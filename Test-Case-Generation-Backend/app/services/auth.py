from fastapi import Request, HTTPException, Header
from typing import Optional
from fastapi.responses import RedirectResponse, JSONResponse
from app.services.jira import get_jira_user_info, refresh_jira_token
from urllib.parse import urlencode
from authlib.integrations.httpx_client import OAuth2Client
from app.core.config import settings
from app.core.postman import get_user
from app.core.cache import cache_set, cache_get
from app.core.database import get_client
import secrets
import json
import traceback
from datetime import datetime, timezone
from app.models.schemas import AdminAuthRequest

JIRA_SCOPE = ["read:me", "read:jira-user", "read:jira-work", "offline_access"]
JIRA_AUTH_BASE_URL = "https://auth.atlassian.com/authorize"
JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
JIRA_AUDIENCE = "api.atlassian.com"
JIRA_OAUTH = OAuth2Client(
    client_id=settings.JIRA_CLIENT_ID,
    scope=" ".join(JIRA_SCOPE),
    redirect_uri=settings.JIRA_REDIRECT_URL
)
ADMIN_REDIRECT_URL = "http://localhost:8000/admin"


async def admin_auth(request: AdminAuthRequest) -> JSONResponse:
    if request.username == settings.ADMIN_USERNAME and request.password == settings.ADMIN_PASSWORD:
        session_token = _generate_token()
        await cache_set(
            key=session_token,
            value={"role": "admin"},
            expire_in=60 * 60
        )
        return JSONResponse(content={"session_token": session_token})

    raise HTTPException(status_code=401, detail="Unauthorized")


async def jira_login(request: Request) -> RedirectResponse:
    authorization_url, state = JIRA_OAUTH.create_authorization_url(
        url=JIRA_AUTH_BASE_URL,
        audience=JIRA_AUDIENCE,
    )

    request.session["oauth_state"] = state
    return RedirectResponse(authorization_url)


async def jira_callback(request: Request) -> RedirectResponse:
    returned_state = request.query_params.get("state")
    expected_state = request.session.get("oauth_state")

    if not expected_state or returned_state != expected_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    try:
        token_json = JIRA_OAUTH.fetch_token(
            url=JIRA_TOKEN_URL,
            client_secret=settings.JIRA_SECRET,
            authorization_response=str(request.url)
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Token fetch failed: {e}")

    # Convert OAuth2Token to a plain dict for JSON serialization
    token_dict = dict(token_json)
    access_token = token_dict.get("access_token")
    refresh_token = token_dict.get("refresh_token")

    # Fetch Jira user info
    user_info = None
    username = None
    if access_token:
        try:
            user_info_raw = await get_jira_user_info(access_token)
            user_info = json.loads(user_info_raw) if isinstance(user_info_raw, str) else user_info_raw
            username = user_info.get("email") or user_info.get("name") or user_info.get("displayName")
        except Exception:
            user_info = None

    # Check if user exists and token is expired — if so, refresh before saving
    if username:
        db = await get_client()
        existing = await db.table("user").select("*").eq("user", username).maybe_single().execute()

        if existing and existing.data and existing.data.get("is_token_expired"):
            try:
                new_tokens = await refresh_jira_token(existing.data["refresh_token"])
                access_token = new_tokens["access_token"]
                refresh_token = new_tokens.get("refresh_token", refresh_token)
                token_dict = {**token_dict, **new_tokens}
            except Exception:
                pass  # Fall through and use the freshly fetched token from callback

        # Upsert user record with latest tokens and last_logged_in timestamp
        await db.table("user").upsert({
            "user": username,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "is_token_expired": False,
            "last_logged_in": datetime.now(timezone.utc).isoformat()
        }, on_conflict="user").execute()

    # Store session in cache (no TTL — longevity managed via DB token expiry)
    session_token = _generate_token()
    await cache_set(
        key=session_token,
        value={
            "jira": token_dict,
            "postman": None,
            "username": username
        }
    )

    user_info_json = json.dumps(user_info) if user_info is not None else "null"

    redirect_params = {
        "session": session_token,
        "user": user_info_json,
    }

    redirect_url = f"http://localhost:5173/dashboard/projects?{urlencode(redirect_params)}"
    return RedirectResponse(redirect_url)


async def postman_connect(session_token: str, key: str) -> Optional[bool]:
    session = await cache_get(session_token)

    if session is None:
        return False

    user = await get_user(key)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid Postman API Key")

    session['postman'] = key
    await cache_set(key=session_token, value=session)
    return True


def _generate_token() -> str:
    return secrets.token_urlsafe(32)


async def verify_postman_session(x_session_token: str = Header(...)):
    session = await cache_get(x_session_token)
    if session is None:
        raise HTTPException(status_code=401, detail="Invalid session key")

    key = session['postman']
    if key is None:
        raise HTTPException(status_code=401, detail="Missing Postman API Key")

    user = await get_user(key)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid Postman API Key")

    return key


async def verify_session(x_session_token: str = Header(...)):
    session = await cache_get(x_session_token)
    if session is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    return x_session_token


async def verify_jira_session(x_session_token: str = Header(...)):
    session = await cache_get(x_session_token)

    if session is None:
        raise HTTPException(status_code=401, detail="Invalid session key")

    token_data = session.get('jira')
    if token_data is None:
        raise HTTPException(status_code=401, detail="Missing Jira Key")

    username = session.get("username")
    if username:
        db = await get_client()
        user = await db.table("user").select("*").eq("user", username).maybe_single().execute()

        if user and user.data:
            if user.data.get("is_banned"):
                raise HTTPException(status_code=403, detail="Account is banned")

            if user.data.get("is_token_expired"):
                try:
                    new_tokens = await refresh_jira_token(user.data["refresh_token"])
                    await db.table("user").update({
                        "access_token": new_tokens["access_token"],
                        "refresh_token": new_tokens.get("refresh_token", user.data["refresh_token"]),
                        "is_token_expired": False,
                        "last_logged_in": datetime.now(timezone.utc).isoformat()
                    }).eq("user", username).execute()
                    token_data = {**token_data, **new_tokens}
                    session['jira'] = token_data
                    await cache_set(key=x_session_token, value=session)
                except Exception:
                    raise HTTPException(status_code=401, detail="Session expired and token refresh failed")

    # Return full session so downstream services can access username and token
    return session


async def verify_admin_session(x_session_token: str = Header(...)):
    session = await cache_get(x_session_token)

    if session is None:
        raise HTTPException(status_code=401, detail="Invalid session key")

    if 'role' not in session or session['role'] != "admin":
        raise HTTPException(status_code=401, detail="Unauthorized")

    return x_session_token
