import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import Modal from '../components/Modal'

interface AppUser {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

export default function UsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<AppUser[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<AppUser | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('worker')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')

  useEffect(() => { api.get('/users').then((res) => setUsers(res.data)).catch(() => {}) }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post('/users', { name, email, password, role })
      setUsers([...users, res.data])
      setShowAdd(false); setName(''); setEmail(''); setPassword(''); setRole('worker')
    } catch { alert('Create failed') }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEdit) return
    try {
      const payload: any = {}
      if (editName) payload.name = editName
      if (editEmail) payload.email = editEmail
      payload.role = editRole
      const res = await api.put(`/users/${showEdit.id}`, payload)
      setUsers(users.map((u) => u.id === showEdit.id ? res.data : u))
      setShowEdit(null)
    } catch { alert('Update failed') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('user.deleteConfirm'))) return
    try {
      await api.delete(`/users/${id}`)
      setUsers(users.filter((u) => u.id !== id))
    } catch { alert('Delete failed') }
  }

  const roleBadge = (r: string) => {
    const cls = r === 'system_admin' ? 'badge-danger' : r === 'pm' ? 'badge-completed' : r === 'sub_leader' ? 'badge-active' : 'badge-pending'
    return <span className={`badge ${cls}`}>{t(`user.roles.${r}`, r)}</span>
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('user.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('user.addUser')}</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="responsive-table">
          <thead>
            <tr><th>{t('common.name')}</th><th>{t('auth.email')}</th><th>{t('user.role')}</th><th></th></tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>{t('user.noUsers')}</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td data-label={t('common.name')}>{u.name}</td>
                <td data-label={t('auth.email')}>{u.email}</td>
                <td data-label={t('user.role')}>{roleBadge(u.role)}</td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <button className="btn btn-sm" onClick={() => { setShowEdit(u); setEditName(u.name); setEditEmail(u.email); setEditRole(u.role) }}>{t('common.edit')}</button>
                  <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(u.id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title={t('user.addUserTitle')} onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd}>
            <div className="form-group"><label>{t('common.name')} *</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="form-group"><label>{t('auth.email')} *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="form-group"><label>{t('auth.password')} *</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <div className="form-group"><label>{t('user.role')}</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="system_admin">{t('user.roles.system_admin')}</option>
                <option value="pm">{t('user.roles.pm')}</option>
                <option value="sub_leader">{t('user.roles.sub_leader')}</option>
                <option value="worker">{t('user.roles.worker')}</option>
                <option value="viewer">{t('user.roles.viewer')}</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.create')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showEdit && (
        <Modal title={t('user.editUserTitle')} onClose={() => setShowEdit(null)}>
          <form onSubmit={handleEdit}>
            <div className="form-group"><label>{t('common.name')}</label><input value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
            <div className="form-group"><label>{t('auth.email')}</label><input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required /></div>
            <div className="form-group"><label>{t('user.role')}</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="system_admin">{t('user.roles.system_admin')}</option>
                <option value="pm">{t('user.roles.pm')}</option>
                <option value="sub_leader">{t('user.roles.sub_leader')}</option>
                <option value="worker">{t('user.roles.worker')}</option>
                <option value="viewer">{t('user.roles.viewer')}</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowEdit(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
