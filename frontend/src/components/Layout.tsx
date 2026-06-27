import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useParams } from 'react-router-dom'

export default function Layout() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <h2>PDM</h2>
        <nav onClick={closeSidebar}>
          <NavLink to="/projects" end>Projects</NavLink>
          {projectId && (
            <>
              <NavLink to={`/projects/${projectId}`}>Dashboard</NavLink>
              <NavLink to={`/projects/${projectId}/phases`}>Phases</NavLink>
              <NavLink to={`/projects/${projectId}/risks`}>Risks</NavLink>
              <NavLink to={`/projects/${projectId}/issues`}>Issues</NavLink>
            </>
          )}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>{user.name}</div>
          <button className="btn btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
