import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { User } from '../types'
import Modal from '../components/Modal'

interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role_in_project: string
  created_at: string
}

export default function ProjectMembersPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [role, setRole] = useState('member')
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/members`).then((res) => setMembers(res.data)).catch(() => {})
    api.get('/users').then((res) => setUsers(res.data)).catch(() => {})
  }, [projectId])

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
    u.name.toLowerCase().includes(selectedUserName.toLowerCase()) &&
    !members.some((m) => m.user_id === u.id)
  )

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))
  const emailMap = Object.fromEntries(users.map((u) => [u.id, u.email]))

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !selectedUserId) return
    try {
      const res = await api.post(`/projects/${projectId}/members`, {
        user_id: selectedUserId,
        role_in_project: role,
      })
      setMembers([...members, res.data])
      setShowAddModal(false)
      setSelectedUserId(''); setSelectedUserName(''); setRole('member')
    } catch { alert('Add member failed') }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!projectId) return
    if (!confirm(t('projectMember.removeConfirm'))) return
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`)
      setMembers(members.filter((m) => m.user_id !== userId))
    } catch { alert('Remove member failed') }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('projectMember.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>{t('projectMember.addMember')}</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="responsive-table">
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.email')}</th>
              <th>{t('projectMember.role')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  {t('projectMember.noMembers')}
                </td>
              </tr>
            ) : members.map((m) => (
              <tr key={m.id}>
                <td data-label={t('common.name')}>{userMap[m.user_id] || m.user_id}</td>
                <td data-label={t('common.email')}>{emailMap[m.user_id] || '-'}</td>
                <td data-label={t('projectMember.role')}>
                  <span className={`badge ${m.role_in_project === 'manager' ? 'badge-danger' : m.role_in_project === 'member' ? 'badge-active' : 'badge-pending'}`}>
                    {t(`projectMember.roles.${m.role_in_project}`, m.role_in_project)}
                  </span>
                </td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <button className="btn btn-sm" style={{ color: 'var(--danger, #e53e3e)' }} onClick={() => handleRemoveMember(m.user_id)}>
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <Modal title={t('projectMember.addMemberTitle')} onClose={() => { setShowAddModal(false); setSelectedUserId(''); setSelectedUserName(''); setRole('member') }}>
          <form onSubmit={handleAddMember}>
            <div className="form-group" ref={userRef} style={{ position: 'relative' }}>
              <label>{t('common.name')}</label>
              <input value={selectedUserName} onChange={(e) => { setSelectedUserName(e.target.value); setSelectedUserId(''); setShowUserDropdown(true) }} onFocus={() => setShowUserDropdown(true)} placeholder={t('task.searchUser')} required />
              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>{t('task.noUsersFound')}</div>
                  ) : filteredUsers.map((u) => (
                    <div key={u.id} onClick={() => { setSelectedUserId(u.id); setSelectedUserName(u.name); setShowUserDropdown(false) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', background: selectedUserId === u.id ? '#e8f0fe' : undefined }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = selectedUserId === u.id ? '#e8f0fe' : '')}>
                      {u.name} <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>{t('projectMember.role')}</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="manager">{t('projectMember.roles.manager')}</option>
                <option value="member">{t('projectMember.roles.member')}</option>
                <option value="viewer">{t('projectMember.roles.viewer')}</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowAddModal(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.create')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
