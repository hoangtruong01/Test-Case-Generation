from app.core.llm import local_llm_chat_testcases
from app.models.ollama import OllamaChatRequest
from app.utils.utils import format_issue_descriptions
from app.core.database import get_client
from typing import List, Dict, Any


async def generate_tests(
    jira_project_name: str,
    request: OllamaChatRequest,
    session: dict
) -> List[Dict[str, Any]]:
    """
    Generates testcases from Jira issue descriptions using a local LLM,
    persists them to Supabase under the authenticated user, and returns the result.

    Args:
        jira_project_name (str): The Jira project name to associate with the testcases.
        request (OllamaChatRequest): Contains issue descriptions and think flag.
        session (dict): The verified Jira session token dict from verify_jira_session.

    Returns:
        List[Dict[str, Any]]: The generated testcases as a list of dicts.
    """

    formatted_requirements = await format_issue_descriptions(request.issue_descriptions)

    result = await local_llm_chat_testcases(
        prompt=formatted_requirements,
        think=request.think
    )

    testcases = [tc.model_dump(mode="json") for tc in result.testcases]

    username = session.get("username") if isinstance(session, dict) else None

    db = await get_client()

    # Check if a row already exists for this user + project combination
    existing = await (
        db.table("testcase")
        .select("id, testsuite")
        .eq("user", username)
        .eq("jira_project_name", jira_project_name)
        .maybe_single()
        .execute()
    )

    if existing and existing.data:
        # Append new testcases to the existing testsuite
        current = existing.data.get("testsuite") or []
        await (
            db.table("testcase")
            .update({"testsuite": current + testcases})
            .eq("id", existing.data["id"])
            .execute()
        )
    else:
        # New user + project combination — insert a fresh row
        await db.table("testcase").insert({
            "user": username,
            "jira_project_name": jira_project_name,
            "testsuite": testcases
        }).execute()

    return {"testcases": testcases}
