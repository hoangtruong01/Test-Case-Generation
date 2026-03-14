from fastapi.responses import StreamingResponse
from fastapi import APIRouter
from app.models.ollama import OllamaChatResponse, TestCase
from app.models.schemas import GenericResponse
from app.services.export import generate_excel, get_filename
from typing import List

router = APIRouter()


@router.api_route(
    path="/export-excel",
    summary="Export Testcases to Excel",
    description=(
        "Accepts either a testsuite JSON array or an object with a 'testcases' key, "
        "and returns a downloadable Excel (.xlsx) file."
    ),
    responses={
        200: {
            "description": "Excel file successfully generated",
            "content": {
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                    "schema": {"type": "string", "format": "binary"}
                }
            },
        },
        422: {"description": "Invalid testsuite payload"},
    },
    methods=["POST"],
    response_class=StreamingResponse,
)
async def export_testcases(payload: List[TestCase]):
    data = {"testcases": [tc.model_dump(mode="json") for tc in payload]}
    excel_file = await generate_excel(data)
    excel_filename = await get_filename()

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{excel_filename}"',
        },
    )
