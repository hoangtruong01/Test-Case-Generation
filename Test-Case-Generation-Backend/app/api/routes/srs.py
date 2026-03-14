from fastapi import APIRouter, Depends
from app.services.jira import get_all_jira_projects, get_all_jira_issues, get_jira_user_info, get_access_token
from app.services.auth import verify_jira_session
from fastapi.responses import JSONResponse
from app.models.schemas import GenericResponse
from fastapi import Query
from typing import List
from app.models.jira import JiraProject, AllJiraIssuesResponse


router = APIRouter()


@router.api_route(
    path="/projects",
    response_model=List[JiraProject],
    summary="Get All Jira Projects",
    description="Returns all Jira projects",
    responses={200: {"model": List[JiraProject], "description": "Projects Successfully Retrieved"},
               401: {"model": GenericResponse, "description": "Unauthorized"}},
    methods=["GET"],
    response_class=JSONResponse
)
async def jira_projects(session=Depends(verify_jira_session)):
    return await get_all_jira_projects(session.get("jira"))


@router.api_route(
    path="/issues",
    response_model=AllJiraIssuesResponse,
    summary="Get All Jira Issues of a Project",
    description="Returns all Jira issues of a project name that is queried in the parameter",
    responses={200: {"description": "Issues Successfully Retrieved"},
               401: {"model": GenericResponse, "description": "Jira user not authenticated"},
               404: {"model": GenericResponse, "description": "Jira project name not found"}},
    methods=["GET"],
    response_class=JSONResponse
)
async def jira_issues(
    project: str = Query(
        description="Jira project name",
        strict=True
    ),
    session=Depends(verify_jira_session)
):

    return await get_all_jira_issues(project_name=project, key=session.get("jira"))


@router.api_route(
    path="/info",
    summary="Get current Jira user info",
    description="Returns the authenticated Jira user's profile information",
    responses={
        200: {"description": "User info successfully retrieved"},
        401: {"model": GenericResponse, "description": "Jira user not authenticated"},
    },
    methods=["GET"],
    response_class=JSONResponse
)
async def info(
    session=Depends(verify_jira_session)
):
    access_token = await get_access_token(session.get("jira"))
    return await get_jira_user_info(access_token)