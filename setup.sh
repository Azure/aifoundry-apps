#!/bin/bash

# AIfoundry.app Setup Script
# This script helps you get started with AIfoundry.app quickly

set -e

echo "🚀 AIfoundry.app Setup Script"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "src" ]; then
    echo "❌ Error: Please run this script from the AIfoundry.app root directory"
    echo "   Make sure you've cloned the repository first:"
    echo "   git clone https://github.com/Azure/aifoundry-apps.git"
    echo "   cd aifoundry-apps"
    exit 1
fi

echo "✅ Found AIfoundry.app project directory"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    echo "✅ Python $PYTHON_VERSION found"
else
    echo "❌ Python 3.12+ is required but not found"
    echo "   Please install Python 3.12+ from https://python.org"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo "✅ Node.js $(node --version) found"
    else
        echo "❌ Node.js 18+ is required but found $(node --version)"
        echo "   Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi
else
    echo "❌ Node.js 18+ is required but not found"
    echo "   Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check if uv is installed
if command -v uv &> /dev/null; then
    echo "✅ uv found"
else
    echo "⚠️  uv not found, installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
    echo "✅ uv installed"
fi

# Check if pnpm is installed
if command -v pnpm &> /dev/null; then
    echo "✅ pnpm found"
else
    echo "⚠️  pnpm not found, installing..."
    npm install -g pnpm
    echo "✅ pnpm installed"
fi

echo ""
echo "🎯 Setup Options:"
echo "1. Local Development (Recommended for testing)"
echo "2. Self-Hosting with Docker (Recommended for production)"
echo "3. Manual Setup (More control)"
echo ""

read -p "Choose an option (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🔧 Setting up Local Development..."
        echo ""
        
        # Backend setup
        echo "📦 Setting up backend..."
        cd src/backend
        uv venv
        source .venv/bin/activate
        uv sync
        echo "✅ Backend dependencies installed"
        
        # Frontend setup
        echo "📦 Setting up frontend..."
        cd ../frontend
        pnpm install
        echo "✅ Frontend dependencies installed"
        
        echo ""
        echo "🎉 Setup complete!"
        echo ""
        echo "To start the application:"
        echo "1. Backend: cd src/backend && source .venv/bin/activate && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
        echo "2. Frontend: cd src/frontend && pnpm run dev"
        echo ""
        echo "Then open http://localhost:5173 in your browser"
        echo ""
        echo "📝 Next steps:"
        echo "1. Configure Azure OpenAI credentials in src/backend/.env"
        echo "2. For full functionality, register a GitHub App (see README.md)"
        echo "3. Explore the customization features in the application"
        ;;
        
    2)
        echo ""
        echo "🐳 Setting up Self-Hosting with Docker..."
        echo ""
        
        # Check if Docker is installed
        if command -v docker &> /dev/null; then
            echo "✅ Docker found"
        else
            echo "❌ Docker is required but not found"
            echo "   Please install Docker from https://docker.com"
            exit 1
        fi
        
        # Check if Docker Compose is installed
        if command -v docker-compose &> /dev/null; then
            echo "✅ Docker Compose found"
        else
            echo "❌ Docker Compose is required but not found"
            echo "   Please install Docker Compose from https://docker.com"
            exit 1
        fi
        
        # Create environment file
        echo "📝 Creating environment file..."
        cd deployment
        cat > .env << EOF
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
EOF
        
        echo "✅ Environment file created at deployment/.env"
        echo ""
        echo "⚠️  IMPORTANT: Edit deployment/.env with your Azure OpenAI credentials"
        echo ""
        echo "To start the application:"
        echo "cd deployment && docker-compose up -d"
        echo ""
        echo "Then open http://localhost:3000 in your browser"
        ;;
        
    3)
        echo ""
        echo "🔧 Manual Setup Instructions:"
        echo ""
        echo "1. Backend Setup:"
        echo "   cd src/backend"
        echo "   uv venv"
        echo "   source .venv/bin/activate  # On Windows: .venv\\Scripts\\activate"
        echo "   uv sync"
        echo "   # Create .env file with your Azure OpenAI credentials"
        echo "   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
        echo ""
        echo "2. Frontend Setup:"
        echo "   cd src/frontend"
        echo "   pnpm install"
        echo "   pnpm run dev"
        echo ""
        echo "3. Open http://localhost:5173 in your browser"
        echo ""
        echo "For detailed instructions, see README.md"
        ;;
        
    *)
        echo "❌ Invalid option. Please run the script again and choose 1, 2, or 3."
        exit 1
        ;;
esac

echo ""
echo "📚 For more information, see:"
echo "   - README.md (main documentation)"
echo "   - deployment/README.md (deployment guide)"
echo "   - https://github.com/Azure/aifoundry-apps"
echo ""
echo "🎉 Happy coding with AIfoundry.app!"
