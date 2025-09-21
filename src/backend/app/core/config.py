import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    GITHUB_REDIRECT_URI: str = os.getenv("GITHUB_REDIRECT_URI", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    
    GITHUB_APP_ID: str = os.getenv("GITHUB_APP_ID", "")
    GITHUB_PRIVATE_KEY_PATH: str = os.getenv("GITHUB_PRIVATE_KEY_PATH", "")
    
    AZURE_OPENAI_KEY: str = os.getenv("AZURE_OPENAI_KEY", "")
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "https://gkcodex-resource.cognitiveservices.azure.com/")
    API_VERSION: str = os.getenv("API_VERSION", "preview")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "gpt-5-nano")
    
    DEVIN_API_BASE_URL: str = os.getenv("DEVIN_API_BASE_URL", "https://api.devin.ai")
    
    HF_API_TOKEN: str = os.getenv("HF_TOKEN", "")
    
    COSMOS_CONNECTION_STRING: str = os.getenv("COSMOS_CONNECTION_STRING", "")
    COSMOS_DATABASE_ID: str = os.getenv("COSMOS_DATABASE_ID", "aifoundry")

settings = Settings()
