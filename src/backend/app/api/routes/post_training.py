from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx
import json
import logging
import os
from typing import List, Dict, Any
from ...models.schemas import DatasetSearchRequest, DatasetSearchResponse, NotebookGenerationRequest
from ...core.config import settings
from openai import OpenAI

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/search-datasets", response_model=DatasetSearchResponse)
async def search_similar_datasets(request: DatasetSearchRequest):
    """Search for similar datasets on HuggingFace using Azure OpenAI for similarity matching"""
    
    try:
        # Check if HuggingFace API token is configured
        if not settings.HF_API_TOKEN:
            raise HTTPException(
                status_code=500, 
                detail="HuggingFace API token not configured. Please set HF_API_TOKEN environment variable."
            )
        
        async with httpx.AsyncClient() as client:
            hf_response = await client.get(
                "https://huggingface.co/api/datasets",
                params={"limit": 50, "sort": "downloads", "direction": -1},
                headers={"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
            )
            
            if hf_response.status_code != 200:
                error_detail = f"Failed to fetch datasets from HuggingFace. Status: {hf_response.status_code}"
                if hf_response.status_code == 401:
                    error_detail += " - Invalid or missing HuggingFace API token"
                elif hf_response.status_code == 403:
                    error_detail += " - HuggingFace API access forbidden"
                raise HTTPException(status_code=500, detail=error_detail)
            
            datasets = hf_response.json()
        
        if request.query:
            try:
                client = OpenAI(
                    api_key=settings.AZURE_OPENAI_KEY,
                    base_url=f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/",
                    default_query={"api-version": settings.API_VERSION}
                )
                
                dataset_descriptions = []
                for dataset in datasets[:20]:
                    desc = {
                        "id": dataset.get("id", ""),
                        "description": dataset.get("description", "")[:200],
                        "tags": dataset.get("tags", [])[:5]
                    }
                    dataset_descriptions.append(desc)
                
                system_prompt = """You are a dataset recommendation system. Given a user query and a list of datasets, 
                return the IDs of the 5 most relevant datasets in JSON format: {"relevant_ids": ["id1", "id2", ...]}"""
                
                user_prompt = f"""Query: {request.query}
                
                Available datasets:
                {json.dumps(dataset_descriptions, indent=2)}
                
                Return the 5 most relevant dataset IDs based on the query."""
                
                response = client.chat.completions.create(
                    model=settings.MODEL_NAME,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.3,
                    max_tokens=500
                )
                
                result_text = response.choices[0].message.content.strip()
                if result_text.startswith("```json"):
                    result_text = result_text[7:-3].strip()
                elif result_text.startswith("```"):
                    result_text = result_text[3:-3].strip()
                
                relevant_result = json.loads(result_text)
                relevant_ids = relevant_result.get("relevant_ids", [])
                
                filtered_datasets = [d for d in datasets if d.get("id") in relevant_ids]
                
            except Exception as e:
                logger.warning(f"Failed to use AI for dataset filtering: {e}")
                query_lower = request.query.lower()
                filtered_datasets = [
                    d for d in datasets 
                    if query_lower in d.get("description", "").lower() or 
                       any(query_lower in tag.lower() for tag in d.get("tags", []))
                ][:10]
        else:
            filtered_datasets = datasets[:10]
        
        formatted_datasets = []
        for dataset in filtered_datasets:
            formatted_datasets.append({
                "id": dataset.get("id", ""),
                "name": dataset.get("id", "").split("/")[-1] if "/" in dataset.get("id", "") else dataset.get("id", ""),
                "description": dataset.get("description", "")[:200] + ("..." if len(dataset.get("description", "")) > 200 else ""),
                "downloads": dataset.get("downloads", 0),
                "likes": dataset.get("likes", 0),
                "tags": dataset.get("tags", [])[:5]
            })
        
        return DatasetSearchResponse(datasets=formatted_datasets)
        
    except Exception as e:
        logger.error(f"Error searching datasets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search datasets: {str(e)}")

@router.post("/generate-notebook")
async def generate_notebook(request: NotebookGenerationRequest):
    """Generate a Jupyter notebook for GRPO post-training"""
    
    try:
        dataset_name = request.dataset.get("name", "custom_dataset")
        hp = request.hyperparameters
        
        notebook_content = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "# GRPO fine-tuning with Post-training on **Phi-4 Mini Instruct** (LoRA/PEFT)\n",
                        "\n",
                        "This end-to-end notebook shows how to:\n",
                        "\n",
                        "1) Load **Phi-4 Mini Instruct** quantized to 4-bit and enable **LoRA/PEFT** with [Unsloth](https://unsloth.ai/).\n",
                        "2) Train with **GRPO** (Group Relative Policy Optimization) using custom rewards.\n",
                        "3) Save and reuse the LoRA adapter.\n",
                        "4) Deploy on **Azure Machine Learning** or **Azure Nvidia GPUs**.\n",
                        "\n",
                        f"**Dataset**: {dataset_name}\n",
                        f"**Learning Rate**: {hp.learning_rate}\n",
                        f"**Batch Size**: {hp.batch_size}\n",
                        f"**Epochs**: {hp.num_epochs}\n"
                    ]
                },
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "## 0) Installs\n",
                        "\n",
                        "Install Unsloth, TRL (for the GRPOConfig/GRPOTrainer API), and support libraries."
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Install required packages\n",
                        "!pip install unsloth vllm==0.8.5.post1\n",
                        "!pip install bitsandbytes accelerate xformers peft \"trl==0.15.2\" triton\n",
                        "!pip install sentencepiece protobuf \"datasets>=3.4.1\" huggingface_hub\n",
                        "!pip install transformers==4.51.3 ipywidgets requests\n",
                        "!pip install azure-ai-ml azure-identity  # For Azure ML deployment"
                    ]
                },
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "## 1) Load and prepare the model"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "from unsloth import FastLanguageModel\n",
                        "import torch\n",
                        "\n",
                        "# Load Phi-4 model with 4-bit quantization\n",
                        f"max_seq_length = {hp.max_seq_length}\n",
                        "dtype = None  # Auto-detect\n",
                        "load_in_4bit = True\n",
                        "\n",
                        "model, tokenizer = FastLanguageModel.from_pretrained(\n",
                        "    model_name=\"microsoft/Phi-4\",\n",
                        "    max_seq_length=max_seq_length,\n",
                        "    dtype=dtype,\n",
                        "    load_in_4bit=load_in_4bit,\n",
                        ")\n",
                        "\n",
                        "# Add LoRA adapters\n",
                        "model = FastLanguageModel.get_peft_model(\n",
                        "    model,\n",
                        f"    r={hp.lora_r},\n",
                        "    target_modules=[\"q_proj\", \"k_proj\", \"v_proj\", \"o_proj\", \"gate_proj\", \"up_proj\", \"down_proj\"],\n",
                        f"    lora_alpha={hp.lora_alpha},\n",
                        f"    lora_dropout={hp.lora_dropout},\n",
                        "    bias=\"none\",\n",
                        "    use_gradient_checkpointing=\"unsloth\",\n",
                        "    random_state=3407,\n",
                        ")"
                    ]
                },
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "## 2) Load and prepare dataset"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "from datasets import load_dataset\n",
                        "\n",
                        f"# Load dataset: {dataset_name}\n",
                        "# Replace with your actual dataset loading logic\n",
                        "dataset = load_dataset(\"your_dataset_here\", split=\"train\")\n",
                        "\n",
                        "# Format dataset for instruction tuning\n",
                        "def format_prompts(examples):\n",
                        "    inputs = examples[\"input\"]\n",
                        "    outputs = examples[\"output\"]\n",
                        "    texts = []\n",
                        "    for input_text, output_text in zip(inputs, outputs):\n",
                        "        text = f\"<|user|>\\n{input_text}<|end|>\\n<|assistant|>\\n{output_text}<|end|>\"\n",
                        "        texts.append(text)\n",
                        "    return {\"text\": texts}\n",
                        "\n",
                        "dataset = dataset.map(format_prompts, batched=True)"
                    ]
                },
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "## 3) SFT Warmup Training"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "from trl import SFTTrainer\n",
                        "from transformers import TrainingArguments\n",
                        "\n",
                        "# SFT warmup training arguments\n",
                        "training_args = TrainingArguments(\n",
                        f"    per_device_train_batch_size={hp.batch_size},\n",
                        "    gradient_accumulation_steps=1,\n",
                        f"    warmup_steps={hp.warmup_steps},\n",
                        f"    num_train_epochs={hp.num_epochs},\n",
                        f"    learning_rate={hp.learning_rate},\n",
                        "    fp16=not torch.cuda.is_bf16_supported(),\n",
                        "    bf16=torch.cuda.is_bf16_supported(),\n",
                        "    logging_steps=1,\n",
                        "    optim=\"adamw_8bit\",\n",
                        "    weight_decay=0.01,\n",
                        "    lr_scheduler_type=\"linear\",\n",
                        "    seed=3407,\n",
                        "    output_dir=\"outputs\",\n",
                        ")\n",
                        "\n",
                        "# SFT Trainer\n",
                        "trainer = SFTTrainer(\n",
                        "    model=model,\n",
                        "    tokenizer=tokenizer,\n",
                        "    train_dataset=dataset,\n",
                        "    dataset_text_field=\"text\",\n",
                        "    max_seq_length=max_seq_length,\n",
                        "    dataset_num_proc=2,\n",
                        "    args=training_args,\n",
                        ")\n",
                        "\n",
                        "# Start SFT training\n",
                        "trainer.train()"
                    ]
                },
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "## 4) GRPO Training"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "from trl import GRPOConfig, GRPOTrainer\n",
                        "\n",
                        "# GRPO configuration\n",
                        "grpo_config = GRPOConfig(\n",
                        f"    learning_rate={hp.learning_rate},\n",
                        f"    batch_size={hp.batch_size},\n",
                        f"    mini_batch_size={hp.batch_size // 2},\n",
                        "    gradient_accumulation_steps=1,\n",
                        f"    grpo_epochs={hp.num_epochs},\n",
                        f"    beta={hp.grpo_beta},\n",
                        f"    group_size={hp.grpo_group_size},\n",
                        "    max_length=max_seq_length,\n",
                        "    optimize_cuda_cache=True,\n",
                        ")\n",
                        "\n",
                        "# GRPO Trainer\n",
                        "grpo_trainer = GRPOTrainer(\n",
                        "    config=grpo_config,\n",
                        "    model=model,\n",
                        "    tokenizer=tokenizer,\n",
                        "    train_dataset=dataset,\n",
                        ")\n",
                        "\n",
                        "# Start GRPO training\n",
                        "grpo_trainer.train()"
                    ]
                },
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "## 5) Save the model"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Save LoRA adapter\n",
                        "model.save_pretrained(\"phi4_grpo_lora\")\n",
                        "tokenizer.save_pretrained(\"phi4_grpo_lora\")\n",
                        "\n",
                        "# Save merged model (optional)\n",
                        "# model.save_pretrained_merged(\"phi4_grpo_merged\", tokenizer, save_method=\"merged_16bit\")"
                    ]
                },
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "## 6) Azure ML Deployment\n",
                        "\n",
                        "Deploy your trained model to Azure Machine Learning for inference."
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "from azure.ai.ml import MLClient\n",
                        "from azure.identity import DefaultAzureCredential\n",
                        "from azure.ai.ml.entities import Model, Environment, CodeConfiguration, ManagedOnlineEndpoint, ManagedOnlineDeployment\n",
                        "\n",
                        "# Initialize Azure ML client\n",
                        "credential = DefaultAzureCredential()\n",
                        "ml_client = MLClient(\n",
                        "    credential=credential,\n",
                        "    subscription_id=\"your-subscription-id\",\n",
                        "    resource_group_name=\"your-resource-group\",\n",
                        "    workspace_name=\"your-workspace-name\"\n",
                        ")\n",
                        "\n",
                        "# Register the model\n",
                        "model = Model(\n",
                        "    path=\"./phi4_grpo_lora\",\n",
                        "    name=\"phi4-grpo-model\",\n",
                        "    description=\"Phi-4 model fine-tuned with GRPO\",\n",
                        "    version=\"1\"\n",
                        ")\n",
                        "registered_model = ml_client.models.create_or_update(model)\n",
                        "\n",
                        "# Create deployment endpoint\n",
                        "endpoint = ManagedOnlineEndpoint(\n",
                        "    name=\"phi4-grpo-endpoint\",\n",
                        "    description=\"Endpoint for Phi-4 GRPO model\",\n",
                        "    auth_mode=\"key\"\n",
                        ")\n",
                        "ml_client.online_endpoints.begin_create_or_update(endpoint)\n",
                        "\n",
                        "print(\"Model registered and endpoint created successfully!\")\n",
                        "print(\"Instructions for Azure Nvidia GPU deployment:\")\n",
                        "print(\"1. Use Standard_NC6s_v3 or Standard_NC12s_v3 VM sizes\")\n",
                        "print(\"2. Configure GPU compute for optimal inference performance\")\n",
                        "print(\"3. Monitor resource usage and scale as needed\")"
                    ]
                }
            ],
            "metadata": {
                "kernelspec": {
                    "display_name": "Python 3",
                    "language": "python",
                    "name": "python3"
                },
                "language_info": {
                    "codemirror_mode": {
                        "name": "ipython",
                        "version": 3
                    },
                    "file_extension": ".py",
                    "mimetype": "text/x-python",
                    "name": "python",
                    "nbconvert_exporter": "python",
                    "pygments_lexer": "ipython3",
                    "version": "3.8.5"
                }
            },
            "nbformat": 4,
            "nbformat_minor": 4
        }
        
        notebook_json = json.dumps(notebook_content, indent=2)
        
        return Response(
            content=notebook_json,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=post_training_grpo_notebook.ipynb"}
        )
        
    except Exception as e:
        logger.error(f"Error generating notebook: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate notebook: {str(e)}")
