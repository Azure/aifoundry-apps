# AIfoundry.app Setup Script for Windows
# This script helps you get started with AIfoundry.app quickly

Write-Host "🚀 AIfoundry.app Setup Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "README.md") -or -not (Test-Path "src")) {
    Write-Host "❌ Error: Please run this script from the AIfoundry.app root directory" -ForegroundColor Red
    Write-Host "   Make sure you've cloned the repository first:" -ForegroundColor Yellow
    Write-Host "   git clone https://github.com/Azure/aifoundry-apps.git" -ForegroundColor Yellow
    Write-Host "   cd aifoundry-apps" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found AIfoundry.app project directory" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check Python
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python (\d+)\.(\d+)") {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        if ($major -eq 3 -and $minor -ge 12) {
            Write-Host "✅ Python $($matches[1]).$($matches[2]) found" -ForegroundColor Green
        } else {
            Write-Host "❌ Python 3.12+ is required but found $pythonVersion" -ForegroundColor Red
            Write-Host "   Please install Python 3.12+ from https://python.org" -ForegroundColor Yellow
            exit 1
        }
    }
} catch {
    Write-Host "❌ Python 3.12+ is required but not found" -ForegroundColor Red
    Write-Host "   Please install Python 3.12+ from https://python.org" -ForegroundColor Yellow
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajor -ge 18) {
        Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js 18+ is required but found $nodeVersion" -ForegroundColor Red
        Write-Host "   Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Node.js 18+ is required but not found" -ForegroundColor Red
    Write-Host "   Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check if uv is installed
try {
    uv --version | Out-Null
    Write-Host "✅ uv found" -ForegroundColor Green
} catch {
    Write-Host "⚠️  uv not found, installing..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://astral.sh/uv/install.ps1" -OutFile "install-uv.ps1"
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    .\install-uv.ps1
    Remove-Item "install-uv.ps1"
    Write-Host "✅ uv installed" -ForegroundColor Green
}

# Check if pnpm is installed
try {
    pnpm --version | Out-Null
    Write-Host "✅ pnpm found" -ForegroundColor Green
} catch {
    Write-Host "⚠️  pnpm not found, installing..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "✅ pnpm installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Setup Options:" -ForegroundColor Cyan
Write-Host "1. Local Development (Recommended for testing)" -ForegroundColor White
Write-Host "2. Self-Hosting with Docker (Recommended for production)" -ForegroundColor White
Write-Host "3. Manual Setup (More control)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Choose an option (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔧 Setting up Local Development..." -ForegroundColor Cyan
        Write-Host ""
        
        # Backend setup
        Write-Host "📦 Setting up backend..." -ForegroundColor Yellow
        Set-Location "src\backend"
        uv venv
        & ".venv\Scripts\Activate.ps1"
        uv sync
        Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
        
        # Frontend setup
        Write-Host "📦 Setting up frontend..." -ForegroundColor Yellow
        Set-Location "..\frontend"
        pnpm install
        Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🎉 Setup complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "To start the application:" -ForegroundColor Cyan
        Write-Host "1. Backend: cd src\backend && .venv\Scripts\Activate.ps1 && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -ForegroundColor White
        Write-Host "2. Frontend: cd src\frontend && pnpm run dev" -ForegroundColor White
        Write-Host ""
        Write-Host "Then open http://localhost:5173 in your browser" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📝 Next steps:" -ForegroundColor Cyan
        Write-Host "1. Configure Azure OpenAI credentials in src\backend\.env" -ForegroundColor White
        Write-Host "2. For full functionality, register a GitHub App (see README.md)" -ForegroundColor White
        Write-Host "3. Explore the customization features in the application" -ForegroundColor White
    }
    
    "2" {
        Write-Host ""
        Write-Host "🐳 Setting up Self-Hosting with Docker..." -ForegroundColor Cyan
        Write-Host ""
        
        # Check if Docker is installed
        try {
            docker --version | Out-Null
            Write-Host "✅ Docker found" -ForegroundColor Green
        } catch {
            Write-Host "❌ Docker is required but not found" -ForegroundColor Red
            Write-Host "   Please install Docker Desktop from https://docker.com" -ForegroundColor Yellow
            exit 1
        }
        
        # Check if Docker Compose is installed
        try {
            docker-compose --version | Out-Null
            Write-Host "✅ Docker Compose found" -ForegroundColor Green
        } catch {
            Write-Host "❌ Docker Compose is required but not found" -ForegroundColor Red
            Write-Host "   Please install Docker Desktop from https://docker.com" -ForegroundColor Yellow
            exit 1
        }
        
        # Create environment file
        Write-Host "📝 Creating environment file..." -ForegroundColor Yellow
        Set-Location "deployment"
        $envContent = @"
# Application Settings
NODE_ENV=production
VITE_API_URL=http://localhost:8000

# Azure AI Foundry (Required for AI features)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Optional: Database (defaults to in-memory)
# DATABASE_URL=postgresql://user:password@localhost:5432/aifoundry

# Optional: Redis (defaults to in-memory)
# REDIS_URL=redis://localhost:6379
"@
        $envContent | Out-File -FilePath ".env" -Encoding UTF8
        
        Write-Host "✅ Environment file created at deployment\.env" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Edit deployment\.env with your Azure OpenAI credentials" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To start the application:" -ForegroundColor Cyan
        Write-Host "cd deployment && docker-compose up -d" -ForegroundColor White
        Write-Host ""
        Write-Host "Then open http://localhost:3000 in your browser" -ForegroundColor Cyan
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔧 Manual Setup Instructions:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Backend Setup:" -ForegroundColor Yellow
        Write-Host "   cd src\backend" -ForegroundColor White
        Write-Host "   uv venv" -ForegroundColor White
        Write-Host "   .venv\Scripts\Activate.ps1" -ForegroundColor White
        Write-Host "   uv sync" -ForegroundColor White
        Write-Host "   # Create .env file with your Azure OpenAI credentials" -ForegroundColor White
        Write-Host "   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -ForegroundColor White
        Write-Host ""
        Write-Host "2. Frontend Setup:" -ForegroundColor Yellow
        Write-Host "   cd src\frontend" -ForegroundColor White
        Write-Host "   pnpm install" -ForegroundColor White
        Write-Host "   pnpm run dev" -ForegroundColor White
        Write-Host ""
        Write-Host "3. Open http://localhost:5173 in your browser" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "For detailed instructions, see README.md" -ForegroundColor Cyan
    }
    
    default {
        Write-Host "❌ Invalid option. Please run the script again and choose 1, 2, or 3." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📚 For more information, see:" -ForegroundColor Cyan
Write-Host "   - README.md (main documentation)" -ForegroundColor White
Write-Host "   - deployment\README.md (deployment guide)" -ForegroundColor White
Write-Host "   - https://github.com/Azure/aifoundry-apps" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy coding with AIfoundry.app!" -ForegroundColor Green
