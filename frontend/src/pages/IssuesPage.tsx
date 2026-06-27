import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
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
  const [name, setName] = useState('')
  const [type, setType] = useState('bug')
  const [priority, setPriority] = useState('medium')

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/issues`).then((res) => setIssues(res.data))
  }, [projectId])

  const createIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    const res = await api.post(`/projects/${projectId}/issues`, { name, type, priority })
    setIssues([res.data, ...issues])
    setShowCreate(false)
    setName(''); setType('bug'); setPriority('medium')
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('issue.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('issue.addIssue')}</button>
      </div>

      <table>
        <thead>
          <tr>
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
              <td>{i.name}</td>
              <td><span className="badge badge-pending">{i.type}</span></td>
              <td><span className={`badge ${i.priority === 'urgent' ? 'badge-danger' : 'badge-active'}`}>{i.priority}</span></td>
              <td>{i.status}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{i.assignee_id || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCreate && (
        <Modal title={t('issue.createIssue')} onClose={() => setShowCreate(false)}>
          <form onSubmit={createIssue}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
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
    </div>
  )
}
