from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import strawberry
from strawberry.fastapi import GraphQLRouter
from strawberry.types import Info
from strawberry.subscriptions import GRAPHQL_TRANSPORT_WS_PROTOCOL, GRAPHQL_WS_PROTOCOL
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, AsyncGenerator
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import uuid
import asyncio
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Subscription event broadcast
class SubscriptionManager:
    def __init__(self):
        self.connections: dict[str, list] = {}
    
    async def broadcast(self, org_id: str, event_type: str, data: dict):
        if org_id in self.connections:
            for queue in self.connections[org_id]:
                await queue.put({"type": event_type, "data": data})
    
    def subscribe(self, org_id: str) -> asyncio.Queue:
        if org_id not in self.connections:
            self.connections[org_id] = []
        queue = asyncio.Queue()
        self.connections[org_id].append(queue)
        return queue
    
    def unsubscribe(self, org_id: str, queue: asyncio.Queue):
        if org_id in self.connections:
            self.connections[org_id].remove(queue)

subscription_manager = SubscriptionManager()

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        user = await db.users.find_one({"email": email}, {"_id": 0, "password": 0})
        return user
    except JWTError:
        return None

def generate_id() -> str:
    return str(uuid.uuid4())

# Strawberry Types
@strawberry.type
class User:
    id: str
    email: str
    name: str
    created_at: str

@strawberry.type
class Organization:
    id: str
    name: str
    slug: str
    contact_email: str
    created_at: str

@strawberry.type
class Project:
    id: str
    organization_id: str
    name: str
    description: str
    status: str
    due_date: Optional[str]
    created_at: str
    task_count: int = 0
    completed_tasks: int = 0

@strawberry.type
class Task:
    id: str
    project_id: str
    title: str
    description: str
    status: str
    assignee_email: str
    due_date: Optional[str]
    created_at: str

@strawberry.type
class TaskComment:
    id: str
    task_id: str
    content: str
    author_email: str
    created_at: str

@strawberry.type
class ProjectStats:
    total_projects: int
    active_projects: int
    completed_projects: int
    on_hold_projects: int
    total_tasks: int
    completed_tasks: int
    completion_rate: float

@strawberry.type
class AuthPayload:
    token: str
    user: User

@strawberry.type
class SubscriptionEvent:
    event_type: str
    entity_type: str
    entity_id: str
    organization_id: str

# Input Types
@strawberry.input
class RegisterInput:
    email: str
    password: str
    name: str

@strawberry.input
class LoginInput:
    email: str
    password: str

@strawberry.input
class OrganizationInput:
    name: str
    slug: str
    contact_email: str

@strawberry.input
class ProjectInput:
    organization_id: str
    name: str
    description: str = ""
    status: str = "ACTIVE"
    due_date: Optional[str] = None

@strawberry.input
class ProjectUpdateInput:
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None

@strawberry.input
class TaskInput:
    project_id: str
    title: str
    description: str = ""
    status: str = "TODO"
    assignee_email: str = ""
    due_date: Optional[str] = None

@strawberry.input
class TaskUpdateInput:
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assignee_email: Optional[str] = None
    due_date: Optional[str] = None

@strawberry.input
class TaskCommentInput:
    task_id: str
    content: str

# Context
async def get_context(token: Optional[str] = None):
    user = None
    if token:
        user = await get_current_user(token)
    return {"user": user, "db": db}

# Query
@strawberry.type
class Query:
    @strawberry.field
    async def me(self, info: Info) -> Optional[User]:
        user = info.context.get("user")
        if not user:
            return None
        return User(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    
    @strawberry.field
    async def organizations(self, info: Info) -> List[Organization]:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        orgs = await db.organizations.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).to_list(100)
        return [Organization(**org) for org in orgs]
    
    @strawberry.field
    async def organization(self, info: Info, id: str) -> Optional[Organization]:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        org = await db.organizations.find_one({"id": id, "user_id": user["id"]}, {"_id": 0, "user_id": 0})
        if org:
            return Organization(**org)
        return None
    
    @strawberry.field
    async def projects(self, info: Info, organization_id: str) -> List[Project]:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        # Verify organization access
        org = await db.organizations.find_one({"id": organization_id, "user_id": user["id"]})
        if not org:
            raise Exception("Organization not found")
        
        projects = await db.projects.find({"organization_id": organization_id}, {"_id": 0}).to_list(100)
        result = []
        for proj in projects:
            task_count = await db.tasks.count_documents({"project_id": proj["id"]})
            completed_tasks = await db.tasks.count_documents({"project_id": proj["id"], "status": "DONE"})
            result.append(Project(
                **proj,
                task_count=task_count,
                completed_tasks=completed_tasks
            ))
        return result
    
    @strawberry.field
    async def project(self, info: Info, id: str) -> Optional[Project]:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        proj = await db.projects.find_one({"id": id}, {"_id": 0})
        if proj:
            org = await db.organizations.find_one({"id": proj["organization_id"], "user_id": user["id"]})
            if not org:
                raise Exception("Access denied")
            task_count = await db.tasks.count_documents({"project_id": proj["id"]})
            completed_tasks = await db.tasks.count_documents({"project_id": proj["id"], "status": "DONE"})
            return Project(**proj, task_count=task_count, completed_tasks=completed_tasks)
        return None
    
    @strawberry.field
    async def tasks(self, info: Info, project_id: str) -> List[Task]:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        # Verify project access
        proj = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not proj:
            raise Exception("Project not found")
        org = await db.organizations.find_one({"id": proj["organization_id"], "user_id": user["id"]})
        if not org:
            raise Exception("Access denied")
        
        tasks = await db.tasks.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
        return [Task(**task) for task in tasks]
    
    @strawberry.field
    async def task(self, info: Info, id: str) -> Optional[Task]:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        task = await db.tasks.find_one({"id": id}, {"_id": 0})
        if task:
            proj = await db.projects.find_one({"id": task["project_id"]})
            if proj:
                org = await db.organizations.find_one({"id": proj["organization_id"], "user_id": user["id"]})
                if org:
                    return Task(**task)
        return None
    
    @strawberry.field
    async def task_comments(self, info: Info, task_id: str) -> List[TaskComment]:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        comments = await db.task_comments.find({"task_id": task_id}, {"_id": 0}).to_list(1000)
        return [TaskComment(**comment) for comment in comments]
    
    @strawberry.field
    async def project_stats(self, info: Info, organization_id: str) -> ProjectStats:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        org = await db.organizations.find_one({"id": organization_id, "user_id": user["id"]})
        if not org:
            raise Exception("Organization not found")
        
        total_projects = await db.projects.count_documents({"organization_id": organization_id})
        active_projects = await db.projects.count_documents({"organization_id": organization_id, "status": "ACTIVE"})
        completed_projects = await db.projects.count_documents({"organization_id": organization_id, "status": "COMPLETED"})
        on_hold_projects = await db.projects.count_documents({"organization_id": organization_id, "status": "ON_HOLD"})
        
        # Get all project IDs for this org
        projects = await db.projects.find({"organization_id": organization_id}, {"id": 1, "_id": 0}).to_list(1000)
        project_ids = [p["id"] for p in projects]
        
        total_tasks = await db.tasks.count_documents({"project_id": {"$in": project_ids}}) if project_ids else 0
        completed_tasks = await db.tasks.count_documents({"project_id": {"$in": project_ids}, "status": "DONE"}) if project_ids else 0
        
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return ProjectStats(
            total_projects=total_projects,
            active_projects=active_projects,
            completed_projects=completed_projects,
            on_hold_projects=on_hold_projects,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            completion_rate=round(completion_rate, 1)
        )

# Mutation
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def register(self, info: Info, input: RegisterInput) -> AuthPayload:
        existing = await db.users.find_one({"email": input.email})
        if existing:
            raise Exception("Email already registered")
        
        user_id = generate_id()
        now = datetime.now(timezone.utc).isoformat()
        user_doc = {
            "id": user_id,
            "email": input.email,
            "password": get_password_hash(input.password),
            "name": input.name,
            "created_at": now
        }
        await db.users.insert_one(user_doc)
        
        token = create_access_token(data={"sub": input.email})
        return AuthPayload(
            token=token,
            user=User(id=user_id, email=input.email, name=input.name, created_at=now)
        )
    
    @strawberry.mutation
    async def login(self, info: Info, input: LoginInput) -> AuthPayload:
        user = await db.users.find_one({"email": input.email})
        if not user or not verify_password(input.password, user["password"]):
            raise Exception("Invalid credentials")
        
        token = create_access_token(data={"sub": input.email})
        return AuthPayload(
            token=token,
            user=User(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
        )
    
    @strawberry.mutation
    async def create_organization(self, info: Info, input: OrganizationInput) -> Organization:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        
        existing = await db.organizations.find_one({"slug": input.slug})
        if existing:
            raise Exception("Organization slug already exists")
        
        org_id = generate_id()
        now = datetime.now(timezone.utc).isoformat()
        org_doc = {
            "id": org_id,
            "user_id": user["id"],
            "name": input.name,
            "slug": input.slug,
            "contact_email": input.contact_email,
            "created_at": now
        }
        await db.organizations.insert_one(org_doc)
        return Organization(id=org_id, name=input.name, slug=input.slug, contact_email=input.contact_email, created_at=now)
    
    @strawberry.mutation
    async def create_project(self, info: Info, input: ProjectInput) -> Project:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        
        org = await db.organizations.find_one({"id": input.organization_id, "user_id": user["id"]})
        if not org:
            raise Exception("Organization not found")
        
        proj_id = generate_id()
        now = datetime.now(timezone.utc).isoformat()
        proj_doc = {
            "id": proj_id,
            "organization_id": input.organization_id,
            "name": input.name,
            "description": input.description,
            "status": input.status,
            "due_date": input.due_date,
            "created_at": now
        }
        await db.projects.insert_one(proj_doc)
        
        await subscription_manager.broadcast(input.organization_id, "PROJECT_CREATED", {"id": proj_id})
        
        return Project(
            id=proj_id,
            organization_id=input.organization_id,
            name=input.name,
            description=input.description,
            status=input.status,
            due_date=input.due_date,
            created_at=now,
            task_count=0,
            completed_tasks=0
        )
    
    @strawberry.mutation
    async def update_project(self, info: Info, id: str, input: ProjectUpdateInput) -> Project:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        
        proj = await db.projects.find_one({"id": id}, {"_id": 0})
        if not proj:
            raise Exception("Project not found")
        
        org = await db.organizations.find_one({"id": proj["organization_id"], "user_id": user["id"]})
        if not org:
            raise Exception("Access denied")
        
        update_data = {}
        if input.name is not None:
            update_data["name"] = input.name
        if input.description is not None:
            update_data["description"] = input.description
        if input.status is not None:
            update_data["status"] = input.status
        if input.due_date is not None:
            update_data["due_date"] = input.due_date
        
        if update_data:
            await db.projects.update_one({"id": id}, {"$set": update_data})
        
        updated = await db.projects.find_one({"id": id}, {"_id": 0})
        task_count = await db.tasks.count_documents({"project_id": id})
        completed_tasks = await db.tasks.count_documents({"project_id": id, "status": "DONE"})
        
        await subscription_manager.broadcast(proj["organization_id"], "PROJECT_UPDATED", {"id": id})
        
        return Project(**updated, task_count=task_count, completed_tasks=completed_tasks)
    
    @strawberry.mutation
    async def delete_project(self, info: Info, id: str) -> bool:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        
        proj = await db.projects.find_one({"id": id})
        if not proj:
            raise Exception("Project not found")
        
        org = await db.organizations.find_one({"id": proj["organization_id"], "user_id": user["id"]})
        if not org:
            raise Exception("Access denied")
        
        # Delete all related data
        await db.task_comments.delete_many({"task_id": {"$in": [t["id"] for t in await db.tasks.find({"project_id": id}, {"id": 1}).to_list(1000)]}})
        await db.tasks.delete_many({"project_id": id})
        await db.projects.delete_one({"id": id})
        
        await subscription_manager.broadcast(proj["organization_id"], "PROJECT_DELETED", {"id": id})
        
        return True
    
    @strawberry.mutation
    async def create_task(self, info: Info, input: TaskInput) -> Task:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        
        proj = await db.projects.find_one({"id": input.project_id})
        if not proj:
            raise Exception("Project not found")
        
        org = await db.organizations.find_one({"id": proj["organization_id"], "user_id": user["id"]})
        if not org:
            raise Exception("Access denied")
        
        task_id = generate_id()
        now = datetime.now(timezone.utc).isoformat()
        task_doc = {
            "id": task_id,
            "project_id": input.project_id,
            "title": input.title,
            "description": input.description,
            "status": input.status,
            "assignee_email": input.assignee_email,
            "due_date": input.due_date,
            "created_at": now
        }
        await db.tasks.insert_one(task_doc)
        
        await subscription_manager.broadcast(proj["organization_id"], "TASK_CREATED", {"id": task_id, "project_id": input.project_id})
        
        return Task(
            id=task_id,
            project_id=input.project_id,
            title=input.title,
            description=input.description,
            status=input.status,
            assignee_email=input.assignee_email,
            due_date=input.due_date,
            created_at=now
        )
    
    @strawberry.mutation
    async def update_task(self, info: Info, id: str, input: TaskUpdateInput) -> Task:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        
        task = await db.tasks.find_one({"id": id})
        if not task:
            raise Exception("Task not found")
        
        proj = await db.projects.find_one({"id": task["project_id"]})
        if not proj:
            raise Exception("Project not found")
        
        org = await db.organizations.find_one({"id": proj["organization_id"], "user_id": user["id"]})
        if not org:
            raise Exception("Access denied")
        
        update_data = {}
        if input.title is not None:
            update_data["title"] = input.title
        if input.description is not None:
            update_data["description"] = input.description
        if input.status is not None:
            update_data["status"] = input.status
        if input.assignee_email is not None:
            update_data["assignee_email"] = input.assignee_email
        if input.due_date is not None:
            update_data["due_date"] = input.due_date
        
        if update_data:
            await db.tasks.update_one({"id": id}, {"$set": update_data})
        
        updated = await db.tasks.find_one({"id": id}, {"_id": 0})
        
        await subscription_manager.broadcast(proj["organization_id"], "TASK_UPDATED", {"id": id, "project_id": task["project_id"]})
        
        return Task(**updated)
    
    @strawberry.mutation
    async def delete_task(self, info: Info, id: str) -> bool:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        
        task = await db.tasks.find_one({"id": id})
        if not task:
            raise Exception("Task not found")
        
        proj = await db.projects.find_one({"id": task["project_id"]})
        if not proj:
            raise Exception("Project not found")
        
        org = await db.organizations.find_one({"id": proj["organization_id"], "user_id": user["id"]})
        if not org:
            raise Exception("Access denied")
        
        await db.task_comments.delete_many({"task_id": id})
        await db.tasks.delete_one({"id": id})
        
        await subscription_manager.broadcast(proj["organization_id"], "TASK_DELETED", {"id": id, "project_id": task["project_id"]})
        
        return True
    
    @strawberry.mutation
    async def add_comment(self, info: Info, input: TaskCommentInput) -> TaskComment:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        
        task = await db.tasks.find_one({"id": input.task_id})
        if not task:
            raise Exception("Task not found")
        
        proj = await db.projects.find_one({"id": task["project_id"]})
        if not proj:
            raise Exception("Project not found")
        
        org = await db.organizations.find_one({"id": proj["organization_id"], "user_id": user["id"]})
        if not org:
            raise Exception("Access denied")
        
        comment_id = generate_id()
        now = datetime.now(timezone.utc).isoformat()
        comment_doc = {
            "id": comment_id,
            "task_id": input.task_id,
            "content": input.content,
            "author_email": user["email"],
            "created_at": now
        }
        await db.task_comments.insert_one(comment_doc)
        
        await subscription_manager.broadcast(proj["organization_id"], "COMMENT_ADDED", {"id": comment_id, "task_id": input.task_id})
        
        return TaskComment(
            id=comment_id,
            task_id=input.task_id,
            content=input.content,
            author_email=user["email"],
            created_at=now
        )
    
    @strawberry.mutation
    async def delete_comment(self, info: Info, id: str) -> bool:
        user = info.context.get("user")
        if not user:
            raise Exception("Not authenticated")
        
        comment = await db.task_comments.find_one({"id": id})
        if not comment:
            raise Exception("Comment not found")
        
        if comment["author_email"] != user["email"]:
            raise Exception("Access denied")
        
        await db.task_comments.delete_one({"id": id})
        return True

# Subscription
@strawberry.type
class Subscription:
    @strawberry.subscription
    async def organization_events(self, info: Info, organization_id: str) -> AsyncGenerator[SubscriptionEvent, None]:
        queue = subscription_manager.subscribe(organization_id)
        try:
            while True:
                event = await queue.get()
                yield SubscriptionEvent(
                    event_type=event["type"],
                    entity_type=event["type"].split("_")[0],
                    entity_id=event["data"].get("id", ""),
                    organization_id=organization_id
                )
        except asyncio.CancelledError:
            subscription_manager.unsubscribe(organization_id, queue)

# Create schema
schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)

# Create the main app
app = FastAPI(title="Mini PM GraphQL API")

# REST API router for backward compatibility
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "Mini PM API - Use /api/graphql for GraphQL endpoint"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Auth endpoints (REST for convenience)
class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

@api_router.post("/auth/register")
async def register_rest(user: UserRegister):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = generate_id()
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": get_password_hash(user.password),
        "name": user.name,
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    token = create_access_token(data={"sub": user.email})
    return {
        "token": token,
        "user": {"id": user_id, "email": user.email, "name": user.name, "created_at": now}
    }

@api_router.post("/auth/login")
async def login_rest(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(data={"sub": user.email})
    return {
        "token": token,
        "user": {"id": db_user["id"], "email": db_user["email"], "name": db_user["name"], "created_at": db_user["created_at"]}
    }

@api_router.get("/auth/me")
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

# Include REST router
app.include_router(api_router)

# GraphQL context dependency
from starlette.requests import Request
from starlette.websockets import WebSocket

async def get_context(request: Request = None, websocket: WebSocket = None):
    token = None
    if request:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    elif websocket:
        auth_header = websocket.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    user = None
    if token:
        user = await get_current_user(token)
    
    return {"user": user, "db": db, "request": request}

graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context,
    subscription_protocols=[GRAPHQL_TRANSPORT_WS_PROTOCOL, GRAPHQL_WS_PROTOCOL]
)
app.include_router(graphql_app, prefix="/api/graphql")

# CORS
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
