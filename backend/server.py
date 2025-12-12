from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import asyncio
import subprocess
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'ide_platform')]

# Create the main app
app = FastAPI(title="AI IDE Platform API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class FileNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # 'file' or 'folder'
    path: str
    content: Optional[str] = None
    language: Optional[str] = None
    parent_id: Optional[str] = None
    children: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    root_folder_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    settings: Dict[str, Any] = {}
    git_url: Optional[str] = None

class GitStatus(BaseModel):
    branch: str
    changes: List[Dict[str, str]]
    staged: List[str]
    commits: List[Dict[str, Any]]

class Terminal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    name: str = "Terminal"
    cwd: str = "/tmp"
    history: List[str] = []

class AIMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIConversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    messages: List[AIMessage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnimationKeyframe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    time: float  # seconds
    value: float
    easing: str = "linear"

class AnimationTrack(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    property: str
    keyframes: List[AnimationKeyframe] = []
    color: str = "#3B82F6"

class Animation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    name: str
    duration: float = 5.0
    fps: int = 60
    tracks: List[AnimationTrack] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProfileSample(BaseModel):
    timestamp: float
    cpu: float
    memory: float
    fps: Optional[float] = None
    function_name: Optional[str] = None
    duration: Optional[float] = None

class ProfilingSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    name: str
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    samples: List[ProfileSample] = []
    summary: Dict[str, Any] = {}

class Extension(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    version: str
    description: str
    author: str
    enabled: bool = True
    category: str
    icon: Optional[str] = None
    downloads: int = 0
    rating: float = 0.0

class Theme(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # 'dark' or 'light'
    colors: Dict[str, str]
    is_default: bool = False

class UserSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    theme_id: str = "default-dark"
    font_size: int = 14
    font_family: str = "JetBrains Mono"
    tab_size: int = 2
    auto_save: bool = True
    minimap_enabled: bool = True
    word_wrap: bool = False
    line_numbers: bool = True
    bracket_matching: bool = True
    auto_indent: bool = True
    keybindings: Dict[str, str] = {}

class Snippet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    prefix: str
    body: str
    description: Optional[str] = None
    language: str
    scope: str = "global"

class Breakpoint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_path: str
    line: int
    condition: Optional[str] = None
    enabled: bool = True

class DebugSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    status: str = "idle"  # 'idle', 'running', 'paused', 'stopped'
    breakpoints: List[Breakpoint] = []
    call_stack: List[Dict[str, Any]] = []
    variables: List[Dict[str, Any]] = []
    current_file: Optional[str] = None
    current_line: Optional[int] = None

# ============== REQUEST MODELS ==============

class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None
    template: Optional[str] = None

class CreateFileRequest(BaseModel):
    name: str
    type: str
    parent_id: Optional[str] = None
    content: Optional[str] = None

class UpdateFileRequest(BaseModel):
    content: Optional[str] = None
    name: Optional[str] = None

class ExecuteCommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None

class AIQueryRequest(BaseModel):
    query: str
    context: Optional[str] = None
    conversation_id: Optional[str] = None

class CreateAnimationRequest(BaseModel):
    name: str
    duration: float = 5.0
    fps: int = 60

class AddKeyframeRequest(BaseModel):
    track_id: str
    time: float
    value: float
    easing: str = "linear"

class StartProfilingRequest(BaseModel):
    name: str

class SearchRequest(BaseModel):
    query: str
    file_types: Optional[List[str]] = None
    include_content: bool = True

class GitCommitRequest(BaseModel):
    message: str
    files: Optional[List[str]] = None

class GitBranchRequest(BaseModel):
    name: str
    checkout: bool = True

# ============== HELPER FUNCTIONS ==============

def get_language_from_extension(filename: str) -> str:
    ext_map = {
        '.py': 'python', '.js': 'javascript', '.jsx': 'javascriptreact',
        '.ts': 'typescript', '.tsx': 'typescriptreact', '.html': 'html',
        '.css': 'css', '.scss': 'scss', '.json': 'json', '.md': 'markdown',
        '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml', '.sql': 'sql',
        '.sh': 'shell', '.bash': 'shell', '.go': 'go', '.rs': 'rust',
        '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
        '.rb': 'ruby', '.php': 'php', '.swift': 'swift', '.kt': 'kotlin',
        '.dart': 'dart', '.vue': 'vue', '.svelte': 'svelte'
    }
    ext = Path(filename).suffix.lower()
    return ext_map.get(ext, 'plaintext')

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def prepare_doc(doc: dict) -> dict:
    """Prepare document for MongoDB insertion"""
    result = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [prepare_doc(v) if isinstance(v, dict) else (v.isoformat() if isinstance(v, datetime) else v) for v in value]
        elif isinstance(value, dict):
            result[key] = prepare_doc(value)
        else:
            result[key] = value
    return result

# ============== ROOT ENDPOINT ==============

@api_router.get("/")
async def root():
    return {"message": "AI IDE Platform API v2.0", "status": "operational"}

# ============== PROJECT ENDPOINTS ==============

@api_router.post("/projects", response_model=dict)
async def create_project(request: CreateProjectRequest):
    # Create root folder
    root_folder = FileNode(
        name=request.name,
        type="folder",
        path=f"/{request.name}",
        children=[]
    )
    await db.files.insert_one(prepare_doc(root_folder.model_dump()))
    
    # Create project
    project = Project(
        name=request.name,
        description=request.description,
        root_folder_id=root_folder.id
    )
    
    # Add template files if specified
    if request.template:
        template_files = await create_template_files(request.template, root_folder.id, request.name)
        root_folder.children = [f['id'] for f in template_files]
        await db.files.update_one({"id": root_folder.id}, {"$set": {"children": root_folder.children}})
    
    await db.projects.insert_one(prepare_doc(project.model_dump()))
    return {"project": project.model_dump(), "root_folder": root_folder.model_dump()}

async def create_template_files(template: str, parent_id: str, project_name: str) -> List[dict]:
    templates = {
        "react": [
            {"name": "src", "type": "folder", "children": [
                {"name": "App.jsx", "type": "file", "content": 'import React from "react";\n\nfunction App() {\n  return (\n    <div className="App">\n      <h1>Hello World</h1>\n    </div>\n  );\n}\n\nexport default App;'},
                {"name": "index.js", "type": "file", "content": 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);'},
                {"name": "index.css", "type": "file", "content": '* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\n.App {\n  text-align: center;\n  padding: 20px;\n}'}
            ]},
            {"name": "package.json", "type": "file", "content": json.dumps({"name": project_name, "version": "1.0.0", "dependencies": {"react": "^18.0.0", "react-dom": "^18.0.0"}}, indent=2)},
            {"name": "README.md", "type": "file", "content": f"# {project_name}\n\nA React project created with AI IDE Platform."}
        ],
        "python": [
            {"name": "src", "type": "folder", "children": [
                {"name": "__init__.py", "type": "file", "content": ""},
                {"name": "main.py", "type": "file", "content": 'def main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()'}
            ]},
            {"name": "requirements.txt", "type": "file", "content": ""},
            {"name": "README.md", "type": "file", "content": f"# {project_name}\n\nA Python project created with AI IDE Platform."}
        ],
        "node": [
            {"name": "src", "type": "folder", "children": [
                {"name": "index.js", "type": "file", "content": 'console.log("Hello, World!");'}
            ]},
            {"name": "package.json", "type": "file", "content": json.dumps({"name": project_name, "version": "1.0.0", "main": "src/index.js"}, indent=2)},
            {"name": "README.md", "type": "file", "content": f"# {project_name}\n\nA Node.js project created with AI IDE Platform."}
        ]
    }
    
    created_files = []
    template_structure = templates.get(template, templates["node"])
    
    async def create_file_recursive(file_def: dict, parent_id: str, base_path: str) -> dict:
        file_path = f"{base_path}/{file_def['name']}"
        file_node = FileNode(
            name=file_def['name'],
            type=file_def['type'],
            path=file_path,
            parent_id=parent_id,
            content=file_def.get('content'),
            language=get_language_from_extension(file_def['name']) if file_def['type'] == 'file' else None
        )
        
        if file_def['type'] == 'folder' and 'children' in file_def:
            child_ids = []
            for child in file_def['children']:
                child_file = await create_file_recursive(child, file_node.id, file_path)
                child_ids.append(child_file['id'])
            file_node.children = child_ids
        
        await db.files.insert_one(prepare_doc(file_node.model_dump()))
        created_files.append(file_node.model_dump())
        return file_node.model_dump()
    
    for file_def in template_structure:
        await create_file_recursive(file_def, parent_id, f"/{project_name}")
    
    return created_files

@api_router.get("/projects", response_model=List[dict])
async def list_projects():
    projects = await db.projects.find({}, {"_id": 0}).to_list(100)
    return projects

@api_router.get("/projects/{project_id}", response_model=dict)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete all files
    if project.get('root_folder_id'):
        await delete_files_recursive(project['root_folder_id'])
    
    await db.projects.delete_one({"id": project_id})
    return {"status": "deleted"}

async def delete_files_recursive(file_id: str):
    file = await db.files.find_one({"id": file_id})
    if file and file['type'] == 'folder':
        for child_id in file.get('children', []):
            await delete_files_recursive(child_id)
    await db.files.delete_one({"id": file_id})

# ============== FILE ENDPOINTS ==============

@api_router.post("/projects/{project_id}/files", response_model=dict)
async def create_file(project_id: str, request: CreateFileRequest):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    parent_id = request.parent_id or project.get('root_folder_id')
    parent = await db.files.find_one({"id": parent_id})
    
    if not parent:
        raise HTTPException(status_code=404, detail="Parent folder not found")
    
    file_path = f"{parent['path']}/{request.name}"
    
    file_node = FileNode(
        name=request.name,
        type=request.type,
        path=file_path,
        parent_id=parent_id,
        content=request.content if request.type == 'file' else None,
        language=get_language_from_extension(request.name) if request.type == 'file' else None
    )
    
    await db.files.insert_one(prepare_doc(file_node.model_dump()))
    
    # Update parent children
    await db.files.update_one(
        {"id": parent_id},
        {"$push": {"children": file_node.id}}
    )
    
    return file_node.model_dump()

@api_router.get("/projects/{project_id}/files", response_model=List[dict])
async def list_files(project_id: str):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files = await db.files.find({}, {"_id": 0}).to_list(1000)
    return files

@api_router.get("/files/{file_id}", response_model=dict)
async def get_file(file_id: str):
    file = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file

@api_router.put("/files/{file_id}", response_model=dict)
async def update_file(file_id: str, request: UpdateFileRequest):
    file = await db.files.find_one({"id": file_id})
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if request.content is not None:
        updates["content"] = request.content
    if request.name is not None:
        updates["name"] = request.name
        # Update path
        parent_path = "/".join(file['path'].split('/')[:-1])
        updates["path"] = f"{parent_path}/{request.name}"
        updates["language"] = get_language_from_extension(request.name)
    
    await db.files.update_one({"id": file_id}, {"$set": updates})
    
    updated_file = await db.files.find_one({"id": file_id}, {"_id": 0})
    return updated_file

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    file = await db.files.find_one({"id": file_id})
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Remove from parent's children
    if file.get('parent_id'):
        await db.files.update_one(
            {"id": file['parent_id']},
            {"$pull": {"children": file_id}}
        )
    
    # Delete recursively if folder
    await delete_files_recursive(file_id)
    
    return {"status": "deleted"}

@api_router.get("/projects/{project_id}/file-tree", response_model=dict)
async def get_file_tree(project_id: str):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    async def build_tree(file_id: str) -> dict:
        file = await db.files.find_one({"id": file_id}, {"_id": 0})
        if not file:
            return None
        
        result = {**file}
        if file['type'] == 'folder' and file.get('children'):
            result['children'] = []
            for child_id in file['children']:
                child = await build_tree(child_id)
                if child:
                    result['children'].append(child)
        return result
    
    root_tree = await build_tree(project['root_folder_id'])
    return root_tree or {}

# ============== TERMINAL ENDPOINTS ==============

@api_router.post("/projects/{project_id}/terminal/execute", response_model=dict)
async def execute_command(project_id: str, request: ExecuteCommandRequest):
    try:
        # Sanitize command for security
        dangerous_commands = ['rm -rf /', 'sudo rm', ':(){', 'fork bomb', '> /dev/sda']
        for dangerous in dangerous_commands:
            if dangerous in request.command.lower():
                return {"output": "Command blocked for security reasons", "exit_code": 1, "error": True}
        
        # Execute command with timeout
        process = await asyncio.create_subprocess_shell(
            request.command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=request.cwd or "/tmp"
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)
            output = stdout.decode() if stdout else ""
            error = stderr.decode() if stderr else ""
            
            return {
                "output": output,
                "error": error if error else None,
                "exit_code": process.returncode,
                "command": request.command
            }
        except asyncio.TimeoutError:
            process.kill()
            return {"output": "", "error": "Command timed out after 30 seconds", "exit_code": -1}
            
    except Exception as e:
        return {"output": "", "error": str(e), "exit_code": -1}

# ============== AI ASSISTANT ENDPOINTS ==============

@api_router.post("/ai/query", response_model=dict)
async def ai_query(request: AIQueryRequest):
    # Simulated AI responses for demo - in production, integrate with actual LLM
    responses = {
        "explain": "This code defines a function that...",
        "refactor": "Here's how you can improve this code:\n\n1. Use more descriptive variable names\n2. Extract repeated logic into helper functions\n3. Add error handling",
        "debug": "I found potential issues:\n\n1. Line 5: Possible null reference\n2. Line 12: Unhandled exception\n3. Consider adding input validation",
        "generate": "Here's the generated code:\n\n```python\ndef example():\n    pass\n```",
        "test": "Here are some test cases:\n\n```python\ndef test_example():\n    assert example() == expected\n```"
    }
    
    # Simple keyword matching for demo
    query_lower = request.query.lower()
    if "explain" in query_lower:
        response_type = "explain"
    elif "refactor" in query_lower or "improve" in query_lower:
        response_type = "refactor"
    elif "debug" in query_lower or "fix" in query_lower or "error" in query_lower:
        response_type = "debug"
    elif "generate" in query_lower or "create" in query_lower or "write" in query_lower:
        response_type = "generate"
    elif "test" in query_lower:
        response_type = "test"
    else:
        response_type = "explain"
    
    ai_response = f"**AI Assistant Response**\n\n{responses[response_type]}\n\nQuery: {request.query}"
    
    # Save conversation
    message = AIMessage(role="user", content=request.query)
    response_message = AIMessage(role="assistant", content=ai_response)
    
    if request.conversation_id:
        await db.conversations.update_one(
            {"id": request.conversation_id},
            {"$push": {"messages": {"$each": [prepare_doc(message.model_dump()), prepare_doc(response_message.model_dump())]}}}
        )
    else:
        conversation = AIConversation(
            project_id="default",
            messages=[message, response_message]
        )
        await db.conversations.insert_one(prepare_doc(conversation.model_dump()))
        request.conversation_id = conversation.id
    
    return {
        "response": ai_response,
        "conversation_id": request.conversation_id,
        "suggestions": [
            "Explain this code in detail",
            "How can I optimize this?",
            "Write tests for this function",
            "Find potential bugs"
        ]
    }

@api_router.get("/ai/conversations/{conversation_id}", response_model=dict)
async def get_conversation(conversation_id: str):
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

# ============== ANIMATION ENDPOINTS ==============

@api_router.post("/projects/{project_id}/animations", response_model=dict)
async def create_animation(project_id: str, request: CreateAnimationRequest):
    animation = Animation(
        project_id=project_id,
        name=request.name,
        duration=request.duration,
        fps=request.fps
    )
    await db.animations.insert_one(prepare_doc(animation.model_dump()))
    return animation.model_dump()

@api_router.get("/projects/{project_id}/animations", response_model=List[dict])
async def list_animations(project_id: str):
    animations = await db.animations.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    return animations

@api_router.get("/animations/{animation_id}", response_model=dict)
async def get_animation(animation_id: str):
    animation = await db.animations.find_one({"id": animation_id}, {"_id": 0})
    if not animation:
        raise HTTPException(status_code=404, detail="Animation not found")
    return animation

@api_router.post("/animations/{animation_id}/tracks", response_model=dict)
async def add_animation_track(animation_id: str, name: str, property: str, color: str = "#3B82F6"):
    animation = await db.animations.find_one({"id": animation_id})
    if not animation:
        raise HTTPException(status_code=404, detail="Animation not found")
    
    track = AnimationTrack(name=name, property=property, color=color)
    
    await db.animations.update_one(
        {"id": animation_id},
        {"$push": {"tracks": prepare_doc(track.model_dump())}}
    )
    
    return track.model_dump()

@api_router.post("/animations/{animation_id}/keyframes", response_model=dict)
async def add_keyframe(animation_id: str, request: AddKeyframeRequest):
    animation = await db.animations.find_one({"id": animation_id})
    if not animation:
        raise HTTPException(status_code=404, detail="Animation not found")
    
    keyframe = AnimationKeyframe(
        time=request.time,
        value=request.value,
        easing=request.easing
    )
    
    # Find and update the track
    tracks = animation.get('tracks', [])
    for i, track in enumerate(tracks):
        if track['id'] == request.track_id:
            if 'keyframes' not in track:
                track['keyframes'] = []
            track['keyframes'].append(prepare_doc(keyframe.model_dump()))
            break
    
    await db.animations.update_one(
        {"id": animation_id},
        {"$set": {"tracks": tracks}}
    )
    
    return keyframe.model_dump()

@api_router.delete("/animations/{animation_id}")
async def delete_animation(animation_id: str):
    result = await db.animations.delete_one({"id": animation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Animation not found")
    return {"status": "deleted"}

# ============== PROFILING ENDPOINTS ==============

@api_router.post("/projects/{project_id}/profiling/start", response_model=dict)
async def start_profiling(project_id: str, request: StartProfilingRequest):
    session = ProfilingSession(
        project_id=project_id,
        name=request.name
    )
    await db.profiling_sessions.insert_one(prepare_doc(session.model_dump()))
    return session.model_dump()

@api_router.post("/profiling/{session_id}/sample", response_model=dict)
async def add_profile_sample(session_id: str, sample: ProfileSample):
    session = await db.profiling_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Profiling session not found")
    
    await db.profiling_sessions.update_one(
        {"id": session_id},
        {"$push": {"samples": prepare_doc(sample.model_dump())}}
    )
    
    return sample.model_dump()

@api_router.post("/profiling/{session_id}/stop", response_model=dict)
async def stop_profiling(session_id: str):
    session = await db.profiling_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Profiling session not found")
    
    samples = session.get('samples', [])
    
    # Calculate summary
    summary = {
        "total_samples": len(samples),
        "avg_cpu": sum(s.get('cpu', 0) for s in samples) / len(samples) if samples else 0,
        "avg_memory": sum(s.get('memory', 0) for s in samples) / len(samples) if samples else 0,
        "peak_cpu": max((s.get('cpu', 0) for s in samples), default=0),
        "peak_memory": max((s.get('memory', 0) for s in samples), default=0),
        "duration": (samples[-1]['timestamp'] - samples[0]['timestamp']) if len(samples) > 1 else 0
    }
    
    await db.profiling_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "end_time": datetime.now(timezone.utc).isoformat(),
            "summary": summary
        }}
    )
    
    return {"status": "stopped", "summary": summary}

@api_router.get("/projects/{project_id}/profiling/sessions", response_model=List[dict])
async def list_profiling_sessions(project_id: str):
    sessions = await db.profiling_sessions.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    return sessions

@api_router.get("/profiling/{session_id}", response_model=dict)
async def get_profiling_session(session_id: str):
    session = await db.profiling_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Profiling session not found")
    return session

# ============== GIT ENDPOINTS ==============

@api_router.get("/projects/{project_id}/git/status", response_model=dict)
async def get_git_status(project_id: str):
    # Simulated git status - in production, integrate with actual git
    return {
        "branch": "main",
        "changes": [
            {"file": "src/App.jsx", "status": "modified"},
            {"file": "src/utils.js", "status": "added"}
        ],
        "staged": [],
        "ahead": 0,
        "behind": 0
    }

@api_router.post("/projects/{project_id}/git/commit", response_model=dict)
async def git_commit(project_id: str, request: GitCommitRequest):
    return {
        "status": "success",
        "commit_hash": str(uuid.uuid4())[:8],
        "message": request.message,
        "files_committed": len(request.files) if request.files else 0
    }

@api_router.post("/projects/{project_id}/git/branch", response_model=dict)
async def create_branch(project_id: str, request: GitBranchRequest):
    return {
        "status": "success",
        "branch": request.name,
        "checked_out": request.checkout
    }

@api_router.get("/projects/{project_id}/git/branches", response_model=List[dict])
async def list_branches(project_id: str):
    return [
        {"name": "main", "current": True, "ahead": 0, "behind": 0},
        {"name": "develop", "current": False, "ahead": 2, "behind": 0},
        {"name": "feature/new-feature", "current": False, "ahead": 5, "behind": 1}
    ]

@api_router.get("/projects/{project_id}/git/commits", response_model=List[dict])
async def list_commits(project_id: str, limit: int = 20):
    # Simulated commits
    return [
        {
            "hash": "abc123",
            "message": "Initial commit",
            "author": "Developer",
            "date": datetime.now(timezone.utc).isoformat(),
            "files_changed": 3
        }
    ]

# ============== SEARCH ENDPOINTS ==============

@api_router.post("/projects/{project_id}/search", response_model=dict)
async def search_files(project_id: str, request: SearchRequest):
    files = await db.files.find({}, {"_id": 0}).to_list(1000)
    
    results = []
    for file in files:
        if file['type'] == 'file':
            # Search in filename
            if request.query.lower() in file['name'].lower():
                results.append({
                    "file": file,
                    "matches": [{"type": "filename", "line": None}]
                })
            # Search in content
            elif request.include_content and file.get('content'):
                content = file['content']
                lines = content.split('\n')
                matches = []
                for i, line in enumerate(lines):
                    if request.query.lower() in line.lower():
                        matches.append({
                            "type": "content",
                            "line": i + 1,
                            "text": line.strip()
                        })
                if matches:
                    results.append({"file": file, "matches": matches})
    
    return {"results": results, "total": len(results)}

# ============== EXTENSIONS ENDPOINTS ==============

@api_router.get("/extensions", response_model=List[dict])
async def list_extensions():
    extensions = await db.extensions.find({}, {"_id": 0}).to_list(100)
    if not extensions:
        # Return default extensions
        return [
            {"id": "ext-1", "name": "Python", "version": "2024.1", "description": "Python language support", "author": "IDE Team", "enabled": True, "category": "Languages", "downloads": 15000, "rating": 4.8},
            {"id": "ext-2", "name": "JavaScript/TypeScript", "version": "5.0", "description": "JavaScript and TypeScript support", "author": "IDE Team", "enabled": True, "category": "Languages", "downloads": 20000, "rating": 4.9},
            {"id": "ext-3", "name": "GitLens", "version": "14.0", "description": "Git supercharged", "author": "Community", "enabled": True, "category": "SCM", "downloads": 12000, "rating": 4.7},
            {"id": "ext-4", "name": "Prettier", "version": "10.0", "description": "Code formatter", "author": "Community", "enabled": True, "category": "Formatters", "downloads": 18000, "rating": 4.8},
            {"id": "ext-5", "name": "ESLint", "version": "3.0", "description": "JavaScript linter", "author": "Community", "enabled": True, "category": "Linters", "downloads": 16000, "rating": 4.6},
            {"id": "ext-6", "name": "Docker", "version": "1.25", "description": "Docker support", "author": "IDE Team", "enabled": False, "category": "DevOps", "downloads": 8000, "rating": 4.5},
            {"id": "ext-7", "name": "AI Copilot", "version": "2.0", "description": "AI-powered code completion", "author": "IDE Team", "enabled": True, "category": "AI", "downloads": 25000, "rating": 4.9},
            {"id": "ext-8", "name": "Theme Pack", "version": "3.0", "description": "Premium themes collection", "author": "Community", "enabled": True, "category": "Themes", "downloads": 10000, "rating": 4.4}
        ]
    return extensions

@api_router.put("/extensions/{extension_id}/toggle", response_model=dict)
async def toggle_extension(extension_id: str):
    extension = await db.extensions.find_one({"id": extension_id})
    if extension:
        new_state = not extension.get('enabled', True)
        await db.extensions.update_one({"id": extension_id}, {"$set": {"enabled": new_state}})
        return {"id": extension_id, "enabled": new_state}
    return {"id": extension_id, "enabled": True}

# ============== THEMES ENDPOINTS ==============

@api_router.get("/themes", response_model=List[dict])
async def list_themes():
    themes = await db.themes.find({}, {"_id": 0}).to_list(100)
    if not themes:
        return [
            {"id": "default-dark", "name": "Dark+ (Default)", "type": "dark", "is_default": True, "colors": {"background": "#1e1e1e", "foreground": "#d4d4d4", "accent": "#007acc"}},
            {"id": "default-light", "name": "Light+ (Default)", "type": "light", "is_default": False, "colors": {"background": "#ffffff", "foreground": "#000000", "accent": "#007acc"}},
            {"id": "monokai", "name": "Monokai", "type": "dark", "is_default": False, "colors": {"background": "#272822", "foreground": "#f8f8f2", "accent": "#f92672"}},
            {"id": "dracula", "name": "Dracula", "type": "dark", "is_default": False, "colors": {"background": "#282a36", "foreground": "#f8f8f2", "accent": "#bd93f9"}},
            {"id": "nord", "name": "Nord", "type": "dark", "is_default": False, "colors": {"background": "#2e3440", "foreground": "#d8dee9", "accent": "#88c0d0"}},
            {"id": "solarized-dark", "name": "Solarized Dark", "type": "dark", "is_default": False, "colors": {"background": "#002b36", "foreground": "#839496", "accent": "#268bd2"}},
            {"id": "github-dark", "name": "GitHub Dark", "type": "dark", "is_default": False, "colors": {"background": "#0d1117", "foreground": "#c9d1d9", "accent": "#58a6ff"}},
            {"id": "one-dark", "name": "One Dark Pro", "type": "dark", "is_default": False, "colors": {"background": "#282c34", "foreground": "#abb2bf", "accent": "#61afef"}}
        ]
    return themes

# ============== SETTINGS ENDPOINTS ==============

@api_router.get("/settings", response_model=dict)
async def get_settings():
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        default_settings = UserSettings()
        return default_settings.model_dump()
    return settings

@api_router.put("/settings", response_model=dict)
async def update_settings(settings: dict):
    await db.settings.update_one({}, {"$set": settings}, upsert=True)
    return settings

# ============== SNIPPETS ENDPOINTS ==============

@api_router.get("/snippets", response_model=List[dict])
async def list_snippets():
    snippets = await db.snippets.find({}, {"_id": 0}).to_list(100)
    if not snippets:
        return [
            {"id": "snip-1", "name": "Console Log", "prefix": "log", "body": "console.log($1);", "description": "Log to console", "language": "javascript", "scope": "global"},
            {"id": "snip-2", "name": "React Component", "prefix": "rfc", "body": "import React from 'react';\n\nfunction $1() {\n  return (\n    <div>\n      $2\n    </div>\n  );\n}\n\nexport default $1;", "description": "React functional component", "language": "javascriptreact", "scope": "global"},
            {"id": "snip-3", "name": "Python Function", "prefix": "def", "body": "def $1($2):\n    \"\"\"$3\"\"\"\n    $4", "description": "Python function", "language": "python", "scope": "global"},
            {"id": "snip-4", "name": "Try Catch", "prefix": "try", "body": "try {\n  $1\n} catch (error) {\n  console.error(error);\n}", "description": "Try-catch block", "language": "javascript", "scope": "global"},
            {"id": "snip-5", "name": "Arrow Function", "prefix": "af", "body": "const $1 = ($2) => {\n  $3\n};", "description": "Arrow function", "language": "javascript", "scope": "global"}
        ]
    return snippets

@api_router.post("/snippets", response_model=dict)
async def create_snippet(snippet: Snippet):
    await db.snippets.insert_one(prepare_doc(snippet.model_dump()))
    return snippet.model_dump()

# ============== DEBUG ENDPOINTS ==============

@api_router.post("/projects/{project_id}/debug/start", response_model=dict)
async def start_debug_session(project_id: str):
    session = DebugSession(project_id=project_id, status="running")
    await db.debug_sessions.insert_one(prepare_doc(session.model_dump()))
    return session.model_dump()

@api_router.post("/debug/{session_id}/breakpoint", response_model=dict)
async def add_breakpoint(session_id: str, breakpoint: Breakpoint):
    await db.debug_sessions.update_one(
        {"id": session_id},
        {"$push": {"breakpoints": prepare_doc(breakpoint.model_dump())}}
    )
    return breakpoint.model_dump()

@api_router.post("/debug/{session_id}/step", response_model=dict)
async def debug_step(session_id: str, action: str = "over"):
    # Actions: over, into, out, continue
    session = await db.debug_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Debug session not found")
    
    return {
        "action": action,
        "status": session.get('status', 'running'),
        "current_line": session.get('current_line', 1) + 1
    }

@api_router.post("/debug/{session_id}/stop", response_model=dict)
async def stop_debug_session(session_id: str):
    await db.debug_sessions.update_one(
        {"id": session_id},
        {"$set": {"status": "stopped"}}
    )
    return {"status": "stopped"}

@api_router.get("/debug/{session_id}", response_model=dict)
async def get_debug_session(session_id: str):
    session = await db.debug_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Debug session not found")
    return session

# ============== AUTH ENDPOINTS ==============

from passlib.context import CryptContext
from jose import jwt, JWTError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    password_hash: str = ""
    plan: str = "free"  # free, pro, enterprise
    avatar: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    plan: str
    avatar: Optional[str] = None

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

@api_router.post("/auth/register", response_model=dict)
async def register(data: UserRegister):
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password)
    )
    
    await db.users.insert_one(prepare_doc(user.model_dump()))
    token = create_token(user.id, user.email)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "plan": user.plan
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "plan": user.get("plan", "free")
        }
    }

@api_router.get("/auth/me", response_model=dict)
async def get_current_user(authorization: str = None):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== HEALTH CHECK ==============

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
