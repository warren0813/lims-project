# LIMS Full Stack

This repository contains the rebuilt LIMS MVP:

- `lims-backend`: Django Ninja API, PostgreSQL schema, JWT auth, WIP/dispatch workflow, Celery equipment simulation, SSE, reports, seed data.
- `lims-nextjs`: role-routed Next.js frontend connected to the live API.

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

Seeded demo users:

| Role | Username | Password |
| --- | --- | --- |
| Fab user | `fab_user` | `mcv8uPKSvqz8Yru` |
| Lab member | `lab_member` | `t26fnPyedon6aFz` |
| Lab manager | `lab_manager` | `q4gXk7vEt2RNw9p` |

## Local Development

Backend:

```bash
cd lims-backend
python -m venv .venv
. .venv/bin/activate
pip install -e .
pip install pytest pytest-django factory-boy ruff
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Frontend:

```bash
cd lims-nextjs
cp .env.example .env.local
npm install
npm run dev
```

For a single-process local backend without Redis/Celery workers, run the backend with `CELERY_TASK_ALWAYS_EAGER=True`.
