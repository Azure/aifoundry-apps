from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import List
import logging
from ...models.schemas import (
    Spec, SpecCreateRequest, CustomizationRequest, SWEAgentRequest, 
    SpecifyRequest, PlanRequest, TasksRequest, ConstitutionalValidationRequest,
    ConstitutionalValidationResponse, SpecKitInitRequest, SystemCheckResponse
)
from ...services.spec_service import SpecService
from ...services.constitutional_service import ConstitutionalService
from ...api.dependencies import get_spec_service
from ...core.config import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

router = APIRouter()

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
        
        system_prompt = """You are an AI assistant that enhances specifications to be more suitable for coding agents and software engineers. Your task is to take a specification and make it more detailed, technical, and actionable for implementation."""

        user_prompt = f"""Please enhance the following specification to be more suitable for coding agents and software engineers. Make it more detailed, technical, and actionable:

Title: {spec.title}
Description: {spec.description}
Current Content:
{spec.content}

Tags: {', '.join(spec.tags)}

Please provide an enhanced version that includes:
1. Clear technical requirements
2. Implementation guidelines
3. Architecture considerations
4. Testing criteria
5. Acceptance criteria

Return the enhanced content in markdown format."""

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
    """Handle the /specify phase - Define requirements and what to build"""
    try:
        spec = spec_service.get_spec_by_id(spec_id)
        if not spec:
            raise HTTPException(status_code=404, detail="Specification not found")
        
        # Generate a semantic branch name based on the requirements
        import re
        def slugify(text: str) -> str:
            return re.sub(r'[^a-zA-Z0-9-]', '-', text.lower()).strip('-')[:50]
        
        # Generate feature number (simple incrementing)
        all_specs = spec_service.get_all_specs()
        feature_num = str(len([s for s in all_specs if s.feature_number]) + 1).zfill(3)
        
        # Create branch name from title
        branch_name = f"{feature_num}-{slugify(spec.title)}"
        
        updated_spec = spec_service.update_spec_phase(
            spec_id, 
            phase="specification",
            specification=request.requirements,
            branch_name=branch_name,
            feature_number=feature_num
        )
        
        if not updated_spec:
            raise HTTPException(status_code=404, detail="Specification not found")
            
        return {
            "message": "Specification phase completed",
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
        
        system_prompt = """You are a senior technical architect. Given a specification and technology requirements, create a comprehensive technical implementation plan."""
        
        user_prompt = f"""Create a detailed technical implementation plan for the following:

Specification: {spec.specification}
Technology Stack: {request.tech_stack}
Architecture: {request.architecture or 'Standard best practices'}
Constraints: {request.constraints or 'None specified'}

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
        
        # Use the existing task breakdown functionality
        # Create a mock CustomizationRequest for compatibility
        customization = CustomizationRequest(
            customer_scenario=f"Implement: {spec.title}",
            brand_theme="Default",
            primary_color="#3b82f6",
            company_name="Default",
            industry="Technology",
            use_case="Implementation",
            additional_requirements=f"Specification: {spec.specification}\n\nPlan: {spec.plan}"
        )
        
        # Reuse existing task breakdown logic
        base_url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/"
        client = OpenAI(
            api_key=settings.AZURE_OPENAI_KEY,
            base_url=base_url,
            default_query={"api-version": settings.API_VERSION},
            timeout=120.0
        )
        
        system_prompt = f"""You are a senior software project lead. Given a specification and technical plan, produce actionable implementation tasks.

Generate 8–15 concrete engineering tasks, each sized 1–6 hours.
- Description: one sentence, max 20 words. No boilerplate.
- Acceptance criteria: 3–5 bullets, each ≤ 12 words, objectively verifiable.
- Title starts with an action verb (Implement, Add, Refactor, Wire, Document, Test, Configure, etc.).

Output format (JSON array):
- Return a JSON array of task objects
- Keys: id, title, description, acceptanceCriteria, estimatedTime, estimatedTokens, priority, status

Specification: {spec.specification}
Technical Plan: {spec.plan}"""

        user_prompt = f"""Generate the task breakdown now based on the specification and technical plan above.

Mode: {request.mode}

Requirements:
- Generate 8–15 implementation tasks
- Keep descriptions ≤ 20 words
- Keep acceptance criteria bullets ≤ 12 words each
- Focus on concrete implementation steps"""

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
        
        # Clean up JSON formatting
        if tasks_json.startswith("```json"):
            tasks_json = tasks_json[7:-3].strip()
        elif tasks_json.startswith("```"):
            tasks_json = tasks_json[3:-3].strip()
        
        try:
            tasks = json.loads(tasks_json)
            if not isinstance(tasks, list):
                # If it's wrapped in an object, extract the array
                if isinstance(tasks, dict) and "tasks" in tasks:
                    tasks = tasks["tasks"]
                else:
                    raise ValueError("Expected task array")
        except Exception:
            # Fallback tasks if parsing fails
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
async def assign_spec_to_swe_agent(spec_id: str, request: SWEAgentRequest, spec_service: SpecService = Depends(get_spec_service)):
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
{request.mode}

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
- Implementation mode: {request.mode}

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

@router.get("/{spec_id}/versions")
async def get_spec_versions(spec_id: str, spec_service: SpecService = Depends(get_spec_service)):
    """Get version history for a specification"""
    versions = spec_service.get_spec_versions(spec_id)
    return {"spec_id": spec_id, "versions": versions}
