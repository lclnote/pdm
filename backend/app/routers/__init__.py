from app.routers.auth import router as auth_router
from app.routers.projects import router as projects_router
from app.routers.phases import router as phases_router
from app.routers.tasks import router as tasks_router
from app.routers.applications import router as applications_router
from app.routers.deliverables import router as deliverables_router
from app.routers.risks import router as risks_router
from app.routers.issues import router as issues_router
from app.routers.dashboard import router as dashboard_router
from app.routers.task_collaborators import router as task_collaborators_router
from app.routers.task_templates import router as task_templates_router

routers = [
    auth_router,
    projects_router,
    phases_router,
    tasks_router,
    applications_router,
    deliverables_router,
    risks_router,
    issues_router,
    dashboard_router,
    task_collaborators_router,
    task_templates_router,
]
