import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Layout() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t, i18n } = useTranslation()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  const toggleLang = () => i18n.changeLanguage(i18n.language === 'ja' ? 'en' : 'ja')

  return (
    <div className="layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <h2>{t('app.title')}</h2>
        <nav onClick={closeSidebar}>
          <NavLink to="/projects" end>{t('nav.projects')}</NavLink>
          {projectId && (
            <>
              <NavLink to={`/projects/${projectId}`}>{t('nav.dashboard')}</NavLink>
              <NavLink to={`/projects/${projectId}/phases`}>{t('nav.phases')}</NavLink>
              <NavLink to={`/projects/${projectId}/risks`}>{t('nav.risks')}</NavLink>
              <NavLink to={`/projects/${projectId}/issues`}>{t('nav.issues')}</NavLink>
              <NavLink to={`/projects/${projectId}/members`}>{t('nav.members')}</NavLink>
              <NavLink to={`/projects/${projectId}/deliverables`}>{t('nav.deliverables')}</NavLink>
              <NavLink to={`/projects/${projectId}/search`}>{t('nav.search')}</NavLink>
            </>
          )}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>{user.name}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm" onClick={toggleLang}>{i18n.language === 'ja' ? 'EN' : 'JP'}</button>
            <button className="btn btn-sm" onClick={handleLogout}>{t('nav.logout')}</button>
          </div>
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
