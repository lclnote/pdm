# PDM - Project Development Manager

## Quick Start

```bash
docker compose up -d
```

- API: http://localhost:8000/api
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

## Architecture

- **Backend**: FastAPI (Python) + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Proxy**: nginx (reverse proxy + SSL termination)

## SSL Setup

```bash
# Initial certificate acquisition
./init-ssl.sh p.mng666.com admin@mng666.com

# Auto-renewal (cron)
0 0 * * * docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
```

## Domain Configuration

- `p.mng666.com` - Production
- `t.mng666.com` - Testing

## API Endpoints

| Module | Path | Description |
|--------|------|-------------|
| Auth | `/api/auth/*` | Login/logout/user info |
| Projects | `/api/projects/*` | Project CRUD + members |
| Phases | `/api/phases/*` | Phase CRUD + gate requests |
| Tasks | `/api/tasks/*` | Task CRUD + status + dependencies |
| Applications | `/api/applications/*` | Application approval workflow |
| Deliverables | `/api/deliverables/*` | Deliverable CRUD + reviews |
| Risks | `/api/risks/*` | Risk CRUD + heatmap |
| Issues | `/api/issues/*` | Issue CRUD + comments |
| Dashboard | `/api/dashboard` | Aggregated project data |
