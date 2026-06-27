import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { User } from '../types'
import Modal from '../components/Modal'

interface Issue {
  id: string
  name: string
  type: string
  priority: string
  status: string
  assignee_id?: string
}

export default function IssuesPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const [issues, setIssues] = useState<Issue[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Issue | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('bug')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('unaddressed')
  const [assigneeId, setAssigneeId] = useState('')
  const [assigneeName, setAssigneeName] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/issues`).then((res) => setIssues(res.data))
  }, [projectId])

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

  const createIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    const payload: any = { name, type, priority }
    if (assigneeId) payload.assignee_id = assigneeId
    const res = await api.post(`/projects/${projectId}/issues`, payload)
    setIssues([res.data, ...issues])
    setShowCreate(false)
    setName(''); setType('bug'); setPriority('medium'); setAssigneeId(''); setAssigneeName('')
  }

  const updateIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEdit) return
    try {
      const payload: any = { name, type, priority, status }
      if (assigneeId) payload.assignee_id = assigneeId
      const res = await api.put(`/issues/${showEdit.id}`, payload)
      setIssues(issues.map((i) => (i.id === showEdit.id ? res.data : i)))
      setShowEdit(null); setName(''); setType('bug'); setPriority('medium'); setStatus('unaddressed'); setAssigneeId(''); setAssigneeName('')
    } catch { alert('Update failed') }
  }

  const deleteIssue = async (id: string) => {
    if (!confirm(t('issue.deleteConfirm'))) return
    try {
      await api.delete(`/issues/${id}`)
      setIssues(issues.filter((i) => i.id !== id))
    } catch { alert('Delete failed') }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('issue.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('issue.addIssue')}</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
      <table className="responsive-table">
        <thead>
          <tr>
            <th></th>
            <th>{t('common.name')}</th>
            <th>{t('common.type')}</th>
            <th>{t('common.priority')}</th>
            <th>{t('common.status')}</th>
            <th>{t('common.assignee')}</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((i) => (
            <tr key={i.id}>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm" onClick={() => { setShowEdit(i); setName(i.name); setType(i.type); setPriority(i.priority); setStatus(i.status); setAssigneeId(i.assignee_id || ''); setAssigneeName(userMap[i.assignee_id || ''] || '') }}>{t('common.edit')}</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger, #e53e3e)' }} onClick={() => deleteIssue(i.id)}>{t('common.delete')}</button>
              </td>
              <td data-label={t('common.name')}>{i.name}</td>
              <td data-label={t('common.type')}><span className="badge badge-pending">{t(`issue.${i.type}`, i.type)}</span></td>
              <td data-label={t('common.priority')}><span className={`badge ${i.priority === 'urgent' ? 'badge-danger' : 'badge-active'}`}>{t(`issue.${i.priority}`, i.priority)}</span></td>
              <td data-label={t('common.status')}><span className={`badge ${i.status === 'in_progress' ? 'badge-active' : i.status === 'resolved' || i.status === 'closed' ? 'badge-completed' : i.status === 'rejected' ? 'badge-danger' : 'badge-pending'}`}>{t(`issue.status.${i.status}`, i.status)}</span></td>
              <td data-label={t('common.assignee')} style={{ color: 'var(--text-secondary)' }}>{userMap[i.assignee_id || ''] || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {showCreate && (
        <Modal title={t('issue.createIssue')} onClose={() => setShowCreate(false)}>
          <form onSubmit={createIssue}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group" ref={userRef} style={{ position: 'relative' }}>
              <label>{t('common.assignee')}</label>
              <input value={assigneeName} onChange={(e) => { setAssigneeName(e.target.value); setAssigneeId(''); setShowUserDropdown(true) }} onFocus={() => setShowUserDropdown(true)} placeholder="Search user name..." />
              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {filteredUsers.length === 0 ? <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>No users found</div> : filteredUsers.map((u) => (
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
              <label>{t('common.type')}</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="bug">{t('issue.bug')}</option>
                <option value="specification_change">{t('issue.specChange')}</option>
                <option value="request">{t('issue.request')}</option>
                <option value="obstacle">{t('issue.obstacle')}</option>
                <option value="other">{t('issue.other')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('common.priority')}</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="urgent">{t('issue.urgent')}</option>
                <option value="high">{t('issue.high')}</option>
                <option value="medium">{t('issue.medium')}</option>
                <option value="low">{t('issue.low')}</option>
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
        <Modal title={t('issue.editIssue')} onClose={() => { setShowEdit(null); setName(''); setType('bug'); setPriority('medium'); setStatus('unaddressed'); setAssigneeId(''); setAssigneeName('') }}>
          <form onSubmit={updateIssue}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group" ref={userRef} style={{ position: 'relative' }}>
              <label>{t('common.assignee')}</label>
              <input value={assigneeName} onChange={(e) => { setAssigneeName(e.target.value); setAssigneeId(''); setShowUserDropdown(true) }} onFocus={() => setShowUserDropdown(true)} placeholder="Search user name..." />
              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {filteredUsers.length === 0 ? <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>No users found</div> : filteredUsers.map((u) => (
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
              <label>{t('common.type')}</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="bug">{t('issue.bug')}</option>
                <option value="specification_change">{t('issue.specChange')}</option>
                <option value="request">{t('issue.request')}</option>
                <option value="obstacle">{t('issue.obstacle')}</option>
                <option value="other">{t('issue.other')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('common.priority')}</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="urgent">{t('issue.urgent')}</option>
                <option value="high">{t('issue.high')}</option>
                <option value="medium">{t('issue.medium')}</option>
                <option value="low">{t('issue.low')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('common.status')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {['unaddressed', 'in_progress', 'resolved', 'rejected', 'closed'].map((s) => (
                  <option key={s} value={s}>{t(`issue.status.${s}`)}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowEdit(null); setName(''); setType('bug'); setPriority('medium'); setStatus('unaddressed'); setAssigneeId(''); setAssigneeName('') }}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
