#!/usr/bin/env python3
"""
Environment setup script for AIfoundry.app backend.
This script helps you set up the required environment variables.
"""

import os
import sys
from pathlib import Path

def create_env_file():
    """Create a .env file with the required environment variables."""
    env_file = Path(".env")
    
    if env_file.exists():
        print("⚠️  .env file already exists. Backing up to .env.backup")
        env_file.rename(".env.backup")
    
    env_content = """# AIfoundry.app Backend Environment Variables
# Copy this file and fill in your actual values

# Required for HuggingFace dataset access
# Get your token from: https://huggingface.co/settings/tokens
HF_TOKEN=your_huggingface_api_token_here

# Required for Azure OpenAI
AZURE_OPENAI_KEY=your_azure_openai_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/

# Optional GitHub integration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback
GITHUB_TOKEN=your_github_personal_access_token_here

# Optional Azure Cosmos DB
COSMOS_CONNECTION_STRING=your_cosmos_connection_string_here
COSMOS_DATABASE_ID=aifoundry

# Optional Devin AI
DEVIN_API_BASE_URL=https://api.devin.ai

# Optional Azure OpenAI settings
API_VERSION=preview
MODEL_NAME=gpt-5-nano
"""
    
    with open(env_file, "w") as f:
        f.write(env_content)
    
    print(f"✅ Created {env_file}")
    print("\n📝 Next steps:")
    print("1. Edit the .env file and add your actual API keys")
    print("2. Get a HuggingFace token from: https://huggingface.co/settings/tokens")
    print("3. Run the backend with: uv run fastapi dev app/main.py")

def check_environment():
    """Check if required environment variables are set."""
    required_vars = ["HF_TOKEN", "AZURE_OPENAI_KEY", "AZURE_OPENAI_ENDPOINT"]
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n💡 Run this script to create a .env template: python setup_env.py")
        return False
    else:
        print("✅ All required environment variables are set!")
        return True

def main():
    """Main function."""
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        check_environment()
    else:
        create_env_file()

if __name__ == "__main__":
    main()
