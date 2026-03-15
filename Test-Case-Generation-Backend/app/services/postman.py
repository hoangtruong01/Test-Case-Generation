
from app.core.postman import postbot_generate, get_all_requestIds, create_collection, add_items_to_collection
from app.core.llm import local_llm_chat
from typing import Optional


async def generate_all_test_scripts(
        collectionId: str,
        language: str,
        agentFramework: str,
        key: str
):
    """
    Generates all test scripts for all requests in a given collection.

    Args:
        collectionId (str): Postman collection ID.
        language (str): Programming language of the generated test scripts.
        agentFramework (str): Postman agent framework of the generated test scripts.
        key (str): Postman API key.

    Returns:
        List[str]: A list of generated test scripts.
    """

    all_requests = await get_all_requestIds(collection_id=collectionId, key=key)

    result = []
    for request in all_requests:

        generated = await postbot_generate(
            collectionId=collectionId,
            requestId=request,
            language=language,
            agentFramework=agentFramework,
            key=key
        )

        result.append(generated['data']['text'])
    return result


async def generate_http_requests(
    testcases: list,
    key: str,
    collection_id: Optional[str] = None,
    collection_name: str = "Generated HTTP Requests",
    workspace_id: Optional[str] = None,
    think: bool = False,
) -> dict:
    """
    Generates HTTP requests from testcases using the local LLM and inserts
    them into a Postman collection. Creates a new collection if none is provided.

    Args:
        testcases (list): List of TestCase dicts to derive HTTP requests from.
        key (str): Postman API key.
        collection_id (Optional[str]): Existing collection ID to insert into.
        collection_name (str): Name for the new collection if none provided.
        think (bool): Whether to enable LLM reasoning mode.

    Returns:
        dict: collection_id and list of inserted requests.
    """
    # Build a condensed prompt from testcase titles + descriptions
    descriptions = []
    for tc in testcases:
        title = tc.get("title", "")
        desc = tc.get("description") or ""
        steps = " | ".join(
            s.get("action", "") for s in (tc.get("test_steps") or [])
        )
        descriptions.append(f"- {title}: {desc}. Steps: {steps}")

    prompt = "\n".join(descriptions)

    # Generate HTTP requests via LLM
    requests = await local_llm_chat(prompt=[prompt], think=think)

    # Build Postman v2.1 item format for each generated request
    items = []
    for req in requests:
        req_dict = req.model_dump(mode="json")
        item = {
            "name": req_dict["name"],
            "request": {
                "method": req_dict["method"],
                "header": [{"key": h["key"], "value": h["value"]} for h in (req_dict.get("headers") or [])],
                "url": {
                    "raw": req_dict["url"],
                    "query": [
                        {"key": p["key"], "value": p["value"], "disabled": not p.get("enabled", True)}
                        for p in (req_dict.get("queryParams") or [])
                    ]
                },
                "description": req_dict.get("description")
            }
        }
        if req_dict.get("rawModeData"):
            item["request"]["body"] = {
                "mode": req_dict.get("dataMode", "raw"),
                "raw": req_dict["rawModeData"],
                "options": req_dict.get("dataOptions")
            }
        items.append(item)

    if not collection_id:
        # Create new collection with all items embedded
        collection_id = await create_collection(name=collection_name, key=key, items=items, workspace_id=workspace_id)
    else:
        # Append items to existing collection via PUT
        await add_items_to_collection(collection_id=collection_id, new_items=items, key=key)

    return {"collection_id": collection_id, "inserted_count": len(items)}
