
from datetime import datetime
from typing import Annotated

import jwt
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
)
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import Base, SessionLocal
from models import Ticket, TicketMessage, User
from security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


# =========================================================
# PYDANTIC SCHEMAS
# Define schemas before routes that reference them.
# =========================================================

class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class AgentCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TicketCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    customer_email: EmailStr
    subject: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    priority: str = "medium"


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_name: str
    customer_email: str
    subject: str
    description: str
    status: str
    priority: str
    created_at: datetime


class TicketStatusUpdate(BaseModel):
    status: str

class TicketPriorityUpdate(BaseModel):
    priority: str

class TicketAssignmentUpdate(BaseModel):
    assigned_agent_id: int


class MessageCreate(BaseModel):
    author_type: str = "support"
    body: str = Field(min_length=1, max_length=10000)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    author_type: str
    body: str
    created_at: datetime


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(title="SupportPilot AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE DEPENDENCY
# =========================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================================================
# AUTHENTICATION
# =========================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")

        if not subject:
            raise credentials_error

        user_id = int(subject)

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise credentials_error

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        raise credentials_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated.",
    )

    return user


def require_roles(*allowed_roles: str):
    def role_checker(
        current_user: Annotated[User, Depends(get_current_user)]
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return current_user

    return role_checker

# =========================================================
# GENERAL ENDPOINTS
# =========================================================

@app.get("/")
def home():
    return {
        "message": "Welcome to SupportPilot AI",
        "status": "running",
    }


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "database": "connected",
    }


# =========================================================
# USER REGISTRATION
# =========================================================

@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    payload: UserRegister,
    db: Session = Depends(get_db),
):
    email = str(payload.email).strip().lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="customer",
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# =========================================================
# USER LOGIN
# =========================================================

@app.post(
    "/auth/login",
    response_model=TokenResponse,
)
def login_user(
    form_data: Annotated[
        OAuth2PasswordRequestForm,
        Depends(),
    ],
    db: Session = Depends(get_db),
):
    # OAuth2PasswordRequestForm uses "username".
    # The frontend should submit the email in this field.
    email = form_data.username.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if (
        user is None
        or not user.is_active
        or not verify_password(
            form_data.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
    }


# =========================================================
# CURRENT AUTHENTICATED USER
# =========================================================

@app.get(
    "/auth/me",
    response_model=UserResponse,
)
def read_current_user(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
):
    return current_user

# =========================================================
# AGENT LIST (ADMIN ONLY)
# =========================================================


@app.get("/admin/agents")
def list_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    agents = (
        db.query(User)
        .filter(User.role == "agent")
        .order_by(User.created_at.desc())
        .all()
    )

    return [
        {
            "id": agent.id,
            "full_name": agent.full_name,
            "email": agent.email,
            "role": agent.role,
            "is_active": agent.is_active,
            "created_at": agent.created_at,
        }
        for agent in agents
    ]


# =========================================================
# CREATE AGENT (ADMIN ONLY)
# =========================================================

@app.post(
    "/admin/agents",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_agent(
    payload: AgentCreate,
    current_user: Annotated[
        User,
        Depends(require_roles("admin")),
    ],
    db: Session = Depends(get_db),
):
    email = str(payload.email).strip().lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    agent = User(
        full_name=payload.full_name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="agent",
        is_active=True,
    )

    db.add(agent)
    db.commit()
    db.refresh(agent)

    return agent

# =========================================================
# CREATE TICKET
# =========================================================


@app.post(
    "/tickets",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket(
    payload: TicketCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    
):
    if payload.priority not in {
        "low",
        "medium",
        "high",
        "urgent",
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Priority must be low, medium, high, or urgent",
        )

    ticket = Ticket(
        customer_id=current_user.id,
        customer_name=current_user.full_name,
        customer_email=current_user.email,
        subject=payload.subject,
        description=payload.description,
        priority=payload.priority,
        status="open",
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return ticket


# =========================================================
# LIST ALL TICKETS
# =========================================================


@app.get(
    "/tickets",
    response_model=list[TicketResponse],
)
def list_tickets(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    query = db.query(Ticket)

    if current_user.role == "customer":
        query = query.filter(
            Ticket.customer_id == current_user.id
        )
    elif current_user.role not in {"agent", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view tickets",
        )

    return query.order_by(Ticket.created_at.desc()).all()


# =========================================================
# GET SINGLE TICKET
# =========================================================


@app.get(
    "/tickets/{ticket_id}",
    response_model=TicketResponse,
)
def get_ticket(
    ticket_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if current_user.role == "customer":
        if ticket.customer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found",
            )
    elif current_user.role not in {"agent", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this ticket",
        )

    return ticket



# =========================================================
# UPDATE TICKET STATUS
# =========================================================


@app.patch(
    "/tickets/{ticket_id}/status",
    response_model=TicketResponse,
)
def update_ticket_status(
    ticket_id: int,
    payload: TicketStatusUpdate,
    current_user: Annotated[
        User,
        Depends(require_roles("agent", "admin")),
    ],
    db: Session = Depends(get_db),
):
    allowed_statuses = {
        "open",
        "in_progress",
        "resolved",
    }

    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Status must be open, in_progress, or resolved",
        )

    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    ticket.status = payload.status

    db.commit()
    db.refresh(ticket)

    return ticket

# =========================================================
# UPDATE TICKET PRIORITY
# =========================================================

@app.patch(
    "/tickets/{ticket_id}/priority",
    response_model=TicketResponse,
)
def update_ticket_priority(
    ticket_id: int,
    payload: TicketPriorityUpdate,
    current_user: Annotated[
        User,
        Depends(require_roles("agent", "admin")),
    ],
    db: Session = Depends(get_db),
):
    allowed_priorities = {
        "low",
        "medium",
        "high",
        "urgent",
    }

    if payload.priority not in allowed_priorities:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Priority must be low, medium, high, or urgent",
        )

    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    ticket.priority = payload.priority

    db.commit()
    db.refresh(ticket)

    return ticket

# =========================================================
# ASSIGN TICKET TO AGENT
# =========================================================


@app.patch(
    "/tickets/{ticket_id}/assign",
    response_model=TicketResponse,
)
def assign_ticket(
    ticket_id: int,
    payload: TicketAssignmentUpdate,
    current_user: Annotated[
        User,
        Depends(require_roles("agent", "admin")),
    ],
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    assigned_agent = db.get(User, payload.assigned_agent_id)

    if (
        assigned_agent is None
        or not assigned_agent.is_active
        or assigned_agent.role != "agent"
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assigned user must be an active agent",
        )

    ticket.assigned_agent_id = assigned_agent.id

    db.commit()
    db.refresh(ticket)

    return ticket

# =========================================================
# UPDATE AGENT STATUS (ADMIN ONLY)
# =========================================================


@app.patch("/admin/agents/{agent_id}/status")
def update_agent_status(
    agent_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    agent = (
        db.query(User)
        .filter(User.id == agent_id, User.role == "agent")
        .first()
    )

    if not agent:
        raise HTTPException(
            status_code=404,
            detail="Agent not found",
        )

    agent.is_active = is_active
    db.commit()
    db.refresh(agent)

    return {
        "id": agent.id,
        "full_name": agent.full_name,
        "email": agent.email,
        "is_active": agent.is_active,
    }

# =========================================================
# GET TICKET MESSAGES
# =========================================================


@app.get(
    "/tickets/{ticket_id}/messages",
    response_model=list[MessageResponse],
)
def get_ticket_messages(
    ticket_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if current_user.role == "customer":
        if ticket.customer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found",
            )
    elif current_user.role not in {"agent", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view these messages",
        )

    return (
        db.query(TicketMessage)
        .filter(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at.asc())
        .all()
    )



# =========================================================
# ADD TICKET MESSAGE
# =========================================================


@app.post(
    "/tickets/{ticket_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_ticket_message(
    ticket_id: int,
    payload: MessageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if current_user.role == "customer":
        if ticket.customer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found",
            )
        author_type = "customer"

    elif current_user.role in {"agent", "admin"}:
        author_type = "support"

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to reply",
        )

    body = payload.body.strip()

    if not body:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty",
        )

    message = TicketMessage(
        ticket_id=ticket_id,
        author_type=author_type,
        author_id=current_user.id,
        body=body,
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return message

