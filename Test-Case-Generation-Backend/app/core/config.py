# Configuration management
from pydantic_settings import BaseSettings
import os
from typing import Optional, List
from dotenv import load_dotenv


# Load environment variables from .env into process environment
load_dotenv()


class Settings(BaseSettings):
    # FastAPI settings
    FASTAPI_SECRET_KEY: Optional[str] = os.getenv("FASTAPI_SECRET_KEY")

    # Frontend / mobile redirect settings
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    MOBILE_SCHEME: str = os.getenv("MOBILE_SCHEME", "testgenai")

    # CORS origins (comma-separated in env)
    CORS_ORIGINS: List[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:8081,http://localhost:19006",
        ).split(",")
        if o.strip()
    ]

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
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")

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
