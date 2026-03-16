from fastapi import APIRouter, Depends
from app.services.auth import jira_login, jira_callback, postman_connect, verify_session
from app.models.schemas import JiraAuthResponse, PostmanAPIKeyRequest, GenericResponse
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi import Request

router = APIRouter()


@router.api_route(
    path="/jira/login",
    response_model=JiraAuthResponse,
    summary="Jira Login",
    description="Redirects to Jira for authorization, after authorization, returns a session token",
    responses={200: {"description": "Authorized"}},
    methods=["GET"],
    response_class=RedirectResponse,
)
async def jira_auth_login(request: Request):
    return await jira_login(request)


@router.api_route(
    path="/jira-callback",
    response_model=JiraAuthResponse,
    summary="Jira Callback",
    description="Redirects to Jira for authorization",
    responses={200: {"description": "Authorized"}},
    methods=["GET"],
    response_class=RedirectResponse
)
async def jira_auth_callback(request: Request):
    return await jira_callback(request)


@router.api_route(
    path="/jira/callback",
    response_model=JiraAuthResponse,
    summary="Jira Callback (compat)",
    description="Compatibility callback path for Jira OAuth redirect",
    responses={200: {"description": "Authorized"}},
    methods=["GET"],
    response_class=RedirectResponse
)
async def jira_auth_callback_compat(request: Request):
    return await jira_callback(request)


@router.api_route(
    path="/postman/connect",
    response_model=GenericResponse,
    summary="For user to enter Postman API Key",
    description="User enter their Postman API Key and it is stored in memory, returns a session token",
    responses={
        200: {"model": GenericResponse, "description": "Successfully stored and returned session token"},
        401: {"model": GenericResponse, "description": "Unauthorized"},
    },
    methods=["POST"],
    response_class=JSONResponse,
)
async def connect(request: PostmanAPIKeyRequest, session_token: str = Depends(verify_session)):
    bool = await postman_connect(session_token, request.api_key)
    if not bool:
        return JSONResponse(
            status_code=401,
            content={
                "detail": "Invalid session key"
            }
        )

    return JSONResponse(
        content={
            "detail": "Postman connected successfully"
        }
    )
