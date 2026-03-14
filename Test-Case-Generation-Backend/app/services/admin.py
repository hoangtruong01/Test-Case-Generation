from app.core.database import get_client
from app.models.schemas import (
    AdminUserView, AdminUserListResponse,
    AdminTestcaseView, AdminTestcaseListResponse,
)
from fastapi import HTTPException


async def get_all_users() -> AdminUserListResponse:
    """
    Returns all users, excluding sensitive token fields.
    """
    db = await get_client()
    result = await (
        db.table("user")
        .select("id, user, is_token_expired, is_banned, last_logged_in")
        .execute()
    )

    users = [AdminUserView(**row) for row in (result.data or [])]
    return AdminUserListResponse(users=users)


async def ban_user(user_id: str) -> None:
    """
    Soft-deletes a user by setting is_banned = true.
    """
    db = await get_client()
    result = await (
        db.table("user")
        .update({"is_banned": True})
        .eq("id", user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")


async def unban_user(user_id: str) -> None:
    """
    Restores a soft-deleted user by setting is_banned = false.
    """
    db = await get_client()
    result = await (
        db.table("user")
        .update({"is_banned": False})
        .eq("id", user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")


async def get_all_testcases() -> AdminTestcaseListResponse:
    """
    Returns all testcase records with who generated them and from which project.
    Includes a count of testcases in each testsuite instead of the raw JSON.
    """
    db = await get_client()
    result = await (
        db.table("testcase")
        .select("id, user, jira_project_name, created_at, testsuite")
        .execute()
    )

    testcases = [
        AdminTestcaseView(
            id=row["id"],
            user=row.get("user"),
            jira_project_name=row.get("jira_project_name"),
            created_at=row["created_at"],
            testcase_count=len(row.get("testsuite") or []),
            testsuite=row.get("testsuite"),
        )
        for row in (result.data or [])
    ]

    return AdminTestcaseListResponse(testcases=testcases)
