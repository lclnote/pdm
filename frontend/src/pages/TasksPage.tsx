import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import { Task, User } from '../types'
import Modal from '../components/Modal'

function dateRangeWarning(start?: string, end?: string, parentStart?: string, parentEnd?: string): string | null {
  if (!start && !end) return null
  if (parentStart && start && start < parentStart) return 'Start date is before phase start'
  if (parentEnd && end && end > parentEnd) return 'End date is after phase end'
  if (parentStart && end && end < parentStart) return 'End date is before phase start'
  if (parentEnd && start && start > parentEnd) return 'Start date is after phase end'
  if (start && end && end < start) return 'End date is before start date'
  return null
}

const STATUS_OPTIONS = ['not_started', 'ready', 'in_progress', 'awaiting_approval', 'completed', 'on_hold', 'suspended']
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  ready: 'Ready',
  in_progress: 'In Progress',
  awaiting_approval: 'Awaiting Approval',
  completed: 'Completed',
  on_hold: 'On Hold',
  suspended: 'Suspended',
}
const STATUS_BADGE: Record<string, string> = {
  not_started: 'badge-pending',
  ready: 'badge-active',
  in_progress: 'badge-active',
  awaiting_approval: 'badge-pending',
  completed: 'badge-completed',
  on_hold: 'badge-pending',
  suspended: 'badge-danger',
}

export default function TasksPage() {
  const { projectId, phaseId } = useParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [name, setName] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [assigneeName, setAssigneeName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [parentTaskId, setParentTaskId] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [phaseStartDate, setPhaseStartDate] = useState('')
  const [phaseEndDate, setPhaseEndDate] = useState('')
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!phaseId) return
    api.get(`/phases/${phaseId}/tasks`).then((res) => setTasks(res.data))
  }, [phaseId])

  useEffect(() => {
    if (!projectId || !phaseId) return
    api.get(`/projects/${projectId}/phases`).then((res) => {
      const ph = res.data.find((p: any) => p.id === phaseId)
      if (ph) { setPhaseStartDate(ph.start_date || ''); setPhaseEndDate(ph.end_date || '') }
    }).catch(() => {})
  }, [projectId, phaseId])

  useEffect(() => {
    api.get('/users').then((res) => setUsers(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(assigneeName.toLowerCase())
  )

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  const [showEdit, setShowEdit] = useState<Task | null>(null)

  const updateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEdit) return
    try {
      const payload: any = { name, assignee_id: assigneeId }
      if (startDate) payload.start_date = startDate
      if (endDate) payload.end_date = endDate
      const res = await api.put(`/tasks/${showEdit.id}`, payload)
      const refresh = (items: Task[]): Task[] => items.map((t) =>
        t.id === showEdit.id ? res.data : { ...t, children: t.children ? refresh(t.children) : undefined }
      )
      setTasks(refresh(tasks))
      setShowEdit(null); setName(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId('')
    } catch (e: any) {
      alert(e.response?.data?.detail?.detail || 'Update failed')
    }
  }

  const formWarning = dateRangeWarning(startDate, endDate, phaseStartDate, phaseEndDate)

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task and all subtasks?')) return
    try {
      await api.delete(`/tasks/${taskId}`)
      const remove = (items: Task[]): Task[] => items.filter((t) => t.id !== taskId).map((t) => ({ ...t, children: t.children ? remove(t.children) : undefined }))
      setTasks(remove(tasks))
      setSelectedTask(null)
    } catch (e: any) {
      alert(e.response?.data?.detail?.detail || 'Delete failed')
    }
  }

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phaseId) return
    const payload: any = { name, assignee_id: assigneeId }
    if (startDate) payload.start_date = startDate
    if (endDate) payload.end_date = endDate
    if (parentTaskId) payload.parent_task_id = parentTaskId
    const res = await api.post(`/phases/${phaseId}/tasks`, payload)
    setTasks([...tasks, res.data])
    setShowCreate(false)
    setName(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId('')
  }

  const updateStatus = async (taskId: string, status: string) => {
    try {
      const res = await api.put(`/tasks/${taskId}/status`, { status })
      setTasks((prev) => {
        const update = (items: Task[]): Task[] => items.map((t) =>
          t.id === taskId ? { ...t, status: res.data.status } : { ...t, children: t.children ? update(t.children) : undefined }
        )
        return update(prev)
      })
    } catch (e: any) {
      alert(e.response?.data?.detail?.message || 'Status change failed')
    }
  }

  const renderTaskTree = (items: Task[], depth = 0) => (
    <div style={{ marginLeft: depth * 24 }}>
      {items.map((t) => {
        const warn = dateRangeWarning(t.start_date || undefined, t.end_date || undefined, phaseStartDate, phaseEndDate)
        return (
        <div key={t.id}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
              borderBottom: '1px solid var(--border)', cursor: 'pointer',
              background: selectedTask?.id === t.id ? '#e8f0fe' : undefined,
              borderLeft: warn ? '3px solid var(--warning)' : undefined,
            }}
            onClick={() => setSelectedTask(t)}
          >
            <span style={{ flex: 1, fontSize: '14px' }}>
              {t.name}
              {warn && <span title={warn} style={{ marginLeft: '4px', cursor: 'help' }}>⚠️</span>}
            </span>
            <span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABELS[t.status]}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.start_date ? t.start_date.slice(5) : ''}~{t.end_date ? t.end_date.slice(5) : ''}</span>
            <select
              value={t.status}
              onChange={(e) => { e.stopPropagation(); updateStatus(t.id, e.target.value) }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'auto', fontSize: '12px', padding: '2px 4px' }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          {warn && <div style={{ fontSize: '12px', color: '#e37400', marginLeft: depth * 24 + 8, marginBottom: '4px' }}>⚠️ {warn}</div>}
          {t.children && renderTaskTree(t.children, depth + 1)}
        </div>
      )})}
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1>Tasks</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Task</button>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No tasks yet</div>
        ) : renderTaskTree(tasks)}
      </div>

      {selectedTask && (() => {
        const detailWarn = dateRangeWarning(selectedTask.start_date || undefined, selectedTask.end_date || undefined, phaseStartDate, phaseEndDate)
        return (
        <div className="card" style={detailWarn ? { borderLeft: '4px solid var(--warning)' } : undefined}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>{selectedTask.name}{detailWarn && <span title={detailWarn} style={{ marginLeft: '6px', cursor: 'help' }}>⚠️</span>}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => { setShowEdit(selectedTask); setName(selectedTask.name); setAssigneeId(selectedTask.assignee_id); setAssigneeName(userMap[selectedTask.assignee_id] || ''); setStartDate(selectedTask.start_date || ''); setEndDate(selectedTask.end_date || ''); setParentTaskId(selectedTask.parent_task_id || '') }}>Edit</button>
              <button className="btn" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--danger, #e53e3e)' }} onClick={() => deleteTask(selectedTask.id)}>Delete</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div><strong>Status:</strong> {STATUS_LABELS[selectedTask.status]}</div>
            <div><strong>Level:</strong> {selectedTask.task_level}</div>
            <div><strong>Period:</strong> {selectedTask.start_date || '...'} ~ {selectedTask.end_date || '...'}</div>
            <div><strong>Weight:</strong> {selectedTask.weight}</div>
            <div><strong>Assignee:</strong> {userMap[selectedTask.assignee_id] || selectedTask.assignee_id}</div>
          </div>
          {detailWarn && <div style={{ fontSize: '13px', color: '#e37400', marginTop: '8px' }}>⚠️ {detailWarn}</div>}
        </div>
      )})()}

      {showEdit && (
        <Modal title="Edit Task" onClose={() => { setShowEdit(null); setName(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId('') }}>
          <form onSubmit={updateTask}>
            <div className="form-group">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Assignee *</label>
              <input value={assigneeName} onChange={(e) => { setAssigneeName(e.target.value); setAssigneeId(''); setShowUserDropdown(true) }} onFocus={() => setShowUserDropdown(true)} placeholder="Search user name..." required />
              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>No users found</div>
                  ) : filteredUsers.map((u) => (
                    <div key={u.id} onClick={() => { setAssigneeId(u.id); setAssigneeName(u.name); setShowUserDropdown(false) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', background: assigneeId === u.id ? '#e8f0fe' : undefined }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = assigneeId === u.id ? '#e8f0fe' : undefined)}>
                      {u.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Parent Task ID (optional)</label>
              <input value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)} placeholder="Leave empty for root task" />
            </div>
            {formWarning && <div style={{ fontSize: '13px', color: '#e37400', marginBottom: '12px' }}>⚠️ {formWarning}</div>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowEdit(null); setName(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId('') }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {showCreate && (
        <Modal title="Add Task" onClose={() => { setShowCreate(false); setStartDate(''); setEndDate('') }}>
          <form onSubmit={createTask}>
            <div className="form-group">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group" ref={userRef} style={{ position: 'relative' }}>
              <label>Assignee *</label>
              <input
                value={assigneeName}
                onChange={(e) => { setAssigneeName(e.target.value); setAssigneeId(''); setShowUserDropdown(true) }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Search user name..."
                required
              />
              {showUserDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)',
                  background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>No users found</div>
                  ) : filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => { setAssigneeId(u.id); setAssigneeName(u.name); setShowUserDropdown(false) }}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: '14px',
                        background: assigneeId === u.id ? '#e8f0fe' : undefined,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = assigneeId === u.id ? '#e8f0fe' : undefined)}
                    >
                      {u.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Parent Task ID (optional)</label>
              <input value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)} placeholder="Leave empty for root task" />
            </div>
            {formWarning && <div style={{ fontSize: '13px', color: '#e37400', marginBottom: '12px' }}>⚠️ {formWarning}</div>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
