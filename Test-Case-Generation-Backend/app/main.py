# Application entry point and composition root

from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.routes import llm, system, srs, auth, export, postman
from starlette.middleware.sessions import SessionMiddleware
from app.core.config import settings
from app.core.llm import ollama_init
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize external dependencies during application startup
    await ollama_init()
    yield


# FastAPI application instance with managed startup/shutdown lifecycle
app = FastAPI(
    title="AI Testcase Generation, Monitoring and Execution",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Session middleware for stateful authentication and user context
app.add_middleware(
    SessionMiddleware,
    secret_key=str(settings.FASTAPI_SECRET_KEY),
    same_site="lax",
    # https_only=False,  # True in production with HTTPS
)

# System health endpoints
app.include_router(system.router, tags=["System"])

# Jira and SRS integration endpoints
app.include_router(srs.router, tags=["Jira Services"], prefix="/jira")

# Authentication and authorization endpoints
app.include_router(auth.router, tags=["Authentication and Authorization"])

# LLM-driven testcase generation endpoints
app.include_router(llm.router, tags=["LLM"])

# Testcase export endpoints
app.include_router(export.router, tags=["Export"], deprecated=True)

app.include_router(postman.router, tags=["Postman"], prefix="/postman")
