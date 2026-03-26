from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.models.enums import PostmanAgentFrameworks, PostmanLanguages


class PostmanCollectionShort(BaseModel):
    id: str
    name: str
    owner: str
    createdAt: str
    updatedAt: str
    uid: str
    isPublic: bool


class PostmanCollectionFullInfo(BaseModel):
    _postman_id: str
    name: str
    schema_url: str = Field(alias="schema")
    createdAt: str
    updatedAt: str
    lastUpdatedBy: str
    uid: str

    model_config = {"populate_by_name": True}


class PostmanCollectionItemProtocolProfileBehavior(BaseModel):
    disabledSystemHeaders: Any
    disableBodyPruning: bool


class PostmanCollectionItemRequest(BaseModel):
    auth: Dict[str, str]
    method: str
    header: List


class PostmanCollectionItem(BaseModel):
    name: str
    id: str
    protocolProfileBehavior: PostmanCollectionItemProtocolProfileBehavior
    request: Dict


class PostmanCollectionFull(BaseModel):
    info: PostmanCollectionFullInfo
    items: List


class PostmanTestScriptsRequest(BaseModel):
    collectionId: str
    language: PostmanLanguages
    agentFramework: PostmanAgentFrameworks


class PostmanTestScriptRequest(BaseModel):
    collectionId: str
    requestId: str
    language: PostmanLanguages
    agentFramework: PostmanAgentFrameworks


# ===============================


class Header(BaseModel):
    key: str
    value: str


class QueryParam(BaseModel):
    key: str
    value: str
    equals: bool
    description: Optional[str] = None
    enabled: bool


class RawOptions(BaseModel):
    language: str


class DataOptions(BaseModel):
    raw: RawOptions


class PostmanRequest(BaseModel):
    name: str
    description: Optional[str]
    url: str
    method: str
    headers: List[Header]
    queryParams: Optional[List[QueryParam]]
    dataMode: str
    rawModeData: Optional[str] = None
    dataOptions: DataOptions


class GenerateHttpRequestsRequest(BaseModel):
    testcases: List[Any]
    collection_id: Optional[str] = None
    collection_name: Optional[str] = "Generated HTTP Requests"
    workspace_id: Optional[str] = None
    think: Optional[bool] = False


class PostmanEndpointForTests(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    method: str
    url: str
    description: Optional[str] = None
    # Headers/body are required to execute the endpoint before generating tests.
    headers: Optional[List[Header]] = None
    body_raw: Optional[str] = None
    body_excerpt: Optional[str] = None
    folder: Optional[str] = None


class GenerateTestcasesFromPostmanRequest(BaseModel):
    postman_workspace: str
    postman_workspace_id: Optional[str] = None
    postman_collection: str
    postman_collection_id: str
    endpoints: List[PostmanEndpointForTests]
    think: Optional[bool] = False
