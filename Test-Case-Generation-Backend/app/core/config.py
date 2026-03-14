# Configuration management
from pydantic_settings import BaseSettings
import os
import secrets
from typing import Optional
from dotenv import load_dotenv


# Load environment variables from .env into process environment
load_dotenv()


class Settings(BaseSettings):
    # FastAPI settings
    FASTAPI_SECRET_KEY: str = os.getenv("FASTAPI_SECRET_KEY") or secrets.token_hex(32)
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "123")

    # LLM settings
    OLLAMA_HOST: str = os.getenv(
        "OLLAMA_HOST", 'http://localhost:11434')
    OLLAMA_API_KEY: Optional[str] = os.getenv("OLLAMA_API_KEY")
    LOCAL_LLM_MODEL: str = os.getenv(
        "LOCAL_LLM_MODEL", 'tinyllama:latest')
    LOCAL_EMBED_MODEL: str = os.getenv(
        "LOCAL_EMBED_MODEL", 'nomic-embed-text:latest')
    CUSTOM_LLM_MODEL: str = os.getenv(
        "CUSTOM_LLM_MODEL", 'swd-model:latest')

    # Database settings
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY")

    # Cache settings
    REDIS_USERNAME: Optional[str] = os.getenv("REDIS_USERNAME")
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    REDIS_HOST: str = os.getenv("REDIS_HOST", 'localhost')
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))

    # Jira settings
    JIRA_CLIENT_ID: Optional[str] = os.getenv("JIRA_CLIENT_ID")
    JIRA_SECRET: Optional[str] = os.getenv("JIRA_SECRET")
    JIRA_REDIRECT_URL: Optional[str] = os.getenv("JIRA_REDIRECT_URL")


# Singleton settings instance shared across the application
settings = Settings()
