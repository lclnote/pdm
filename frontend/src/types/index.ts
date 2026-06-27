export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  progress_calc_method: string;
  created_at: string;
  updated_at: string;
}

export interface Phase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  sort_order: number;
  parallel_execution: boolean;
  status: string;
  start_date?: string;
  end_date?: string;
}

export interface Task {
  id: string;
  project_id: string;
  phase_id: string;
  parent_task_id?: string;
  name: string;
  description?: string;
  task_level: string;
  assignee_id: string;
  estimated_hours: number;
  actual_hours?: number;
  status: string;
  weight: number;
  start_date?: string;
  end_date?: string;
  sort_order: number;
  children?: Task[];
}

export interface Dashboard {
  project_id: string;
  project_name: string;
  progress: number;
  completed_tasks: number;
  total_tasks: number;
  delayed_tasks: number;
  remaining_days: number;
  phase_summaries: { id: string; name: string; status: string; total_tasks: number; completed_tasks: number }[];
  pending_applications: number;
  risk_summary: Record<string, number>;
  issue_summary: Record<string, number>;
}
