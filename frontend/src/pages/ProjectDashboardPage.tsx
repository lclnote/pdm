import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Dashboard } from '../types'

function taskDateWarning(start?: string, end?: string, pStart?: string, pEnd?: string): string | null {
  if (!start && !end) return null
  if (pStart && start && start < pStart) return 'Task starts before phase start'
  if (pEnd && end && end > pEnd) return 'Task ends after phase end'
  if (pStart && end && end < pStart) return 'Task ends before phase start'
  if (pEnd && start && start > pEnd) return 'Task starts after phase end'
  if (start && end && end < start) return 'Task end before start'
  return null
}

export default function ProjectDashboardPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<Dashboard | null>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [projDates, setProjDates] = useState({ start: '', end: '' })
  const [taskWarns, setTaskWarns] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/dashboard`).then((res) => setData(res.data))
    api.get(`/projects/${projectId}`).then((res) => {
      setProjDates({ start: res.data.start_date || '', end: res.data.end_date || '' })
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
      Promise.all(phs.map(async (ph: any) => {
        try {
          const tRes = await api.get(`/phases/${ph.id}/tasks`)
          let count = 0
          for (const t of tRes.data) {
            if (t.start_date || t.end_date) {
              if (taskDateWarning(t.start_date || undefined, t.end_date || undefined, ph.start_date || undefined, ph.end_date || undefined)) count++
            }
          }
          if (count > 0) warns[ph.id] = count
        } catch {}
      })).then(() => setTaskWarns({ ...warns }))
    }).catch(() => {})
  }, [projectId])

  if (!data) return <div>Loading...</div>

  const dateWarnings: { id: string; name: string; msg: string }[] = []
  for (const ph of phases) {
    if (!ph.start_date && !ph.end_date) continue
    if (projDates.start && ph.start_date && ph.start_date < projDates.start) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'Start date before project start' })
    } else if (projDates.end && ph.end_date && ph.end_date > projDates.end) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'End date after project end' })
    } else if (projDates.start && ph.end_date && ph.end_date < projDates.start) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'End date before project start' })
    } else if (projDates.end && ph.start_date && ph.start_date > projDates.end) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'Start date after project end' })
    } else if (ph.start_date && ph.end_date && ph.end_date < ph.start_date) {
      dateWarnings.push({ id: ph.id, name: ph.name, msg: 'End date before start date' })
    }
  }

  const uniqueWarnings = dateWarnings.filter((w, i, a) => a.findIndex((x) => x.id === w.id) === i)
  const totalTaskWarns = Object.values(taskWarns).reduce((s, c) => s + c, 0)

  return (
    <div>
      <div className="page-header">
        <h1>{data.project_name}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => navigate(`/projects/${projectId}/phases`)}>Phases</button>
          <button className="btn" onClick={() => navigate(`/projects/${projectId}/risks`)}>Risks</button>
          <button className="btn" onClick={() => navigate(`/projects/${projectId}/issues`)}>Issues</button>
        </div>
      </div>

      {(uniqueWarnings.length > 0 || totalTaskWarns > 0) && (
        <div className="card" style={{ borderLeft: '4px solid var(--warning)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>⚠️ Date Range Warnings ({uniqueWarnings.length + totalTaskWarns})</h3>
          {uniqueWarnings.map((w) => (
            <div key={w.id} style={{ fontSize: '14px', marginBottom: '4px', cursor: 'pointer' }}
              onClick={() => navigate(`/projects/${projectId}/phases/${w.id}/tasks`)}>
              <strong>{w.name}</strong>: {w.msg}
            </div>
          ))}
          {totalTaskWarns > 0 && (
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <strong>Tasks</strong>: {totalTaskWarns} task(s) with date range warnings across phases
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>Progress</span>
          <span style={{ fontWeight: 600 }}>{data.progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${data.progress}%` }} />
        </div>
        <div className="progress-stat">
          <div className="stat-item">
            <div className="stat-value">{data.completed_tasks}/{data.total_tasks}</div>
            <div className="stat-label">Tasks</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: data.delayed_tasks > 0 ? 'var(--danger)' : undefined }}>
              {data.delayed_tasks}
            </div>
            <div className="stat-label">Delayed</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{data.remaining_days}</div>
            <div className="stat-label">Days Left</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: data.pending_applications > 0 ? 'var(--warning)' : undefined }}>
              {data.pending_applications}
            </div>
            <div className="stat-label">Pending Apps</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Phases</h2>
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
                  {(warn || tCount > 0) && <span title={warn ? warn.msg : `${tCount} task(s) with date warnings`} style={{ marginLeft: '4px', cursor: 'help' }}>⚠️</span>}
                </strong>
                <span className={`badge ${ph.status === 'completed' ? 'badge-completed' : ph.status === 'active' ? 'badge-active' : 'badge-pending'}`}>
                  {ph.status}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Tasks: {ph.completed_tasks}/{ph.total_tasks}
              </div>
              {phData?.start_date && phData?.end_date && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {phData.start_date} ~ {phData.end_date}
                </div>
              )}
              {warn && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>⚠️ {warn.msg}</div>}
              {tCount > 0 && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>⚠️ {tCount} task(s) with date range warnings</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
