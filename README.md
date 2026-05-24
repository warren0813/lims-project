# LIMS Full Stack

This repository contains the rebuilt LIMS MVP:

- `backend`: Django Ninja API, PostgreSQL schema, JWT auth, WIP/dispatch workflow, Celery equipment simulation, SSE, and reports.
- `frontend`: role-routed Next.js frontend connected to the live API.

## Run With Docker Compose

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- API docs: http://localhost:8000/api/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

The application starts with a clean database. On first launch, create the first
lab manager from the login screen. After that, use the manager account APIs/UI to
create fab and lab users.

## Local Development

Backend:

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -e .
pip install pytest pytest-django factory-boy ruff
python manage.py migrate
python manage.py runserver
```

Optional demo data for local testing only:

```bash
python manage.py seed_demo
```

Frontend:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

For a single-process local backend without Redis/Celery workers, run the backend with `CELERY_TASK_ALWAYS_EAGER=True`.
