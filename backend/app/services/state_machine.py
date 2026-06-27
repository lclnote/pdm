TASK_TRANSITIONS = {
    "not_started": ["ready", "suspended"],
    "ready": ["in_progress", "suspended"],
    "in_progress": ["awaiting_approval", "on_hold", "suspended"],
    "awaiting_approval": ["in_progress", "completed"],
    "on_hold": ["ready", "suspended"],
    "suspended": [],
    "completed": [],
}

TRANSITION_ACTORS = {
    ("not_started", "ready"): "system",
    ("not_started", "suspended"): "pm",
    ("ready", "in_progress"): "assignee",
    ("ready", "suspended"): "pm",
    ("in_progress", "awaiting_approval"): "assignee",
    ("in_progress", "on_hold"): "pm",
    ("in_progress", "suspended"): "pm",
    ("awaiting_approval", "in_progress"): "approver",
    ("awaiting_approval", "completed"): "approver",
    ("on_hold", "ready"): "pm",
    ("on_hold", "suspended"): "pm",
}

APPLICATION_TRANSITIONS = {
    "pending": ["approved", "rejected"],
}

PHASE_TRANSITIONS = {
    "pending": ["active"],
    "active": ["gate_waiting"],
    "gate_waiting": ["completed", "active"],
}


def get_allowed_transitions(current_status: str) -> list[str]:
    return TASK_TRANSITIONS.get(current_status, [])


def is_transition_allowed(current_status: str, new_status: str) -> bool:
    return new_status in TASK_TRANSITIONS.get(current_status, [])


def can_perform_transition(current_status: str, new_status: str, actor_role: str) -> bool:
    required = TRANSITION_ACTORS.get((current_status, new_status))
    if required is None:
        return False
    if required == "system":
        return True
    if required == "assignee":
        return actor_role in ("worker", "sub_leader", "pm")
    if required == "approver":
        return actor_role in ("sub_leader", "pm")
    if required == "pm":
        return actor_role == "pm"
    return False


def calculate_priority(impact: str, probability: str) -> str:
    matrix = {
        ("high", "high"): "critical",
        ("high", "medium"): "high",
        ("high", "low"): "medium",
        ("medium", "high"): "high",
        ("medium", "medium"): "medium",
        ("medium", "low"): "low",
        ("low", "high"): "medium",
        ("low", "medium"): "low",
        ("low", "low"): "low",
    }
    return matrix.get((impact, probability), "low")
