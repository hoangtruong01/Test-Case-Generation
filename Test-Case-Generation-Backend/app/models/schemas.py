#  This file is for defining the models within the schemas

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class GenericResponse(BaseModel):
    detail: str


class AdminAuthResponse(BaseModel):
    redirect_url: str
    token: Optional[str] = None


class AdminAuthRequest(BaseModel):
    username: str
    password: str


class JiraAuthResponse(BaseModel):
    redirect_url: str


class PostmanAPIKeyRequest(BaseModel):
    api_key: str


class TokenResponse(BaseModel):
    token: str


# Admin — user management
class AdminUserView(BaseModel):
    id: str
    user: str
    is_token_expired: bool
    is_banned: bool
    last_logged_in: Optional[datetime] = None


class AdminUserListResponse(BaseModel):
    users: List[AdminUserView]


# Admin — testcase view
class AdminTestcaseView(BaseModel):
    id: str
    user: Optional[str] = None
    jira_project_name: Optional[str] = None
    created_at: datetime
    testcase_count: int
    testsuite: Optional[List[dict]] = None


class AdminTestcaseListResponse(BaseModel):
    testcases: List[AdminTestcaseView]


class AdminBanRequest(BaseModel):
    user_id: str
