# LLM abstraction layer for interacting with a local Ollama server
from ollama import AsyncClient
from app.core.config import settings
from typing import List, Optional
import httpx
import traceback
from app.models.postman import PostmanRequest
from app.models.ollama import OllamaChatResponse, TestCase
from pydantic import TypeAdapter

# System prompt injected into the custom Ollama model to constrain behavior
SWD_MODEL_SYSTEM_PROMPT = """
You are an API request generation assistant.

Your task is to generate HTTP request definitions that strictly conform to the provided JSON schema for a list of PostmanRequest objects.

CRITICAL OUTPUT RULES:

- Output MUST be valid JSON.
- The top-level output MUST be a JSON array.
- Each element in the array MUST strictly match the PostmanRequest schema.
- Do NOT output a single object. Always output an array.
- Do NOT include explanations, comments, markdown, or code fences.
- Do NOT include fields not defined in the schema.
- Do NOT omit required fields.
- If an optional field is not applicable, set it to null.
- If no query parameters are required, set "queryParams" to null.
- Stop once all API operations described in the requirements are represented.

SCHEMA CONSTRAINTS:

Each PostmanRequest object MUST contain:
- name: string
- description: string or null
- url: string (absolute URL)
- method: string
- headers: array of { key: string, value: string }
- queryParams: array of {
      key: string,
      value: string,
      equals: boolean,
      description: string or null,
      enabled: boolean
  } OR null
- dataMode: string
- rawModeData: string or null
- dataOptions: {
      raw: {
          language: string
      }
  }

HTTP METHOD RULES:

For GET requests:
- method MUST be "GET"
- rawModeData MUST be null
- dataMode MUST still be provided
- Query parameters MUST be defined in "queryParams" (not embedded only in URL)

For POST requests:
- method MUST be "POST"
- dataMode MUST be "raw"
- rawModeData MUST contain a valid JSON string when a body is required
- dataOptions.raw.language MUST be "json"

HEADER RULES:

- headers MUST always be a properly structured array.
- Include realistic HTTP headers.
- Do not include duplicate header keys.

STRICT BEHAVIORAL RULES:

- Generate only requests directly supported by the provided requirements.
- Do not invent endpoints.
- Do not generate test cases.
- Do not generate metadata.
- Do not describe your reasoning.
- Do not output anything outside the JSON array.

The output must be directly validatable against the provided JSON schema without modification.
"""

TESTCASE_SYSTEM_PROMPT = """
You are a software QA assistant.

Your task is to generate structured test cases that strictly conform to the provided JSON schema for an OllamaChatResponse object.

CRITICAL OUTPUT RULES:

- Output MUST be valid JSON.
- The top-level output MUST be a JSON object with a single key: "testcases".
- "testcases" MUST be a JSON array.
- Each element MUST strictly match the TestCase schema below.
- Do NOT include explanations, comments, markdown, or code fences.
- Do NOT include fields not defined in the schema.
- Do NOT omit required fields.
- If an optional field is not applicable, set it to null.

SCHEMA CONSTRAINTS:

Each TestCase object MUST contain:
- test_case_id: string (unique, e.g. "TC_001")
- title: string (short descriptive title)
- priority: one of "Low" | "Medium" | "High" | "Critical" | null
- module: string describing the feature area, or null
- description: string explaining what is being tested, or null
- pre_conditions: array of strings describing required setup, or null
- test_steps: array of objects, each containing:
    - step_number: integer (1-based)
    - action: string describing what the tester does
    - test_data: string with input data for this step, or null
- expected_result: string describing the expected outcome
- actual_result: empty string ""
- status: "Pending"
- post_conditions: array of strings describing state after test, or null
- metadata: object containing:
    - created_by: "QA_Team"
    - created_date: today's date in "YYYY-MM-DD" format
    - environment: "Staging"

STRICT BEHAVIORAL RULES:

- Derive test cases only from the provided requirements.
- Do not invent functionality not described in the requirements.
- Cover both happy path and edge cases where applicable.
- Do not describe your reasoning.
- Do not output anything outside the JSON object.

The output must be directly validatable against the provided JSON schema without modification.
"""


# Shared async Ollama client configured via application settings
ollama_client = AsyncClient(
    host=settings.OLLAMA_HOST,
    headers={
        "Authorization": f"Bearer {settings.OLLAMA_API_KEY}"
    }
)


async def ollama_init() -> None:
    """
    Initializes the Ollama client by ensuring the required base, embedding, and custom models exist locally.

    If the OLLAMA_API_KEY is set, this function does nothing.

    Otherwise, it checks for the presence of the required models and pulls them from the Ollama cloud if they are missing.
    If the custom model does not exist, it is created with a fixed system prompt.

    Raises:
        RuntimeError: If the Ollama initialization fails for any reason.
    """

    if settings.OLLAMA_API_KEY is not None:
        return None

    # Initialize Ollama by ensuring required base and custom models exist locally
    llm_ok: bool = False      # Tracks presence of base LLM model
    embed_ok: bool = False    # Tracks presence of embedding model
    custom_ok: bool = False   # Tracks presence of derived custom model

    try:
        # Retrieve all locally available models from Ollama
        models = (await ollama_client.list()).models

        if models:
            for model in models:
                name = model.model
                if name == settings.LOCAL_LLM_MODEL:
                    llm_ok = True
                if name == settings.LOCAL_EMBED_MODEL:
                    embed_ok = True
                if name == settings.CUSTOM_LLM_MODEL:
                    custom_ok = True

                # Exit early once all required models are confirmed
                if llm_ok and embed_ok and custom_ok:
                    break

        # Pull missing base LLM model
        if not llm_ok:
            await ollama_client.pull(model=str(settings.LOCAL_LLM_MODEL))

        # Pull missing embedding model
        if not embed_ok:
            await ollama_client.pull(model=str(settings.LOCAL_EMBED_MODEL))

        # Create the custom model with a fixed system prompt if it does not exist
        if not custom_ok:
            await ollama_client.create(
                model=str(settings.CUSTOM_LLM_MODEL),
                from_=str(settings.LOCAL_LLM_MODEL),
                system=SWD_MODEL_SYSTEM_PROMPT
            )
    except Exception as e:
        # Log stack trace for diagnostics and propagate a domain-specific failure
        traceback.print_exc()
        raise RuntimeError(f"Ollama Initialization Failed: {e}")

    return None


async def get_ollama_model() -> str:
    """
    Resolve the LLM model name based on Ollama authentication configuration.

    If no Ollama API key is provided, the function returns the name of the local LLM model.
    Otherwise, it returns the name of the local LLM model.

    Returns:
        str: The name of the LLM model to use.
    """

    # Resolve the LLM model name based on Ollama authentication configuration
    if settings.OLLAMA_API_KEY is not None:
        return settings.LOCAL_LLM_MODEL

    return settings.CUSTOM_LLM_MODEL


async def ollama_healthcheck() -> None:
    """
    Check the health status of the OLLAMA server.
    This function will raise a RuntimeError if the OLLAMA server is not reachable.
    """

    # Perform a lightweight HTTP reachability check against the Ollama API
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.OLLAMA_HOST}/api/tags")
        response.raise_for_status()


async def local_llm_chat(prompt: List[str], think: Optional[bool]) -> List[PostmanRequest]:
    """
    Interact with the local OLLAMA server to generate testcases from provided requirements.

    Args:
        prompt (List[str]): A list of strings representing the software requirements to be analyzed.
        think (Optional[bool]): A boolean indicating whether the LLM should generate a single function or a code block based on the requirements.

    Returns:
        ChatResponse: A structured response validated by the OllamaChatResponse schema containing the generated testcases.

    Raises:
        ValueError: If the local LLM returns no response.
    """

    schema = TypeAdapter(List[PostmanRequest])

    # Send user requirements to the custom Ollama model and enforce schema-valid JSON output
    response = await ollama_client.chat(
        model=await get_ollama_model(),
        messages=[
            {
                "role": "system",
                "content": SWD_MODEL_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": f"Requirements: \n{prompt}"
            }
        ],
        tools=None,
        stream=False,
        think=think,
        format=schema.json_schema()
    )

    # Fail fast if the LLM returns no response
    if response is None or not response.message or not response.message.content:
        raise ValueError("No Local LLM Response from Core LLM")

    requests_list = schema.validate_json(response.message.content)

    # Return structured response
    return requests_list


async def local_llm_chat_testcases(prompt: List[str], think: Optional[bool]) -> OllamaChatResponse:
    """
    Interact with the local Ollama server to generate structured QA test cases
    from provided requirements.

    Args:
        prompt (List[str]): A list of software requirement strings to analyze.
        think (Optional[bool]): Whether to enable the model's reasoning mode.

    Returns:
        OllamaChatResponse: Validated response containing a list of test cases.

    Raises:
        ValueError: If the local LLM returns no response or empty content.
    """

    schema = TypeAdapter(OllamaChatResponse)

    response = await ollama_client.chat(
        model=await get_ollama_model(),
        messages=[
            {
                "role": "system",
                "content": TESTCASE_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": f"Requirements: \n{prompt}"
            }
        ],
        tools=None,
        stream=False,
        think=think,
        format=schema.json_schema()
    )

    if not response or not response.message or not response.message.content:
        raise ValueError("No Local LLM Response from Core LLM")

    return schema.validate_json(response.message.content)
