# Backend - AIfoundry.app

FastAPI backend service for the AIfoundry.app platform with AI agent integrations.

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **Azure AI Foundry** - Integration with Azure AI services
- **MCP (Model Context Protocol)** - Seamless AI agent communication
- **Agent Templates** - Catalog of pre-built agent templates
- **Specifications Management** - Handle agent specifications and configurations

## Prerequisites

- [Python 3.12+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/) - Modern Python package manager

## Development Setup

### 1. Create Virtual Environment
```bash
# Create a virtual environment using uv
uv venv

# Activate the virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 2. Install Dependencies
```bash
# Install the project and its dependencies in editable mode
uv pip install -e .
```

### 3. Run the Development Server
```bash
# Start the FastAPI development server
uv run fastapi dev app/main.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Health Check**: http://localhost:8000/healthz
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Core Endpoints
- `GET /healthz` - Health check endpoint
- `GET /api/templates` - Get available agent templates
- `GET /api/specs` - Get agent specifications
- `GET /api/featured` - Get featured templates

### Agent Integration
- Integration with GitHub Copilot via MCP
- Azure AI Foundry model access
- Cognition Devin agent support

## Project Structure

```
src/backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── mcp_client.py        # MCP client for agent communication
│   ├── sync_catalog.py      # Catalog synchronization utilities
│   ├── catalog.json         # Agent templates catalog
│   ├── featured.json        # Featured templates
│   └── specs.json          # Agent specifications
├── tests/                   # Test files
├── Dockerfile              # Docker configuration
├── pyproject.toml          # Project dependencies and configuration
└── README.md               # This file
```

## Environment Variables

The application supports the following environment variables:

### Required Environment Variables
- `HF_TOKEN` - HuggingFace API token for dataset access (required for post-training features)
- `AZURE_OPENAI_KEY` - Azure OpenAI API key for AI model access
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL

### Optional Environment Variables
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID for authentication
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
- `GITHUB_REDIRECT_URI` - GitHub OAuth redirect URI
- `GITHUB_TOKEN` - GitHub personal access token
- `GITHUB_APP_ID` - GitHub App ID for advanced features
- `GITHUB_PRIVATE_KEY_PATH` - Path to GitHub App private key
- `DEVIN_API_BASE_URL` - Devin AI API base URL (default: https://api.devin.ai)
- `COSMOS_CONNECTION_STRING` - Azure Cosmos DB connection string
- `COSMOS_DATABASE_ID` - Azure Cosmos DB database ID (default: aifoundry)
- `API_VERSION` - Azure OpenAI API version (default: preview)
- `MODEL_NAME` - Azure OpenAI model name (default: gpt-5-nano)
- `PYTHONPATH` - Set to `/app` for proper module resolution
- `PORT` - Server port (default: 8000)

### Setting Up Environment Variables

Create a `.env` file in the backend directory with the required variables:

```bash
# Required for HuggingFace dataset access
HF_TOKEN=your_huggingface_api_token

# Required for Azure OpenAI
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/

# Optional GitHub integration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Getting a HuggingFace API Token

1. Go to [HuggingFace Settings](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Select "Read" access (sufficient for dataset browsing)
4. Copy the generated token and add it to your `.env` file

## Testing

```bash
# Run tests (when test suite is available)
uv run pytest

# Test API endpoints manually
curl http://localhost:8000/healthz
curl http://localhost:8000/api/templates
curl http://localhost:8000/api/specs
```

## Docker Development

### Build Docker Image
```bash
docker build -t aifoundry-apps-backend .
```

### Run Docker Container
```bash
docker run -p 8000:8000 aifoundry-apps-backend
```

## Deployment

The backend is designed to be deployed on Azure Container Apps. See the [deployment guide](../../deployment/README.md) for detailed instructions.

## Dependencies

Key dependencies managed via `pyproject.toml`:

- **fastapi[standard]** - Web framework with all standard extras
- **psycopg[binary]** - PostgreSQL adapter (for future database integration)
- **pydantic** - Data validation and settings management
- **azure-ai-projects** - Azure AI Foundry integration
- **azure-core** - Azure SDK core functionality
- **mcp** - Model Context Protocol for agent communication
- **beautifulsoup4** - HTML parsing for web scraping
- **lxml** - XML and HTML processing
- **httpx** - Async HTTP client

## Contributing

1. Create a virtual environment with `uv venv`
2. Activate it with `source .venv/bin/activate`
3. Install dependencies with `uv pip install -r pyproject.toml`
4. Make your changes
5. Test with `uv run fastapi dev app/main.py`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
