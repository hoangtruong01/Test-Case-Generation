from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from app.models.schemas import (
    AdminAuthRequest, GenericResponse,
    AdminUserListResponse, AdminTestcaseListResponse, AdminBanRequest,
)
from app.services.auth import admin_auth, verify_admin_session
from app.services.admin import get_all_users, ban_user, unban_user, get_all_testcases

router = APIRouter()


@router.api_route(
    path="/login",
    summary="Admin Login",
    description="Admin enters a fixed username and password, returns a session token valid for 1 hour.",
    responses={
        200: {"description": "Successfully logged in", "content": {"application/json": {"schema": {"properties": {"session_token": {"type": "string"}}}}}},
        401: {"model": GenericResponse, "description": "Unauthorized"},
    },
    methods=["POST"],
    response_class=JSONResponse,
)
async def admin_login(request: AdminAuthRequest):
    return await admin_auth(request=request)


@router.api_route(
    path="/users",
    response_model=AdminUserListResponse,
    summary="List All Users",
    description="Returns all registered users. Sensitive token fields are excluded.",
    responses={
        200: {"model": AdminUserListResponse, "description": "Users retrieved successfully"},
        401: {"model": GenericResponse, "description": "Unauthorized"},
    },
    methods=["GET"],
    response_class=JSONResponse,
)
async def list_users(session=Depends(verify_admin_session)):
    return (await get_all_users()).model_dump()


@router.api_route(
    path="/users/ban",
    response_model=GenericResponse,
    summary="Ban User",
    description="Soft-deletes a user by setting is_banned = true.",
    responses={
        200: {"model": GenericResponse, "description": "User banned successfully"},
        401: {"model": GenericResponse, "description": "Unauthorized"},
        404: {"model": GenericResponse, "description": "User not found"},
    },
    methods=["POST"],
    response_class=JSONResponse,
)
async def ban(body: AdminBanRequest, session=Depends(verify_admin_session)):
    await ban_user(body.user_id)
    return JSONResponse(content={"detail": f"User {body.user_id} has been banned."})


@router.api_route(
    path="/users/unban",
    response_model=GenericResponse,
    summary="Unban User",
    description="Restores a banned user by setting is_banned = false.",
    responses={
        200: {"model": GenericResponse, "description": "User unbanned successfully"},
        401: {"model": GenericResponse, "description": "Unauthorized"},
        404: {"model": GenericResponse, "description": "User not found"},
    },
    methods=["POST"],
    response_class=JSONResponse,
)
async def unban(body: AdminBanRequest, session=Depends(verify_admin_session)):
    await unban_user(body.user_id)
    return JSONResponse(content={"detail": f"User {body.user_id} has been unbanned."})


@router.api_route(
    path="/testcases",
    response_model=AdminTestcaseListResponse,
    summary="List All Generated Testcases",
    description="Returns all testcase records showing who generated them, from which project, when, and how many testcases are in each suite.",
    responses={
        200: {"model": AdminTestcaseListResponse, "description": "Testcases retrieved successfully"},
        401: {"model": GenericResponse, "description": "Unauthorized"},
    },
    methods=["GET"],
    response_class=JSONResponse,
)
async def list_testcases(session=Depends(verify_admin_session)):
    return (await get_all_testcases()).model_dump()
