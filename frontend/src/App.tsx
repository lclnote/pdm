import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDashboardPage from './pages/ProjectDashboardPage'
import PhasesPage from './pages/PhasesPage'
import TasksPage from './pages/TasksPage'
import RisksPage from './pages/RisksPage'
import IssuesPage from './pages/IssuesPage'
import ProjectMembersPage from './pages/ProjectMembersPage'
import DeliverablesPage from './pages/DeliverablesPage'
import SearchPage from './pages/SearchPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDashboardPage />} />
        <Route path="projects/:projectId/phases" element={<PhasesPage />} />
        <Route path="projects/:projectId/phases/:phaseId/tasks" element={<TasksPage />} />
        <Route path="projects/:projectId/risks" element={<RisksPage />} />
        <Route path="projects/:projectId/issues" element={<IssuesPage />} />
        <Route path="projects/:projectId/members" element={<ProjectMembersPage />} />
        <Route path="projects/:projectId/deliverables" element={<DeliverablesPage />} />
        <Route path="projects/:projectId/search" element={<SearchPage />} />
      </Route>
    </Routes>
  )
}
