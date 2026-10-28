
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="customer")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    customer_tickets = relationship(
        "Ticket",
        back_populates="customer",
        foreign_keys="Ticket.customer_id",
    )
    assigned_tickets = relationship(
        "Ticket",
        back_populates="assigned_agent",
        foreign_keys="Ticket.assigned_agent_id",
    )
    messages = relationship("TicketMessage", back_populates="author")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(100), nullable=False)
    customer_email = Column(String(255), nullable=False, index=True)
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="open")
    priority = Column(String(30), nullable=False, default="medium")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Nullable initially so existing tickets remain valid.
    # We'll backfill ownership before enforcing it.
    customer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )
    assigned_agent_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    customer = relationship(
        "User",
        back_populates="customer_tickets",
        foreign_keys=[customer_id],
    )
    assigned_agent = relationship(
        "User",
        back_populates="assigned_tickets",
        foreign_keys=[assigned_agent_id],
    )
    messages = relationship(
        "TicketMessage",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketMessage.created_at",
    )


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(
        Integer,
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_type = Column(String(20), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Nullable temporarily to preserve existing messages.
    author_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    ticket = relationship("Ticket", back_populates="messages")
    author = relationship("User", back_populates="messages")
