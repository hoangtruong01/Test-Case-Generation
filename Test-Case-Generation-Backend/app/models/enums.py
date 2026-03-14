from enum import Enum

# ====================OLLAMA ENUMS==============================================


class OllamaChatResponsePropertiesType(Enum):
    FUNCTIONAL = "functional"
    REGRESSION = "regression"
    SMOKE = "smoke"
    INTEGRATION = "integration"
    PERFORMANCE = "performance"
    SECURITY = "security"


class OllamaChatResponsePropertiesPriority(Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class TestCaseStatus(Enum):
    PENDING = "Pending"
    PASS = "Pass"
    FAIL = "Fail"
    BLOCKED = "Blocked"
    SKIPPED = "Skipped"


class PostmanAgentFrameworks(Enum):
    OPENAI = "openai"
    MISTRAL = "mistral"
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"
    LANGCHAIN = "langchain"
    AUTOGEN = "autogen"


class PostmanLanguages(Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
