from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from app.models.enums import OllamaChatResponsePropertiesType, OllamaChatResponsePropertiesPriority, TestCaseStatus

# ==============================OLLAMA LIST==============================================


class OllamaModelDetails(BaseModel):
    parent_model: str
    format: str
    family: str
    families: List[str]
    parameter_size: str
    quantization_level: str


class OllamaModel(BaseModel):
    model: str
    modified_at: str
    digest: str
    size: int
    details: OllamaModelDetails

# ==============================OLLAMA CHAT==============================================


class TestCaseStep(BaseModel):
    step_number: int
    action: str
    test_data: Optional[str] = None


class TestCaseMetadata(BaseModel):
    created_by: str
    created_date: str
    environment: str


class TestCase(BaseModel):
    test_case_id: str
    title: str
    priority: Optional[OllamaChatResponsePropertiesPriority] = None
    module: Optional[str] = None
    description: Optional[str] = None
    pre_conditions: Optional[List[str]] = None
    test_steps: List[TestCaseStep]
    expected_result: str
    actual_result: Optional[str] = ""
    status: TestCaseStatus = TestCaseStatus.PENDING
    post_conditions: Optional[List[str]] = None
    metadata: Optional[TestCaseMetadata] = None


class OllamaChatResponse(BaseModel):
    testcases: List[TestCase]


class OllamaChatRequest(BaseModel):
    issue_descriptions: List[str]
    think: Optional[bool] = False
