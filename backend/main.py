from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from database import Base, SessionLocal
from models import Ticket, TicketMessage
from datetime import datetime
from typing import Annotated
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session
from models import User
from security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


app = FastAPI(title="SupportPilot AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class TicketCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    customer_email: str = Field(min_length=3, max_length=255)
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

    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_name: str
    customer_email: str
    subject: str
    description: str
    status: str
    priority: str
    created_at: datetime


@app.get("/")
def home():
    return {
        "message": "Welcome to SupportPilot AI",
        "status": "running",
    }


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "connected"}


@app.post("/tickets", response_model=TicketResponse, status_code=201)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
):
    if payload.priority not in {"low", "medium", "high", "urgent"}:
        raise HTTPException(
            status_code=422,
            detail="Priority must be low, medium, high, or urgent",
        )

    ticket = Ticket(**payload.model_dump())

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return ticket


@app.get("/tickets", response_model=list[TicketResponse])
def list_tickets(db: Session = Depends(get_db)):
    return (
        db.query(Ticket)
        .order_by(Ticket.created_at.desc())
        .all()
    )

@app.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return ticket


@app.patch("/tickets/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: int,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
):
    allowed_statuses = {"open", "in_progress", "resolved"}

    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=422,
            detail="Status must be open, in_progress, or resolved",
        )

    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = payload.status
    db.commit()
    db.refresh(ticket)

    return ticket


@app.get(
    "/tickets/{ticket_id}/messages",
    response_model=list[MessageResponse],
)
def get_ticket_messages(
    ticket_id: int,
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return (
        db.query(TicketMessage)
        .filter(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at.asc())
        .all()
    )


@app.post(
    "/tickets/{ticket_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
def add_ticket_message(
    ticket_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
):
    ticket = db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if payload.author_type not in {"customer", "support"}:
        raise HTTPException(
            status_code=422,
            detail="Author type must be customer or support",
        )

    message = TicketMessage(
        ticket_id=ticket_id,
        author_type=payload.author_type,
        body=payload.body.strip(),
    )

    if not message.body:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty",
        )

    db.add(message)
    db.commit()
    db.refresh(message)

    return message
