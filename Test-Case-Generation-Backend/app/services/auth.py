from fastapi import Request, HTTPException, Header
from typing import Optional
from app.core.postman import get_user
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
import json
import httpx
from authlib.integrations.httpx_client import OAuth2Client
from app.core.config import settings
from app.core.postman import get_user
from app.core.cache import cache_set, cache_get
import secrets

jira_scope = ["read:me", "read:jira-user", "read:jira-work", "offline_access"]
jira_auth_base_url = "https://auth.atlassian.com/authorize"
jira_token_url = "https://auth.atlassian.com/oauth/token"
jira_audience = "api.atlassian.com"
jira_oauth = OAuth2Client(
    client_id=settings.JIRA_CLIENT_ID,
    scope=" ".join(jira_scope),
    redirect_uri=settings.JIRA_REDIRECT_URL
)


async def jira_login(request: Request) -> RedirectResponse:

    authorization_url, state = jira_oauth.create_authorization_url(
        url=jira_auth_base_url,
        audience=jira_audience,
    )

    request.session["oauth_state"] = state
    # Preserve mobile flag so callback can redirect via deep link
    if request.query_params.get("mobile") == "1":
        request.session["mobile"] = True
    return RedirectResponse(authorization_url)


async def jira_callback(request: Request) -> RedirectResponse:
    returned_state = request.query_params.get("state")
    expected_state = request.session.get("oauth_state")

    # Detect if the request originated from a mobile client
    is_mobile = request.session.get("mobile") or request.query_params.get("mobile") == "1"

    if not expected_state or returned_state != expected_state:
        raise HTTPException(
            status_code=400,
            detail="Invalid OAuth state"
        )

    token_json = jira_oauth.fetch_token(
        url=jira_token_url,
        client_secret=settings.JIRA_SECRET,
        authorization_response=str(request.url)
    )

    # create session token and store tokens
    session_token = _generate_token()

    await cache_set(
        key=session_token,
        value={
            "jira": token_json,
            "postman": None
        },
        expire_at=token_json.get('expires_at')
    )

    access_token = token_json.get("access_token")

    # fetch jira user info (if possible)
    user_info = None
    if access_token:
        try:
            user_info = await get_jira_user_info(access_token)
        except Exception:
            user_info = None

    # remove any id-like fields before sending to frontend
    if isinstance(user_info, dict):
        # Atlassian uses 'accountId' or 'id' keys
        user_info.pop("id", None)
        user_info.pop("accountId", None)
        # if wrapped under 'user'
        if "user" in user_info and isinstance(user_info["user"], dict):
            user_info["user"].pop("id", None)
            user_info["user"].pop("accountId", None)

    user_info_json = json.dumps(user_info) if user_info is not None else "null"

    # Redirect to frontend with access token, session token and user info in query params
    redirect_params = {
        "token": access_token,
        "session": session_token,
        "user": user_info_json,
    }

    if is_mobile:
        # Deep link back to mobile app
        redirect_url = f"{settings.MOBILE_SCHEME}://callback?{urlencode(redirect_params)}"
    else:
        redirect_url = f"{settings.FRONTEND_URL}/dashboard/projects?{urlencode(redirect_params)}"
    return RedirectResponse(redirect_url)


async def get_jira_user_info(access_token: str) -> Optional[dict]:
    """Fetch Jira/Atlassian account info using the access token."""
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get("https://api.atlassian.com/me", headers=headers)
        resp.raise_for_status()
        return resp.json()


async def postman_connect(session_token: str, key: str) -> Optional[bool]:
    session = await cache_get(session_token)

    if session is None:
        return False

    user = await get_user(key)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid Postman API Key")

    session['postman'] = key
    await cache_set(
        key=session_token,
        value=session
    )
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

    key = session['jira']
    if key is None:
        raise HTTPException(status_code=401, detail="Missing Jira Key")

    return key
