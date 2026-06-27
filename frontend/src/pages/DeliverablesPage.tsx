import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { User } from '../types'
import Modal from '../components/Modal'

interface Deliverable {
  id: string
  task_id: string
  name: string
  description?: string
  type: string
  file_path?: string
  file_url?: string
  version: string
  status: string
  reviewer_id?: string
  created_at: string
}

interface Task {
  id: string
  name: string
}

export default function DeliverablesPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  
  // Create Deliverable form states
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [dlName, setDlName] = useState('')
  const [dlDescription, setDlDescription] = useState('')
  const [dlType, setDlType] = useState('document')
  const [dlFilePath, setDlFilePath] = useState('')
  const [dlFileUrl, setDlFileUrl] = useState('')
  const [dlVersion, setDlVersion] = useState('1.0')

  // Review form states
  const [showReview, setShowReview] = useState<Deliverable | null>(null)
  const [reviewStatus, setReviewStatus] = useState('approved')
  const [reviewComment, setReviewComment] = useState('')

  useEffect(() => {
    if (!projectId) return
    api.get('/users').then((res) => setUsers(res.data)).catch(() => {})
    api.get('/auth/me').then((res) => setCurrentUser(res.data)).catch(() => {})

    // Load phases, then tasks, then deliverables
    api.get(`/projects/${projectId}/phases`).then((phaseRes) => {
      const phs = phaseRes.data
      const promises = phs.map((p: any) => api.get(`/phases/${p.id}/tasks`))
      
      Promise.all(promises).then((results) => {
        const allTasks = results.flatMap((r: any) => r.data)
        setTasks(allTasks)

        const dlPromises = allTasks.map((tk: any) => api.get(`/tasks/${tk.id}/deliverables`))
        Promise.all(dlPromises).then((dlResults) => {
          const allDls = dlResults.flatMap((r: any) => r.data)
          setDeliverables(allDls)
        }).catch(() => {})
      }).catch(() => {})
    }).catch(() => {})
  }, [projectId])

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))
  const taskMap = Object.fromEntries(tasks.map((tk) => [tk.id, tk.name]))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTaskId) return
    try {
      const payload = {
        name: dlName,
        description: dlDescription || undefined,
        type: dlType,
        file_path: dlFilePath || undefined,
        file_url: dlFileUrl || undefined,
        version: dlVersion,
      }
      const res = await api.post(`/tasks/${selectedTaskId}/deliverables`, payload)
      setDeliverables([...deliverables, res.data])
      setShowCreate(false)
      setDlName(''); setDlDescription(''); setDlType('document'); setDlFilePath(''); setDlFileUrl(''); setDlVersion('1.0'); setSelectedTaskId('')
    } catch { alert('Create failed') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('deliverable.deleteConfirm'))) return
    try {
      await api.delete(`/deliverables/${id}`)
      setDeliverables(deliverables.filter((d) => d.id !== id))
    } catch { alert('Delete failed') }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showReview) return
    try {
      // 1. Submit the review record
      await api.post(`/deliverables/${showReview.id}/review`, {
        status: reviewStatus,
        comment: reviewComment || undefined,
      })
      // 2. Update the deliverable status and reviewer_id
      const updateRes = await api.put(`/deliverables/${showReview.id}`, {
        status: reviewStatus,
        reviewer_id: currentUser?.id,
      })

      // 3. Update state
      setDeliverables(deliverables.map((d) => d.id === showReview.id ? updateRes.data : d))
      setShowReview(null)
      setReviewComment('')
      setReviewStatus('approved')
    } catch { alert('Review submission failed') }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'badge-completed'
      case 'rejected': return 'badge-danger'
      case 'pending': return 'badge-pending'
      default: return 'badge-pending'
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('deliverable.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('deliverable.addDeliverable')}</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="responsive-table">
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.task')}</th>
              <th>{t('common.type')}</th>
              <th>{t('deliverable.version')}</th>
              <th>{t('deliverable.file')}</th>
              <th>{t('common.status')}</th>
              <th>{t('deliverable.reviewer')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {deliverables.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  {t('deliverable.noDeliverables')}
                </td>
              </tr>
            ) : deliverables.map((d) => (
              <tr key={d.id}>
                <td data-label={t('common.name')}>
                  <strong>{d.name}</strong>
                  {d.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{d.description}</div>}
                </td>
                <td data-label={t('common.task')}>{taskMap[d.task_id] || d.task_id}</td>
                <td data-label={t('common.type')}>{t(`deliverable.types.${d.type}`, d.type)}</td>
                <td data-label={t('deliverable.version')}>{d.version}</td>
                <td data-label={t('deliverable.file')}>
                  {d.file_url ? (
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="link">{d.file_url}</a>
                  ) : d.file_path ? (
                    <code style={{ fontSize: '11px' }}>{d.file_path}</code>
                  ) : '-'}
                </td>
                <td data-label={t('common.status')}>
                  <span className={`badge ${getStatusBadge(d.status)}`}>{t(`deliverable.status.${d.status}`, d.status)}</span>
                </td>
                <td data-label={t('deliverable.reviewer')}>{userMap[d.reviewer_id || ''] || '-'}</td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    {d.status === 'pending' && (
                      <button className="btn btn-sm btn-primary" onClick={() => setShowReview(d)}>
                        {t('deliverable.review')}
                      </button>
                    )}
                    <button className="btn btn-sm" style={{ color: 'var(--danger, #e53e3e)' }} onClick={() => handleDelete(d.id)}>
                      {t('common.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title={t('deliverable.addDeliverableTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>{t('common.task')} *</label>
              <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} required>
                <option value="">-- {t('deliverable.selectTask')} --</option>
                {tasks.map((tk) => (
                  <option key={tk.id} value={tk.id}>{tk.name}</option>
                ))}
              </select>
            </div>

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
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.create')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showReview && (
        <Modal title={t('deliverable.reviewTitle')} onClose={() => setShowReview(null)}>
          <form onSubmit={handleReviewSubmit}>
            <div className="form-group">
              <label>{t('deliverable.reviewStatus')} *</label>
              <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                <option value="approved">{t('deliverable.status.approved')}</option>
                <option value="rejected">{t('deliverable.status.rejected')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('deliverable.reviewComment')}</label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} placeholder={t('deliverable.commentPlaceholder')} />
            </div>

            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowReview(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.submit')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
