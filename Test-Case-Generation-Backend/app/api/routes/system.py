from fastapi import APIRouter
from app.core.database import database_healthcheck
from fastapi.responses import JSONResponse
from app.core.llm import ollama_healthcheck
from app.core.vector_database import chromadb_healthcheck
from chromadb.errors import ChromaError
from app.models.schemas import GenericResponse
from app.core.cache import redis_healthcheck
import traceback

router = APIRouter()


@router.api_route(
    path="/health",
    response_model=GenericResponse,
    summary="Health Check",
    description="Checks the health",
    responses={200: {"description": "Services Healthy"}},
    methods=["GET"],
    response_class=JSONResponse,
)
async def healthcheck():
    return JSONResponse(
        content={
            "detail": "Backend is up and running"
        },
    )


@router.api_route(
    path="/status",
    response_model=GenericResponse,
    summary="Services Status Check",
    description="Checks the status of the service (LLM, Database, Vector Database)",
    responses={200: {"model": GenericResponse, "description": "Services Healthy"},
               503: {"model": GenericResponse, "description": "Service(s) Unavailable"}},
    methods=["GET"],
    response_class=JSONResponse,
)
async def status():
    db_ok: bool = True
    llm_ok: bool = True
    vector_ok: bool = True
    cache_ok: bool = True

    try:
        await database_healthcheck()
    except Exception as e:
        traceback.print_exc()
        db_ok = False

    try:
        await ollama_healthcheck()
    except Exception as e:
        traceback.print_exc()
        llm_ok = False

    try:
        chromadb_healthcheck()
    except ChromaError as e:
        traceback.print_exc()
        vector_ok = False

    try:
        await redis_healthcheck()
    except Exception as e:
        traceback.print_exc()
        cache_ok = False

    if not db_ok or not llm_ok or not vector_ok or not cache_ok:
        errorMessage = f"Database: {db_ok}, LLM: {llm_ok}, Vector: {vector_ok}, Cache: {cache_ok}"

        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "message": errorMessage
            },
        )

    return JSONResponse(
        content={
            "detail": "Database, LLM, Cache and Vector services healthy"
        },
    )
