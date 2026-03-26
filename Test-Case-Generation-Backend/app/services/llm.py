from app.core.llm import local_llm_chat_testcases
from app.models.ollama import OllamaChatRequest
from app.models.postman import GenerateTestcasesFromPostmanRequest
from app.utils.utils import format_issue_descriptions, format_postman_endpoints_for_llm
from app.core.database import get_client
from typing import List, Dict, Any, AsyncGenerator
import asyncio
import httpx


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


async def generate_tests_from_postman(
    request: GenerateTestcasesFromPostmanRequest,
    username: str,
) -> Dict[str, Any]:
    """
    Execute the selected Postman endpoints, then generate QA testcases
    from the observed responses (persist to Supabase for monitoring).
    """
    if not request.endpoints:
        raise ValueError("At least one endpoint is required")

    async def _execute_endpoint(ep: Any) -> Dict[str, Any]:
        if not ep.get("url"):
            return {"observed_error": "Missing URL", "observed_status_code": None, "observed_body_excerpt": ""}

        method = str(ep.get("method") or "GET").upper()
        url = str(ep.get("url") or "")

        headers_list = ep.get("headers") or []
        headers: Dict[str, str] = {}
        for h in headers_list:
            if not h:
                continue
            k = h.get("key")
            v = h.get("value")
            if k and v is not None:
                headers[str(k)] = str(v)

        # Keep it simple: send body_raw as raw content when provided.
        body_raw = ep.get("body_raw") or ""
        content = None
        if body_raw and method in {"POST", "PUT", "PATCH", "DELETE"}:
            content = str(body_raw)

        timeout_s = 30
        try:
            async with httpx.AsyncClient(timeout=timeout_s, follow_redirects=True) as client:
                resp = await client.request(method, url, headers=headers or None, content=content)

            text = resp.text or ""
            excerpt = text[:2000] + ("…" if len(text) > 2000 else "")
            return {
                "observed_status_code": resp.status_code,
                "observed_body_excerpt": excerpt,
                "observed_error": "",
            }
        except Exception as e:
            msg = str(e)
            return {
                "observed_status_code": None,
                "observed_body_excerpt": "",
                "observed_error": msg[:2000],
            }

    semaphore = asyncio.Semaphore(3)

    async def _run_wrapped(ep: Any) -> Dict[str, Any]:
        async with semaphore:
            return await _execute_endpoint(ep)

    execution_results = await asyncio.gather(
        *[_run_wrapped(ep.model_dump() if hasattr(ep, "model_dump") else ep) for ep in request.endpoints]
    )

    raw_lines = []
    for ep, exec_info in zip(request.endpoints, execution_results):
        raw_lines.append(
            {
                "method": ep.method,
                "url": ep.url,
                "name": ep.name,
                "description": ep.description,
                "body_excerpt": ep.body_excerpt,
                "folder": ep.folder,
                "observed_status_code": exec_info.get("observed_status_code"),
                "observed_body_excerpt": exec_info.get("observed_body_excerpt"),
                "observed_error": exec_info.get("observed_error"),
            }
        )

    requirements = format_postman_endpoints_for_llm(raw_lines)
    formatted_requirements = await format_issue_descriptions(requirements)

    result = await local_llm_chat_testcases(
        prompt=formatted_requirements,
        think=request.think or False,
    )

    testcases = [tc.model_dump(mode="json") for tc in result.testcases]

    db = await get_client()

    existing = await (
        db.table("testcase")
        .select("id, testsuite")
        .eq("user", username)
        .eq("postman_workspace", request.postman_workspace)
        .eq("postman_collection", request.postman_collection)
        .maybe_single()
        .execute()
    )

    if existing and existing.data:
        current = existing.data.get("testsuite") or []
        await (
            db.table("testcase")
            .update({"testsuite": current + testcases})
            .eq("id", existing.data["id"])
            .execute()
        )
    else:
        await db.table("testcase").insert({
            "user": username,
            "jira_project_name": None,
            "postman_workspace": request.postman_workspace,
            "postman_collection": request.postman_collection,
            "testsuite": testcases,
        }).execute()

    return {"testcases": testcases}


async def generate_tests_from_postman_ws(
    request: GenerateTestcasesFromPostmanRequest,
    username: str,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Same logic as generate_tests_from_postman but yields progress events for WebSocket streaming.
    Events:
      { "type": "endpoint_start",  "index": i, "name": ..., "method": ..., "url": ... }
      { "type": "endpoint_done",   "index": i, "status_code": ..., "error": ... }
      { "type": "llm_start" }
      { "type": "done",            "testcases": [...] }
    """
    if not request.endpoints:
        yield {"type": "error", "message": "At least one endpoint is required"}
        return

    async def _execute_endpoint(ep: Any) -> Dict[str, Any]:
        if not ep.get("url"):
            return {"observed_error": "Missing URL", "observed_status_code": None, "observed_body_excerpt": ""}

        method = str(ep.get("method") or "GET").upper()
        url = str(ep.get("url") or "")

        headers_list = ep.get("headers") or []
        headers: Dict[str, str] = {}
        for h in headers_list:
            if not h:
                continue
            k = h.get("key")
            v = h.get("value")
            if k and v is not None:
                headers[str(k)] = str(v)

        body_raw = ep.get("body_raw") or ""
        content = None
        if body_raw and method in {"POST", "PUT", "PATCH", "DELETE"}:
            content = str(body_raw)

        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                resp = await client.request(method, url, headers=headers or None, content=content)
            text = resp.text or ""
            excerpt = text[:2000] + ("…" if len(text) > 2000 else "")
            return {
                "observed_status_code": resp.status_code,
                "observed_body_excerpt": excerpt,
                "observed_error": "",
            }
        except Exception as e:
            msg = str(e)
            return {
                "observed_status_code": None,
                "observed_body_excerpt": "",
                "observed_error": msg[:2000],
            }

    semaphore = asyncio.Semaphore(3)
    execution_results: List[Dict[str, Any]] = [{}] * len(request.endpoints)
    queue: asyncio.Queue = asyncio.Queue()

    async def _run_one(i: int, ep: Any):
        ep_dict = ep.model_dump() if hasattr(ep, "model_dump") else ep
        await queue.put({"type": "endpoint_start", "index": i,
                         "name": ep_dict.get("name") or "",
                         "method": (ep_dict.get("method") or "GET").upper(),
                         "url": ep_dict.get("url") or ""})
        async with semaphore:
            result = await _execute_endpoint(ep_dict)
        execution_results[i] = result
        await queue.put({"type": "endpoint_done", "index": i,
                         "status_code": result.get("observed_status_code"),
                         "error": result.get("observed_error") or ""})

    tasks = [asyncio.create_task(_run_one(i, ep)) for i, ep in enumerate(request.endpoints)]

    done_count = 0
    total = len(tasks)
    while done_count < total:
        event = await queue.get()
        yield event
        if event["type"] == "endpoint_done":
            done_count += 1

    await asyncio.gather(*tasks, return_exceptions=True)

    raw_lines = []
    for ep, exec_info in zip(request.endpoints, execution_results):
        raw_lines.append({
            "method": ep.method,
            "url": ep.url,
            "name": ep.name,
            "description": ep.description,
            "body_excerpt": ep.body_excerpt,
            "folder": ep.folder,
            "observed_status_code": exec_info.get("observed_status_code"),
            "observed_body_excerpt": exec_info.get("observed_body_excerpt"),
            "observed_error": exec_info.get("observed_error"),
        })

    yield {"type": "llm_start"}

    requirements = format_postman_endpoints_for_llm(raw_lines)
    formatted_requirements = await format_issue_descriptions(requirements)

    result = await local_llm_chat_testcases(
        prompt=formatted_requirements,
        think=request.think or False,
    )

    testcases = [tc.model_dump(mode="json") for tc in result.testcases]

    db = await get_client()
    existing = await (
        db.table("testcase")
        .select("id, testsuite")
        .eq("user", username)
        .eq("postman_workspace", request.postman_workspace)
        .eq("postman_collection", request.postman_collection)
        .maybe_single()
        .execute()
    )
    if existing and existing.data:
        current = existing.data.get("testsuite") or []
        await (
            db.table("testcase")
            .update({"testsuite": current + testcases})
            .eq("id", existing.data["id"])
            .execute()
        )
    else:
        await db.table("testcase").insert({
            "user": username,
            "jira_project_name": None,
            "postman_workspace": request.postman_workspace,
            "postman_collection": request.postman_collection,
            "testsuite": testcases,
        }).execute()

    yield {"type": "done", "testcases": testcases}
