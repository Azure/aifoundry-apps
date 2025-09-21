from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class PlanningInfo(BaseModel):
    tech_stack: Optional[str] = None
    architecture: Optional[str] = None
    non_functional_requirements: Optional[str] = None
    gates: Optional[Dict[str, bool]] = None

class PlanTemplate(BaseModel):
    technical_context: Optional[Dict[str, str]] = None
    constitution_check: Optional[Dict[str, Any]] = None
    project_structure: Optional[Dict[str, Any]] = None
    research_content: Optional[str] = None
    data_model_content: Optional[str] = None
    contracts_content: Optional[str] = None
    quickstart_content: Optional[str] = None
    complexity_tracking: Optional[Dict[str, Any]] = None
    progress_tracking: Optional[Dict[str, Any]] = None

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
    planning: Optional[PlanningInfo] = None

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

class SpecAssignmentRequest(BaseModel):
    agent_id: str
    api_key: str
    endpoint: Optional[str] = None
    github_token: Optional[str] = None
    github_pat: Optional[str] = None
    prefer_import: Optional[bool] = False
    customization: CustomizationRequest
    selected_tasks: List[str] = []
    workflow_mode: str = "breakdown"
    task_details: Optional[Dict[str, Any]] = None

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
    plan_template: Optional[PlanTemplate] = None  # Structured plan template data
    tasks: Optional[List[Dict[str, Any]]] = None  # Actionable implementation tasks
    branch_name: Optional[str] = None  # Git branch for this spec
    feature_number: Optional[str] = None  # Unique feature number
    version: int = 1
    constitutional_compliance: Dict[str, Any] = {}
    # Spec-kit metadata
    tech_stack: Optional[str] = None
    architecture: Optional[str] = None
    constraints: Optional[str] = None
    # Template planning data
    planning: Optional[PlanningInfo] = None

class SpecCreateRequest(BaseModel):
    title: str
    description: str
    content: str
    tags: List[str] = []

class SpecifyRequest(BaseModel):
    requirements: str
    context: Optional[str] = None
    template_id: Optional[str] = None

class PlanRequest(BaseModel):
    tech_stack: str
    architecture: Optional[str] = None
    constraints: Optional[str] = None
    specification: Optional[str] = None
    constitution_gates: Optional[Dict[str, bool]] = None
    use_mcp_tools: Optional[bool] = False
    use_a2a: Optional[bool] = False

class ConstitutionData(BaseModel):
    tech_stack: Optional[str] = None
    architecture: Optional[str] = None
    constraints: Optional[str] = None
    gates: Optional[Dict[str, bool]] = None

class DevelopmentOptions(BaseModel):
    use_mcp_tools: Optional[bool] = False
    use_a2a: Optional[bool] = False
    ai_preference: Optional[str] = "copilot"
    ignore_agent_tools: Optional[bool] = False

class TemplateContext(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    planning: Optional[PlanningInfo] = None

class TasksRequest(BaseModel):
    mode: str = "breakdown"  # breakdown or oneshot
    specification: Optional[str] = None
    plan: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    constitution: Optional[ConstitutionData] = None
    development_options: Optional[DevelopmentOptions] = None
    template_context: Optional[TemplateContext] = None
    research: Optional[str] = None
    data_model: Optional[str] = None
    contracts: Optional[str] = None

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

class ConstitutionPopulateRequest(BaseModel):
    project_name: str
    project_description: str
    tech_stack: Optional[str] = ""

class ConstitutionPopulateResponse(BaseModel):
    status: str
    constitution: str
    message: str

class DatasetSearchRequest(BaseModel):
    query: str
    uploaded_file: Optional[str] = None

class DatasetSearchResponse(BaseModel):
    datasets: List[Dict[str, Any]]

class HyperParameters(BaseModel):
    learning_rate: float = 5e-5
    batch_size: int = 4
    num_epochs: int = 3
    max_seq_length: int = 2048
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.1
    warmup_steps: int = 100
    grpo_beta: float = 0.1
    grpo_group_size: int = 64

class NotebookGenerationRequest(BaseModel):
    dataset: Dict[str, Any]
    hyperparameters: HyperParameters

class NotebookGenerationResponse(BaseModel):
    notebook_content: str
    filename: str
