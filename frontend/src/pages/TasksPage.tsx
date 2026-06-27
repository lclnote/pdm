import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { Task, User } from '../types'
import Modal from '../components/Modal'
import GanttChart from '../components/GanttChart'

function dateRangeWarning(start?: string, end?: string, parentStart?: string, parentEnd?: string): string | null {
  if (!start && !end) return null
  if (parentStart && start && start < parentStart) return 'warning.phaseStartBeforeProject'
  if (parentEnd && end && end > parentEnd) return 'warning.phaseEndAfterProject'
  if (parentStart && end && end < parentStart) return 'warning.phaseEndBeforeProjectStart'
  if (parentEnd && start && start > parentEnd) return 'warning.phaseStartAfterProjectEnd'
  if (start && end && end < start) return 'warning.phaseEndBeforeStart'
  return null
}

const STATUS_OPTIONS = ['not_started', 'ready', 'in_progress', 'awaiting_approval', 'completed', 'on_hold', 'suspended']
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
  const { t } = useTranslation()
  const { projectId, phaseId } = useParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [actualHours, setActualHours] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [assigneeName, setAssigneeName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [parentTaskId, setParentTaskId] = useState('')
  const [parentTaskName, setParentTaskName] = useState('')
  const [showParentDropdown, setShowParentDropdown] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [viewMode, setViewMode] = useState<'tree' | 'gantt'>('tree')
  const [phaseStartDate, setPhaseStartDate] = useState('')
  const [phaseEndDate, setPhaseEndDate] = useState('')
  const userRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const statusLabel = (s: string) => t(`task.status.${s}`)

  const sortByStartDate = (items: Task[]): Task[] =>
    [...items].sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0
      if (!a.start_date) return 1
      if (!b.start_date) return -1
      return a.start_date < b.start_date ? -1 : 1
    }).map((t) => ({ ...t, children: t.children ? sortByStartDate(t.children) : undefined }))

  const [projectMembers, setProjectMembers] = useState<{ user_id: string }[]>([])

  useEffect(() => {
    if (!phaseId) return
    api.get(`/phases/${phaseId}/tasks`).then((res) => setTasks(sortByStartDate(res.data)))
  }, [phaseId])

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/members`).then((res) => setProjectMembers(res.data)).catch(() => {})
  }, [projectId])

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
      if (parentRef.current && !parentRef.current.contains(e.target as Node)) {
        setShowParentDropdown(false)
      }
      if (collabRef.current && !collabRef.current.contains(e.target as Node)) {
        setShowCollabDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const flattenTasks = (items: Task[]): { id: string; name: string; level: string }[] =>
    items.flatMap((t) => [{ id: t.id, name: t.name, level: t.task_level }, ...(t.children ? flattenTasks(t.children) : [])])

  const allTasks = flattenTasks(tasks)
  const taskMap = Object.fromEntries(allTasks.map((t) => [t.id, t.name]))

  const filteredTasks = allTasks.filter((t) =>
    t.name.toLowerCase().includes(parentTaskName.toLowerCase())
  )

  const filteredUsers = users.filter((u) =>
    projectMembers.some((m) => m.user_id === u.id) &&
    u.name.toLowerCase().includes(assigneeName.toLowerCase())
  )

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  useEffect(() => {
    if (!selectedTask) { setCollaborators([]); setTaskDeliverables([]); return }
    api.get(`/tasks/${selectedTask.id}/collaborators`).then((res) => setCollaborators(res.data)).catch(() => {})
    api.get(`/tasks/${selectedTask.id}/deliverables`).then((res) => setTaskDeliverables(res.data)).catch(() => {})
  }, [selectedTask])

  const [showEdit, setShowEdit] = useState<Task | null>(null)
  const [showApplyModal, setShowApplyModal] = useState<Task | null>(null)
  const [applyReason, setApplyReason] = useState('')
  const [applyEvidence, setApplyEvidence] = useState('')
  const [showHoldModal, setShowHoldModal] = useState<Task | null>(null)
  const [holdReason, setHoldReason] = useState('')
  const [holdEvidence, setHoldEvidence] = useState('')
  const [showSuspendModal, setShowSuspendModal] = useState<Task | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendEvidence, setSuspendEvidence] = useState('')
  const [collaborators, setCollaborators] = useState<{ id: string; user_id: string }[]>([])
  const [taskDeliverables, setTaskDeliverables] = useState<any[]>([])
  const [showAddDlModal, setShowAddDlModal] = useState(false)
  const [dlName, setDlName] = useState('')
  const [dlDescription, setDlDescription] = useState('')
  const [dlType, setDlType] = useState('document')
  const [dlFilePath, setDlFilePath] = useState('')
  const [dlFileUrl, setDlFileUrl] = useState('')
  const [dlVersion, setDlVersion] = useState('1.0')
  const [collaboratorName, setCollaboratorName] = useState('')
  const [showCollabDropdown, setShowCollabDropdown] = useState(false)
  const collabRef = useRef<HTMLDivElement>(null)

  const updateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEdit) return
    try {
      const payload: any = { name, assignee_id: assigneeId }
      if (startDate) payload.start_date = startDate
      if (endDate) payload.end_date = endDate
      if (parentTaskId) payload.parent_task_id = parentTaskId
      if (weight) payload.weight = parseFloat(weight)
      if (actualHours) payload.actual_hours = parseFloat(actualHours)
      const res = await api.put(`/tasks/${showEdit.id}`, payload)
      const refresh = (items: Task[]): Task[] => items.map((t) =>
        t.id === showEdit.id ? res.data : { ...t, children: t.children ? refresh(t.children) : undefined }
      )
      setTasks(sortByStartDate(refresh(tasks)))
      setShowEdit(null); setName(''); setWeight(''); setActualHours(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId(''); setParentTaskName('')
    } catch (e: any) {
      alert(e.response?.data?.detail?.detail || t('task.updateFailed'))
    }
  }

  const formWarning = dateRangeWarning(startDate, endDate, phaseStartDate, phaseEndDate)

  const deleteTask = async (taskId: string) => {
    if (!confirm(t('task.deleteConfirm'))) return
    try {
      await api.delete(`/tasks/${taskId}`)
      const remove = (items: Task[]): Task[] => items.filter((t) => t.id !== taskId).map((t) => ({ ...t, children: t.children ? remove(t.children) : undefined }))
      setTasks(sortByStartDate(remove(tasks)))
      setSelectedTask(null)
    } catch (e: any) {
      alert(e.response?.data?.detail?.detail || t('task.deleteFailed'))
    }
  }

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phaseId) return
    const payload: any = { name, assignee_id: assigneeId }
    if (startDate) payload.start_date = startDate
    if (endDate) payload.end_date = endDate
    if (parentTaskId) payload.parent_task_id = parentTaskId
    if (weight) payload.weight = parseFloat(weight)
    if (actualHours) payload.actual_hours = parseFloat(actualHours)
    const res = await api.post(`/phases/${phaseId}/tasks`, payload)
    setTasks(sortByStartDate([...tasks, res.data]))
    setShowCreate(false)
    setName(''); setWeight(''); setActualHours(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId(''); setParentTaskName('')
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
      alert(e.response?.data?.detail?.message || t('task.statusChangeFailed'))
    }
  }

  const submitApplyRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showApplyModal) return
    try {
      await api.post('/tasks/apply', {
        task_id: showApplyModal.id,
        application_type: 'task_submission',
        reason: applyReason,
        evidence: applyEvidence || undefined,
      })
      await api.put(`/tasks/${showApplyModal.id}/status`, { status: 'awaiting_approval' })

      const update = (items: Task[]): Task[] => items.map((t) =>
        t.id === showApplyModal.id ? { ...t, status: 'awaiting_approval' } : { ...t, children: t.children ? update(t.children) : undefined }
      )
      setTasks(update(tasks))

      if (selectedTask?.id === showApplyModal.id) {
        setSelectedTask({ ...selectedTask, status: 'awaiting_approval' })
      }

      setShowApplyModal(null)
      setApplyReason('')
      setApplyEvidence('')
    } catch {
      alert('Application failed')
    }
  }

  const submitHoldRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showHoldModal) return
    try {
      await api.post('/tasks/apply', {
        task_id: showHoldModal.id,
        application_type: 'hold',
        reason: holdReason,
        evidence: holdEvidence || undefined,
      })
      await api.put(`/tasks/${showHoldModal.id}/status`, { status: 'on_hold' })

      const update = (items: Task[]): Task[] => items.map((t) =>
        t.id === showHoldModal.id ? { ...t, status: 'on_hold' } : { ...t, children: t.children ? update(t.children) : undefined }
      )
      setTasks(update(tasks))
      if (selectedTask?.id === showHoldModal.id) {
        setSelectedTask({ ...selectedTask, status: 'on_hold' })
      }
      setShowHoldModal(null)
      setHoldReason('')
      setHoldEvidence('')
    } catch {
      alert('Hold request failed')
    }
  }

  const submitSuspendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showSuspendModal) return
    try {
      await api.post('/tasks/apply', {
        task_id: showSuspendModal.id,
        application_type: 'suspend',
        reason: suspendReason,
        evidence: suspendEvidence || undefined,
      })
      await api.put(`/tasks/${showSuspendModal.id}/status`, { status: 'suspended' })

      const update = (items: Task[]): Task[] => items.map((t) =>
        t.id === showSuspendModal.id ? { ...t, status: 'suspended' } : { ...t, children: t.children ? update(t.children) : undefined }
      )
      setTasks(update(tasks))
      if (selectedTask?.id === showSuspendModal.id) {
        setSelectedTask({ ...selectedTask, status: 'suspended' })
      }
      setShowSuspendModal(null)
      setSuspendReason('')
      setSuspendEvidence('')
    } catch {
      alert('Suspend request failed')
    }
  }

  const handleCreateDl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return
    try {
      const payload = {
        name: dlName,
        description: dlDescription || undefined,
        type: dlType,
        file_path: dlFilePath || undefined,
        file_url: dlFileUrl || undefined,
        version: dlVersion,
      }
      const res = await api.post(`/tasks/${selectedTask.id}/deliverables`, payload)
      setTaskDeliverables([...taskDeliverables, res.data])
      setShowAddDlModal(false)
      setDlName(''); setDlDescription(''); setDlType('document'); setDlFilePath(''); setDlFileUrl(''); setDlVersion('1.0')
    } catch { alert('Create deliverable failed') }
  }

  const renderTaskTree = (items: Task[], depth = 0) => (
    <div style={{ marginLeft: depth * 24 }}>
      {items.map((task) => {
        const warn = dateRangeWarning(task.start_date || undefined, task.end_date || undefined, phaseStartDate, phaseEndDate)
        return (
          <div key={task.id} className="task-card" style={{ marginLeft: depth * 24 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
              borderBottom: '1px solid var(--border)', cursor: 'pointer',
              background: selectedTask?.id === task.id ? '#e8f0fe' : undefined,
              borderLeft: warn ? '3px solid var(--warning)' : undefined,
            }}
            onClick={() => setSelectedTask(task)}
          >
            <span style={{ flex: 1, fontSize: '14px' }}>
              {task.name || 'Untitled'}
              <span style={{ fontSize: '10px', marginLeft: '6px', verticalAlign: 'middle', color: 'var(--text-secondary)', backgroundColor: '#e8eaed', padding: '1px 6px', borderRadius: '8px' }}>{task.weight != null ? Number(task.weight).toFixed(2) : '0.00'}</span>
              {warn && <span title={t(warn)} style={{ marginLeft: '4px', cursor: 'help' }}>⚠️</span>}
            </span>
            <select
              value={task.status || 'not_started'}
              onChange={(e) => { e.stopPropagation(); updateStatus(task.id, e.target.value) }}
              onClick={(e) => e.stopPropagation()}
              className={`badge ${task.status ? STATUS_BADGE[task.status] : 'badge-pending'}`}
              style={{ cursor: 'pointer', border: 'none', fontSize: '10px', padding: '2px 6px', outline: 'none', maxWidth: '85px' }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
          </div>
          {warn && <div style={{ fontSize: '12px', color: '#e37400', marginLeft: depth * 24 + 8, marginBottom: '4px' }}>⚠️ {t(warn)}</div>}
          {task.children && renderTaskTree(task.children, depth + 1)}
        </div>
      )})}
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1>{t('task.title')}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn ${viewMode === 'tree' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode('tree')}>{t('task.treeView')}</button>
          <button className={`btn ${viewMode === 'gantt' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode('gantt')}>{t('task.ganttView')}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('task.addTask')}</button>
        </div>
      </div>

      {viewMode === 'tree' ? (
        <div className="card" style={{ marginBottom: '24px' }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('task.noTasks')}</div>
          ) : renderTaskTree(tasks)}
        </div>
      ) : (
        <div style={{ marginBottom: '24px' }}>
          {tasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('task.noTasks')}</div>
          ) : (
            <GanttChart tasks={tasks} />
          )}
        </div>
      )}

      {selectedTask && (() => {
        const detailWarn = dateRangeWarning(selectedTask.start_date || undefined, selectedTask.end_date || undefined, phaseStartDate, phaseEndDate)
        return (
        <div className="card" style={detailWarn ? { borderLeft: '4px solid var(--warning)' } : undefined}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>{selectedTask.name}{detailWarn && <span title={t(detailWarn)} style={{ marginLeft: '6px', cursor: 'help' }}>⚠️</span>}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedTask.status !== 'completed' && selectedTask.status !== 'awaiting_approval' && (
                <button className="btn btn-primary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => { setShowApplyModal(selectedTask); setApplyReason(''); setApplyEvidence('') }}>{t('task.applyCompletion')}</button>
              )}
              {selectedTask.status === 'in_progress' && (
                <>
                  <button className="btn btn-warning" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => { setShowHoldModal(selectedTask); setHoldReason(''); setHoldEvidence('') }}>{t('task.applyHold')}</button>
                  <button className="btn" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--danger, #e53e3e)' }} onClick={() => { setShowSuspendModal(selectedTask); setSuspendReason(''); setSuspendEvidence('') }}>{t('task.applySuspend')}</button>
                </>
              )}
              <button className="btn" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => { setShowEdit(selectedTask); setName(selectedTask.name); setWeight(String(selectedTask.weight ?? '')); setActualHours(String(selectedTask.actual_hours ?? '')); setAssigneeId(selectedTask.assignee_id); setAssigneeName(userMap[selectedTask.assignee_id] || ''); setStartDate(selectedTask.start_date || ''); setEndDate(selectedTask.end_date || ''); setParentTaskId(selectedTask.parent_task_id || ''); setParentTaskName(selectedTask.parent_task_id ? (taskMap[selectedTask.parent_task_id] || '') : '') }}>{t('common.edit')}</button>
              <button className="btn" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--danger, #e53e3e)' }} onClick={() => deleteTask(selectedTask.id)}>{t('common.delete')}</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div><strong>{t('task.statusLabel')}</strong> {statusLabel(selectedTask.status)}</div>
            <div><strong>{t('task.levelLabel')}</strong> {selectedTask.task_level}</div>
            <div><strong>{t('task.periodLabel')}</strong> {selectedTask.start_date || '...'} ~ {selectedTask.end_date || '...'}</div>
            <div><strong>{t('task.weightLabel')}</strong> {selectedTask.weight}</div>
            <div><strong>{t('task.actualHoursLabel')}</strong> {selectedTask.actual_hours ?? '-'}</div>
            <div><strong>{t('task.assigneeLabel')}</strong> {userMap[selectedTask.assignee_id] || selectedTask.assignee_id}</div>
          </div>
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '14px' }}>
            <strong>{t('task.collaboratorsLabel')}</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {collaborators.map((c) => (
                <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: '#e8eaed', borderRadius: '12px', fontSize: '12px' }}>
                  {userMap[c.user_id] || c.user_id}
                  <span style={{ cursor: 'pointer', color: 'var(--danger, #e53e3e)', fontWeight: 'bold' }} onClick={() => {
                    api.delete(`/tasks/${selectedTask.id}/collaborators/${c.id}`).then(() => setCollaborators(collaborators.filter((x) => x.id !== c.id))).catch(() => alert('Remove failed'))
                  }}>×</span>
                </span>
              ))}
              <div ref={collabRef} style={{ position: 'relative' }}>
                <input value={collaboratorName} onChange={(e) => { setCollaboratorName(e.target.value); setShowCollabDropdown(true) }} onFocus={() => setShowCollabDropdown(true)} placeholder={t('task.addCollaborator')} style={{ width: '120px', fontSize: '12px', padding: '2px 8px', height: '24px' }} />
                {showCollabDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, width: '200px', maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {users.filter((u) => projectMembers.some((m) => m.user_id === u.id) && u.name.toLowerCase().includes(collaboratorName.toLowerCase()) && !collaborators.some((c) => c.user_id === u.id) && u.id !== selectedTask?.assignee_id).length === 0 ? (
                      <div style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontSize: '12px' }}>{t('task.noUsersFound')}</div>
                    ) : users.filter((u) => projectMembers.some((m) => m.user_id === u.id) && u.name.toLowerCase().includes(collaboratorName.toLowerCase()) && !collaborators.some((c) => c.user_id === u.id) && u.id !== selectedTask?.assignee_id).map((u) => (
                      <div key={u.id} onClick={() => {
                        api.post(`/tasks/${selectedTask.id}/collaborators`, { user_id: u.id }).then((res) => {
                          setCollaborators([...collaborators, res.data]); setCollaboratorName(''); setShowCollabDropdown(false)
                        }).catch(() => alert('Add failed'))
                      }} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '12px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        {u.name} <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{u.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong>{t('deliverable.title')}</strong>
              <button className="btn btn-sm" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={() => {
                setDlName(''); setDlDescription(''); setDlType('document'); setDlFilePath(''); setDlFileUrl(''); setDlVersion('1.0'); setShowAddDlModal(true)
              }}>{t('deliverable.addDeliverable')}</button>
            </div>
            {taskDeliverables.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('deliverable.noDeliverables')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {taskDeliverables.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '13px' }}>
                    <div>
                      <strong>{d.name}</strong> <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({t(`deliverable.types.${d.type}`)})</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {d.file_url ? (
                          <a href={d.file_url} target="_blank" rel="noreferrer" className="link">{d.file_url}</a>
                        ) : d.file_path ? (
                          <code>{d.file_path}</code>
                        ) : ''}
                        <span className={`badge ${d.status === 'approved' ? 'badge-completed' : d.status === 'rejected' ? 'badge-danger' : 'badge-pending'}`} style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 5px' }}>
                          {t(`deliverable.status.${d.status}`)}
                        </span>
                        {d.reviewer_id && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            ({t('deliverable.reviewer')}: {userMap[d.reviewer_id] || d.reviewer_id})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {detailWarn && <div style={{ fontSize: '13px', color: '#e37400', marginTop: '8px' }}>⚠️ {t(detailWarn)}</div>}
        </div>
      )})()}

      {showEdit && (
        <Modal title={t('task.editTask')} onClose={() => { setShowEdit(null); setName(''); setWeight(''); setActualHours(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId(''); setParentTaskName('') }}>
          <form onSubmit={updateTask}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group" style={{ position: 'relative' }} ref={userRef}>
              <label>{t('task.assigneeRequired')}</label>
              <input value={assigneeName} onChange={(e) => { setAssigneeName(e.target.value); setAssigneeId(''); setShowUserDropdown(true) }} onFocus={() => setShowUserDropdown(true)} placeholder={t('task.searchUser')} required />
              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>{t('task.noUsersFound')}</div>
                  ) : filteredUsers.map((u) => (
                    <div key={u.id} onClick={() => { setAssigneeId(u.id); setAssigneeName(u.name); setShowUserDropdown(false) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', background: assigneeId === u.id ? '#e8f0fe' : undefined }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = assigneeId === u.id ? '#e8f0fe' : '')}>
                      {u.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>{t('common.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.weight')}</label>
              <input type="number" step="0.1" min="0" max="99.99" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('task.actualHoursLabel')}</label>
              <input type="number" step="0.1" min="0" value={actualHours} onChange={(e) => setActualHours(e.target.value)} />
            </div>
            <div className="form-group" style={{ position: 'relative' }} ref={parentRef}>
              <label>{t('task.parentTask')}</label>
              <input value={parentTaskName} onChange={(e) => { setParentTaskName(e.target.value); setParentTaskId(''); setShowParentDropdown(true) }} onFocus={() => setShowParentDropdown(true)} placeholder={t('task.searchTask')} />
              {showParentDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {filteredTasks.length === 0 ? (
                    <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>{t('task.noTasksFound')}</div>
                  ) : filteredTasks.map((t) => (
                    <div key={t.id} onClick={() => { setParentTaskId(t.id); setParentTaskName(t.name); setShowParentDropdown(false) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', background: parentTaskId === t.id ? '#e8f0fe' : undefined }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = parentTaskId === t.id ? '#e8f0fe' : '')}>
                      {t.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{t.level}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {formWarning && <div style={{ fontSize: '13px', color: '#e37400', marginBottom: '12px' }}>⚠️ {t(formWarning)}</div>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowEdit(null); setName(''); setWeight(''); setActualHours(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId(''); setParentTaskName('') }}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showCreate && (
        <Modal title={t('task.createTask')} onClose={() => { setShowCreate(false); setName(''); setWeight(''); setActualHours(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId(''); setParentTaskName('') }}>
          <form onSubmit={createTask}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group" ref={userRef} style={{ position: 'relative' }}>
              <label>{t('task.assigneeRequired')}</label>
              <input
                value={assigneeName}
                onChange={(e) => { setAssigneeName(e.target.value); setAssigneeId(''); setShowUserDropdown(true) }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder={t('task.searchUser')}
                required
              />
              {showUserDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)',
                  background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>{t('task.noUsersFound')}</div>
                  ) : filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => { setAssigneeId(u.id); setAssigneeName(u.name); setShowUserDropdown(false) }}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: '14px',
                        background: assigneeId === u.id ? '#e8f0fe' : undefined,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = assigneeId === u.id ? '#e8f0fe' : '')}
                    >
                      {u.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>{t('common.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.weight')}</label>
              <input type="number" step="0.1" min="0" max="99.99" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('task.actualHoursLabel')}</label>
              <input type="number" step="0.1" min="0" value={actualHours} onChange={(e) => setActualHours(e.target.value)} />
            </div>
            <div className="form-group" style={{ position: 'relative' }} ref={parentRef}>
              <label>{t('task.parentTask')}</label>
              <input value={parentTaskName} onChange={(e) => { setParentTaskName(e.target.value); setParentTaskId(''); setShowParentDropdown(true) }} onFocus={() => setShowParentDropdown(true)} placeholder={t('task.searchTask')} />
              {showParentDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {filteredTasks.length === 0 ? (
                    <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>{t('task.noTasksFound')}</div>
                  ) : filteredTasks.map((t) => (
                    <div key={t.id} onClick={() => { setParentTaskId(t.id); setParentTaskName(t.name); setShowParentDropdown(false) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', background: parentTaskId === t.id ? '#e8f0fe' : undefined }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = parentTaskId === t.id ? '#e8f0fe' : '')}>
                      {t.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{t.level}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {formWarning && <div style={{ fontSize: '13px', color: '#e37400', marginBottom: '12px' }}>⚠️ {t(formWarning)}</div>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowCreate(false); setName(''); setWeight(''); setActualHours(''); setAssigneeId(''); setAssigneeName(''); setStartDate(''); setEndDate(''); setParentTaskId(''); setParentTaskName('') }}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.create')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showApplyModal && (
        <Modal title={t('task.applyCompletionTitle')} onClose={() => setShowApplyModal(null)}>
          <form onSubmit={submitApplyRequest}>
            <div className="form-group">
              <label>{t('task.applyReason')}</label>
              <textarea value={applyReason} onChange={(e) => setApplyReason(e.target.value)} rows={3} required />
            </div>
            <div className="form-group">
              <label>{t('task.applyEvidence')}</label>
              <input value={applyEvidence} onChange={(e) => setApplyEvidence(e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowApplyModal(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.submit')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showHoldModal && (
        <Modal title={t('task.applyHoldTitle')} onClose={() => setShowHoldModal(null)}>
          <form onSubmit={submitHoldRequest}>
            <div className="form-group">
              <label>{t('task.applyReason')}</label>
              <textarea value={holdReason} onChange={(e) => setHoldReason(e.target.value)} rows={3} required />
            </div>
            <div className="form-group">
              <label>{t('task.applyEvidence')}</label>
              <input value={holdEvidence} onChange={(e) => setHoldEvidence(e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowHoldModal(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn" style={{ background: '#e65100', color: '#fff' }}>{t('task.submitHold')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showSuspendModal && (
        <Modal title={t('task.applySuspendTitle')} onClose={() => setShowSuspendModal(null)}>
          <form onSubmit={submitSuspendRequest}>
            <div className="form-group">
              <label>{t('task.applyReason')}</label>
              <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3} required />
            </div>
            <div className="form-group">
              <label>{t('task.applyEvidence')}</label>
              <input value={suspendEvidence} onChange={(e) => setSuspendEvidence(e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowSuspendModal(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn" style={{ background: '#c62828', color: '#fff' }}>{t('task.submitSuspend')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddDlModal && selectedTask && (
        <Modal title={t('deliverable.addDeliverableTitle')} onClose={() => setShowAddDlModal(false)}>
          <form onSubmit={handleCreateDl}>
            <div className="form-group">
              <label>{t('common.name')} *</label>
              <input value={dlName} onChange={(e) => setDlName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea value={dlDescription} onChange={(e) => setDlDescription(e.target.value)} rows={3} />
            </div>

            <div className="form-group">
              <label>{t('common.type')} *</label>
              <select value={dlType} onChange={(e) => setDlType(e.target.value)}>
                <option value="document">{t('deliverable.types.document')}</option>
                <option value="code">{t('deliverable.types.code')}</option>
                <option value="design">{t('deliverable.types.design')}</option>
                <option value="other">{t('deliverable.types.other')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('deliverable.filePath')}</label>
              <input value={dlFilePath} onChange={(e) => setDlFilePath(e.target.value)} placeholder="src/components/..." />
            </div>

            <div className="form-group">
              <label>{t('deliverable.fileUrl')}</label>
              <input value={dlFileUrl} onChange={(e) => setDlFileUrl(e.target.value)} placeholder="https://github.com/..." />
            </div>

            <div className="form-group">
              <label>{t('deliverable.version')}</label>
              <input value={dlVersion} onChange={(e) => setDlVersion(e.target.value)} required />
            </div>

            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowAddDlModal(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.create')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
