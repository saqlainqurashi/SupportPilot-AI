# SupportPilot AI

SupportPilot AI is a lightweight support desk application for managing customer tickets, agent workflows, and admin operations. The project includes a FastAPI backend, a React + Vite frontend, and a PostgreSQL database container for local development.

## Overview

The application is structured around three primary roles:

- Customer: creates and tracks support tickets
- Agent: views and manages ticket status, priority, and replies
- Admin: manages agent accounts and can enable or disable agents

The app exposes a REST API and a React dashboard UI, both designed to run locally during development.

## Features

- User registration and login
- JWT-based authentication
- Customer ticket creation and tracking
- Agent-side ticket management
- Ticket status and priority updates
- Ticket assignment to active agents
- Support message threads per ticket
- Admin-only agent management
- PostgreSQL persistence via SQLAlchemy
- Docker-based local database setup

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Pydantic, JWT
- Frontend: React, Vite
- Database: PostgreSQL 16
- Containerization: Docker Compose

## Project Structure

```text
SupportPilot AI/
├── backend/
│   ├── .env
│   ├── .venv/
│   ├── alembic.ini
│   ├── create_admin.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── security.py
│   ├── migrations/
│   └── __pycache__/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
├── docker-compose.yml
├── supportpilot_backup.sql
├── README.md
└── .gitignore
```

## Prerequisites

Before running the app, make sure you have installed:

- Python 3.11+
- Node.js 18+
- npm
- Docker Desktop or Docker Engine
- Git

## Local Development Setup

### 1) Start PostgreSQL with Docker

From the project root:

```bash
docker-compose up -d db
```

This starts PostgreSQL on port 5432 using the configuration in [docker-compose.yml](docker-compose.yml).

### 2) Configure backend environment

Create or update the backend environment file:

```bash
backend/.env
```

Use values like:

```env
DATABASE_URL=postgresql+psycopg://<db_user>:<db_password>@localhost:5432/<db_name>
SECRET_KEY=replace_with_a_long_random_secret_key
```

> The backend loads this file automatically via `python-dotenv`. Keep your actual credentials in the local environment file and never commit them to source control.

### 3) Create and activate a Python virtual environment

```bash
cd backend
python -m venv .venv
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 4) Install backend dependencies

```bash
pip install -r requirements.txt
```

### 5) Create the database tables

This project uses SQLAlchemy models and Alembic migrations. To initialize the schema for a fresh database, run:

```bash
python -c "from database import Base, engine; from models import User, Ticket, TicketMessage; Base.metadata.create_all(bind=engine)"
```

If you prefer the migration workflow, you can also use Alembic from the backend directory.

### 6) Create an admin account

```bash
python create_admin.py
```

You will be prompted to enter:

- admin full name
- admin email
- admin password

This creates an admin user with the `admin` role.

### 7) Start the backend API

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- http://localhost:8000
- health check: http://localhost:8000/health

### 8) Start the frontend

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend should run at:

- http://localhost:5173

## Default Local URLs

- Frontend UI: http://localhost:5173
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

## Authentication

The app uses token-based authentication with Bearer JWTs. The frontend stores the token in local storage after login and sends it with authenticated API requests.

### Login flow

- POST /auth/login
- Returns an access token and token type
- Token is then used for protected routes

### Key API endpoints

- POST /auth/register
- POST /auth/login
- GET /auth/me
- GET /tickets
- POST /tickets
- PATCH /tickets/{ticket_id}/status
- PATCH /tickets/{ticket_id}/priority
- PATCH /tickets/{ticket_id}/assign
- GET /tickets/{ticket_id}/messages
- POST /tickets/{ticket_id}/messages
- GET /admin/agents
- POST /admin/agents
- PATCH /admin/agents/{agent_id}/status

## Roles and Permissions

- Customer: can register, log in, create tickets, and view their own tickets
- Agent: can view tickets, update status/priority, assign tickets, and reply to tickets
- Admin: can manage agent accounts and toggle agent active status

## Database Notes

- Database name: set in your local environment file
- Username: set in your local environment file
- Password: set in your local environment file
- Docker volume: configured in [docker-compose.yml](docker-compose.yml)

This project also includes a database dump at [supportpilot_backup.sql](supportpilot_backup.sql) that can be used to restore or inspect data, but it should be treated as a backup artifact and not used as a source of live credentials.

## Common Commands

Start the database:

```bash
docker-compose up -d db
```

Stop the database:

```bash
docker-compose down
```

Stop the database and remove volumes:

```bash
docker-compose down -v
```

Run backend in development mode:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Run frontend in development mode:

```bash
cd frontend
npm run dev
```

## Troubleshooting

### Backend fails to start

Check the following:

- `backend/.env` exists and contains valid values
- PostgreSQL is running via Docker
- your virtual environment is active
- dependencies are installed with `pip install -r requirements.txt`

### Database connection issues

Make sure the `DATABASE_URL` matches your local PostgreSQL instance:

```env
postgresql+psycopg://<db_user>:<db_password>@localhost:5432/<db_name>
```

### Frontend cannot reach API

Confirm that the backend is running on port 8000 and that the frontend is using the expected API base URL in the client code.
