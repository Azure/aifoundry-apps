# AIfoundry.app

> **⚠️ Experimental - Work in Progress**  
> This is an experimental platform currently under active development. You can test the latest version at [aifoundry.app](https://aifoundry.app)

An agentic application that empowers solution engineers to customize multi-agent patterns and leverage the Azure AI Foundry Agent Service Catalog of Agent templates using SWE (Software Engineering) Agents.

## 🚀 Quick Start

**For the best experience, we recommend self-hosting this application to avoid rate limits and get full functionality.**

### Option 1: Self-Host (Recommended)
```bash
# Clone the repository
git clone https://github.com/Azure/aifoundry-apps.git
cd aifoundry-apps

# Follow the detailed setup instructions below
```

### Option 2: Try the Demo
Visit [aifoundry.app](https://aifoundry.app) to try the demo (note: heavily rate-limited)

## Overview

AIfoundry.app provides a comprehensive platform for solution engineers to:
- Browse and customize multi-agent patterns from the Azure AI Foundry Agent Service Catalog
- Leverage various AI agents and tools for code generation and automation
- Deploy and test agent templates in integrated development environments
- Collaborate on agent-driven software engineering solutions

## Core Technologies & Integrations

### AI Agents & Tools
- **GitHub Copilot Agent**: Integrated via MCP (Model Context Protocol) for intelligent code suggestions
- **Azure AI Foundry Model**: Powered by Codex for advanced code generation and analysis
- **Cognition Devin**: Deployed via MCP on Azure Marketplace for autonomous software engineering
- **Replit Integration**: Available through Azure Marketplace for cloud-based development

### Development Infrastructure
- **GitHub Actions Runner**: Automated CI/CD pipelines and testing
- **MCP (Model Context Protocol)**: Seamless integration between different AI agents
- **Azure Marketplace**: Deployment and distribution platform for agent services

### Backend Technologies
- **Spec-Kit**: Powered by [GitHub's spec-kit](https://github.com/github/spec-kit) for managing and serving agent specifications

## Features

- **Agent Template Gallery**: Browse and discover pre-built agent templates from Azure AI Foundry
- **Multi-Agent Pattern Customization**: Tailor agent behaviors and workflows to specific use cases
- **Integrated Development Environment**: Test and iterate on agent solutions in real-time
- **SWE Agent Integration**: Leverage Software Engineering Agents for automated code generation
- **Specification Customization**: Create and modify detailed technical specifications
- **Post-Training with RL**: Fine-tune models using reinforcement learning
- **GitHub Integration**: Seamless workflow with GitHub repositories and Copilot
- **Modern UI/UX**: Clean, intuitive interface inspired by Azure AI Labs design language

## Screenshots

See AIfoundry.app in action with these key features:

<table>
<tr>
<td width="50%">

**Homepage Interface**
<br>
<img src="src/frontend/src/assets/screenshots/homepage.png" alt="AIfoundry.app Homepage showing the main interface with navigation and feature cards" width="100%">

</td>
<td width="50%">

**Agent Templates**
<br>
<img src="src/frontend/src/assets/screenshots/templates.png" alt="Templates page showing various AI agent templates and configuration options" width="100%">

</td>
</tr>
<tr>
<td width="50%">

**Task Assignment**
<br>
<img src="src/frontend/src/assets/screenshots/spec_assignment.png" alt="Specification assignment interface showing task breakdown and agent assignment" width="100%">

</td>
<td width="50%">

**Post-Training with RL**
<br>
<img src="src/frontend/src/assets/screenshots/post-training.png" alt="Post-training interface showing model fine-tuning and reinforcement learning options" width="100%">

</td>
</tr>
</table>

## Architecture

- **Backend**: FastAPI with Python, integrated with Azure AI Foundry services and powered by [spec-kit](https://github.com/github/spec-kit) for agent specification management
- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Agent Layer**: MCP-based integration with multiple AI agents (Copilot, Devin, Codex)
- **Deployment**: Azure Container Apps with marketplace integrations
- **Development Tools**: GitHub Actions, Replit, and Azure AI Foundry toolchain

## 🛠️ Development Setup

### Prerequisites

**Required:**
- Python 3.12+ 
- Node.js 18+ and pnpm
- Git

**Optional (for full functionality):**
- Azure AI Foundry access
- GitHub Copilot subscription
- Azure Marketplace account for agent services

### Step 1: Clone and Setup

**Option A: Quick Setup (Recommended)**
```bash
# Clone the repository
git clone https://github.com/Azure/aifoundry-apps.git
cd aifoundry-apps

# Run the interactive setup script
./setup.sh                    # Linux/macOS
# OR
.\setup.ps1                   # Windows PowerShell
```

**Option B: Manual Setup**
```bash
# Clone the repository
git clone https://github.com/Azure/aifoundry-apps.git
cd aifoundry-apps

# Install uv (Python package manager) if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh
# Or on Windows: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Install pnpm if you don't have it
npm install -g pnpm
```

### Step 2: Backend Setup

```bash
cd src/backend

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv sync

# Start the backend server
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at:
- API: http://localhost:8000
- Health check: http://localhost:8000/healthz
- API docs: http://localhost:8000/docs

### Step 3: Frontend Setup

```bash
# In a new terminal
cd src/frontend

# Install dependencies
pnpm install

# Start the development server
pnpm run dev
```

The frontend will be available at:
- Application: http://localhost:5173 (or http://localhost:5174 if 5173 is busy)

### Step 4: Verify Setup

1. Open http://localhost:5173 in your browser
2. You should see the AIfoundry.app homepage
3. Click "Start Spec-Driven Development" to test the application
4. The glass popup should appear recommending self-hosting (you can dismiss it)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `src/backend` directory for production configuration:

```bash
# Azure AI Foundry Configuration (optional)
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Database Configuration (optional - defaults to in-memory)
DATABASE_URL=postgresql://user:password@localhost:5432/aifoundry

# Redis Configuration (optional - defaults to in-memory)
REDIS_URL=redis://localhost:6379

# GitHub Integration (optional but recommended for full functionality)
GITHUB_APP_ID=your_github_app_id
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_PRIVATE_KEY_PATH=/path/to/your/private-key.pem
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### Rate Limiting

- **Local Development**: No rate limiting applied
- **Production (aifoundry.app)**: 10 requests per hour per IP for Azure OpenAI calls
- **Self-hosted**: Rate limiting can be configured via environment variables

## 🐳 Docker Setup (Alternative)

If you prefer Docker for local development:

```bash
# From the project root
cd deployment

# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build

# Stop services
docker-compose down
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## 🌐 Self-Hosting Guide

### Why Self-Host?

- **No Rate Limits**: Full access to all features without restrictions
- **Privacy**: Your data stays on your infrastructure
- **Customization**: Modify and extend the application as needed
- **Cost Control**: Manage your own Azure OpenAI usage and costs

### Self-Hosting Options

#### Option 1: Simple VPS/Cloud Server

**Requirements:**
- Ubuntu 20.04+ or similar Linux distribution
- 2GB RAM minimum, 4GB recommended
- 20GB disk space
- Docker and Docker Compose installed

**Setup Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/Azure/aifoundry-apps.git
cd aifoundry-apps

# 2. Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Configure environment variables
cp deployment/.env.example deployment/.env
nano deployment/.env  # Edit with your configuration

# 4. Start the application
cd deployment
docker-compose up -d

# 5. Check status
docker-compose ps
```

**Access your application:**
- Frontend: http://your-server-ip:3000
- Backend API: http://your-server-ip:8000

#### Option 2: Kubernetes Deployment

**Prerequisites:**
- Kubernetes cluster (AKS, EKS, GKE, or local with minikube)
- kubectl configured
- Helm (optional)

**Setup Steps:**

```bash
# 1. Clone and prepare
git clone https://github.com/Azure/aifoundry-apps.git
cd aifoundry-apps

# 2. Create namespace
kubectl create namespace aifoundry

# 3. Deploy with Helm (if available)
helm install aifoundry ./helm-chart --namespace aifoundry

# Or deploy with kubectl
kubectl apply -f k8s/ -n aifoundry

# 4. Check deployment
kubectl get pods -n aifoundry
kubectl get services -n aifoundry
```

#### Option 3: Azure Container Apps

**Prerequisites:**
- Azure subscription
- Azure CLI installed
- Azure Developer CLI (azd) installed

**Setup Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/Azure/aifoundry-apps.git
cd aifoundry-apps

# 2. Initialize Azure Developer CLI
azd init

# 3. Deploy to Azure
azd up

# 4. Get the application URL
azd show
```

### Production Configuration

#### Environment Variables for Production

Create a `.env` file with the following variables:

```bash
# Application Settings
NODE_ENV=production
VITE_API_URL=https://your-domain.com/api

# Azure AI Foundry (Required for AI features)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Database (Optional - defaults to in-memory)
DATABASE_URL=postgresql://user:password@localhost:5432/aifoundry

# Redis (Optional - defaults to in-memory)
REDIS_URL=redis://localhost:6379

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Security
SECRET_KEY=your_secret_key_for_jwt_tokens
```

#### SSL/HTTPS Setup

**Using Nginx (Recommended):**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Using Let's Encrypt (Free SSL):**

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Monitoring and Maintenance

#### Health Checks

```bash
# Check application health
curl https://your-domain.com/api/healthz

# Check rate limit status
curl https://your-domain.com/api/rate-limit/status
```

#### Logs

```bash
# Docker Compose logs
docker-compose logs -f

# Kubernetes logs
kubectl logs -f deployment/aifoundry-backend -n aifoundry
kubectl logs -f deployment/aifoundry-frontend -n aifoundry
```

#### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or for Kubernetes
kubectl rollout restart deployment/aifoundry-backend -n aifoundry
kubectl rollout restart deployment/aifoundry-frontend -n aifoundry
```

## 🚀 Deployment

### Quick Start

For detailed deployment instructions, testing, and troubleshooting, see the [`deployment/` directory](./deployment/README.md).

### Local Development with Docker

Build and run both services using docker-compose:

```bash
# From the deployment directory
cd deployment
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build

# Stop services
docker-compose down
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Backend Health Check: http://localhost:8000/healthz

### Azure Container Apps Deployment

#### Option 1: Azure Developer CLI (Recommended)
```bash
# From project root
azd init
azd up
```

#### Option 2: Manual Deployment
```bash
# From deployment directory
cd deployment

# Linux/macOS
chmod +x deploy.sh
./deploy.sh

# Windows
./deploy.ps1
```

### Testing Your Deployment

After deployment, test your application:

```bash
# From deployment directory
cd deployment

# Linux/macOS
chmod +x test-deployment.sh
./test-deployment.sh <backend-url> <frontend-url>

# Windows
./test-deployment.ps1 <backend-url> <frontend-url>
```

## Project Structure

```
.
├── src/
│   ├── backend/           # FastAPI backend with AI agent integrations
│   └── frontend/          # React frontend for agent template management
├── deployment/            # Deployment scripts and configs
│   ├── README.md         # Detailed deployment guide
│   ├── docker-compose.yml
│   ├── deploy.sh         # Bash deployment script
│   ├── deploy.ps1        # PowerShell deployment script
│   └── test-deployment.* # Testing scripts
├── infra/                # Azure infrastructure templates
└── azure.yaml           # Azure Developer CLI config
```

## 🎯 Getting Started

### For Self-Hosted Users

1. **Setup**: Follow the [Development Setup](#-development-setup) instructions above
2. **Configure**: Set up your Azure AI Foundry credentials in the `.env` file
3. **GitHub App**: Register a GitHub App for full functionality (see [GitHub Integration](#-github-integration-setup))
4. **Test**: Open http://localhost:5173 and start creating specifications
5. **Deploy**: Follow the [Self-Hosting Guide](#-self-hosting-guide) for production deployment

### For Demo Users

1. **Try the Demo**: Visit [aifoundry.app](https://aifoundry.app) to test the platform
2. **Fork & Self-Host**: Click the "Fork on GitHub" button in the popup for full functionality
3. **Follow Setup**: Use the detailed instructions above to get your own instance running

## 🛠️ Customization & Advanced Features

### Specification Customization

AIfoundry.app allows you to create, modify, and manage detailed technical specifications for your projects:

#### Creating Custom Specifications
1. **Navigate to Specs**: Go to the "Specs" section in the application
2. **Create New Spec**: Click "Create New Specification"
3. **Define Requirements**: Use the interactive form to define:
   - **Project Overview**: High-level description and goals
   - **Technical Stack**: Technologies, frameworks, and tools
   - **Architecture**: System design and component relationships
   - **Constraints**: Performance, security, and compliance requirements
   - **Constitutional Gates**: Simplicity, anti-abstraction, and integration-first principles

#### Specification Workbench Features
- **Live Preview**: Real-time markdown rendering of your specification
- **Template Integration**: Start from pre-built templates or create from scratch
- **Version Control**: Track changes and maintain specification history
- **Export Options**: Generate PDF, markdown, or structured JSON outputs

### Template Customization

#### Agent Template Management
1. **Browse Templates**: Explore the Azure AI Foundry Agent Service Catalog
2. **Customize Behaviors**: Modify agent prompts, instructions, and capabilities
3. **Configure Parameters**: Adjust temperature, max tokens, and other model settings
4. **Test Interactions**: Preview how agents will respond to different inputs

#### Template Workbench
- **Visual Editor**: Drag-and-drop interface for configuring agent workflows
- **Prompt Engineering**: Advanced prompt editing with syntax highlighting
- **Behavior Testing**: Interactive testing environment for agent responses
- **Template Sharing**: Export and share custom templates with your team

### Pattern Customization

#### Multi-Agent Pattern Design
1. **Pattern Workbench**: Visual interface for designing agent workflows
2. **Agent Orchestration**: Define how multiple agents interact and collaborate
3. **Workflow Logic**: Create conditional flows and decision trees
4. **Integration Points**: Connect agents with external APIs and services

#### Pattern Types
- **Sequential Patterns**: Linear workflows where agents work in sequence
- **Parallel Patterns**: Concurrent execution of multiple agents
- **Hierarchical Patterns**: Master-agent coordinating sub-agents
- **Collaborative Patterns**: Agents working together on shared tasks

### Post-Training with Reinforcement Learning

#### Model Fine-Tuning
1. **Data Preparation**: Prepare your training datasets and feedback data
2. **RL Configuration**: Set up reward functions and training parameters
3. **Training Pipeline**: Configure the reinforcement learning training process
4. **Model Evaluation**: Test and validate your fine-tuned models

#### RL Training Features
- **Custom Reward Functions**: Define what constitutes good performance
- **Human Feedback Integration**: Incorporate human preferences and corrections
- **Iterative Improvement**: Continuously refine models based on performance
- **A/B Testing**: Compare different model versions and configurations

#### Supported RL Algorithms
- **PPO (Proximal Policy Optimization)**: Stable and efficient policy optimization
- **A2C (Advantage Actor-Critic)**: Actor-critic methods for continuous learning
- **Custom Algorithms**: Support for custom RL implementations

### GitHub Integration Setup

#### GitHub App Registration (Required for Full Functionality)

To use GitHub Copilot integration and work with repositories, you need to register a GitHub App:

1. **Create GitHub App**:
   - Go to [GitHub Developer Settings](https://github.com/settings/apps)
   - Click "New GitHub App"
   - Fill in the required information:
     - **App name**: `AIfoundry-YourOrg` (or your preferred name)
     - **Homepage URL**: `https://your-domain.com` (or `http://localhost:5173` for development)
     - **Webhook URL**: `https://your-domain.com/api/github/webhook` (or `http://localhost:8000/api/github/webhook` for development)
     - **Callback URL**: `https://your-domain.com/auth/callback` (or `http://localhost:5173/auth/callback` for development)

2. **Configure Permissions**:
   - **Repository permissions**:
     - Contents: Read & Write
     - Issues: Read & Write
     - Pull requests: Read & Write
     - Metadata: Read
     - Commit statuses: Read & Write
   - **Account permissions**:
     - Email addresses: Read
   - **Subscribe to events**:
     - Push
     - Pull request
     - Issues
     - Commit comment

3. **Generate Credentials**:
   - Download the private key file
   - Copy the App ID and Client ID
   - Generate a webhook secret

4. **Configure Environment Variables**:
   ```bash
   # Add to your .env file
   GITHUB_APP_ID=your_app_id
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_PRIVATE_KEY_PATH=/path/to/your/private-key.pem
   GITHUB_WEBHOOK_SECRET=your_webhook_secret
   ```

#### GitHub Workflow Integration

Once configured, you can:

1. **Connect Repositories**: Link your GitHub repositories to the platform
2. **Assign Tasks**: Create and assign development tasks to GitHub Copilot
3. **Track Progress**: Monitor task completion and code generation
4. **Review Changes**: Review and approve generated code before merging
5. **Collaborate**: Share tasks and progress with team members

#### Copilot Coding Agent Features
- **Task Breakdown**: Automatically break down specifications into actionable tasks
- **Code Generation**: Generate code based on specifications and requirements
- **Repository Integration**: Work directly with your GitHub repositories
- **Progress Tracking**: Monitor development progress and completion status
- **Quality Assurance**: Automated code review and quality checks

### Post-Training Workflow

#### Setting Up Model Fine-Tuning

1. **Prepare Training Data**:
   - Collect high-quality examples of desired behavior
   - Create feedback datasets with human preferences
   - Organize data into training, validation, and test sets

2. **Configure RL Training**:
   - Navigate to the "Post-Training" section
   - Select your base model (GPT-4, Claude, etc.)
   - Define reward functions based on your success criteria
   - Set training parameters (learning rate, batch size, etc.)

3. **Start Training Process**:
   - Upload your training data
   - Configure the reinforcement learning pipeline
   - Monitor training progress and metrics
   - Adjust parameters based on performance

4. **Evaluate and Deploy**:
   - Test your fine-tuned model on validation data
   - Compare performance against the base model
   - Deploy the best-performing model
   - Monitor performance in production

#### RL Training Configuration

```yaml
# Example RL training configuration
training_config:
  algorithm: "PPO"
  learning_rate: 0.0001
  batch_size: 32
  epochs: 10
  reward_function: "code_quality_score"
  
reward_functions:
  code_quality_score:
    - syntax_correctness: 0.3
    - test_coverage: 0.2
    - performance_metrics: 0.2
    - human_preference: 0.3
```

#### Supported Training Data Formats

- **JSON**: Structured data with input-output pairs
- **CSV**: Tabular data for classification tasks
- **Text**: Raw text data for language modeling
- **Code**: Source code repositories for code generation tasks
- **Conversations**: Chat logs for conversational AI training

### Complete Workflow Example

Here's how you can use AIfoundry.app for a complete development project:

#### 1. Specification Phase
```bash
# Create a new specification
1. Navigate to "Specs" → "Create New Specification"
2. Define your project requirements:
   - Project: "E-commerce Recommendation Engine"
   - Tech Stack: "Python, FastAPI, React, PostgreSQL"
   - Architecture: "Microservices with API Gateway"
   - Constraints: "High availability, <100ms response time"
3. Use constitutional gates to ensure quality
4. Generate detailed technical specification
```

#### 2. Template Selection
```bash
# Choose and customize agent templates
1. Browse the Azure AI Foundry catalog
2. Select relevant templates:
   - "Code Generation Agent"
   - "Testing Agent" 
   - "Documentation Agent"
3. Customize prompts and behaviors
4. Test agent interactions
```

#### 3. Pattern Design
```bash
# Design multi-agent workflow
1. Open Pattern Workbench
2. Create workflow:
   - Code Generation Agent → Testing Agent → Documentation Agent
3. Configure parallel execution for independent tasks
4. Set up error handling and retry logic
```

#### 4. GitHub Integration
```bash
# Connect to GitHub and assign tasks
1. Register GitHub App (see GitHub Integration Setup)
2. Connect your repository
3. Assign tasks to GitHub Copilot:
   - "Implement user authentication API"
   - "Create recommendation algorithm"
   - "Write unit tests for all components"
4. Monitor progress and review generated code
```

#### 5. Post-Training (Optional)
```bash
# Fine-tune models for your specific domain
1. Collect feedback on generated code
2. Prepare training data with your preferences
3. Configure RL training pipeline
4. Train and evaluate custom models
5. Deploy improved models
```

### Use Cases

#### Software Development
- **API Development**: Generate REST APIs with OpenAPI specifications
- **Frontend Development**: Create React components and pages
- **Database Design**: Generate schema and migration scripts
- **Testing**: Automated test generation and quality assurance

#### AI/ML Projects
- **Model Training**: Customize training pipelines and hyperparameters
- **Data Processing**: Generate ETL scripts and data validation
- **Model Deployment**: Create inference APIs and monitoring
- **Documentation**: Generate technical documentation and tutorials

#### DevOps & Infrastructure
- **Infrastructure as Code**: Generate Terraform and Kubernetes manifests
- **CI/CD Pipelines**: Create GitHub Actions and deployment scripts
- **Monitoring**: Set up logging, metrics, and alerting
- **Security**: Implement security best practices and compliance

#### Research & Experimentation
- **Prototype Development**: Rapidly prototype new ideas
- **A/B Testing**: Compare different implementations
- **Performance Optimization**: Identify and fix bottlenecks
- **Knowledge Management**: Document and share research findings

## 🔧 Troubleshooting

### Common Issues

#### Backend Won't Start

**Error**: `ModuleNotFoundError` or import errors
```bash
# Solution: Make sure you're in the virtual environment
cd src/backend
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Error**: `Port 8000 already in use`
```bash
# Solution: Kill existing process or use different port
pkill -f "uvicorn"
# Or use different port
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend Won't Start

**Error**: `Port 5173 already in use`
```bash
# Solution: Vite will automatically try the next available port
# Check the terminal output for the actual port (usually 5174)
```

**Error**: `pnpm: command not found`
```bash
# Solution: Install pnpm
npm install -g pnpm
```

#### API Connection Issues

**Error**: `Failed to fetch` or CORS errors
```bash
# Solution: Make sure backend is running on port 8000
curl http://localhost:8000/healthz

# Check if frontend is pointing to correct API URL
# In src/frontend/.env.local:
VITE_API_URL=http://localhost:8000
```

#### Azure OpenAI Issues

**Error**: `401 Unauthorized` or `403 Forbidden`
```bash
# Solution: Check your Azure OpenAI credentials
# In src/backend/.env:
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

**Error**: `Rate limit exceeded` on localhost
```bash
# Solution: Rate limiting is disabled for localhost
# If you see this error, check your host header configuration
```

### Getting Help

1. **Check Logs**: Look at the terminal output for detailed error messages
2. **Verify Setup**: Make sure all prerequisites are installed correctly
3. **Test Components**: Test backend and frontend separately
4. **Check Issues**: Look at [GitHub Issues](https://github.com/Azure/aifoundry-apps/issues) for known problems
5. **Create Issue**: If you can't solve it, create a new issue with:
   - Your operating system
   - Error messages
   - Steps to reproduce
   - Your configuration (without sensitive data)

### Performance Tips

- **Memory**: Use at least 2GB RAM for smooth operation
- **Storage**: SSD recommended for better performance
- **Network**: Stable internet connection for Azure OpenAI calls
- **Caching**: Redis improves performance for production deployments

## Contributing

This project is in active development. Contributions, feedback, and suggestions are welcome as we build the future of agent-driven software engineering.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.