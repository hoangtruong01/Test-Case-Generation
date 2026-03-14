from fastapi import HTTPException
import httpx
from atlassian.jira import Jira
from app.core.config import settings
from app.models.jira import JiraToken
from typing import Optional, Dict, Any
import json

ATLASSIAN_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"
JIRA_ME_URL = "https://api.atlassian.com/me"
JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token"


async def _get_access_token(key: dict) -> str:
    try:
        if isinstance(key, dict):
            jira_token = JiraToken.model_validate(key)
        else:
            jira_token = JiraToken.model_validate_json(key)
        access_token = jira_token.access_token
    except HTTPException as e:
        raise
    except Exception as e:
        raise RuntimeError(f"Failed to get Jira access token: {e}")
    return access_token


async def get_access_token(key: dict) -> str:
    """Public wrapper around _get_access_token for use outside this module."""
    return await _get_access_token(key)


async def get_jira_user_info(access_token: str):
    """Fetch Jira/Atlassian account info using the access token."""
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        user_info = await client.get(JIRA_ME_URL, headers=headers)

    user_info.raise_for_status()
    user_info = user_info.json()

    # remove any id-like fields before sending to frontend
    if isinstance(user_info, dict):
        # Atlassian uses 'accountId' or 'id' keys
        user_info.pop("id", None)
        user_info.pop("accountId", None)
        # if wrapped under 'user'
        if "user" in user_info and isinstance(user_info["user"], dict):
            user_info["user"].pop("id", None)
            user_info["user"].pop("accountId", None)

    # user_info_json = json.dumps(user_info) if user_info is not None else "null"

    return user_info


async def _get_cloud_id(access_token: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            ATLASSIAN_RESOURCES_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
        response.raise_for_status()

        resources = response.json()

    if not resources:
        raise Exception("No resources found")

    return resources[0]["id"]


async def _create_jira_client(access_token: str) -> Jira:
    cloud_id = await _get_cloud_id(access_token)

    oauth2_config = {
        "client_id": settings.JIRA_CLIENT_ID,
        "token": {
            "access_token": access_token,
            "token_type": "Bearer",
        },
    }

    return Jira(
        url=f"https://api.atlassian.com/ex/jira/{cloud_id}",
        oauth2=oauth2_config,
        cloud=True,
    )


async def get_all_jira_projects(key: str):
    access_token = await _get_access_token(key)

    jira = await _create_jira_client(access_token)
    return jira.projects()


async def get_all_jira_issues(project_name: str, key: str):
    access_token = await _get_access_token(key)

    if project_name is None:
        raise HTTPException(
            status_code=404,
            detail="No project name found in query params"
        )

    jira = await _create_jira_client(access_token)

    # TODO: May subjugate under SQL Injection
    jql_request = f'project = "{project_name}" ORDER BY issuekey'
    issues = jira.enhanced_jql(
        jql=jql_request,
        fields=[
            'description',
            'id',
            'key',
            'self',
            'statusCategory',
            'summary'
        ]
    )

    return issues


async def refresh_jira_token(refresh_token: str) -> Dict[str, Any]:
    """
    Uses a refresh token to obtain a new Jira access token.

    Args:
        refresh_token (str): The stored refresh token for the user.

    Returns:
        Dict[str, Any]: New token data including access_token and refresh_token.

    Raises:
        RuntimeError: If the token refresh request fails.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            JIRA_TOKEN_URL,
            json={
                "grant_type": "refresh_token",
                "client_id": settings.JIRA_CLIENT_ID,
                "client_secret": settings.JIRA_SECRET,
                "refresh_token": refresh_token,
            },
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()

    return response.json()
