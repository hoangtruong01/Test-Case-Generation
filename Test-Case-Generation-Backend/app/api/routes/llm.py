from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from app.models.ollama import OllamaChatRequest, OllamaChatResponse
from app.models.schemas import GenericResponse
from app.services.llm import generate_tests
from app.services.auth import verify_jira_session

router = APIRouter()


@router.api_route(
    path="/testcases",
    summary="Generate Testcases",
    description=(
        "Generates structured QA testcases from Jira issue descriptions using a local LLM. "
        "Results are persisted to Supabase under the authenticated user and project, "
        "appending to an existing testsuite if one already exists for the same user and project."
    ),
    responses={
        200: {
            "description": "Testcases successfully generated",
            "content": {
                "application/json": {
                    "schema": OllamaChatResponse.model_json_schema()
                }
            }
        },
        401: {"model": GenericResponse, "description": "Invalid or missing session token"},
        422: {"model": GenericResponse, "description": "Invalid request body"},
    },
    methods=["POST"],
    response_class=JSONResponse,
)
async def get_testcases(
    jira_project_name: str,
    request: OllamaChatRequest,
    session=Depends(verify_jira_session)
):
    return await generate_tests(
        jira_project_name=jira_project_name,
        request=request,
        session=session
    )
