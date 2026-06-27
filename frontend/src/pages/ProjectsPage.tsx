import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { Project } from '../types'
import Modal from '../components/Modal'

function taskDateWarning(start?: string, end?: string, pStart?: string, pEnd?: string): string | null {
  if (!start && !end) return null
  if (pStart && start && start < pStart) return 'warning.taskStartBeforePhaseStart'
  if (pEnd && end && end > pEnd) return 'warning.taskEndAfterPhaseEnd'
  if (pStart && end && end < pStart) return 'warning.taskEndBeforePhaseStart'
  if (pEnd && start && start > pEnd) return 'warning.taskStartAfterPhaseEnd'
  if (start && end && end < start) return 'warning.taskEndBeforeStart'
  return null
}

export default function ProjectsPage() {
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [warnings, setWarnings] = useState<Record<string, { phaseCount: number; taskCount: number }>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Project | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [progressCalcMethod, setProgressCalcMethod] = useState('task_count')
  const [status, setStatus] = useState('pending')
  const [projectProgress, setProjectProgress] = useState<Record<string, number>>({})
  const navigate = useNavigate()

  useEffect(() => { loadProjects() }, [])

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects')
      const projs: Project[] = res.data
      projs.sort((a, b) => {
        if (!a.start_date && !b.start_date) return 0
        if (!a.start_date) return 1
        if (!b.start_date) return -1
        return a.start_date < b.start_date ? -1 : 1
      })
      setProjects(projs)
      const warns: Record<string, { phaseCount: number; taskCount: number }> = {}
      const progressMap: Record<string, number> = {}
      await Promise.all(projs.map(async (p) => {
        try {
          const [phRes, dashRes] = await Promise.all([
            api.get(`/projects/${p.id}/phases`),
            api.get(`/projects/${p.id}/dashboard`),
          ])
          progressMap[p.id] = dashRes.data.progress ?? 0
          const phases = phRes.data
          let phaseCount = 0
          let taskCount = 0
          for (const ph of phases) {
            if (ph.start_date || ph.end_date) {
              if (p.start_date && ph.start_date && ph.start_date < p.start_date) phaseCount++
              else if (p.end_date && ph.end_date && ph.end_date > p.end_date) phaseCount++
              else if (p.start_date && ph.end_date && ph.end_date < p.start_date) phaseCount++
              else if (p.end_date && ph.start_date && ph.start_date > p.end_date) phaseCount++
              else if (ph.start_date && ph.end_date && ph.end_date < ph.start_date) phaseCount++
            }
            try {
              const tRes = await api.get(`/phases/${ph.id}/tasks`)
              for (const t of tRes.data) {
                if (t.start_date || t.end_date) {
                  if (taskDateWarning(t.start_date || undefined, t.end_date || undefined, ph.start_date || undefined, ph.end_date || undefined)) taskCount++
                }
              }
            } catch {}
          }
          if (phaseCount > 0 || taskCount > 0) warns[p.id] = { phaseCount, taskCount }
        } catch {}
      }))
      setProjectProgress(progressMap)
      setWarnings(warns)
    } catch (e) { console.error(e) }
  }

  const openEdit = (p: Project) => {
    const normalizedStatus = p.status === 'planning' ? 'pending' : (p.status || 'pending')
    setName(p.name); setDescription(p.description || ''); setStartDate(p.start_date); setEndDate(p.end_date); setProgressCalcMethod(p.progress_calc_method || 'task_count'); setStatus(normalizedStatus)
    setShowEdit(p)
  }

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/projects', { name, description, start_date: startDate, end_date: endDate, progress_calc_method: progressCalcMethod })
      setShowCreate(false)
      setName(''); setDescription(''); setStartDate(''); setEndDate(''); setProgressCalcMethod('task_count'); setStatus('pending')
      loadProjects()
    } catch (e) { console.error(e) }
  }

  const updateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEdit) return
    try {
      await api.put(`/projects/${showEdit.id}`, { name, description, start_date: startDate, end_date: endDate, progress_calc_method: progressCalcMethod, status })
      setShowEdit(null); setName(''); setDescription(''); setStartDate(''); setEndDate(''); setProgressCalcMethod('task_count'); setStatus('pending')
      loadProjects()
    } catch (e) { console.error(e) }
  }

  const deleteProject = async (id: string) => {
    if (!confirm(t('project.deleteConfirm'))) return
    try {
      await api.delete(`/projects/${id}`)
      loadProjects()
    } catch (e) { console.error(e) }
  }

  const selfWarn = (p: Project): string | null => {
    if (p.start_date && p.end_date && p.end_date < p.start_date) return 'warning.endDateBeforeStartDate'
    return null
  }

  const statusBadge = (status: string) => {
    const normalized = status === 'planning' ? 'pending' : status
    const cls = normalized === 'active' ? 'badge-active' : normalized === 'closed' ? 'badge-completed' : 'badge-pending'
    return <span className={`badge ${cls}`}>{t(`project.status.${normalized}`, normalized)}</span>
  }

  const totalWarnings = Object.values(warnings).reduce((s, w) => s + w.phaseCount + w.taskCount, 0)

  return (
    <div>
      <div className="page-header">
        <h1>{t('project.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('project.newProject')}</button>
      </div>

      {totalWarnings > 0 && (
        <div style={{ fontSize: '13px', color: '#e37400', marginBottom: '16px' }}>
          {t('project.dateRangeWarnings', {count: totalWarnings})}
        </div>
      )}

      <div className="grid">
        {projects.map((p) => {
          const self = selfWarn(p)
          const w = warnings[p.id]
          return (
            <div key={p.id} className="card" style={{ cursor: 'pointer', borderLeft: (self || w) ? '4px solid var(--warning)' : undefined }}>
              <div onClick={() => navigate(`/projects/${p.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px' }}>
                    {p.name}
                    {(self || w) && <span title={self ? t(self) : `${w.phaseCount + w.taskCount} warning(s)`} style={{ marginLeft: '4px', cursor: 'help' }}>⚠️</span>}
                  </h3>
                  {statusBadge(p.status)}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>{p.description}</p>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {t('dateRange.format', {start: p.start_date, end: p.end_date})}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t('project.progress')}</span>
                  <span style={{ fontWeight: 600 }}>{projectProgress[p.id] ?? 0}%</span>
                </div>
                <div className="progress-bar" style={{ marginTop: '4px', marginBottom: '6px', height: '6px' }}>
                  <div className="progress-bar-fill" style={{ width: `${projectProgress[p.id] ?? 0}%`, height: '100%' }} />
                </div>
                {self && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>⚠️ {t(self)}</div>}
                {w?.phaseCount > 0 && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>{t('project.phaseWarnings', {count: w.phaseCount})}</div>}
                {w?.taskCount > 0 && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>{t('project.taskWarnings', {count: w.taskCount})}</div>}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                <button className="btn" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); openEdit(p) }}>{t('common.edit')}</button>
                <button className="btn" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--danger, #e53e3e)' }} onClick={(e) => { e.stopPropagation(); deleteProject(p.id) }}>{t('common.delete')}</button>
              </div>
            </div>
          )
        })}
      </div>

      {showCreate && (
        <Modal title={t('project.newProject')} onClose={() => { setShowCreate(false); setName(''); setDescription(''); setStartDate(''); setEndDate(''); setProgressCalcMethod('task_count') }}>
          <form onSubmit={createProject}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('project.progressCalcMethod')}</label>
              <select value={progressCalcMethod} onChange={(e) => setProgressCalcMethod(e.target.value)}>
                <option value="task_count">{t('project.calcMethod.task_count')}</option>
                <option value="hour">{t('project.calcMethod.hour')}</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.create')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showEdit && (
        <Modal title={t('project.editProject')} onClose={() => { setShowEdit(null); setName(''); setDescription(''); setStartDate(''); setEndDate(''); setProgressCalcMethod('task_count'); setStatus('pending') }}>
          <form onSubmit={updateProject}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('project.progressCalcMethod')}</label>
              <select value={progressCalcMethod} onChange={(e) => setProgressCalcMethod(e.target.value)}>
                <option value="task_count">{t('project.calcMethod.task_count')}</option>
                <option value="hour">{t('project.calcMethod.hour')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('common.status')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">{t('project.status.pending')}</option>
                <option value="active">{t('project.status.active')}</option>
                <option value="closed">{t('project.status.closed')}</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowEdit(null); setName(''); setDescription(''); setStartDate(''); setEndDate(''); setProgressCalcMethod('task_count'); setStatus('pending') }}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
