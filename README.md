# SupportPilot AI

SupportPilot AI is a lightweight support desk application for managing customer tickets, agent workflows, and admin operations. The hosted application uses Neon for PostgreSQL, Render for the FastAPI backend, and Vercel for the React + Vite frontend. Docker Compose is available for running PostgreSQL locally during development.

## Overview

The application is structured around three primary roles:

- Customer: creates and tracks support tickets
- Agent: views and manages ticket status, priority, and replies
- Admin: manages agent accounts and can enable or disable agents

The frontend sends API requests to the FastAPI service. FastAPI connects to the Neon PostgreSQL database using the server-side `DATABASE_URL`.

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
- Docker-based local database option

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Pydantic, JWT
- Frontend: React, Vite
- Database: Neon PostgreSQL
- Hosting: Render (FastAPI), Vercel (frontend)
- Local database option: PostgreSQL 16 with Docker Compose

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
- Git

Docker Desktop or Docker Engine is optional and only needed to run the local PostgreSQL container.

## Local Development Setup

### 1) Start local PostgreSQL (optional)

From the project root:

```bash
docker-compose up -d db
```

This starts a local PostgreSQL instance on port 5432 using [docker-compose.yml](docker-compose.yml). For cloud development, use your Neon connection string in `DATABASE_URL` instead.

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

### 5) Create or update the database schema

This project uses Alembic migrations. From the `backend` directory, apply them to the database selected by `DATABASE_URL`:

```bash
alembic upgrade head
```

Use the local database URL for local development, or the Neon URL when intentionally updating the hosted database.

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

## Hosted Deployment

The production request path is Vercel frontend → Render FastAPI → Neon PostgreSQL. Configure each service with the following settings.

### Neon database

Create a Neon project and database, then copy its connection string. Configure the Render service's `DATABASE_URL` with the Neon host, database, username, and password. This project uses Psycopg 3, so use the `postgresql+psycopg://` scheme and retain Neon query parameters such as `sslmode=require`:

```env
DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>/<database>?sslmode=require
```

Keep this value private and configure it on Render only, never in the frontend.

### Render API

Create a Python web service from this repository with `backend` as its root directory. Use these commands:

```text
Build: pip install -r requirements.txt
Start: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Add `DATABASE_URL` from Neon and a strong, private `SECRET_KEY` to the Render service's environment variables. After the service is deployed, run `alembic upgrade head` from the backend root (for example, in the service shell) to apply database migrations.

### Vercel frontend

Create a Vercel project from this repository with `frontend` as its root directory. Use `npm run build` as the build command and `dist` as the output directory. Set this build-time environment variable in Vercel:

```env
VITE_API_URL=https://supportpilot-api-z7o7.onrender.com
```

The same value is stored in `frontend/.env.production`. Vercel environment variables take precedence, so remove or update any old `VITE_API_URL` value that points to localhost. Redeploy after changing it because Vite embeds the value during the frontend build. In production, requests should go to the Render host, not `localhost`.

### CORS

The FastAPI CORS allowlist is configured in `backend/main.py`. Ensure it includes the exact production Vercel origin (scheme and hostname, with no path). Add a custom domain there too if one is used. Preview deployments may have different hostnames and need to be allowed separately if they must call the API.

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

- Production database: Neon PostgreSQL, configured through the Render service's `DATABASE_URL`
- Local database: optional PostgreSQL container and persistent Docker volume configured in [docker-compose.yml](docker-compose.yml)
- Schema changes: apply committed Alembic migrations with `alembic upgrade head`

This project also includes a database dump at [supportpilot_backup.sql](supportpilot_backup.sql) that can be used to restore or inspect data, but it is not the live Neon database and must not be used as a source of credentials.

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
- For local development, PostgreSQL is running via Docker; for deployment, the Render service has a valid `DATABASE_URL`
- your virtual environment is active
- dependencies are installed with `pip install -r requirements.txt`

### Database connection issues

For local development, make sure `DATABASE_URL` matches your local PostgreSQL instance:

```env
postgresql+psycopg://<db_user>:<db_password>@localhost:5432/<db_name>
```

For Render, verify that `DATABASE_URL` is set to the Neon connection string with the `postgresql+psycopg://` scheme and `sslmode=require`.

### Frontend cannot reach API

Confirm that the Render API is available at its public URL, that Vercel's `VITE_API_URL` points to that URL and the frontend has been redeployed, and that the frontend's exact origin is allowed by FastAPI CORS configuration.
