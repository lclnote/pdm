import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Phase } from '../types'
import Modal from '../components/Modal'

function dateRangeWarning(start?: string, end?: string, projStart?: string, projEnd?: string): string | null {
  if (!start && !end) return null
  if (projStart && start && start < projStart) return 'Start date is before project start'
  if (projEnd && end && end > projEnd) return 'End date is after project end'
  if (projStart && end && end < projStart) return 'End date is before project start'
  if (projEnd && start && start > projEnd) return 'Start date is after project end'
  if (start && end && end < start) return 'End date is before start date'
  return null
}

function taskDateWarning(start?: string, end?: string, pStart?: string, pEnd?: string): string | null {
  if (!start && !end) return null
  if (pStart && start && start < pStart) return 'Task starts before phase start'
  if (pEnd && end && end > pEnd) return 'Task ends after phase end'
  if (pStart && end && end < pStart) return 'Task ends before phase start'
  if (pEnd && start && start > pEnd) return 'Task starts after phase end'
  if (start && end && end < start) return 'Task end before start'
  return null
}

export default function PhasesPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [phases, setPhases] = useState<Phase[]>([])
  const [taskWarns, setTaskWarns] = useState<Record<string, number>>({})
  const [projStartDate, setProjStartDate] = useState('')
  const [projEndDate, setProjEndDate] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Phase | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => { if (projectId) loadPage() }, [projectId])

  const loadPage = async () => {
    if (!projectId) return
    try {
      const [phRes, projRes] = await Promise.all([
        api.get(`/projects/${projectId}/phases`),
        api.get(`/projects/${projectId}`),
      ])
      const phs: Phase[] = phRes.data
      phs.sort((a, b) => {
        if (!a.start_date && !b.start_date) return 0
        if (!a.start_date) return 1
        if (!b.start_date) return -1
        return a.start_date < b.start_date ? -1 : 1
      })
      setPhases(phs)
      setProjStartDate(projRes.data.start_date || '')
      setProjEndDate(projRes.data.end_date || '')
      const warns: Record<string, number> = {}
      await Promise.all(phs.map(async (ph) => {
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
      }))
      setTaskWarns({ ...warns })
    } catch (e) { console.error(e) }
  }
  const createPhase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    const payload: any = { name }
    if (startDate) payload.start_date = startDate
    if (endDate) payload.end_date = endDate
    const res = await api.post(`/projects/${projectId}/phases`, payload)
    setPhases([...phases, res.data])
    setShowCreate(false)
    setName(''); setStartDate(''); setEndDate('')
  }

  const updatePhase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEdit) return
    try {
      const payload: any = { name, description }
      if (startDate) payload.start_date = startDate
      if (endDate) payload.end_date = endDate
      const res = await api.put(`/phases/${showEdit.id}`, payload)
      setPhases(phases.map((p) => (p.id === showEdit.id ? res.data : p)))
      setShowEdit(null); setName(''); setDescription(''); setStartDate(''); setEndDate('')
    } catch (e) { console.error(e) }
  }

  const deletePhase = async (id: string) => {
    if (!confirm('Delete this phase?')) return
    try {
      await api.delete(`/phases/${id}`)
      setPhases(phases.filter((p) => p.id !== id))
    } catch (e) { console.error(e) }
  }

  const formWarning = dateRangeWarning(startDate, endDate, projStartDate, projEndDate)
  const totalTaskWarns = Object.values(taskWarns).reduce((s, c) => s + c, 0)

  return (
    <div>
      <div className="page-header">
        <h1>Phases</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Phase</button>
      </div>

      {projStartDate && projEndDate && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Project period: {projStartDate} ~ {projEndDate}
          {(phases.filter((ph) => dateRangeWarning(ph.start_date || undefined, ph.end_date || undefined, projStartDate, projEndDate)).length > 0 || totalTaskWarns > 0) && (
            <span style={{ marginLeft: '12px', color: '#e37400' }}>
              ⚠️ {phases.filter((ph) => dateRangeWarning(ph.start_date || undefined, ph.end_date || undefined, projStartDate, projEndDate)).length + totalTaskWarns} warning(s)
            </span>
          )}
          <span style={{ marginLeft: '8px', color: '#888', fontSize: '11px' }}>
            taskWarns: {JSON.stringify(taskWarns)} | phases: {phases.length} | debug: {Object.keys(taskWarns).length}
          </span>
        </div>
      )}

      <div className="grid">
        {phases.map((ph) => {
          const warn = dateRangeWarning(ph.start_date || undefined, ph.end_date || undefined, projStartDate, projEndDate)
          const tCount = taskWarns[ph.id] || 0
          return (
            <div key={ph.id} className="card" style={(warn || tCount > 0) ? { borderLeft: '4px solid var(--warning)' } : undefined}>
              <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${projectId}/phases/${ph.id}/tasks`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>
                    {ph.name}
                    {(warn || tCount > 0) && <span title={warn || `${tCount} task(s) with date warnings`} style={{ marginLeft: '6px', cursor: 'help' }}>⚠️</span>}
                  </strong>
                  <span className={`badge ${ph.status === 'active' ? 'badge-active' : ph.status === 'completed' ? 'badge-completed' : 'badge-pending'}`}>
                    {ph.status}
                  </span>
                </div>
                {ph.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{ph.description}</p>}
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {ph.start_date && ph.end_date ? `${ph.start_date} ~ ${ph.end_date}` : ph.start_date || ph.end_date ? `${ph.start_date || '...'} ~ ${ph.end_date || '...'}` : ''}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Order: {ph.sort_order}
                  {ph.parallel_execution && ' (Parallel)'}
                </div>
                {warn && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>⚠️ {warn}</div>}
                {tCount > 0 && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>⚠️ {tCount} task(s) with date range warnings</div>}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                <button className="btn" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); setShowEdit(ph); setName(ph.name); setDescription(ph.description || ''); setStartDate(ph.start_date || ''); setEndDate(ph.end_date || '') }}>Edit</button>
                <button className="btn" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--danger, #e53e3e)' }} onClick={(e) => { e.stopPropagation(); deletePhase(ph.id) }}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {showCreate && (
        <Modal title="Add Phase" onClose={() => { setShowCreate(false); setStartDate(''); setEndDate('') }}>
          <form onSubmit={createPhase}>
            <div className="form-group">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {formWarning && <div style={{ fontSize: '13px', color: '#e37400', marginBottom: '12px' }}>⚠️ {formWarning}</div>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowCreate(false); setStartDate(''); setEndDate('') }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </Modal>
      )}

      {showEdit && (
        <Modal title="Edit Phase" onClose={() => { setShowEdit(null); setName(''); setDescription(''); setStartDate(''); setEndDate('') }}>
          <form onSubmit={updatePhase}>
            <div className="form-group">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {formWarning && <div style={{ fontSize: '13px', color: '#e37400', marginBottom: '12px' }}>⚠️ {formWarning}</div>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowEdit(null); setName(''); setDescription(''); setStartDate(''); setEndDate('') }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
