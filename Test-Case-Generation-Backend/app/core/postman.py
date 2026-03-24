from typing import Any, Dict, List, Optional
import httpx


POSTMAN_URLS = {
    'collections': 'https://api.getpostman.com/collections',
    'environments': 'https://api.getpostman.com/environments',
    'workspaces': 'https://api.getpostman.com/workspaces',
    'user': 'https://api.getpostman.com/me',
    'mocks': 'https://api.getpostman.com/mocks',
    'monitors': 'https://api.getpostman.com/monitors',
    'postbot': 'https://api.getpostman.com/postbot/generations/tool',
}


def _get_headers(key: str) -> Dict[str, str]:
    return {
        'X-Api-Key': key
    }


async def get_all_collections(key: str, workspace_id: Optional[str] = None):
    params: Dict[str, str] = {}
    if workspace_id:
        params["workspace"] = workspace_id
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            url=POSTMAN_URLS['collections'],
            headers=_get_headers(key),
            params=params or None,
        )
    response.raise_for_status()
    body = response.json()
    return body.get("collections") or []


async def get_collection(collection_id: str, key: str):
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            url=f"{POSTMAN_URLS['collections']}/{collection_id}",
            headers=_get_headers(key)
        )
    return response.json()


async def get_all_workspaces(key: str):
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            POSTMAN_URLS['workspaces'],
            headers=_get_headers(key)
        )
    response.raise_for_status()
    return response.json()


def flatten_collection_requests(items: List[Dict[str, Any]], folder_path: str = "") -> List[Dict[str, Any]]:
    """Flatten nested Postman collection folders into a list of request items."""
    out: List[Dict[str, Any]] = []
    for it in items or []:
        name = (it.get("name") or "").strip()
        if it.get("request") is not None:
            clone = {k: v for k, v in it.items() if k != "item"}
            if folder_path:
                clone["_folder"] = folder_path
            out.append(clone)
            continue
        sub_items = it.get("item")
        if isinstance(sub_items, list) and sub_items:
            sub = f"{folder_path}/{name}" if folder_path else name
            out.extend(flatten_collection_requests(sub_items, sub))
    return out


async def list_workspace_summaries(key: str) -> List[Dict[str, Any]]:
    data = await get_all_workspaces(key)
    raw = data.get("workspaces") or []
    return [
        {
            "id": w.get("id"),
            "name": w.get("name") or w.get("id"),
            "type": w.get("type"),
        }
        for w in raw
        if w.get("id")
    ]


async def create_collection(name: str, key: str, items: list = None, workspace_id: str = None) -> str:
    """Creates a new Postman collection with optional items, returns its ID."""
    payload = {
        "collection": {
            "info": {
                "name": name,
                "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            "item": items or []
        }
    }
    params = {}
    if workspace_id:
        params["workspace"] = workspace_id

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url=POSTMAN_URLS['collections'],
            headers=_get_headers(key),
            json=payload,
            params=params
        )
    response.raise_for_status()
    return response.json()["collection"]["id"]


async def add_items_to_collection(collection_id: str, new_items: list, key: str) -> None:
    """Fetches existing collection and PUTs it back with new items appended."""
    existing = await get_collection(collection_id=collection_id, key=key)
    collection_data = existing.get("collection", {})
    current_items = collection_data.get("item", [])

    collection_data["item"] = current_items + new_items

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.put(
            url=f"{POSTMAN_URLS['collections']}/{collection_id}",
            headers=_get_headers(key),
            json={"collection": collection_data}
        )
    response.raise_for_status()


async def get_all_requestIds(collection_id: str, key: str):
    collection = await get_collection(collection_id=collection_id, key=key)
    return [item['id'] for item in collection["collection"]["item"]]


async def get_all_request(collection_id: str, key: str):
    collection = await get_collection(collection_id=collection_id, key=key)
    items = collection.get("collection", {}).get("item") or []
    return flatten_collection_requests(items)


async def get_user(key: str):
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            POSTMAN_URLS["user"],
            headers=_get_headers(key)
        )

    if response.status_code == 401:
        return None

    response.raise_for_status()
    return response.json()


async def postbot_generate(
        collectionId: str,
        requestId: str,
        language: str,
        agentFramework: str,
        key: str
) -> Any:

    POSTBOT_PAYLOAD = {
        "collectionId": collectionId,
        "requestId": requestId,
        "config": {
            "language": language,
            "agentFramework": agentFramework
        }
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url=POSTMAN_URLS['postbot'],
            headers=_get_headers(key),
            json=POSTBOT_PAYLOAD
        )

    return response.json()
