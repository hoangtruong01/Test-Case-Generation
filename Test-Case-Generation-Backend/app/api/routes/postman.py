from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from app.core.postman import get_all_collections, get_collection, get_all_request, postbot_generate, get_user
from app.services.postman import generate_all_test_scripts, generate_http_requests
from app.services.auth import verify_postman_session
from app.models.schemas import GenericResponse
from app.models.postman import PostmanTestScriptRequest, PostmanTestScriptsRequest, PostmanRequest, PostmanCollectionShort, GenerateHttpRequestsRequest
from typing import List

router = APIRouter()


@router.api_route(
    path="/me",
    summary="Get Postman User Info",
    description="Returns the authenticated Postman user's profile information.",
    responses={
        200: {"description": "User info successfully retrieved"},
        401: {"model": GenericResponse, "description": "Invalid session/API key"},
    },
    methods=["GET"],
    response_class=JSONResponse,
)
async def postman_me(session: str = Depends(verify_postman_session)):
    data = await get_user(session)
    # Extract only relevant user fields
    user = data.get("user", {})
    return JSONResponse(content={
        "username": user.get("username"),
        "email": user.get("email"),
        "fullName": user.get("fullName"),
        "avatar": user.get("avatar"),
        "isPublic": user.get("isPublic"),
    })


@router.api_route(
    path="/collections",
    response_model=List[PostmanCollectionShort],
    summary="",
    description="Gets all user's collections",
    responses={
        200: {"model": List[PostmanCollectionShort], "description": "Successfully retrieved"},
        401: {"model": GenericResponse, "description": "Invalid session/API key"}
    },
    methods=["GET"],
    response_class=JSONResponse,
)
async def all_collections(session=Depends(verify_postman_session)):
    collections = await get_all_collections(session)

    return collections


@router.api_route(
    path="/collection",
    # response_model=,
    summary="Get specific collection by ID",
    description="",
    responses={200: {"description": "Successfully retrieved"}},
    methods=["GET"],
    response_class=JSONResponse,
)
async def collection(
    collectionId: str = Query(
        description="Postman collection ID",
        strict=True
    ),
    session=Depends(verify_postman_session)
):
    collection = await get_collection(collection_id=collectionId, key=session)

    return JSONResponse(
        content=collection
    )


@router.api_route(
    path="/generate",
    # response_model=GenericResponse,
    summary="Generate test script by specific request ID and collection ID",
    description="",
    responses={200: {"description": "Successfully generated"}},
    methods=["POST"],
    response_class=JSONResponse,
)
async def testscript(request: PostmanTestScriptRequest, session: str = Depends(verify_postman_session)):

    collection = await postbot_generate(
        collectionId=request.collectionId,
        requestId=request.requestId,
        language=request.language.value,
        agentFramework=request.agentFramework.value,
        key=session
    )

    return JSONResponse(
        content=collection
    )


@router.api_route(
    path="/generate-all",
    response_model=List[PostmanRequest],
    summary="Generate all test script for all requests of a collection",
    description="",
    responses={200: {"description": "Successfully generated"}},
    methods=["POST"],
    response_class=JSONResponse,
)
async def testscripts(request: PostmanTestScriptsRequest, session=Depends(verify_postman_session)):
    collections = await generate_all_test_scripts(
        collectionId=request.collectionId,
        language=request.language.value,
        agentFramework=request.agentFramework.value,
        key=session
    )

    return JSONResponse(
        content=collections
    )


@router.api_route(
    path="/requests",
    # response_model=List[PostmanRequest],
    summary="Get all request IDs using a collection ID",
    description="",
    responses={200: {"description": "Successfully retrieved"}},
    methods=["GET"],
    response_class=JSONResponse,
)
async def request(collectionId: str, session=Depends(verify_postman_session)):
    requestList = await get_all_request(collectionId, session)

    return requestList


@router.api_route(
    path="/generate-http",
    summary="Generate HTTP Requests from Testcases",
    description=(
        "Uses the local LLM to derive HTTP requests from the provided testcases, "
        "then inserts them into a Postman collection. "
        "If no collection_id is provided, a new collection is created automatically."
    ),
    responses={
        200: {"description": "HTTP requests generated and inserted into Postman collection"},
        401: {"model": GenericResponse, "description": "Invalid session/API key"},
        422: {"model": GenericResponse, "description": "Invalid request body"},
    },
    methods=["POST"],
    response_class=JSONResponse,
)
async def generate_http(request: GenerateHttpRequestsRequest, session: str = Depends(verify_postman_session)):
    result = await generate_http_requests(
        testcases=request.testcases,
        key=session,
        collection_id=request.collection_id,
        collection_name=request.collection_name or "Generated HTTP Requests",
        workspace_id=request.workspace_id,
        think=request.think or False,
    )
    return JSONResponse(content=result)
