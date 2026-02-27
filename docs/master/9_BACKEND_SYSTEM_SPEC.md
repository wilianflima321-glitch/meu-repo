# BACKEND_SYSTEM_SPEC.md
## Especificação Completa do Sistema Backend
**Data:** Janeiro 2026  
**Versão:** 1.0  
**Status:** Contrato de Execução

---

## 1. VISÃO GERAL

O backend é a fundação da plataforma, responsável por:
- Autenticação e autorização
- Gestão de projetos e arquivos
- Execução de código em containers
- Serviços de AI
- Deploy e hosting
- Colaboração real-time
- Admin e billing

### 1.1 MODOS DE OPERAÇÃO (HÍBRIDO)

A plataforma opera em dois modos distintos para garantir viabilidade econômica e performance AAA:

1.  **Modo Cloud (Web-Native):**
    - Execução em containers gerenciados (Kubernetes).
    - Foco: Coding, Preview leve (WebGPU), IA Agents, Colaboração.
    - Custo: Deduzido da Wallet do usuário (Pay-as-you-go).

2.  **Modo Local (Bridge):**
    - Execução na máquina do usuário (via CLI/Desktop Bridge).
    - Foco: Builds pesados (Unreal/Unity), Renderização 4K, Jogos AAA.
    - Custo: Zero infraestrutura para a plataforma (BYOD - Bring Your Own Device).

---

## 2. ARQUITETURA GERAL

### 2.1 Diagrama de Serviços

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                  │
│                           (Nginx / CloudFlare)                              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                              API GATEWAY                                    │
│                              (FastAPI)                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Middleware: Auth │ Rate Limit │ CORS │ Logging │ Error Handling    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────┬─────────────┬─────────────┬─────────────┬───────────────────────┘
            │             │             │             │
    ┌───────▼───┐ ┌───────▼───┐ ┌───────▼───┐ ┌───────▼───┐
    │   AUTH    │ │  PROJECT  │ │   FILE    │ │    AI     │
    │  SERVICE  │ │  SERVICE  │ │  SERVICE  │ │  SERVICE  │
    └───────────┘ └───────────┘ └───────────┘ └───────────┘
            │             │             │             │
    ┌───────▼───┐ ┌───────▼───┐ ┌───────▼───┐ ┌───────▼───┐
    │ EXECUTION │ │  DEPLOY   │ │  COLLAB   │ │   ADMIN   │
    │  SERVICE  │ │  SERVICE  │ │  SERVICE  │ │  SERVICE  │
    └───────────┘ └───────────┘ └───────────┘ └───────────┘
            │             │             │             │
┌───────────▼─────────────▼─────────────▼─────────────▼───────────────────────┐
│                            DATA LAYER                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ MongoDB │  │  Redis  │  │   S3    │  │ Vector  │  │  Queue  │          │
│  │         │  │         │  │         │  │   DB    │  │ (Celery)│          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnológico

```yaml
# Core Framework
framework: FastAPI
python_version: "3.11+"
async: true

# Database
primary_db: MongoDB (motor async driver)
cache: Redis
search: MongoDB Atlas Search / Elasticsearch
vector_db: Pinecone / Qdrant

# Storage
file_storage: S3 / MinIO
cdn: CloudFlare

# Queue / Workers
task_queue: Celery + Redis
scheduler: Celery Beat

# Containers
container_runtime: Docker
orchestration: Kubernetes
isolation: Firecracker (optional)

# Real-time
websocket: FastAPI WebSocket + Redis PubSub
collab: Yjs + y-websocket

# AI
providers: OpenAI, Anthropic, Google
streaming: Server-Sent Events (SSE)
```

---

## 3. SERVIÇOS DETALHADOS

### 3.1 Auth Service

```python
# /app/backend/services/auth/

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class User(BaseModel):
    id: str
    email: str
    name: str
    avatar: str | None
    plan: str
    created_at: datetime
    last_login: datetime | None
    wallet_balance: float = 0.0  # Saldo em creditos (Aethel Coins)

# ============ CONFIG ============

AUTH_CONFIG = {
    "secret_key": "ENV_SECRET_KEY",
    "algorithm": "HS256",
    "access_token_expire": 60 * 60,  # 1 hour
    "refresh_token_expire": 60 * 60 * 24 * 30,  # 30 days
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============ FUNCTIONS ============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, AUTH_CONFIG["secret_key"], algorithm=AUTH_CONFIG["algorithm"])

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = jwt.decode(token, AUTH_CONFIG["secret_key"], algorithms=[AUTH_CONFIG["algorithm"]])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ ROUTES ============

@router.post("/register", response_model=Token)
async def register(data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = {
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "plan": "free",
        "created_at": datetime.utcnow(),
        "last_login": None,
        "wallet_balance": 0.0,
    }
    result = await db.users.insert_one(user)
    
    # Generate tokens
    access_token = create_token({"sub": str(result.inserted_id)}, timedelta(seconds=AUTH_CONFIG["access_token_expire"]))
    refresh_token = create_token({"sub": str(result.inserted_id), "type": "refresh"}, timedelta(seconds=AUTH_CONFIG["refresh_token_expire"]))
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=AUTH_CONFIG["access_token_expire"]
    )

@router.post("/login", response_model=Token)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update last login
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}})
    
    # Generate tokens
    access_token = create_token({"sub": str(user["_id"])}, timedelta(seconds=AUTH_CONFIG["access_token_expire"]))
    refresh_token = create_token({"sub": str(user["_id"]), "type": "refresh"}, timedelta(seconds=AUTH_CONFIG["refresh_token_expire"]))
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=AUTH_CONFIG["access_token_expire"]
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, AUTH_CONFIG["secret_key"], algorithms=[AUTH_CONFIG["algorithm"]])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        access_token = create_token({"sub": user_id}, timedelta(seconds=AUTH_CONFIG["access_token_expire"]))
        new_refresh = create_token({"sub": user_id, "type": "refresh"}, timedelta(seconds=AUTH_CONFIG["refresh_token_expire"]))
        
        return Token(
            access_token=access_token,
            refresh_token=new_refresh,
            expires_in=AUTH_CONFIG["access_token_expire"]
        )
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    # Optionally: add token to blacklist in Redis
    return {"message": "Logged out successfully"}
```

### 3.2 Project Service

```python
# /app/backend/services/project/

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from bson import ObjectId

router = APIRouter(prefix="/api/projects", tags=["projects"])

# ============ MODELS ============

class ProjectCreate(BaseModel):
    name: str
    template: Optional[str] = None
    description: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Project(BaseModel):
    id: str
    name: str
    description: Optional[str]
    owner_id: str
    template: Optional[str]
    created_at: datetime
    updated_at: datetime
    status: str  # active, archived, deleted
    
    # Stats
    file_count: int
    storage_used: int
    deploy_url: Optional[str]
    last_deployed: Optional[datetime]
    
    # Collaboration
    collaborators: List[str]
    runtime_mode: str = "cloud" # 'cloud' | 'local'

# ============ ROUTES ============

@router.get("/", response_model=List[Project])
async def list_projects(
    current_user: User = Depends(get_current_user),
    status: str = "active",
    limit: int = 50,
    offset: int = 0
):
    """List user's projects"""
    query = {
        "$or": [
            {"owner_id": current_user.id},
            {"collaborators": current_user.id}
        ],
        "status": status
    }
    
    cursor = db.projects.find(query).skip(offset).limit(limit).sort("updated_at", -1)
    projects = await cursor.to_list(length=limit)
    
    return [Project(**p, id=str(p["_id"])) for p in projects]

@router.post("/", response_model=Project)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new project"""
    # Check project limit for free users
    if current_user.plan == "free":
        count = await db.projects.count_documents({"owner_id": current_user.id, "status": "active"})
        if count >= 5:  # Free tier limit
            raise HTTPException(status_code=403, detail="Project limit reached. Upgrade to create more.")
    
    project = {
        "name": data.name,
        "description": data.description,
        "owner_id": current_user.id,
        "template": data.template,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "status": "active",
        "file_count": 0,
        "storage_used": 0,
        "deploy_url": None,
        "last_deployed": None,
        "collaborators": [],
        "runtime_mode": "cloud", # Default to cloud
    }
    
    result = await db.projects.insert_one(project)
    project["id"] = str(result.inserted_id)
    
    # Initialize project files from template
    if data.template:
        await initialize_from_template(project["id"], data.template)
    else:
        await initialize_empty_project(project["id"])
    
    return Project(**project)

@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get project details"""
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access
    if project["owner_id"] != current_user.id and current_user.id not in project.get("collaborators", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return Project(**project, id=str(project["_id"]))

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update project"""
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can update project")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": update_data}
    )
    
    return await get_project(project_id, current_user)

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete project (soft delete)"""
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete project")
    
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"status": "deleted", "deleted_at": datetime.utcnow()}}
    )
    
    return {"message": "Project deleted"}

@router.post("/{project_id}/collaborators")
async def add_collaborator(
    project_id: str,
    email: str,
    current_user: User = Depends(get_current_user)
):
    """Add collaborator to project"""
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    
    if not project or project["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can add collaborators")
    
    # Find user by email
    collaborator = await db.users.find_one({"email": email})
    if not collaborator:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add to collaborators
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$addToSet": {"collaborators": str(collaborator["_id"])}}
    )
    
    return {"message": "Collaborator added"}
```

### 3.3 File Service

```python
# /app/backend/services/file/

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import boto3
from botocore.exceptions import ClientError
import hashlib

router = APIRouter(prefix="/api/files", tags=["files"])

# ============ CONFIG ============

s3_client = boto3.client(
    's3',
    endpoint_url=os.environ.get('S3_ENDPOINT'),
    aws_access_key_id=os.environ.get('S3_ACCESS_KEY'),
    aws_secret_access_key=os.environ.get('S3_SECRET_KEY'),
)

BUCKET_NAME = os.environ.get('S3_BUCKET', 'projects')

# ============ MODELS ============

class FileNode(BaseModel):
    name: str
    path: str
    type: str  # file, folder
    size: Optional[int] = None
    modified_at: Optional[datetime] = None
    children: Optional[List['FileNode']] = None

class FileContent(BaseModel):
    path: str
    content: str
    encoding: str = "utf-8"

class CreateFile(BaseModel):
    path: str
    content: Optional[str] = ""
    type: str = "file"  # file or folder

class UpdateFile(BaseModel):
    content: str

# ============ HELPER FUNCTIONS ============

def get_s3_key(project_id: str, path: str) -> str:
    """Generate S3 key from project ID and path"""
    return f"projects/{project_id}/{path.lstrip('/')}"

async def update_project_stats(project_id: str):
    """Update project file count and storage"""
    prefix = f"projects/{project_id}/"
    
    total_size = 0
    file_count = 0
    
    paginator = s3_client.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        for obj in page.get('Contents', []):
            total_size += obj['Size']
            file_count += 1
    
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"storage_used": total_size, "file_count": file_count}}
    )

# ============ ROUTES ============

@router.get("/{project_id}/tree", response_model=FileNode)
async def get_file_tree(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get project file tree"""
    # Verify access
    project = await verify_project_access(project_id, current_user)
    
    prefix = f"projects/{project_id}/"
    
    # Build tree from S3 objects
    tree = {"name": project["name"], "path": "/", "type": "folder", "children": []}
    
    paginator = s3_client.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        for obj in page.get('Contents', []):
            path = obj['Key'].replace(prefix, '')
            add_to_tree(tree, path, obj['Size'], obj['LastModified'])
    
    return FileNode(**tree)

@router.get("/{project_id}/file")
async def get_file(
    project_id: str,
    path: str,
    current_user: User = Depends(get_current_user)
):
    """Get file content"""
    await verify_project_access(project_id, current_user)
    
    s3_key = get_s3_key(project_id, path)
    
    try:
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=s3_key)
        content = response['Body'].read().decode('utf-8')
        
        return FileContent(path=path, content=content)
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise HTTPException(status_code=404, detail="File not found")
        raise HTTPException(status_code=500, detail="Error reading file")

@router.put("/{project_id}/file")
async def update_file(
    project_id: str,
    path: str,
    data: UpdateFile,
    current_user: User = Depends(get_current_user)
):
    """Update file content"""
    await verify_project_access(project_id, current_user, write=True)
    
    s3_key = get_s3_key(project_id, path)
    
    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=data.content.encode('utf-8'),
            ContentType=get_content_type(path)
        )
        
        # Update project stats
        await update_project_stats(project_id)
        
        # Update project timestamp
        await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        
        return {"message": "File updated", "path": path}
    except ClientError:
        raise HTTPException(status_code=500, detail="Error saving file")

@router.post("/{project_id}/file")
async def create_file(
    project_id: str,
    data: CreateFile,
    current_user: User = Depends(get_current_user)
):
    """Create new file or folder"""
    await verify_project_access(project_id, current_user, write=True)
    
    s3_key = get_s3_key(project_id, data.path)
    
    if data.type == "folder":
        s3_key = s3_key.rstrip('/') + '/'
        content = b''
    else:
        content = (data.content or "").encode('utf-8')
    
    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=content,
            ContentType=get_content_type(data.path) if data.type == "file" else "application/x-directory"
        )
        
        await update_project_stats(project_id)
        
        return {"message": f"{data.type.capitalize()} created", "path": data.path}
    except ClientError:
        raise HTTPException(status_code=500, detail="Error creating file")

@router.delete("/{project_id}/file")
async def delete_file(
    project_id: str,
    path: str,
    current_user: User = Depends(get_current_user)
):
    """Delete file or folder"""
    await verify_project_access(project_id, current_user, write=True)
    
    s3_key = get_s3_key(project_id, path)
    
    try:
        # Check if it's a folder (delete all contents)
        if path.endswith('/'):
            objects = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=s3_key)
            if 'Contents' in objects:
                delete_keys = [{'Key': obj['Key']} for obj in objects['Contents']]
                s3_client.delete_objects(Bucket=BUCKET_NAME, Delete={'Objects': delete_keys})
        else:
            s3_client.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
        
        await update_project_stats(project_id)
        
        return {"message": "Deleted", "path": path}
    except ClientError:
        raise HTTPException(status_code=500, detail="Error deleting file")

@router.post("/{project_id}/rename")
async def rename_file(
    project_id: str,
    old_path: str,
    new_path: str,
    current_user: User = Depends(get_current_user)
):
    """Rename/move file"""
    await verify_project_access(project_id, current_user, write=True)
    
    old_key = get_s3_key(project_id, old_path)
    new_key = get_s3_key(project_id, new_path)
    
    try:
        # Copy to new location
        s3_client.copy_object(
            Bucket=BUCKET_NAME,
            CopySource={'Bucket': BUCKET_NAME, 'Key': old_key},
            Key=new_key
        )
        
        # Delete old file
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=old_key)
        
        return {"message": "Renamed", "old_path": old_path, "new_path": new_path}
    except ClientError:
        raise HTTPException(status_code=500, detail="Error renaming file")

@router.post("/{project_id}/upload")
async def upload_file(
    project_id: str,
    path: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload binary file (images, etc)"""
    await verify_project_access(project_id, current_user, write=True)
    
    # Check file size (10MB limit)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    
    s3_key = get_s3_key(project_id, path)
    
    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=content,
            ContentType=file.content_type
        )
        
        await update_project_stats(project_id)
        
        return {"message": "Uploaded", "path": path, "size": len(content)}
    except ClientError:
        raise HTTPException(status_code=500, detail="Error uploading file")
```

### 3.4 Execution Service

```python
# /app/backend/services/execution/

from fastapi import APIRouter, WebSocket, Depends
import docker
import asyncio
from typing import Optional

router = APIRouter(prefix="/api/execution", tags=["execution"])

# ============ CONFIG ============

docker_client = docker.from_env()

CONTAINER_CONFIG = {
    "image": "project-runtime:latest",
    "mem_limit": "512m",
    "cpu_quota": 50000,  # 50% of one CPU
    "network_mode": "bridge",
    "auto_remove": True,
    "detach": True,
}

# Warm pool de containers
container_pool = {}

# ============ CONTAINER MANAGEMENT ============

class ContainerManager:
    def __init__(self):
        self.containers = {}  # project_id -> container
        self.lock = asyncio.Lock()
    
    async def get_container(self, project_id: str, user_id: str) -> docker.models.containers.Container:
        """Get or create container for project"""
        async with self.lock:
            key = f"{project_id}:{user_id}"
            
            if key in self.containers:
                container = self.containers[key]
                try:
                    container.reload()
                    if container.status == "running":
                        return container
                except:
                    pass
            
            # Create new container
            container = await self._create_container(project_id, user_id)
            self.containers[key] = container
            return container
    
    async def _create_container(self, project_id: str, user_id: str):
        """Create new container"""
        # Sync project files to container volume
        volume_name = f"project_{project_id}"
        
        container = docker_client.containers.run(
            CONTAINER_CONFIG["image"],
            name=f"workbench_{project_id}_{user_id[:8]}",
            mem_limit=CONTAINER_CONFIG["mem_limit"],
            cpu_quota=CONTAINER_CONFIG["cpu_quota"],
            network_mode=CONTAINER_CONFIG["network_mode"],
            detach=True,
            volumes={
                volume_name: {"bind": "/workspace", "mode": "rw"}
            },
            environment={
                "PROJECT_ID": project_id,
                "USER_ID": user_id,
            },
            labels={
                "project_id": project_id,
                "user_id": user_id,
            }
        )
        
        # Wait for container to be ready
        await asyncio.sleep(1)
        
        return container
    
    async def stop_container(self, project_id: str, user_id: str):
        """Stop container"""
        key = f"{project_id}:{user_id}"
        if key in self.containers:
            try:
                self.containers[key].stop(timeout=5)
            except:
                pass
            del self.containers[key]
    
    async def exec_command(self, project_id: str, user_id: str, command: str) -> tuple[int, str, str]:
        """Execute command in container"""
        container = await self.get_container(project_id, user_id)
        
        result = container.exec_run(
            cmd=["bash", "-c", command],
            workdir="/workspace",
            demux=True
        )
        
        stdout = result.output[0].decode() if result.output[0] else ""
        stderr = result.output[1].decode() if result.output[1] else ""
        
        return result.exit_code, stdout, stderr

container_manager = ContainerManager()

# ============ BILLING & METERING ============

async def check_wallet_balance(user_id: str, estimated_cost: float) -> bool:
    """Check if user has enough credits"""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    # Free tier limits logic here...
    if user["plan"] == "free":
        return True # Apply hard limits instead of cost
        
    return user.get("wallet_balance", 0) >= estimated_cost

async def deduct_credits(user_id: str, amount: float, description: str):
    """Deduct credits from wallet"""
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"wallet_balance": -amount}}
    )
    # Log transaction
    await db.transactions.insert_one({
        "user_id": user_id,
        "amount": -amount,
        "description": description,
        "timestamp": datetime.utcnow()
    })

# ============ ROUTES ============

@router.post("/{project_id}/exec")
async def execute_command(
    project_id: str,
    command: str,
    current_user: User = Depends(get_current_user)
):
    """Execute command in project container"""
    await verify_project_access(project_id, current_user)
    
    # Check execution context
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if project.get("runtime_mode") == "local":
        return {"status": "routed_to_local_bridge", "message": "Command sent to local machine"}

    exit_code, stdout, stderr = await container_manager.exec_command(
        project_id, current_user.id, command
    )
    
    return {
        "exit_code": exit_code,
        "stdout": stdout,
        "stderr": stderr
    }

@router.post("/{project_id}/start")
async def start_dev_server(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Start development server"""
    await verify_project_access(project_id, current_user)
    
    # Detect project type and start appropriate dev server
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    
    # Check for package.json (Node project)
    try:
        s3_key = get_s3_key(project_id, "package.json")
        s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        command = "npm install && npm run dev"
    except:
        # Check for requirements.txt (Python project)
        try:
            s3_key = get_s3_key(project_id, "requirements.txt")
            s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
            command = "pip install -r requirements.txt && python main.py"
        except:
            command = "echo 'No package.json or requirements.txt found'"
    
    # Check balance before starting expensive container
    if current_user.plan != "free":
        if not await check_wallet_balance(current_user.id, 0.05): # Min 1 hour
            raise HTTPException(status_code=402, detail="Insufficient credits")

    # Execute in background
    container = await container_manager.get_container(project_id, current_user.id)
    
    # Return preview URL
    preview_port = 3000  # Map from container
    preview_url = f"https://preview-{project_id}.platform.com"
    
    return {
        "status": "starting",
        "preview_url": preview_url,
        "port": preview_port
    }

@router.post("/{project_id}/stop")
async def stop_dev_server(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Stop development server"""
    await verify_project_access(project_id, current_user)
    await container_manager.stop_container(project_id, current_user.id)
    return {"status": "stopped"}

@router.websocket("/{project_id}/terminal")
async def terminal_websocket(
    websocket: WebSocket,
    project_id: str,
    token: str
):
    """WebSocket for terminal"""
    # Verify token
    try:
        user = await get_current_user_from_token(token)
        await verify_project_access(project_id, user)
    except:
        await websocket.close(code=4001)
        return
    
    await websocket.accept()
    
    container = await container_manager.get_container(project_id, user.id)
    
    # Create exec instance
    exec_id = container.exec_run(
        cmd=["bash"],
        stdin=True,
        tty=True,
        socket=True,
        demux=True
    )
    
    # Bidirectional communication
    async def read_from_container():
        while True:
            data = await asyncio.get_event_loop().run_in_executor(
                None, exec_id.output.read, 1024
            )
            if not data:
                break
            await websocket.send_bytes(data)
    
    async def write_to_container():
        while True:
            data = await websocket.receive_bytes()
            exec_id.output.write(data)
    
    try:
        await asyncio.gather(read_from_container(), write_to_container())
    except:
        pass
    finally:
        await websocket.close()
```

### 3.5 AI Service

```python
# /app/backend/services/ai/

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, AsyncGenerator
import openai
import anthropic
from tiktoken import encoding_for_model

router = APIRouter(prefix="/api/ai", tags=["ai"])

# ============ CONFIG ============

openai_client = openai.AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
anthropic_client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

MODEL_CONFIG = {
    "autocomplete": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "max_tokens": 256,
        "temperature": 0.2,
    },
    "chat": {
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 4096,
        "temperature": 0.7,
    },
    "actions": {
        "provider": "openai",
        "model": "gpt-4o",
        "max_tokens": 2048,
        "temperature": 0.3,
    },
    "agent": {
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 8192,
        "temperature": 0.5,
    },
}

# ============ MODELS ============

class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    project_id: Optional[str] = None
    file_context: Optional[str] = None

class AutocompleteRequest(BaseModel):
    prefix: str
    suffix: str
    language: str
    filepath: str
    project_id: Optional[str] = None

class ActionRequest(BaseModel):
    action: str  # explain, refactor, fix, test, document
    code: str
    language: str
    instruction: Optional[str] = None

# ============ HELPER FUNCTIONS ============

def count_tokens(text: str, model: str = "gpt-4") -> int:
    """Count tokens in text"""
    try:
        encoding = encoding_for_model(model)
        return len(encoding.encode(text))
    except:
        return len(text) // 4  # Rough estimate

async def check_rate_limit(user_id: str, operation: str) -> bool:
    """Check if user is within rate limits"""
    key = f"ratelimit:{user_id}:{operation}"
    
    # Get current count
    count = await redis_client.get(key)
    if count is None:
        await redis_client.setex(key, 60, 1)
        return True
    
    count = int(count)
    limits = {
        "autocomplete": 100,
        "chat": 30,
        "actions": 20,
        "agent": 10,
    }
    
    if count >= limits.get(operation, 10):
        return False
    
    await redis_client.incr(key)
    return True

async def track_usage(user_id: str, operation: str, tokens: int, cost: float):
    """Track AI usage for billing"""
    await db.ai_usage.insert_one({
        "user_id": user_id,
        "operation": operation,
        "tokens": tokens,
        "cost": cost,
        "timestamp": datetime.utcnow(),
    })

# ============ ROUTES ============

@router.post("/complete")
async def autocomplete(
    data: AutocompleteRequest,
    current_user: User = Depends(get_current_user)
):
    """AI code autocomplete"""
    # Check rate limit
    if not await check_rate_limit(current_user.id, "autocomplete"):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Check wallet for heavy usage
    if current_user.plan != "free" and not await check_wallet_balance(current_user.id, 0.001):
        raise HTTPException(status_code=402, detail="Insufficient credits for AI")

    config = MODEL_CONFIG["autocomplete"]
    
    prompt = f"""Complete the following {data.language} code. Only output the completion, no explanations.

File: {data.filepath}

```{data.language}
{data.prefix}<CURSOR>{data.suffix}
```

Complete at <CURSOR>:"""

    try:
        response = await openai_client.chat.completions.create(
            model=config["model"],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=config["max_tokens"],
            temperature=config["temperature"],
        )
        
        suggestion = response.choices[0].message.content.strip()
        
        # Track usage
        tokens = response.usage.total_tokens
        cost = tokens * 0.00001  # Approximate cost
        
        # Charge user (with markup)
        if current_user.plan != "free":
            await deduct_credits(current_user.id, cost * 1.5, "AI Autocomplete")
            
        await track_usage(current_user.id, "autocomplete", tokens, cost)
        
        return {
            "suggestion": suggestion,
            "tokens_used": tokens,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat(
    data: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """AI chat with streaming"""
    if not await check_rate_limit(current_user.id, "chat"):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    config = MODEL_CONFIG["chat"]
    
    # Build messages with context
    messages = [
        {"role": "system", "content": "You are a helpful coding assistant in an IDE. Be concise and direct. Provide code examples when helpful."},
    ]
    
    # Add file context if provided
    if data.file_context:
        messages.append({
            "role": "system",
            "content": f"Current file context:\n```\n{data.file_context}\n```"
        })
    
    # Add conversation messages
    for msg in data.messages:
        messages.append({"role": msg.role, "content": msg.content})
    
    async def generate() -> AsyncGenerator[str, None]:
        try:
            async with anthropic_client.messages.stream(
                model=config["model"],
                max_tokens=config["max_tokens"],
                messages=messages[1:],  # Anthropic doesn't use system in messages
                system=messages[0]["content"],
            ) as stream:
                async for text in stream.text_stream:
                    yield f"data: {text}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@router.post("/action")
async def code_action(
    data: ActionRequest,
    current_user: User = Depends(get_current_user)
):
    """AI code actions (explain, refactor, fix, etc)"""
    if not await check_rate_limit(current_user.id, "actions"):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    config = MODEL_CONFIG["actions"]
    
    prompts = {
        "explain": f"Explain the following {data.language} code clearly and concisely:\n\n```{data.language}\n{data.code}\n```",
        "refactor": f"Refactor the following {data.language} code for better readability and maintainability:\n\n```{data.language}\n{data.code}\n```",
        "fix": f"Fix any bugs or issues in the following {data.language} code:\n\n```{data.language}\n{data.code}\n```",
        "test": f"Generate comprehensive unit tests for the following {data.language} code:\n\n```{data.language}\n{data.code}\n```",
        "document": f"Add comprehensive documentation to the following {data.language} code:\n\n```{data.language}\n{data.code}\n```",
        "optimize": f"Optimize the following {data.language} code for better performance:\n\n```{data.language}\n{data.code}\n```",
    }
    
    prompt = prompts.get(data.action, data.instruction or f"Process the following code:\n\n```{data.language}\n{data.code}\n```")
    
    async def generate() -> AsyncGenerator[str, None]:
        try:
            stream = await openai_client.chat.completions.create(
                model=config["model"],
                messages=[{"role": "user", "content": prompt}],
                max_tokens=config["max_tokens"],
                temperature=config["temperature"],
                stream=True,
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield f"data: {chunk.choices[0].delta.content}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
    )

@router.get("/usage")
async def get_usage(
    current_user: User = Depends(get_current_user)
):
    """Get user's AI usage"""
    # Get usage for current month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    pipeline = [
        {"$match": {"user_id": current_user.id, "timestamp": {"$gte": start_of_month}}},
        {"$group": {
            "_id": "$operation",
            "count": {"$sum": 1},
            "tokens": {"$sum": "$tokens"},
            "cost": {"$sum": "$cost"},
        }}
    ]
    
    usage = await db.ai_usage.aggregate(pipeline).to_list(None)
    
    return {
        "period": "month",
        "usage": usage,
        "limits": {
            "autocomplete": 5000 if current_user.plan == "pro" else 500,
            "chat": 500 if current_user.plan == "pro" else 100,
            "actions": 200 if current_user.plan == "pro" else 50,
        }
    }
```

---

## 4. LIMITAÇÕES DO BACKEND ATUAL

### 4.1 Limitações Técnicas

| Limitação | Impacto | Severidade | Mitigação |
|-----------|---------|------------|-----------|
| **Container cold start** | 2-5s para novo container | ALTO | Warm pool, Firecracker |
| **File sync latency** | S3 não é instantâneo | MÉDIO | Cache local, delta sync |
| **WebSocket scale** | ~65k connections/server | ALTO | Sharding, Redis pubsub |
| **AI rate limits** | OpenAI/Anthropic limits | ALTO | Queue, caching, multi-provider |
| **MongoDB connections** | Pool limits | MÉDIO | Connection pooling |

### 4.2 Limitações Arquiteturais

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| **Single region** | Latência para usuários distantes | Multi-region P3 |
| **Monolith tendencies** | Difícil escalar partes | Microservices gradual |
| **No event sourcing** | Auditoria limitada | Event log P2 |
| **Cache invalidation** | Dados stale | TTL agressivo + invalidação manual |

### 4.3 Limitações de Segurança

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| **Container escape risk** | Segurança | Firecracker, gVisor |
| **Code execution** | Código malicioso | Sandbox, resource limits |
| **Secret management** | Vazamento | Vault, encryption at rest |
| **DDoS** | Disponibilidade | CloudFlare, rate limiting |

---

## 5. MELHORIAS NECESSÁRIAS

### 5.1 P0 - Críticas (MVP)

| Melhoria | Descrição | Esforço |
|----------|-----------|---------|
| **Container warm pool** | Pre-criar containers | 3d |
| **File caching** | Redis cache para files | 2d |
| **Better error handling** | Erros consistentes | 2d |
| **Request validation** | Pydantic em tudo | 1d |
| **Logging estruturado** | JSON logs | 1d |

### 5.2 P1 - Importantes

| Melhoria | Descrição | Esforço |
|----------|-----------|---------|
| **Rate limiting granular** | Por operação | 2d |
| **Webhook system** | Eventos externos | 3d |
| **Background jobs** | Celery workers | 3d |
| **Health checks** | Endpoint /health | 1d |
| **Metrics** | Prometheus | 2d |
| **Tracing** | OpenTelemetry | 2d |

### 5.3 P2 - Desejáveis

| Melhoria | Descrição | Esforço |
|----------|-----------|---------|
| **GraphQL** | Alternativa a REST | 5d |
| **gRPC** | Para serviços internos | 3d |
| **Event sourcing** | Audit trail completo | 5d |
| **CQRS** | Read/write separation | 5d |

---

## 6. ESTRUTURA DE DIRETÓRIOS

```
/app/backend/
├── main.py                 # FastAPI app entry
├── config.py               # Configuration
├── database.py             # MongoDB connection
├── dependencies.py         # FastAPI dependencies
├── middleware/
│   ├── __init__.py
│   ├── auth.py            # Auth middleware
│   ├── cors.py            # CORS config
│   ├── logging.py         # Request logging
│   └── rate_limit.py      # Rate limiting
├── models/
│   ├── __init__.py
│   ├── user.py            # User models
│   ├── project.py         # Project models
│   └── common.py          # Shared models
├── services/
│   ├── __init__.py
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   └── service.py
│   ├── project/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   └── service.py
│   ├── file/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   └── service.py
│   ├── execution/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── container.py
│   │   └── terminal.py
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── providers.py
│   │   └── prompts.py
│   ├── deploy/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   └── service.py
│   ├── collab/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   └── yjs_handler.py
│   └── admin/
│       ├── __init__.py
│       ├── routes.py
│       └── service.py
├── utils/
│   ├── __init__.py
│   ├── s3.py              # S3 utilities
│   ├── redis.py           # Redis utilities
│   ├── security.py        # Security utilities
│   └── validators.py      # Custom validators
├── workers/
│   ├── __init__.py
│   ├── celery.py          # Celery config
│   └── tasks.py           # Background tasks
└── tests/
    ├── __init__.py
    ├── conftest.py        # Test fixtures
    ├── test_auth.py
    ├── test_project.py
    └── test_ai.py
```

---

## 7. API COMPLETA

```yaml
# OpenAPI summary

paths:
  # Auth
  /api/auth/register: POST
  /api/auth/login: POST
  /api/auth/refresh: POST
  /api/auth/logout: POST
  /api/auth/me: GET
  /api/auth/password: PUT
  
  # Projects
  /api/projects: GET, POST
  /api/projects/{id}: GET, PUT, DELETE
  /api/projects/{id}/collaborators: GET, POST, DELETE
  
  # Files
  /api/files/{project_id}/tree: GET
  /api/files/{project_id}/file: GET, PUT, POST, DELETE
  /api/files/{project_id}/rename: POST
  /api/files/{project_id}/upload: POST
  
  # Execution
  /api/execution/{project_id}/exec: POST
  /api/execution/{project_id}/start: POST
  /api/execution/{project_id}/stop: POST
  /api/execution/{project_id}/terminal: WebSocket
  
  # AI
  /api/ai/complete: POST
  /api/ai/chat: POST (streaming)
  /api/ai/action: POST (streaming)
  /api/ai/usage: GET
  
  # Deploy
  /api/deploy/{project_id}/build: POST
  /api/deploy/{project_id}/deploy: POST
  /api/deploy/{project_id}/status: GET
  /api/deploy/{project_id}/logs: GET
  
  # Collab
  /api/collab/{project_id}/ws: WebSocket
  /api/collab/{project_id}/presence: GET
  
  # Admin
  /api/admin/dashboard: GET
  /api/admin/users: GET, POST
  /api/admin/users/{id}: GET, PUT, DELETE
  /api/admin/projects: GET
  /api/admin/billing: GET
  /api/admin/system: GET
```

---

## 8. PRÓXIMOS PASSOS

1. **Implementar serviços core** (Auth, Project, File)
2. **Setup Docker para containers de usuário**
3. **Integrar AI providers**
4. **WebSocket para terminal e collab**
5. **Admin dashboard profissional**
6. **Testes automatizados**
7. **Documentação OpenAPI**

---

**DOCUMENTOS RELACIONADOS:**
- `8_ADMIN_SYSTEM_SPEC.md`
- `WORKBENCH_SPEC.md`
- `AI_SYSTEM_SPEC.md`
- `EXECUTION_PLAN.md`
