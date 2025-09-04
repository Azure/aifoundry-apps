from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class Template(BaseModel):
    id: str
    title: str
    description: str
    tags: List[str]
    languages: List[str]
    models: List[str]
    databases: List[str]
    collection: str
    task: str
    pattern: Optional[str] = None
    github_url: str
    fork_count: int
    star_count: int
    is_featured: bool
    icon: str
    created_at: str

class FilterOptions(BaseModel):
    tasks: List[str]
    languages: List[str]
    collections: List[str]
    models: List[str]
    databases: List[str]
    patterns: List[str]

class LearningResource(BaseModel):
    id: str
    title: str
    description: str
    url: str
    type: str
    icon: str

class CustomizationRequest(BaseModel):
    customer_scenario: str
    brand_theme: str
    primary_color: str
    company_name: str
    industry: str
    use_case: str
    additional_requirements: str
    use_mcp_tools: bool = False
    use_a2a: bool = False
    owner: str = ""
    repo: str = ""

class TaskBreakdownRequest(BaseModel):
    template_id: str
    customization: CustomizationRequest

class TaskBreakdownResponse(BaseModel):
    tasks: List[Dict[str, str]]

class SWEAgentRequest(BaseModel):
    agent_id: str
    api_key: str
    endpoint: Optional[str] = None
    template_id: str
    github_token: Optional[str] = None
    github_pat: Optional[str] = None
    prefer_import: Optional[bool] = False
    customization: CustomizationRequest
    task_id: Optional[str] = None
    # Optional task payload when assigning a specific task
    task_details: Optional[Dict[str, Any]] = None
    mode: str = "breakdown"

class Spec(BaseModel):
    id: str
    title: str
    description: str
    content: str
    created_at: str
    updated_at: str
    tags: List[str]
    # Spec-kit phases
    phase: str = "specification"  # specification, plan, tasks, completed
    specification: Optional[str] = None  # Requirements and what to build
    plan: Optional[str] = None  # Technical implementation plan
    tasks: Optional[List[Dict[str, Any]]] = None  # Actionable implementation tasks
    branch_name: Optional[str] = None  # Git branch for this spec
    feature_number: Optional[str] = None  # Unique feature number
    version: int = 1
    constitutional_compliance: Dict[str, Any] = {}
    # Spec-kit metadata
    tech_stack: Optional[str] = None
    architecture: Optional[str] = None
    constraints: Optional[str] = None

class SpecCreateRequest(BaseModel):
    title: str
    description: str
    content: str
    tags: List[str] = []

class SpecifyRequest(BaseModel):
    requirements: str
    context: Optional[str] = None

class PlanRequest(BaseModel):
    tech_stack: str
    architecture: Optional[str] = None
    constraints: Optional[str] = None

class TasksRequest(BaseModel):
    mode: str = "breakdown"  # breakdown or oneshot

class ConstitutionalValidationRequest(BaseModel):
    plan: str
    tech_stack: str
    architecture: Optional[str] = None

class ConstitutionalValidationResponse(BaseModel):
    is_compliant: bool
    violations: List[Dict[str, str]]
    recommendations: List[str]
    gates_passed: Dict[str, bool]

class SpecKitInitRequest(BaseModel):
    project_name: str
    ai_agent: str = "claude"  # claude, gemini, copilot
    initialize_here: bool = False
    skip_agent_tools: bool = False
    skip_git: bool = False

class SystemCheckResponse(BaseModel):
    status: str
    checks: Dict[str, bool]
    messages: List[str]
