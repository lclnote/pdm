import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { Dashboard } from '../types'
import GanttChart from '../components/GanttChart'

function taskDateWarning(start?: string, end?: string, pStart?: string, pEnd?: string): string | null {
  if (!start && !end) return null
  if (pStart && start && start < pStart) return 'warning.taskStartBeforePhaseStart'
  if (pEnd && end && end > pEnd) return 'warning.taskEndAfterPhaseEnd'
  if (pStart && end && end < pStart) return 'warning.taskEndBeforePhaseStart'
  if (pEnd && start && start > pEnd) return 'warning.taskStartAfterPhaseEnd'
  if (start && end && end < start) return 'warning.taskEndBeforeStart'
  return null
}

export default function ProjectDashboardPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<Dashboard | null>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [phaseTasks, setPhaseTasks] = useState<Record<string, any[]>>({})
  const [projDates, setProjDates] = useState({ start: '', end: '' })
  const [progressCalcMethod, setProgressCalcMethod] = useState('task_count')
  const [taskWarns, setTaskWarns] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/dashboard`).then((res) => setData(res.data))
    api.get(`/projects/${projectId}`).then((res) => {
      setProjDates({ start: res.data.start_date || '', end: res.data.end_date || '' })
      setProgressCalcMethod(res.data.progress_calc_method || 'task_count')
    }).catch(() => {})
    api.get(`/projects/${projectId}/phases`).then((res) => {
      const phs = res.data
      phs.sort((a: any, b: any) => {
        if (!a.start_date && !b.start_date) return 0
        if (!a.start_date) return 1
        if (!b.start_date) return -1
        return a.start_date < b.start_date ? -1 : 1
      })
      setPhases(phs)
      
      const warns: Record<string, number> = {}
      const tasksMap: Record<string, any[]> = {}
      Promise.all(phs.map(async (ph: any) => {
        try {
          const tRes = await api.get(`/phases/${ph.id}/tasks`)
          tasksMap[ph.id] = tRes.data
          let count = 0
          for (const t of tRes.data) {
            if (t.start_date || t.end_date) {
              if (taskDateWarning(t.start_date || undefined, t.end_date || undefined, ph.start_date || undefined, ph.end_date || undefined)) count++
            }
          }
          if (count > 0) warns[ph.id] = count
        } catch {}
      })).then(() => {
        setPhaseTasks(tasksMap)
        setTaskWarns({ ...warns })
      })
    }).catch(() => {})
  }, [projectId])

  if (!data) return <div>{t('common.loading')}</div>

  const dateWarnings: { id: string; name: string; msg: string }[] = []
  for (const ph of phases) {
    if (!ph.start_date && !ph.end_date) continue
    if (projDates.start && ph.start_date && ph.start_date < projDates.start) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'warning.phaseStartBeforeProject' })
    } else if (projDates.end && ph.end_date && ph.end_date > projDates.end) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'warning.phaseEndAfterProject' })
    } else if (projDates.start && ph.end_date && ph.end_date < projDates.start) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'warning.phaseEndBeforeProjectStart' })
    } else if (projDates.end && ph.start_date && ph.start_date > projDates.end) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'warning.phaseStartAfterProjectEnd' })
    } else if (ph.start_date && ph.end_date && ph.end_date < ph.start_date) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'warning.phaseEndBeforeStart' })
    }
  }

  const uniqueWarnings = dateWarnings.filter((w, i, a) => a.findIndex((x) => x.id === w.id) === i)
  const totalTaskWarns = Object.values(taskWarns).reduce((s, c) => s + c, 0)

  const getPhaseProgress = (phaseId: string) => {
    const tasksList = phaseTasks[phaseId] || []
    if (tasksList.length === 0) return 0

    const getLeaves = (items: any[]): any[] => {
      return items.flatMap(t => t.children && t.children.length > 0 ? getLeaves(t.children) : [t])
    }
    const leaves = getLeaves(tasksList)
    if (leaves.length === 0) return 0

    if (progressCalcMethod === 'hour') {
      const totalEstimated = leaves.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)
      if (totalEstimated === 0) return 0
      
      const totalActual = leaves.reduce((sum, t) => {
        if (t.status === 'completed') {
          return sum + (t.actual_hours || t.estimated_hours || 0)
        }
        return sum
      }, 0)
      return Math.round((totalActual / totalEstimated) * 100)
    } else {
      const totalWeight = leaves.reduce((sum, t) => sum + (Number(t.weight) || 1.0), 0)
      if (totalWeight === 0) return 0

      const completedWeight = leaves.reduce((sum, t) => {
        if (t.status === 'completed') {
          return sum + (Number(t.weight) || 1.0)
        }
        return sum
      }, 0)
      return Math.round((completedWeight / totalWeight) * 100)
    }
  }

  const getGanttTasks = () => {
    const formatted: any[] = []
    phases.forEach(ph => {
      const phData = phases.find(p => p.id === ph.id)
      formatted.push({
        id: `phase-${ph.id}`,
        name: ph.name,
        start_date: phData?.start_date || undefined,
        end_date: phData?.end_date || undefined,
        status: ph.status,
        parent_task_id: undefined,
        children: (phaseTasks[ph.id] || []).map(t => ({
          ...t,
          parent_task_id: t.parent_task_id || `phase-${ph.id}`
        }))
      })
    })
    return formatted
  }

  return (
    <div>
      <div className="page-header">
        <h1>{data.project_name}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => navigate(`/projects/${projectId}/phases`)}>{t('nav.phases')}</button>
          <button className="btn" onClick={() => navigate(`/projects/${projectId}/risks`)}>{t('nav.risks')}</button>
          <button className="btn" onClick={() => navigate(`/projects/${projectId}/issues`)}>{t('nav.issues')}</button>
        </div>
      </div>

      {(uniqueWarnings.length > 0 || totalTaskWarns > 0) && (
        <div className="card" style={{ borderLeft: '4px solid var(--warning)', marginBottom: '24px' }}>
          <h3>⚠️ {t('dashboard.dateRangeWarnings', { count: uniqueWarnings.length + totalTaskWarns })}</h3>
          {uniqueWarnings.map((w) => (
            <div key={w.id} style={{ fontSize: '14px', marginBottom: '4px', cursor: 'pointer' }}
              onClick={() => navigate(`/projects/${projectId}/phases/${w.id}/tasks`)}>
              <strong>{w.name}</strong>: {t(w.msg)}
            </div>
          ))}
          {totalTaskWarns > 0 && (
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <strong>{t('common.task')}</strong>: {t('dashboard.taskWarningsAcrossPhases', { count: totalTaskWarns })}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>{t('project.progress')}</span>
          <span style={{ fontWeight: 600 }}>{data.progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${data.progress}%` }} />
        </div>
        <div className="progress-stat">
          <div className="stat-item">
            <div className="stat-value">{data.completed_tasks}/{data.total_tasks}</div>
            <div className="stat-label">{t('project.taskCount')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: data.delayed_tasks > 0 ? 'var(--danger)' : undefined }}>
              {data.delayed_tasks}
            </div>
            <div className="stat-label">{t('project.delayed')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{data.remaining_days}</div>
            <div className="stat-label">{t('project.daysLeft')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: data.pending_applications > 0 ? 'var(--warning)' : undefined }}>
              {data.pending_applications}
            </div>
            <div className="stat-label">{t('project.pendingApps')}</div>
          </div>
        </div>
      </div>

      <h2>{t('nav.phases')}</h2>
      <div className="grid">
        {data.phase_summaries.map((ph) => {
          const phData = phases.find((p) => p.id === ph.id)
          const warn = phData ? uniqueWarnings.find((w) => w.id === ph.id) : null
          const tCount = taskWarns[ph.id] || 0
          return (
            <div
              key={ph.id}
              className="card"
              style={{ cursor: 'pointer', borderLeft: (warn || tCount > 0) ? '4px solid var(--warning)' : undefined }}
              onClick={() => navigate(`/projects/${projectId}/phases/${ph.id}/tasks`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong>
                  {ph.name}
                  {(warn || tCount > 0) && <span title={warn ? t(warn.msg) : t('warning.taskWarnings', { count: tCount })} style={{ marginLeft: '4px', cursor: 'help' }}>⚠️</span>}
                </strong>
                <select
                  value={ph.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={async (e) => {
                    e.stopPropagation()
                    try {
                      const res = await api.put(`/phases/${ph.id}`, { status: e.target.value })
                      setPhases(phases.map((p) => p.id === ph.id ? res.data : p))
                    } catch { alert('Status change failed') }
                  }}
                  className={`badge ${ph.status === 'completed' || ph.status === 'closed' ? 'badge-completed' : ph.status === 'active' ? 'badge-active' : 'badge-pending'}`}
                  style={{ cursor: 'pointer', border: 'none', fontSize: '11px', padding: '2px 8px', outline: 'none' }}
                >
                  {['planned', 'active', 'gate_waiting', 'completed', 'closed'].map((s) => (
                    <option key={s} value={s}>{t(`phase.status.${s}`)}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('common.task')}: {ph.completed_tasks}/{ph.total_tasks}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{getPhaseProgress(ph.id)}%</span>
              </div>
              <div className="progress-bar" style={{ marginTop: '6px', marginBottom: '8px', height: '6px' }}>
                <div className="progress-bar-fill" style={{ width: `${getPhaseProgress(ph.id)}%`, height: '100%' }} />
              </div>
              {phData?.start_date && phData?.end_date && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {t('dateRange.format', { start: phData.start_date, end: phData.end_date })}
                </div>
              )}
              {warn && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>⚠️ {t(warn.msg)}</div>}
              {tCount > 0 && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>⚠️ {t('warning.taskWarnings', { count: tCount })}</div>}
            </div>
          )
        })}
      </div>

      <h2 style={{ marginTop: '24px' }}>{t('task.ganttView')}</h2>
      {phases.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('task.noTasks')}</div>
      ) : (
        <GanttChart tasks={getGanttTasks()} />
      )}
    </div>
  )
}
