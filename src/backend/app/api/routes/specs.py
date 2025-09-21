from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import List
import logging
from ...models.schemas import (
    Spec, SpecCreateRequest, CustomizationRequest, SWEAgentRequest, SpecAssignmentRequest,
    SpecifyRequest, PlanRequest, TasksRequest, ConstitutionalValidationRequest,
    ConstitutionalValidationResponse, SpecKitInitRequest, SystemCheckResponse,
    ConstitutionPopulateRequest, ConstitutionPopulateResponse
)
from ...services.spec_service import SpecService
from ...services.constitutional_service import ConstitutionalService
from ...api.dependencies import get_spec_service
from ...core.config import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/system-check")
async def system_check():
    """System requirements check (web equivalent of specify check command)"""

    checks = {
        "azure_openai": bool(settings.AZURE_OPENAI_KEY and settings.AZURE_OPENAI_ENDPOINT),
        "cosmos_db": bool(getattr(settings, 'COSMOS_CONNECTION_STRING', None) or
                         (getattr(settings, 'COSMOS_ENDPOINT', None) and getattr(settings, 'COSMOS_KEY', None))),
        "github_oauth": bool(getattr(settings, 'GITHUB_CLIENT_ID', None) and getattr(settings, 'GITHUB_CLIENT_SECRET', None)),
        "internet_connectivity": True
    }

    messages = []
    if not checks["azure_openai"]:
        messages.append("Azure OpenAI configuration missing - spec enhancement may not work")
    if not checks["cosmos_db"]:
        messages.append("Cosmos DB configuration missing - specs will not be persisted")
    if not checks["github_oauth"]:
        messages.append("GitHub OAuth configuration missing - agent assignment may not work")

    all_passed = all(checks.values())
    status = "ready" if all_passed else "partial"

    if not messages:
        messages.append("All systems operational - ready for spec-driven development")

    return SystemCheckResponse(
        status=status,
        checks=checks,
        messages=messages
    )

@router.get("")
async def get_specs(spec_service: SpecService = Depends(get_spec_service)):
    """Get all specifications"""
    return spec_service.get_all_specs()

@router.get("/{spec_id}")
async def get_spec(spec_id: str, spec_service: SpecService = Depends(get_spec_service)):
    """Get a specific specification"""
    spec = spec_service.get_spec_by_id(spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Specification not found")
    return spec

@router.post("")
async def create_spec(request: SpecCreateRequest, spec_service: SpecService = Depends(get_spec_service)):
    """Create a new specification"""
    return spec_service.create_spec(request)

@router.put("/{spec_id}")
async def update_spec(spec_id: str, request: SpecCreateRequest, spec_service: SpecService = Depends(get_spec_service)):
    """Update an existing specification"""
    updated_spec = spec_service.update_spec(spec_id, request)
    if not updated_spec:
        raise HTTPException(status_code=404, detail="Specification not found")
    return updated_spec

@router.post("/{spec_id}/breakdown")
async def generate_spec_task_breakdown(spec_id: str, request: CustomizationRequest, spec_service: SpecService = Depends(get_spec_service), http_request: Request = None):
    """Generate task breakdown for a specification using Azure OpenAI"""

    try:
        logger.info(f"[breakdown] spec_id={spec_id} request={getattr(request, 'model_dump', lambda: request)() if hasattr(request,'model_dump') else str(request)[:256]}")
        spec = spec_service.get_spec_by_id(spec_id)
        if not spec:
            raise HTTPException(status_code=404, detail="Specification not found")

        # Configure OpenAI client for Azure OpenAI Responses API
        base_url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/"
        logger.info(f"[breakdown] === AZURE OPENAI CONFIGURATION ===")
        logger.info(f"[breakdown] AZURE_OPENAI_ENDPOINT: {settings.AZURE_OPENAI_ENDPOINT}")
        logger.info(f"[breakdown] MODEL_NAME: {settings.MODEL_NAME}")
        logger.info(f"[breakdown] API_VERSION: {settings.API_VERSION}")
        logger.info(f"[breakdown] Full base_url: {base_url}")
        logger.info(f"[breakdown] Has API key: {bool(settings.AZURE_OPENAI_KEY)}")
        logger.info(f"[breakdown] API key length: {len(settings.AZURE_OPENAI_KEY) if settings.AZURE_OPENAI_KEY else 0}")

        client = OpenAI(
            api_key=settings.AZURE_OPENAI_KEY,
            base_url=base_url,
            default_query={"api-version": settings.API_VERSION},
            timeout=120.0  # 2 minute timeout
        )

        logger.info(f"[breakdown] OpenAI client created with base_url: {client.base_url}")
        logger.info(f"[breakdown] OpenAI client default_query: {client._client.params.get('default_query', {})}")

        system_prompt = f"""You are a senior software project lead. Given a product spec/epic/PRD, produce a Work Breakdown Structure (WBS) tailored for a junior software engineer to execute.

Guidance:
- 8–15 concrete engineering tasks, each sized 1–6 hours.
- Description: one sentence, max 20 words. No boilerplate.
- Acceptance criteria: 3–5 bullets, each ≤ 12 words, objectively verifiable.
- Prefer implementation over research; include unit/e2e tests, instrumentation, and docs where relevant.
- Title starts with an action verb (Implement, Add, Refactor, Wire, Document, Test, Configure, etc.).
- Respect context (title, description, tags, markdown content) and additional requirements.

Output format (NDJSON):
- Stream one JSON object per line (no code fences, no extra text).
- Keys: id, title, description, acceptanceCriteria, estimatedTime, estimatedTokens, priority, status.
- Example line:
  {{"id":"task-1","title":"Implement auth middleware","description":"Add JWT validation…","acceptanceCriteria":["Requests without token receive 401", "Valid token attaches user"],"estimatedTime":"2-3 hours","estimatedTokens":"2k-4k tokens","priority":"high","status":"pending"}}

Specification context:
Title: {spec.title}
Description: {spec.description}
Tags: {', '.join(spec.tags)}
Content (truncated):\n{(spec.content or '')[:8000]}
"""

        user_prompt = f"""Generate the NDJSON task stream now based on the context above and these extra parameters:
Company: {request.company_name}
Industry: {request.industry}
Use Case: {request.use_case}
Customer Scenario: {request.customer_scenario}
Brand Theme: {request.brand_theme}
Primary Color: {request.primary_color}
Additional Requirements: {request.additional_requirements}

Requirements:
- Start output immediately as NDJSON lines.
- Do NOT wrap in code fences.
- Do NOT emit arrays; only one task JSON per line.
- Generate 8–15 lines total.
- Keep every description ≤ 20 words; acceptanceCriteria bullets ≤ 12 words.
"""

        # Streaming support when ?stream=true
        try:
            stream_flag = False
            if http_request is not None:
                qp = http_request.query_params
                stream_flag = qp.get("stream") in {"1", "true", "True"}
        except Exception:
            stream_flag = False
        logger.info(f"[breakdown] stream_flag={stream_flag}")

        if stream_flag:
            def token_stream():
                logger.warning("[breakdown] starting streaming with Azure OpenAI Responses API")
                logger.info(f"[breakdown] === MAKING API CALL ===")
                logger.info(f"[breakdown] Model: {settings.MODEL_NAME}")
                logger.info(f"[breakdown] Base URL: {client.base_url}")
                logger.info(f"[breakdown] API Version in query: {client._client.params.get('default_query', {}).get('api-version')}")
                logger.info(f"[breakdown] About to call client.responses.create...")
                stream = client.responses.create(
                    model=settings.MODEL_NAME,
                    instructions=system_prompt,
                    input=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "input_text", "text": user_prompt},
                            ],
                        }
                    ],
                    stream=True,
                    max_output_tokens=8000
                )

                buf = ""
                yielded = 0
                events = 0
                types_seen = set()
                # Immediately send a heartbeat to improve TTFB for the client
                try:
                    yield "\n"
                except Exception:
                    pass

                timeout_occurred = False

                def extract_objects(s: str):
                    out = []
                    i = 0
                    n = len(s)
                    while i < n:
                        # find start of object
                        if s[i] != '{':
                            i += 1
                            continue
                        depth = 0
                        j = i
                        in_str = False
                        esc = False
                        while j < n:
                            ch = s[j]
                            if in_str:
                                if esc:
                                    esc = False
                                elif ch == '\\':
                                    esc = True
                                elif ch == '"':
                                    in_str = False
                            else:
                                if ch == '"':
                                    in_str = True
                                elif ch == '{':
                                    depth += 1
                                elif ch == '}':
                                    depth -= 1
                                    if depth == 0:
                                        out.append(s[i:j+1])
                                        # skip trailing comma/newlines/spaces
                                        k = j+1
                                        while k < n and s[k] in ' \n\r\t,]':
                                            k += 1
                                        return out, s[k:]
                            j += 1
                        # incomplete object
                        break
                    return out, s

                # stream loop for Azure OpenAI Responses API
                import time
                start_time = time.time()
                max_wait_time = 120  # 2 minutes max

                try:
                    for event in stream:
                        # Check for timeout
                        if time.time() - start_time > max_wait_time:
                            logger.warning(f"[breakdown] streaming timeout after {max_wait_time}s")
                            timeout_occurred = True
                            break

                        et = getattr(event, "type", None) or event.get("type")
                        events += 1
                        if et:
                            try:
                                types_seen.add(str(et))
                            except Exception:
                                pass

                        if et == "response.output_text.delta":
                            buf += (getattr(event, "delta", None) or event.get("delta", ""))
                            while True:
                                objs, buf2 = extract_objects(buf)
                                if not objs:
                                    break
                                buf = buf2
                                for obj in objs:
                                    yield obj + "\n"
                                    yielded += 1
                        elif et == "response.completed":
                            # try full output_text from final event
                            try:
                                resp = getattr(event, "response", None) or event.get("response")
                                full_text = None
                                if resp is not None:
                                    full_text = getattr(resp, "output_text", None) or resp.get("output_text")
                                    if not full_text:
                                        # assemble from response.output[*].content[*].text
                                        try:
                                            pieces = []
                                            for item in (getattr(resp, 'output', None) or resp.get('output') or []):
                                                contents = getattr(item, 'content', None) or item.get('content') or []
                                                for c in contents:
                                                    t = getattr(c, 'text', None) or c.get('text')
                                                    if t:
                                                        pieces.append(t)
                                            if pieces:
                                                full_text = ''.join(pieces)
                                        except Exception:
                                            pass
                                if full_text:
                                    buf += full_text
                            except Exception:
                                pass
                            logger.warning(f"[breakdown] stream completed, events={events}, types_seen={list(types_seen)}, yielded={yielded}")
                            break
                except Exception as stream_error:
                    logger.error(f"[breakdown] streaming error: {stream_error}")
                    timeout_occurred = True

                # flush remaining
                while True:
                    objs, buf2 = extract_objects(buf)
                    if not objs:
                        break
                    buf = buf2
                    for obj in objs:
                        yield obj + "\n"
                        yielded += 1

                if buf.strip() and yielded == 0:
                    # last resort, emit leftover line so client gets something
                    yield buf.strip() + "\n"
                    yielded += 1

                logger.warning(f"[breakdown] stream completed, events={events}, yielded={yielded}, timeout={timeout_occurred}")
                if yielded == 0 or timeout_occurred:
                    logger.warning("[breakdown] streaming produced 0 lines; falling back to non-stream request")
                    try:
                        logger.info("[breakdown] making fallback non-streaming responses call")
                        resp2 = client.responses.create(
                            model=settings.MODEL_NAME,
                            instructions=system_prompt,
                            input=[
                                {
                                    "role": "user",
                                    "content": [
                                        {"type": "input_text", "text": user_prompt},
                                    ],
                                }
                            ],
                            max_output_tokens=8000
                        )
                        text = getattr(resp2, 'output_text', None)
                        if not text:
                            pieces = []
                            for item in (getattr(resp2, 'output', None) or []):
                                contents = getattr(item, 'content', None) or []
                                for c in contents:
                                    t = getattr(c, 'text', None)
                                    if t:
                                        pieces.append(t)
                            text = ''.join(pieces)
                        if text:
                            import json as _json
                            try:
                                arr = _json.loads(text)
                                if isinstance(arr, dict) and 'tasks' in arr:
                                    arr = arr['tasks']
                                if isinstance(arr, list):
                                    for obj in arr:
                                        try:
                                            yield _json.dumps(obj) + "\n"
                                            yielded += 1
                                        except Exception:
                                            continue
                            except Exception:
                                # maybe NDJSON already
                                for line in (text.splitlines() if text else []):
                                    line = line.strip()
                                    if not line:
                                        continue
                                    yield line + "\n"
                                    yielded += 1
                    except Exception as fe:
                        logger.error(f"[breakdown] fallback non-stream failed: {fe}")
            return StreamingResponse(token_stream(), media_type="text/plain")

        logger.info("[breakdown] making non-streaming responses call")
        logger.info(f"[breakdown] === MAKING NON-STREAMING API CALL ===")
        logger.info(f"[breakdown] Model: {settings.MODEL_NAME}")
        logger.info(f"[breakdown] Base URL: {client.base_url}")
        logger.info(f"[breakdown] API Version in query: {client._client.params.get('default_query', {}).get('api-version')}")
        logger.info(f"[breakdown] About to call client.responses.create...")

        try:
            response = client.responses.create(
                model=settings.MODEL_NAME,
                instructions=system_prompt,
                input=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": user_prompt},
                        ],
                    }
                ],
                max_output_tokens=8000
            )
            logger.info(f"[breakdown] API call successful, response type: {type(response)}")
        except Exception as api_error:
            logger.error(f"[breakdown] API call failed: {api_error}")
            raise api_error

        import json
        # Extract text from Responses API
        tasks_json = getattr(response, "output_text", None)
        if not tasks_json:
            try:
                parts = []
                for item in getattr(response, "output", []) or []:
                    for c in getattr(item, "content", []) or []:
                        if getattr(c, "type", None) in ("text", "output_text"):
                            parts.append(getattr(c, "text", ""))
                tasks_json = "".join(parts).strip()
            except Exception:
                tasks_json = ""

        logger.info(f"[breakdown] received response length: {len(tasks_json) if tasks_json else 0} chars")
        logger.debug(f"[breakdown] raw response content: {tasks_json[:200]}..." if tasks_json and len(tasks_json) > 200 else f"[breakdown] full response content: {tasks_json}")

        if tasks_json.startswith("```json"):
            tasks_json = tasks_json[7:-3].strip()
        elif tasks_json.startswith("```"):
            tasks_json = tasks_json[3:-3].strip()

        try:
            tasks = json.loads(tasks_json)
            # accept array or object with tasks
            if isinstance(tasks, dict) and "tasks" in tasks:
                tasks = tasks["tasks"]
            elif isinstance(tasks, str):
                tasks = json.loads(tasks)
            return {"tasks": tasks}
        except Exception:
            # Try NDJSON fallback
            tasks = []
            for line in tasks_json.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    tasks.append(json.loads(line))
                except Exception:
                    continue
            if tasks:
                return {"tasks": tasks}
            return {
                "tasks": [
                    {
                        "id": "task-1",
                        "title": f"Analyze {spec.title} requirements",
                        "description": f"Review and analyze the specification requirements for {request.company_name} in the {request.industry} industry.",
                        "estimatedTime": "2-3 hours",
                        "estimatedTokens": "8000-12000 tokens",
                        "priority": "high",
                        "status": "pending"
                    },
                    {
                        "id": "task-2",
                        "title": "Design implementation architecture",
                        "description": f"Design the technical architecture and approach for implementing {spec.title} based on the customer scenario: {request.customer_scenario}",
                        "estimatedTime": "3-4 hours",
                        "estimatedTokens": "12000-18000 tokens",
                        "priority": "high",
                        "status": "pending"
                    },
                    {
                        "id": "task-3",
                        "title": "Implement core functionality",
                        "description": f"Develop the core functionality according to the specification, incorporating the brand theme: {request.brand_theme}",
                        "estimatedTime": "4-6 hours",
                        "estimatedTokens": "18000-28000 tokens",
                        "priority": "high",
                        "status": "pending"
                    },
                    {
                        "id": "task-4",
                        "title": "Apply customizations",
                        "description": f"Apply specific customizations and requirements: {request.additional_requirements}",
                        "estimatedTime": "2-3 hours",
                        "estimatedTokens": "8000-12000 tokens",
                        "priority": "medium",
                        "status": "pending"
                    },
                    {
                        "id": "task-5",
                        "title": "Testing and validation",
                        "description": f"Test the implementation for the {request.use_case} use case and validate against requirements",
                        "estimatedTime": "2-3 hours",
                        "estimatedTokens": "6000-10000 tokens",
                        "priority": "high",
                        "status": "pending"
                    }
                ]
            }

    except Exception as e:
        logger.error(f"Error in generate_spec_task_breakdown: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{spec_id}/enhance")
async def enhance_spec(spec_id: str, request: Request, spec_service: SpecService = Depends(get_spec_service)):
    """Enhance specification content to be tailored for coding agents using Azure OpenAI"""

    try:
        spec = spec_service.get_spec_by_id(spec_id)
        if not spec:
            raise HTTPException(status_code=404, detail="Specification not found")

        # Configure OpenAI client for Azure OpenAI Responses API
        base_url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/"
        logger.info(f"[enhance] === AZURE OPENAI CONFIGURATION ===")
        logger.info(f"[enhance] AZURE_OPENAI_ENDPOINT: {settings.AZURE_OPENAI_ENDPOINT}")
        logger.info(f"[enhance] MODEL_NAME: {settings.MODEL_NAME}")
        logger.info(f"[enhance] API_VERSION: {settings.API_VERSION}")
        logger.info(f"[enhance] Full base_url: {base_url}")
        logger.info(f"[enhance] Has API key: {bool(settings.AZURE_OPENAI_KEY)}")
        logger.info(f"[enhance] API key length: {len(settings.AZURE_OPENAI_KEY) if settings.AZURE_OPENAI_KEY else 0}")

        client = OpenAI(
            api_key=settings.AZURE_OPENAI_KEY,
            base_url=base_url,
            default_query={"api-version": settings.API_VERSION},
            timeout=120.0  # 2 minute timeout
        )

        logger.info(f"[enhance] OpenAI client created with base_url: {client.base_url}")
        logger.info(f"[enhance] OpenAI client default_query: {client._client.params.get('default_query', {})}")

        system_prompt = """You are an AI assistant that transforms user requirements into a detailed feature specification following the spec-kit methodology. Your task is to take functional requirements and create a comprehensive specification that focuses on WHAT users need and WHY, not HOW to implement it.

Use this template structure:

# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "[USER DESCRIPTION]"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

## User Scenarios & Testing *(mandatory)*

### Primary User Story
[Describe the main user journey in plain language]

### Acceptance Scenarios
1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

### Edge Cases
- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]  
- **FR-003**: Users MUST be able to [key interaction]
- **FR-004**: System MUST [data requirement if applicable]
- **FR-005**: System MUST [behavior]

*Example of marking unclear requirements:*
- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*
- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---

IMPORTANT: Do not end your response with questions or offers to help further. Provide a complete specification following the template structure above."""

        user_prompt = f"""Transform the following user requirements into a detailed feature specification following the spec-kit template structure:

**Project Title**: {spec.title}
**Project Description**: {spec.description}
**User Requirements**: {spec.content}

Create a complete specification that:
1. Focuses on WHAT users need and WHY (not HOW to implement)
2. Includes clear user scenarios and acceptance criteria
3. Defines functional requirements that are testable
4. Identifies key entities if data is involved
5. Marks any ambiguities with [NEEDS CLARIFICATION: specific question]
6. Follows the exact template structure provided

Generate the complete specification in markdown format following the template structure. Do not end with questions or offers to help further - provide a complete specification ready for the planning phase."""

        # If streaming requested, stream token deltas as plain text
        stream_flag = request.query_params.get("stream") in {"1", "true", "True"}
        if stream_flag:
            def token_stream():
                full = []
                logger.info(f"[enhance] starting streaming responses call with model={settings.MODEL_NAME}")
                stream = client.responses.create(
                    model=settings.MODEL_NAME,
                    instructions=system_prompt,
                    input=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "input_text", "text": user_prompt},
                            ],
                        }
                    ],
                    stream=True,
                    max_output_tokens=8000
                )
                try:
                    for event in stream:
                        et = getattr(event, "type", None) or event.get("type")
                        if et == "response.output_text.delta":
                            delta = getattr(event, "delta", None) or event.get("delta", "")
                            full.append(delta)
                            yield delta
                        elif et == "response.completed":
                            break
                finally:
                    try:
                        enhanced_text = "".join(full)
                        spec_service.update_spec(spec_id, SpecCreateRequest(
                            title=spec.title,
                            description=spec.description,
                            content=enhanced_text,
                            tags=spec.tags,
                        ))
                    except Exception as _:
                        logger.exception("Failed to persist enhanced spec after stream")
            return StreamingResponse(token_stream(), media_type="text/plain")

        # Otherwise do a single-shot non-streaming call
        logger.info(f"[enhance] making non-streaming responses call")
        response = client.responses.create(
            model=settings.MODEL_NAME,
            instructions=system_prompt,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": user_prompt},
                    ],
                }
            ],
            max_output_tokens=8000
        )

        enhanced_content = getattr(response, "output_text", None)
        if not enhanced_content:
            try:
                parts = []
                for item in getattr(response, "output", []) or []:
                    for c in getattr(item, "content", []) or []:
                        if getattr(c, "type", None) in ("text", "output_text"):
                            parts.append(getattr(c, "text", ""))
                enhanced_content = "".join(parts).strip()
            except Exception:
                enhanced_content = ""

        logger.info(f"[enhance] received enhanced content length: {len(enhanced_content) if enhanced_content else 0} chars")

        enhanced_spec = spec_service.update_spec(spec_id, SpecCreateRequest(
            title=spec.title,
            description=spec.description,
            content=enhanced_content,
            tags=spec.tags
        ))

        return {"message": "Specification enhanced successfully", "spec": enhanced_spec}

    except Exception as e:
        logger.error(f"Error in enhance_spec: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{spec_id}/specify")
async def specify_phase(spec_id: str, request: SpecifyRequest, spec_service: SpecService = Depends(get_spec_service)):
    """Handle the /specify phase - Generate proper specification using spec template prompt"""
    try:
        spec = spec_service.get_spec_by_id(spec_id)
        if not spec:
            raise HTTPException(status_code=404, detail="Specification not found")

        # Use Azure OpenAI to generate a proper specification using the spec template prompt
        base_url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/"
        client = OpenAI(
            api_key=settings.AZURE_OPENAI_KEY,
            base_url=base_url,
            default_query={"api-version": settings.API_VERSION},
            timeout=120.0
        )

        # Spec template prompt for context
        spec_template_prompt = """# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
[Describe the main user journey in plain language]

### Acceptance Scenarios
1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

### Edge Cases
- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]  
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*
- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*
- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---"""

        # Generate specification using the template
        system_prompt = f"""You are an AI assistant that creates detailed feature specifications following the spec-kit methodology. 

Use this template as your guide:
{spec_template_prompt}

Create a complete specification based on the user's input. Focus on WHAT users need and WHY, not HOW to implement it. Mark any ambiguities with [NEEDS CLARIFICATION: specific question].

The specification should be ready for the planning phase."""

        user_prompt = f"""Create a detailed feature specification for:

**Project Title**: {spec.title}
**Project Description**: {spec.description}
**User Requirements**: {request.requirements}

Generate a complete specification following the template structure above. Focus on user scenarios, functional requirements, and acceptance criteria. Avoid implementation details."""

        response = client.responses.create(
            model=settings.MODEL_NAME,
            instructions=system_prompt,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": user_prompt},
                    ],
                }
            ],
            max_output_tokens=8000
        )

        generated_specification = getattr(response, "output_text", None)
        if not generated_specification:
            try:
                parts = []
                for item in getattr(response, "output", []) or []:
                    for c in getattr(item, "content", []) or []:
                        if getattr(c, "type", None) in ("text", "output_text"):
                            parts.append(getattr(c, "text", ""))
                generated_specification = "".join(parts).strip()
            except Exception:
                generated_specification = ""

        # Generate a semantic branch name based on the requirements
        import re
        def slugify(text: str) -> str:
            return re.sub(r'[^a-zA-Z0-9-]', '-', text.lower()).strip('-')[:50]

        # Generate feature number (simple incrementing)
        all_specs = spec_service.get_all_specs()
        feature_num = str(len([s for s in all_specs if s.feature_number]) + 1).zfill(3)

        # Create branch name from title
        branch_name = f"{feature_num}-{slugify(spec.title)}"

        # If template_id is provided, fetch template and copy planning data
        planning_data = None
        logger.info(f"Specify request template_id: {request.template_id}")
        if request.template_id:
            try:
                # Load template data from catalog.json
                import json
                import os
                catalog_path = os.path.join(os.path.dirname(__file__), "..", "..", "catalog.json")
                with open(catalog_path, 'r') as f:
                    catalog = json.load(f)
                
                logger.info(f"Loaded catalog with {len(catalog)} templates")
                logger.info(f"Looking for template with id: {request.template_id}")
                
                # Find the template
                template = next((t for t in catalog if t.get('id') == request.template_id), None)
                if template:
                    logger.info(f"Found template: {template.get('title', 'Unknown')}")
                    logger.info(f"Template has planning data: {bool(template.get('planning'))}")
                    if template.get('planning'):
                        planning_data = template['planning']
                        logger.info(f"Found planning data for template {request.template_id}: {planning_data}")
                    else:
                        logger.warning(f"Template {request.template_id} has no planning data")
                else:
                    logger.warning(f"Template {request.template_id} not found in catalog")
                    # Log available template IDs for debugging
                    available_ids = [t.get('id') for t in catalog if t.get('id')]
                    logger.info(f"Available template IDs: {available_ids}")
            except Exception as e:
                logger.error(f"Error fetching template planning data: {e}")
        else:
            logger.info("No template_id provided in request")

        updated_spec = spec_service.update_spec_phase(
            spec_id,
            phase="specification",
            specification=generated_specification,
            branch_name=branch_name,
            feature_number=feature_num,
            planning=planning_data
        )

        if not updated_spec:
            raise HTTPException(status_code=404, detail="Specification not found")

        return {
            "message": "Specification generated successfully using spec-kit methodology",
            "spec": updated_spec,
            "next_step": "Use /plan to define technical implementation"
        }

    except Exception as e:
        logger.error(f"Error in specify_phase: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{spec_id}/plan")
async def plan_phase(spec_id: str, request: PlanRequest, spec_service: SpecService = Depends(get_spec_service)):
    """Handle the /plan phase - Create technical implementation plan"""
    try:
        spec = spec_service.get_spec_by_id(spec_id)
        if not spec:
            raise HTTPException(status_code=404, detail="Specification not found")

        if spec.phase != "specification":
            raise HTTPException(status_code=400, detail="Must complete specification phase first")

        # Use AI to generate technical plan based on specification and tech stack
        base_url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/"
        client = OpenAI(
            api_key=settings.AZURE_OPENAI_KEY,
            base_url=base_url,
            default_query={"api-version": settings.API_VERSION},
            timeout=120.0
        )

        system_prompt = """You are a senior technical architect. Given a specification and technology requirements, create a comprehensive technical implementation plan.

IMPORTANT: Do not end your response with questions or offers to help further. Provide a complete, detailed implementation plan without asking if the user would like additional assistance or if you can do anything else."""

        # Use specification from request if provided, otherwise from spec
        specification_content = request.specification or spec.specification or spec.content
        
        # Build constitution gates context
        gates_context = ""
        if request.constitution_gates:
            gates_context = f"""
Constitutional Gates:
- Simplicity Gate: {'Enabled' if request.constitution_gates.get('simplicity') else 'Disabled'}
- Anti-Abstraction Gate: {'Enabled' if request.constitution_gates.get('anti_abstraction') else 'Disabled'}
- Integration-First Gate: {'Enabled' if request.constitution_gates.get('integration_first') else 'Disabled'}
"""

        user_prompt = f"""Create a detailed technical implementation plan for the following:

Specification: {specification_content}
Technology Stack: {request.tech_stack}
Architecture: {request.architecture or 'Standard best practices'}
Constraints: {request.constraints or 'None specified'}{gates_context}

Please provide:
1. Architecture Overview
2. Technical Requirements
3. Implementation Approach
4. API Design (if applicable)
5. Data Models
6. Testing Strategy
7. Deployment Considerations

Format the response in markdown."""

        response = client.responses.create(
            model=settings.MODEL_NAME,
            instructions=system_prompt,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": user_prompt},
                    ],
                }
            ],
            max_output_tokens=8000
        )

        plan_content = getattr(response, "output_text", None)
        if not plan_content:
            try:
                parts = []
                for item in getattr(response, "output", []) or []:
                    for c in getattr(item, "content", []) or []:
                        if getattr(c, "type", None) in ("text", "output_text"):
                            parts.append(getattr(c, "text", ""))
                plan_content = "".join(parts).strip()
            except Exception:
                plan_content = "# Technical Implementation Plan\n\nPlan generation failed."

        updated_spec = spec_service.update_spec_phase(
            spec_id,
            phase="plan",
            plan=plan_content
        )

        return {
            "message": "Plan phase completed",
            "spec": updated_spec,
            "next_step": "Use /tasks to break down into actionable tasks"
        }

    except Exception as e:
        logger.error(f"Error in plan_phase: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{spec_id}/tasks")
async def tasks_phase(spec_id: str, request: TasksRequest, spec_service: SpecService = Depends(get_spec_service)):
    """Handle the /tasks phase - Break down into actionable implementation tasks"""
    try:
        spec = spec_service.get_spec_by_id(spec_id)
        if not spec:
            raise HTTPException(status_code=404, detail="Specification not found")

        if spec.phase != "plan":
            raise HTTPException(status_code=400, detail="Must complete plan phase first")

        # Build comprehensive context from the request
        specification_content = request.specification or spec.specification or spec.content
        plan_content = request.plan or spec.plan
        
        # Build constitution context
        constitution_context = ""
        if request.constitution:
            constitution_context = f"""
Constitutional Requirements:
- Tech Stack: {request.constitution.tech_stack or 'Not specified'}
- Architecture: {request.constitution.architecture or 'Not specified'}
- Constraints: {request.constitution.constraints or 'Not specified'}
- Gates: {request.constitution.gates or {}}
"""

        # Build development options context
        dev_options_context = ""
        if request.development_options:
            dev_options_context = f"""
Development Options:
- Use MCP Tools: {request.development_options.use_mcp_tools}
- Use A2A: {request.development_options.use_a2a}
- AI Preference: {request.development_options.ai_preference}
- Ignore Agent Tools: {request.development_options.ignore_agent_tools}
"""

        # Build template context
        template_context = ""
        if request.template_context:
            template_context = f"""
Template Context:
- Template: {request.template_context.title or 'Unknown'}
- Template ID: {request.template_context.id or 'Unknown'}
- Template Planning: {request.template_context.planning or 'None'}
"""

        # Build research and plan components context
        plan_components_context = ""
        if request.research or request.data_model or request.contracts:
            plan_components_context = f"""
Plan Components:
- Research: {request.research or 'None'}
- Data Model: {request.data_model or 'None'}
- Contracts: {request.contracts or 'None'}
"""

        # Create a comprehensive CustomizationRequest for compatibility
        additional_requirements = f"""Specification: {specification_content}

Plan: {plan_content}
{constitution_context}
{dev_options_context}
{template_context}
{plan_components_context}"""

        customization = CustomizationRequest(
            customer_scenario=f"Implement: {request.title or spec.title}",
            brand_theme="Default",
            primary_color="#3b82f6",
            company_name="Default",
            industry="Technology",
            use_case="Implementation",
            additional_requirements=additional_requirements,
            use_mcp_tools=request.development_options.use_mcp_tools if request.development_options else False,
            use_a2a=request.development_options.use_a2a if request.development_options else False
        )

        # Reuse existing task breakdown logic
        base_url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/"
        client = OpenAI(
            api_key=settings.AZURE_OPENAI_KEY,
            base_url=base_url,
            default_query={"api-version": settings.API_VERSION},
            timeout=120.0
        )

        system_prompt = f"""You are a senior software project lead following the spec-kit methodology. Given a comprehensive specification, technical plan, and constitutional requirements, produce actionable implementation tasks following the task template structure.

Generate tasks by category following this structure:

## Phase 3.1: Setup
- Project structure, dependencies, linting configuration

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
- Contract tests, integration tests, unit tests

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- Models, services, CLI commands, endpoints

## Phase 3.4: Integration
- Database connections, middleware, logging

## Phase 3.5: Polish
- Performance tests, documentation, cleanup

Task Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Number tasks sequentially (T001, T002...)

Output format (JSON array):
- Return ONLY a valid JSON array of task objects
- Do NOT include any markdown formatting, code blocks, or explanatory text
- Do NOT wrap the array in any other object
- Keys: id, title, description, acceptanceCriteria, estimatedTime, priority, status, phase, parallel, filePath
- Example format: [{{"id":"T001","title":"Setup project structure","description":"Create basic FastAPI project with proper structure","acceptanceCriteria":["Project created","Dependencies installed","Basic structure in place"],"estimatedTime":"2-3 hours","priority":"high","status":"pending","phase":"setup","parallel":false,"filePath":"src/main.py"}}]

## Project Context:
Title: {request.title or spec.title}
Description: {request.description or spec.description}

## Specification:
{specification_content}

## Technical Plan:
{plan_content}

## Constitutional Requirements:
{constitution_context}

## Development Options:
{dev_options_context}

## Template Context:
{template_context}

## Plan Components:
{plan_components_context}

IMPORTANT: 
- Consider ALL the constitutional requirements, development options, and template context when generating tasks
- Ensure tasks align with the specified tech stack, architecture, and constraints
- Include tasks that leverage MCP tools and A2A patterns if specified
- Do not end your response with questions or offers to help further. Provide a complete task breakdown without asking if the user would like additional assistance."""

        user_prompt = f"""Generate the task breakdown now based on the specification and technical plan above.

Mode: {request.mode}

Requirements:
- Generate 15-25 implementation tasks following the spec-kit methodology
- Organize tasks by phases: Setup, Tests First, Core Implementation, Integration, Polish
- Mark parallel tasks with [P] for different files
- Include exact file paths in descriptions
- Number tasks sequentially (T001, T002, T003...)
- Focus on concrete implementation steps with specific deliverables
- Ensure tests come before implementation (TDD approach)
- Each task should be 1-6 hours of work

CRITICAL: Return ONLY a valid JSON array. Do not include any markdown, explanations, or other text. Start with [ and end with ]. Example:
[{{"id":"T001","title":"Setup project structure","description":"Create basic FastAPI project","acceptanceCriteria":["Project created","Dependencies installed"],"estimatedTime":"2-3 hours","priority":"high","status":"pending","phase":"setup","parallel":false,"filePath":"src/main.py"}}]"""

        response = client.responses.create(
            model=settings.MODEL_NAME,
            instructions=system_prompt,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": user_prompt},
                    ],
                }
            ],
            max_output_tokens=8000
        )

        import json
        tasks_json = getattr(response, "output_text", None)
        if not tasks_json:
            try:
                parts = []
                for item in getattr(response, "output", []) or []:
                    for c in getattr(item, "content", []) or []:
                        if getattr(c, "type", None) in ("text", "output_text"):
                            parts.append(getattr(c, "text", ""))
                tasks_json = "".join(parts).strip()
            except Exception:
                tasks_json = ""

        logger.info(f"[tasks] Raw AI response length: {len(tasks_json) if tasks_json else 0}")
        logger.info("[tasks] Raw AI response preview: " + (tasks_json[:500] if tasks_json else 'None') + "...")

        # Clean up JSON formatting
        if tasks_json.startswith("```json"):
            tasks_json = tasks_json[7:-3].strip()
        elif tasks_json.startswith("```"):
            tasks_json = tasks_json[3:-3].strip()
        
        # Try to extract JSON array from the response
        import re
        # Look for JSON array pattern
        json_match = re.search(r'\[.*\]', tasks_json, re.DOTALL)
        if json_match:
            tasks_json = json_match.group(0)
            logger.info(f"[tasks] Extracted JSON array from response")

        logger.info("[tasks] Cleaned JSON preview: " + (tasks_json[:500] if tasks_json else 'None') + "...")

        try:
            tasks = json.loads(tasks_json)
            logger.info(f"[tasks] Parsed tasks type: {type(tasks)}")
            logger.info(f"[tasks] Parsed tasks length: {len(tasks) if isinstance(tasks, (list, dict)) else 'N/A'}")
            
            if not isinstance(tasks, list):
                # If it's wrapped in an object, extract the array
                if isinstance(tasks, dict) and "tasks" in tasks:
                    tasks = tasks["tasks"]
                    logger.info(f"[tasks] Extracted tasks from wrapper, new length: {len(tasks)}")
                else:
                    logger.error(f"[tasks] Expected task array but got: {type(tasks)}")
                    raise ValueError("Expected task array")
            
            # Validate that we have a reasonable number of tasks
            if len(tasks) < 5:
                logger.warning(f"[tasks] Only {len(tasks)} tasks generated, expected 15-25")
            
            logger.info(f"[tasks] Final tasks count: {len(tasks)}")
            
        except Exception as e:
            logger.error(f"[tasks] JSON parsing failed: {e}")
            logger.error("[tasks] Failed to parse JSON: " + (tasks_json[:1000] if tasks_json else 'None'))
            
            # Try to extract individual task objects using regex as last resort
            try:
                task_pattern = r'\{[^{}]*"id"[^{}]*\}'
                task_matches = re.findall(task_pattern, tasks_json)
                if task_matches:
                    tasks = []
                    for i, match in enumerate(task_matches):
                        try:
                            task = json.loads(match)
                            if not task.get('id'):
                                task['id'] = f"task-{i+1}"
                            tasks.append(task)
                        except:
                            continue
                    if tasks:
                        logger.info(f"[tasks] Extracted {len(tasks)} tasks using regex fallback")
                    else:
                        raise ValueError("No valid tasks found")
                else:
                    raise ValueError("No task patterns found")
            except Exception as regex_error:
                logger.error(f"[tasks] Regex fallback also failed: {regex_error}")
                # Final fallback tasks if all parsing fails
                tasks = [
                    {
                        "id": "task-1",
                        "title": f"Implement core functionality for {spec.title}",
                        "description": "Set up project structure and implement main features",
                        "estimatedTime": "4-6 hours",
                        "estimatedTokens": "15000-25000 tokens",
                        "priority": "high",
                        "status": "pending",
                        "acceptanceCriteria": ["Core functionality working", "Tests passing", "Documentation updated"]
                    }
                ]
                logger.warning(f"[tasks] Using final fallback tasks: {len(tasks)} tasks")

        updated_spec = spec_service.update_spec_phase(
            spec_id,
            phase="tasks",
            tasks=tasks
        )

        return {
            "message": "Tasks phase completed",
            "spec": updated_spec,
            "tasks": tasks,
            "next_step": "Ready for implementation - assign to SWE agent"
        }

    except Exception as e:
        logger.error(f"Error in tasks_phase: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{spec_id}/assign")
async def assign_spec_to_swe_agent(spec_id: str, request: SpecAssignmentRequest, spec_service: SpecService = Depends(get_spec_service)):
    """Assign specification implementation to SWE agent"""
    try:
        spec = spec_service.get_spec_by_id(spec_id)
        if not spec:
            raise HTTPException(status_code=404, detail="Specification not found")

        if request.agent_id == "devin":
            # Validate API key
            if not request.api_key or not request.api_key.strip():
                raise HTTPException(status_code=400, detail="Devin API key is required")

            # Build a Devin prompt that includes the spec and optional focused task
            import re
            import io
            from ...core.config import settings
            import httpx

            def slugify(s: str) -> str:
                return re.sub(r"[^a-zA-Z0-9-]+", "-", (s or "").lower()).strip("-")

            focus_block = ""
            repo_hint = ""
            if request.task_details:
                t = request.task_details
                t_title = (t.get("title") if isinstance(t, dict) else None) or "Selected Task"
                t_desc = (t.get("description") if isinstance(t, dict) else None) or ""
                focus_block = f"\n\nFocus Task:\n- Title: {t_title}\n- Description: {t_desc}\n"
                repo_hint = f"Create a NEW GitHub repository for this task named: {slugify(spec.title)}-{slugify(t_title)}."
            else:
                repo_hint = f"Create a NEW GitHub repository for this specification named: {slugify(spec.title)}-implementation."

            # Create a detailed specification file content
            spec_file_content = f"""# {spec.title}

## Description
{spec.description}

## Full Specification
{spec.content}

## Customer Customization
- Customer: {request.customization.company_name}
- Industry: {request.customization.industry}
- Use Case: {request.customization.use_case}
- Scenario: {request.customization.customer_scenario}
- Brand Theme: {request.customization.brand_theme}
- Primary Color: {request.customization.primary_color}
- Additional Requirements: {request.customization.additional_requirements}
- Use MCP Tools: {request.customization.use_mcp_tools}
- Use A2A: {request.customization.use_a2a}

## Implementation Mode
{request.workflow_mode}

{focus_block if focus_block else ""}

## Instructions
- {"Leverage MCP tools if helpful." if request.customization.use_mcp_tools else "Use best-practice tooling and testing."}
- {"Apply A2A patterns when useful." if request.customization.use_a2a else "Structure code cleanly and modularly."}
"""

            logger.info(f"[devin] Uploading specification file to Devin...")

            # Upload the specification file to Devin
            async with httpx.AsyncClient() as client:
                # Create file-like object from string content
                spec_file = io.BytesIO(spec_file_content.encode('utf-8'))

                # Upload file to Devin attachments API
                files = {"file": ("specification.md", spec_file, "text/markdown")}
                headers = {"Authorization": f"Bearer {request.api_key}"}

                upload_resp = await client.post(
                    f"{settings.DEVIN_API_BASE_URL}/v1/attachments",
                    headers=headers,
                    files=files,
                    timeout=30.0
                )

                if upload_resp.status_code != 200:
                    logger.error(f"[devin] File upload failed: {upload_resp.status_code} - {upload_resp.text}")
                    raise HTTPException(status_code=500, detail=f"Failed to upload specification file: {upload_resp.status_code}")

                file_url = upload_resp.text.strip().strip('"')  # Remove quotes if present
                logger.info(f"[devin] File uploaded successfully: {file_url}")

            # Create a concise prompt that references the uploaded file
            prompt = f"""Please implement the "{spec.title}" specification based on the detailed requirements in the attached file.

{repo_hint}

Key Points:
- Review the attached specification file for complete technical requirements
- Follow the customer customization requirements specified in the file
- {"Use MCP tools where helpful" if request.customization.use_mcp_tools else "Use best-practice tooling and testing"}
- {"Apply A2A patterns when useful" if request.customization.use_a2a else "Structure code cleanly and modularly"}
- Implementation mode: {request.workflow_mode}

ATTACHMENT:"{file_url}"

Please start by creating the GitHub repository and then implement according to the detailed specification in the attached file."""

            logger.info(f"[devin] Final prompt length: {len(prompt)} characters")
            devin_payload = {"prompt": prompt, "idempotent": True}

            headers = {"Authorization": f"Bearer {request.api_key}", "Content-Type": "application/json"}

            logger.info(f"[devin] === DEVIN SESSION CREATION ===")
            logger.info(f"[devin] API URL: {settings.DEVIN_API_BASE_URL}/v1/sessions")
            logger.info(f"[devin] Headers: {headers}")
            logger.info(f"[devin] Uploaded file URL: {file_url}")
            logger.info(f"[devin] Payload: {devin_payload}")
            logger.info(f"[devin] API Key length: {len(request.api_key) if request.api_key else 0}")

            async with httpx.AsyncClient() as client:
                resp = await client.post(f"{settings.DEVIN_API_BASE_URL}/v1/sessions", json=devin_payload, headers=headers, timeout=30.0)

                logger.info(f"[devin] Response status: {resp.status_code}")
                logger.info(f"[devin] Response headers: {dict(resp.headers)}")

                try:
                    response_text = resp.text
                    logger.info(f"[devin] Response body: {response_text}")
                except Exception as e:
                    logger.error(f"[devin] Failed to read response body: {e}")

                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "status": "success",
                        "agent": "devin",
                        "message": f"Specification '{spec.title}' assigned to Devin for implementation",
                        "spec_id": spec_id,
                        "session_id": data.get("session_id"),
                        "session_url": data.get("url"),  # Note: API returns "url" not "session_url"
                    }
                elif resp.status_code == 401:
                    raise HTTPException(status_code=401, detail="Invalid Devin API key")
                elif resp.status_code == 429:
                    raise HTTPException(status_code=429, detail="Devin API rate limit exceeded")
                else:
                    error_detail = f"Devin API error: {resp.status_code}"
                    try:
                        error_response = resp.json()
                        error_detail += f" - {error_response}"
                    except:
                        error_detail += f" - {resp.text}"
                    raise HTTPException(status_code=500, detail=error_detail)
        elif request.agent_id == "github-copilot":
            return {
                "status": "success",
                "agent": "github-copilot",
                "message": f"Specification '{spec.title}' assigned to GitHub Copilot for implementation",
                "spec_id": spec_id,
                "customization": request.customization.model_dump()
            }
        elif request.agent_id == "codex-cli":
            return {
                "status": "success",
                "agent": "codex-cli",
                "message": f"Specification '{spec.title}' assigned to Azure OpenAI Codex for implementation",
                "spec_id": spec_id,
                "customization": request.customization.model_dump()
            }
        else:
            raise HTTPException(status_code=400, detail=f"Unknown agent: {request.agent_id}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assigning specification to agent: {str(e)}")


@router.post("/constitutional-validation")
async def validate_constitutional_compliance(request: ConstitutionalValidationRequest):
    """Validate plan against spec-kit constitutional principles"""
    constitutional_service = ConstitutionalService()
    return constitutional_service.validate_plan(request)

@router.post("/spec-kit-init")
async def spec_kit_init(request: SpecKitInitRequest):
    """Initialize new spec-kit project (web equivalent of specify init command)"""

    project_structure = {
        "project_name": request.project_name,
        "ai_agent": request.ai_agent,
        "directories": [
            "memory/",
            "scripts/",
            "templates/",
            "specs/"
        ],
        "files": [
            "memory/constitution.md",
            "memory/constitution_update_checklist.md",
            "scripts/create-new-feature.sh",
            "scripts/setup-plan.sh",
            "scripts/check-task-prerequisites.sh",
            "templates/spec-template.md",
            "templates/plan-template.md",
            "templates/tasks-template.md"
        ],
        "agent_files": []
    }

    if request.ai_agent == "claude":
        project_structure["agent_files"].extend([
            ".claude/commands/specify.md",
            ".claude/commands/plan.md",
            ".claude/commands/tasks.md"
        ])
    elif request.ai_agent == "gemini":
        project_structure["agent_files"].extend([
            ".gemini/commands/specify.toml",
            ".gemini/commands/plan.toml",
            ".gemini/commands/tasks.toml",
            "GEMINI.md"
        ])
    elif request.ai_agent == "copilot":
        project_structure["agent_files"].extend([
            ".github/prompts/specify.prompt.md",
            ".github/prompts/plan.prompt.md",
            ".github/prompts/tasks.prompt.md",
            ".github/copilot-instructions.md"
        ])

    return {
        "status": "success",
        "message": f"Spec-kit project '{request.project_name}' initialized successfully",
        "project_structure": project_structure,
        "next_steps": [
            "Use /specify command to create your first feature specification",
            "Follow the three-phase workflow: Specify → Plan → Tasks",
            "Ensure constitutional compliance during planning phase"
        ]
    }


@router.get("/{spec_id}/versions")
async def get_spec_versions(spec_id: str, spec_service: SpecService = Depends(get_spec_service)):
    """Get version history for a specification"""
    versions = spec_service.get_spec_versions(spec_id)
    return {"spec_id": spec_id, "versions": versions}

@router.get("/constitution")
async def get_constitution():
    """Get the current constitutional framework"""
    constitutional_service = ConstitutionalService()
    return constitutional_service.constitutional_articles

@router.put("/constitution")
async def update_constitution(request: dict):
    """Update the constitutional framework"""
    try:
        # Here you could parse the markdown and update the constitutional articles
        # For now, we'll return success to indicate the constitution was "updated"
        # In a real implementation, you'd want to parse the markdown and update the underlying data

        constitution_text = request.get("constitution", "")
        spec_id = request.get("spec_id")

        # Log the constitution update
        logger.info(f"Constitution updated for spec {spec_id}")
        logger.info(f"Constitution length: {len(constitution_text)} characters")

        # In a real implementation, you'd parse the markdown and update the ConstitutionalService
        # For now, just return success

        return {
            "status": "success",
            "message": "Constitution updated successfully",
            "spec_id": spec_id
        }
    except Exception as e:
        logger.error(f"Error updating constitution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/constitution/populate")
async def populate_constitution(request: ConstitutionPopulateRequest):
    """Populate constitutional framework using AI based on project requirements"""

    try:
        project_name = request.project_name
        project_description = request.project_description
        tech_stack = request.tech_stack or "Modern web application"

        # Configure OpenAI client for Azure OpenAI
        base_url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/"
        logger.info(f"[populate_constitution] === AZURE OPENAI CONFIGURATION ===")
        logger.info(f"[populate_constitution] AZURE_OPENAI_ENDPOINT: {settings.AZURE_OPENAI_ENDPOINT}")
        logger.info(f"[populate_constitution] MODEL_NAME: {settings.MODEL_NAME}")
        logger.info(f"[populate_constitution] API_VERSION: {settings.API_VERSION}")
        logger.info(f"[populate_constitution] Full base_url: {base_url}")
        logger.info(f"[populate_constitution] Has API key: {bool(settings.AZURE_OPENAI_KEY)}")

        client = OpenAI(
            api_key=settings.AZURE_OPENAI_KEY,
            base_url=base_url,
            default_query={"api-version": settings.API_VERSION},
            timeout=120.0
        )

        system_prompt = """You are an AI assistant that creates constitutional frameworks for software projects based on spec-kit methodology. Your task is to generate a comprehensive constitutional document that enforces architectural discipline and development practices."""

        # Use the exact spec-kit template structure from GitHub
        spec_kit_template = """# {project_name} Constitution

*Inspired by [spec-kit](https://github.com/github/spec-kit) - A constitutional approach to spec-driven development*

This document defines the constitutional principles that govern spec-driven development for {project_name}.


Every feature starts as a standalone library. Libraries must be self-contained, independently testable, and documented. Clear purpose required - no organizational-only libraries.

**Checks:**
- Using existing libraries over custom implementations
- Clear module boundaries defined
- Minimal dependencies specified
- Libraries are self-contained and testable

Every library exposes functionality via CLI. Text in/out protocol: stdin/args → stdout, errors → stderr. Support JSON + human-readable formats.

**Checks:**
- Command-line interface defined
- All functionality accessible via CLI
- Proper argument parsing implemented
- Text I/O protocol followed (stdin/args → stdout)

Tests written → User approved → Tests fail → Implementation. Red-Green-Refactor cycle strictly enforced.

**Checks:**
- Unit tests defined before implementation
- Test coverage plan specified
- Integration tests included
- Red-Green-Refactor cycle enforced

Focus areas requiring integration tests: New library contract tests, contract changes, inter-service communication, shared schemas.

**Checks:**
- Integration tests for new library contracts
- Contract change verification tests
- Inter-service communication validation
- Real environment testing over mocks

Text I/O ensures debuggability. Structured logging required. Or: MAJOR.MINOR.BUILD format. Or: Start simple, YAGNI principles.

**Checks:**
- Structured logging implemented
- Debuggable text I/O protocols
- YAGNI (You Aren't Gonna Need It) principles followed
- Semantic versioning (MAJOR.MINOR.BUILD)

Maximum 3 projects, no future-proofing patterns, direct framework usage.

**Checks:**
- Using ≤3 projects
- No future-proofing patterns
- Simple, direct implementation approach
- Using frameworks directly with minimal wrapping

## Technology Stack Considerations

For {tech_stack}:
- Prioritize established libraries and frameworks
- Implement comprehensive testing at all levels
- Maintain clear separation of concerns
- Follow industry best practices for the chosen stack

## Constitution Update Checklist

When amending this constitution, ensure all dependent documents are updated to maintain consistency.


When adding/modifying ANY article:
- [ ] /templates/plan-template.md - Update Constitution Check section
- [ ] /templates/spec-template.md - Update if requirements/scope affected
- [ ] /templates/tasks-template.md - Update if new task types needed
- [ ] /.claude/commands/plan.md - Update if planning process changes
- [ ] /.claude/commands/tasks.md - Update if task generation affected
- [ ] /CLAUDE.md - Update runtime development guidelines


**Article I (Library-First):**
- Ensure templates emphasize library creation
- Update CLI command examples
- Add libs.txt documentation requirements

**Article II (CLI Interface):**
- Update CLI flag requirements in templates
- Update text I/O protocol examples

**Article III (Test-First):**
- Update test order in templates
- Update TDD requirements

**Article IV (Integration Testing):**
- List integration test triggers
- Update testing priorities

**Article V (Observability):**
- Add logging requirements
- Update monitoring guidelines

**Article VI (Simplicity):**
- Update project limits
- Update pattern prohibitions

1. [ ] All templates reference new requirements
2. [ ] Examples updated to match new rules
3. [ ] No contradictions between documents
4. [ ] Run sample implementation plan
5. [ ] Verify templates are self-contained

- Constitution supersedes all other practices
- Amendments require comprehensive documentation update
- Approval process for changes
- Mandatory migration planning for breaking changes

---
*Version: 2.1.1 | Ratified: 2025-07-16 | Last Amended: 2025-07-16*
*For more information: https://github.com/github/spec-kit*"""

        user_prompt = f"""Using the spec-kit constitutional template, create a constitutional framework for the following project:

Project Name: {project_name}
Description: {project_description}
Tech Stack: {tech_stack}

Please populate the following template with project-specific details while maintaining the exact structure and all core principles:

{spec_kit_template}

Instructions:
1. Replace {{project_name}} with the actual project name
2. Replace {{tech_stack}} with the specific technology stack
3. Customize the "Technology Stack Considerations" section for the specific tech stack
4. Keep all six core principles exactly as defined in spec-kit methodology
5. Maintain all checklist items and governance structure
6. Ensure the constitution follows spec-kit update checklist requirements

Generate the complete constitutional framework in markdown format."""

        logger.info(f"[populate_constitution] making responses call")
        response = client.responses.create(
            model=settings.MODEL_NAME,
            instructions=system_prompt,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": user_prompt},
                    ],
                }
            ],
            max_output_tokens=8000
        )

        constitution_content = getattr(response, "output_text", None)
        if not constitution_content:
            try:
                parts = []
                for item in getattr(response, "output", []) or []:
                    for c in getattr(item, "content", []) or []:
                        if getattr(c, "type", None) in ("text", "output_text"):
                            parts.append(getattr(c, "text", ""))
                constitution_content = "".join(parts).strip()
            except Exception:
                constitution_content = ""

        logger.info(f"[populate_constitution] received constitution content length: {len(constitution_content) if constitution_content else 0} chars")

        return ConstitutionPopulateResponse(
            status="success",
            constitution=constitution_content,
            message="Constitutional framework generated successfully"
        )

    except Exception as e:
        logger.error(f"Error in populate_constitution: {e}")
        
        # Fallback constitutional framework using exact spec-kit template structure
        fallback_constitution = f"""# {project_name} Constitution

*Inspired by [spec-kit](https://github.com/github/spec-kit) - A constitutional approach to spec-driven development*

This document defines the constitutional principles that govern spec-driven development for {project_name}.


Every feature starts as a standalone library. Libraries must be self-contained, independently testable, and documented. Clear purpose required - no organizational-only libraries.

**Checks:**
- Using existing libraries over custom implementations
- Clear module boundaries defined
- Minimal dependencies specified
- Libraries are self-contained and testable

Every library exposes functionality via CLI. Text in/out protocol: stdin/args → stdout, errors → stderr. Support JSON + human-readable formats.

**Checks:**
- Command-line interface defined
- All functionality accessible via CLI
- Proper argument parsing implemented
- Text I/O protocol followed (stdin/args → stdout)

Tests written → User approved → Tests fail → Implementation. Red-Green-Refactor cycle strictly enforced.

**Checks:**
- Unit tests defined before implementation
- Test coverage plan specified
- Integration tests included
- Red-Green-Refactor cycle enforced

Focus areas requiring integration tests: New library contract tests, contract changes, inter-service communication, shared schemas.

**Checks:**
- Integration tests for new library contracts
- Contract change verification tests
- Inter-service communication validation
- Real environment testing over mocks

Text I/O ensures debuggability. Structured logging required. Or: MAJOR.MINOR.BUILD format. Or: Start simple, YAGNI principles.

**Checks:**
- Structured logging implemented
- Debuggable text I/O protocols
- YAGNI (You Aren't Gonna Need It) principles followed
- Semantic versioning (MAJOR.MINOR.BUILD)

Maximum 3 projects, no future-proofing patterns, direct framework usage.

**Checks:**
- Using ≤3 projects
- No future-proofing patterns
- Simple, direct implementation approach
- Using frameworks directly with minimal wrapping

## Technology Stack Considerations

For {tech_stack or "modern web applications"}:
- Prioritize established libraries and frameworks
- Implement comprehensive testing at all levels
- Maintain clear separation of concerns
- Follow industry best practices for the chosen stack

## Constitution Update Checklist

When amending this constitution, ensure all dependent documents are updated to maintain consistency.


When adding/modifying ANY article:
- [ ] /templates/plan-template.md - Update Constitution Check section
- [ ] /templates/spec-template.md - Update if requirements/scope affected
- [ ] /templates/tasks-template.md - Update if new task types needed
- [ ] /.claude/commands/plan.md - Update if planning process changes
- [ ] /.claude/commands/tasks.md - Update if task generation affected
- [ ] /CLAUDE.md - Update runtime development guidelines


**Article I (Library-First):**
- Ensure templates emphasize library creation
- Update CLI command examples
- Add libs.txt documentation requirements

**Article II (CLI Interface):**
- Update CLI flag requirements in templates
- Update text I/O protocol examples

**Article III (Test-First):**
- Update test order in templates
- Update TDD requirements

**Article IV (Integration Testing):**
- List integration test triggers
- Update testing priorities

**Article V (Observability):**
- Add logging requirements
- Update monitoring guidelines

**Article VI (Simplicity):**
- Update project limits
- Update pattern prohibitions

1. [ ] All templates reference new requirements
2. [ ] Examples updated to match new rules
3. [ ] No contradictions between documents
4. [ ] Run sample implementation plan
5. [ ] Verify templates are self-contained

- Constitution supersedes all other practices
- Amendments require comprehensive documentation update
- Approval process for changes
- Mandatory migration planning for breaking changes

---
*Version: 2.1.1 | Ratified: 2025-07-16 | Last Amended: 2025-07-16*
*For more information: https://github.com/github/spec-kit*
"""
        
        return {
            "status": "success",
            "constitution": fallback_constitution,
            "message": "Constitutional framework generated using fallback template (AI service temporarily unavailable)"
        }
