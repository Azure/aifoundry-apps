from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from .api.routes import auth, templates, specs, users, agents, progress, github, post_training
from .data.static_data import learning_resources_data, patterns_data
from .models.schemas import LearningResource
from .api.dependencies import get_template_service
from .services.rate_limiter import check_azure_openai_rate_limit

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Set specific loggers to appropriate levels
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)
logger.info("Starting AIFoundry.app API with enhanced logging")

app = FastAPI(title="AIFoundry.app API", description="API for AI App Templates")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware for Azure OpenAI endpoints
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Check rate limit for Azure OpenAI related endpoints
    if any(path in str(request.url) for path in ["/api/specs", "/api/templates", "/api/agents"]):
        try:
            check_azure_openai_rate_limit(request, "azure_openai")
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content=e.detail
            )
    
    response = await call_next(request)
    return response

# Global exception handler for rate limiting
@app.exception_handler(HTTPException)
async def rate_limit_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 429:
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": "Too many requests. Please try again later.",
                "retry_after": 3600,
                "details": exc.detail
            }
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(specs.router, prefix="/api/specs", tags=["specs"])
app.include_router(users.router, prefix="/api/user", tags=["users"])
app.include_router(agents.router, prefix="/api", tags=["agents"])
app.include_router(progress.router, prefix="/api", tags=["progress"])
app.include_router(github.router, prefix="/api", tags=["github"])
app.include_router(post_training.router, prefix="/api/post-training", tags=["post-training"])

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/api/rate-limit/status")
async def rate_limit_status(request: Request):
    """Get current rate limit status for the client"""
    from .services.rate_limiter import rate_limiter
    
    client_ip = request.client.host if request.client else "unknown"
    remaining = rate_limiter.get_remaining_requests(client_ip, "azure_openai", limit=10, window=3600)
    
    return {
        "remaining_requests": remaining,
        "limit": 10,
        "window": "1 hour",
        "reset_time": "Rate limit resets every hour"
    }

@app.get("/api/learning-resources")
async def get_learning_resources():
    """Get learning resources"""
    return [LearningResource(**resource) for resource in learning_resources_data]

@app.get("/api/filters")
async def get_filters():
    """Get filter options"""
    template_service = get_template_service()
    return template_service.get_filter_options().model_dump()

@app.get("/api/patterns")
async def get_patterns():
    """Get multi-agent patterns"""
    return patterns_data
