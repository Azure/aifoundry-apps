from typing import List, Optional, Dict, Any
import logging
import uuid
from datetime import datetime
import os
from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from azure.identity import DefaultAzureCredential
from ..models.schemas import Spec, SpecCreateRequest
from ..core.config import settings

logger = logging.getLogger(__name__)

class SpecService:
    def __init__(self):
        self._cosmos_client = None
        self._database = None
        self._container = None
        self._init_cosmos()
    
    def _init_cosmos(self) -> None:
        try:
            endpoint = getattr(settings, 'COSMOS_ENDPOINT', os.getenv('COSMOS_ENDPOINT'))
            
            if endpoint:
                try:
                    credential = DefaultAzureCredential()
                    self._cosmos_client = CosmosClient(endpoint, credential)
                    logger.info("Using AAD authentication for Cosmos DB")
                except Exception as aad_error:
                    logger.warning(f"AAD authentication failed: {aad_error}")
                    
                    if hasattr(settings, 'COSMOS_CONNECTION_STRING') and settings.COSMOS_CONNECTION_STRING:
                        self._cosmos_client = CosmosClient.from_connection_string(settings.COSMOS_CONNECTION_STRING)
                        logger.info("Using connection string authentication for Cosmos DB")
                    else:
                        key = getattr(settings, 'COSMOS_KEY', os.getenv('COSMOS_KEY'))
                        if key:
                            self._cosmos_client = CosmosClient(endpoint, key)
                            logger.info("Using key-based authentication for Cosmos DB")
            
            if self._cosmos_client:
                database_id = getattr(settings, 'COSMOS_DATABASE_ID', os.getenv('COSMOS_DATABASE_ID', 'aifoundry'))
                container_id = getattr(settings, 'COSMOS_CONTAINER_ID', os.getenv('COSMOS_CONTAINER_ID', 'specs'))
                
                self._database = self._cosmos_client.create_database_if_not_exists(id=database_id)
                self._container = self._database.create_container_if_not_exists(
                    id=container_id,
                    partition_key=PartitionKey(path="/id"),
                    offer_throughput=400
                )
                logger.info("Cosmos DB initialized successfully")
                self._init_fallback_storage()
            else:
                logger.warning("Cosmos DB not configured, falling back to in-memory storage")
                self._init_fallback_storage()
        except Exception as e:
            logger.error(f"Failed to initialize Cosmos DB: {e}")
            self._cosmos_client = None
            self._container = None
            logger.warning("Falling back to in-memory storage due to Cosmos DB error")
            self._init_fallback_storage()
    
    def _init_fallback_storage(self) -> None:
        """Initialize in-memory storage as fallback when Cosmos DB is not available"""
        self._memory_specs: Dict[str, Spec] = {}
        self._memory_versions: Dict[str, List[Dict[str, Any]]] = {}
        
        # Load starter specs from specs.json
        self._load_starter_specs()
        
        logger.info("Initialized in-memory storage for specs")
    
    def get_all_specs(self) -> List[Spec]:
        if hasattr(self, '_memory_specs') and self._memory_specs:
            return list(self._memory_specs.values())
        
        if not self._container:
            return []
        
        try:
            items = list(self._container.query_items(
                query="SELECT * FROM c WHERE c.type = 'spec' ORDER BY c.created_at DESC",
                enable_cross_partition_query=True
            ))
            return [Spec(**item) for item in items]
        except Exception as e:
            logger.error(f"Error fetching specs: {e}")
            return []
    
    def get_spec_by_id(self, spec_id: str) -> Optional[Spec]:
        if not self._container:
            if hasattr(self, '_memory_specs'):
                return self._memory_specs.get(spec_id)
            return None
        
        try:
            item = self._container.read_item(item=spec_id, partition_key=spec_id)
            return Spec(**item)
        except CosmosResourceNotFoundError:
            return None
        except Exception as e:
            logger.error(f"Error fetching spec {spec_id}: {e}")
            return None
    
    def get_spec_versions(self, spec_id: str) -> List[Dict[str, Any]]:
        if not self._container:
            return []
        
        try:
            items = list(self._container.query_items(
                query="SELECT * FROM c WHERE c.spec_id = @spec_id AND c.type = 'spec_version' ORDER BY c.version DESC",
                parameters=[{"name": "@spec_id", "value": spec_id}],
                enable_cross_partition_query=True
            ))
            return items
        except Exception as e:
            logger.error(f"Error fetching spec versions for {spec_id}: {e}")
            return []
    
    def create_spec(self, request: SpecCreateRequest) -> Spec:
        spec_id = str(uuid.uuid4())
        feature_number = self._generate_feature_number()
        branch_name = f"{feature_number}-{self._slugify(request.title)}"
        
        new_spec = Spec(
            id=spec_id,
            title=request.title,
            description=request.description,
            content=request.content,
            tags=request.tags,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            phase="specification",
            specification=request.content,
            plan=None,
            tasks=None,
            branch_name=branch_name,
            feature_number=feature_number,
            version=1,
            constitutional_compliance={}
        )
        
        if self._container:
            try:
                spec_dict = new_spec.model_dump()
                spec_dict['type'] = 'spec'
                self._container.create_item(body=spec_dict)
                
                self._create_version_record(spec_id, 1, "Initial specification created", spec_dict)
            except Exception as e:
                logger.error(f"Error creating spec in Cosmos DB: {e}")
        else:
            if hasattr(self, '_memory_specs'):
                self._memory_specs[spec_id] = new_spec
                if not hasattr(self, '_memory_versions'):
                    self._memory_versions = {}
                self._memory_versions[spec_id] = [{
                    "version": 1,
                    "change_description": "Initial specification created",
                    "timestamp": datetime.now().isoformat(),
                    "spec_data": new_spec.model_dump()
                }]
        
        return new_spec
    
    def update_spec(self, spec_id: str, request: SpecCreateRequest) -> Optional[Spec]:
        current_spec = self.get_spec_by_id(spec_id)
        if not current_spec:
            return None
        
        updated_spec = Spec(
            id=current_spec.id,
            title=request.title,
            description=request.description,
            content=request.content,
            tags=request.tags,
            created_at=current_spec.created_at,
            updated_at=datetime.now().isoformat(),
            phase=current_spec.phase,
            specification=current_spec.specification,
            plan=current_spec.plan,
            tasks=current_spec.tasks,
            branch_name=current_spec.branch_name,
            feature_number=current_spec.feature_number,
            version=current_spec.version + 1,
            constitutional_compliance=getattr(current_spec, 'constitutional_compliance', {})
        )
        
        if self._container:
            try:
                spec_dict = updated_spec.model_dump()
                spec_dict['type'] = 'spec'
                self._container.replace_item(item=spec_id, body=spec_dict)
                
                self._create_version_record(spec_id, updated_spec.version, "Specification updated", spec_dict)
            except Exception as e:
                logger.error(f"Error updating spec in Cosmos DB: {e}")
        else:
            if hasattr(self, '_memory_specs'):
                self._memory_specs[spec_id] = updated_spec
                if hasattr(self, '_memory_versions'):
                    if spec_id not in self._memory_versions:
                        self._memory_versions[spec_id] = []
                    self._memory_versions[spec_id].append({
                        "version": updated_spec.version,
                        "change_description": "Specification updated",
                        "timestamp": datetime.now().isoformat(),
                        "spec_data": updated_spec.model_dump()
                    })
        
        return updated_spec
    
    def update_spec_phase(self, spec_id: str, phase: str, **kwargs) -> Optional[Spec]:
        current_spec = self.get_spec_by_id(spec_id)
        if not current_spec:
            return None
        
        updated_spec = Spec(
            id=current_spec.id,
            title=current_spec.title,
            description=current_spec.description,
            content=current_spec.content,
            tags=current_spec.tags,
            created_at=current_spec.created_at,
            updated_at=datetime.now().isoformat(),
            phase=phase,
            specification=kwargs.get('specification', current_spec.specification),
            plan=kwargs.get('plan', current_spec.plan),
            tasks=kwargs.get('tasks', current_spec.tasks),
            branch_name=kwargs.get('branch_name', current_spec.branch_name),
            feature_number=kwargs.get('feature_number', current_spec.feature_number),
            version=current_spec.version + 1,
            constitutional_compliance=kwargs.get('constitutional_compliance', getattr(current_spec, 'constitutional_compliance', {})),
            planning=kwargs.get('planning', getattr(current_spec, 'planning', None))
        )
        
        if self._container:
            try:
                spec_dict = updated_spec.model_dump()
                spec_dict['type'] = 'spec'
                self._container.replace_item(item=spec_id, body=spec_dict)
                
                change_description = f"Phase updated to {phase}"
                if kwargs:
                    change_description += f" with changes: {', '.join(kwargs.keys())}"
                self._create_version_record(spec_id, updated_spec.version, change_description, spec_dict)
            except Exception as e:
                logger.error(f"Error updating spec phase in Cosmos DB: {e}")
        else:
            if hasattr(self, '_memory_specs'):
                self._memory_specs[spec_id] = updated_spec
                if hasattr(self, '_memory_versions'):
                    if spec_id not in self._memory_versions:
                        self._memory_versions[spec_id] = []
                    change_description = f"Phase updated to {phase}"
                    if kwargs:
                        change_description += f" with changes: {', '.join(kwargs.keys())}"
                    self._memory_versions[spec_id].append({
                        "version": updated_spec.version,
                        "change_description": change_description,
                        "timestamp": datetime.now().isoformat(),
                        "spec_data": updated_spec.model_dump()
                    })
        
        return updated_spec
    
    def _generate_feature_number(self) -> str:
        if not self._container:
            return "001"
        
        try:
            items = list(self._container.query_items(
                query="SELECT VALUE MAX(TONUMBER(c.feature_number)) FROM c WHERE c.type = 'spec'",
                enable_cross_partition_query=True
            ))
            max_num = items[0] if items and items[0] else 0
            return f"{max_num + 1:03d}"
        except Exception as e:
            logger.error(f"Error generating feature number: {e}")
            return "001"
    
    def _slugify(self, text: str) -> str:
        import re
        return re.sub(r'[^a-zA-Z0-9]+', '-', text.lower()).strip('-')
    
    def _create_version_record(self, spec_id: str, version: int, change_description: str, spec_data: Dict[str, Any]) -> None:
        if not self._container:
            return
        
        try:
            version_record = {
                "id": f"{spec_id}-v{version}",
                "spec_id": spec_id,
                "version": version,
                "change_description": change_description,
                "timestamp": datetime.now().isoformat(),
                "spec_data": spec_data,
                "type": "spec_version"
            }
            self._container.create_item(body=version_record)
        except Exception as e:
            logger.error(f"Error creating version record: {e}")
    
    def _load_starter_specs(self) -> None:
        """Load starter specifications from specs.json file"""
        try:
            import json
            from pathlib import Path
            
            # Find specs.json file relative to this module
            current_dir = Path(__file__).parent.parent
            specs_file = current_dir / "specs.json"
            
            if specs_file.exists():
                with open(specs_file, 'r', encoding='utf-8') as f:
                    specs_data = json.load(f)
                
                for spec_dict in specs_data:
                    try:
                        spec = Spec(**spec_dict)
                        self._memory_specs[spec.id] = spec
                        
                        # Create initial version record
                        if not hasattr(self, '_memory_versions'):
                            self._memory_versions = {}
                        self._memory_versions[spec.id] = [{
                            "version": 1,
                            "change_description": "Starter specification loaded",
                            "timestamp": spec.created_at,
                            "spec_data": spec_dict
                        }]
                    except Exception as spec_error:
                        logger.warning(f"Skipping invalid spec in specs.json: {spec_error}")
                
                logger.info(f"Loaded {len(self._memory_specs)} starter specs from specs.json")
            else:
                logger.warning(f"Starter specs file not found: {specs_file}")
        except Exception as e:
            logger.error(f"Error loading starter specs: {e}")
