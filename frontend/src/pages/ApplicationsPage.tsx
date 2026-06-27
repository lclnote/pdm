import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import Modal from '../components/Modal'

interface Application {
  id: string
  project_id: string
  task_id?: string
  phase_id?: string
  application_type: string
  reason: string
  evidence?: string
  status: string
  applicant_id: string
  reviewer_id?: string
  rejection_reason?: string
  created_at: string
}

export default function ApplicationsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const [applications, setApplications] = useState<Application[]>([])
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [tasks, setTasks] = useState<{ id: string; name: string }[]>([])
  const [showRejectModal, setShowRejectModal] = useState<Application | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    api.get('/applications').then((res) => {
      // Filter applications that belong to the current project
      const filtered = res.data.filter((app: Application) => app.project_id === projectId)
      setApplications(filtered)
    }).catch(() => {})

    api.get('/users').then((res) => setUsers(res.data)).catch(() => {})

    // Load tasks to resolve task names
    api.get('/users').then(() => {
      // We can fetch tasks by first loading all phases, then loading tasks for each phase
      if (!projectId) return
      api.get(`/projects/${projectId}/phases`).then((phaseRes) => {
        const promises = phaseRes.data.map((p: any) => api.get(`/phases/${p.id}/tasks`))
        Promise.all(promises).then((results) => {
          const allTasks = results.flatMap((r: any) => r.data)
          setTasks(allTasks)
        }).catch(() => {})
      })
    })
  }, [projectId])

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))
  const taskMap = Object.fromEntries(tasks.map((tk) => [tk.id, tk.name]))

  const handleApprove = async (app: Application) => {
    if (!confirm(t('application.approveConfirm'))) return
    try {
      await api.put(`/applications/${app.id}/approve`, { application_type: app.application_type })
      
      if (app.task_id) {
        // task_submission → completed, hold/suspend stay as-is
        if (app.application_type === 'task_submission') {
          await api.put(`/tasks/${app.task_id}/status`, { status: 'completed' })
        }
      }

      setApplications(applications.map((a) => a.id === app.id ? { ...a, status: 'approved' } : a))
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || err.response?.data?.detail || 'Approve failed')
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showRejectModal || !rejectionReason.trim()) return
    try {
      await api.put(`/applications/${showRejectModal.id}/reject`, {
        application_type: showRejectModal.application_type,
        rejection_reason: rejectionReason,
      })

      if (showRejectModal.task_id) {
        // All rejections roll back the task to in_progress
        await api.put(`/tasks/${showRejectModal.task_id}/status`, { status: 'in_progress' })
      }

      setApplications(applications.map((a) => a.id === showRejectModal.id ? { ...a, status: 'rejected', rejection_reason: rejectionReason } : a))
      setShowRejectModal(null)
      setRejectionReason('')
    } catch (err: any) {
      alert(err.response?.data?.detail?.message || err.response?.data?.detail || 'Reject failed')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'badge-completed'
      case 'rejected': return 'badge-danger'
      default: return 'badge-pending'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return t('application.status.approved')
      case 'rejected': return t('application.status.rejected')
      default: return t('application.status.pending')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('application.title')}</h1>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="responsive-table">
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.type')}</th>
              <th>{t('application.applicant')}</th>
              <th>{t('application.reason')}</th>
              <th>{t('application.evidence')}</th>
              <th>{t('common.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  {t('application.noApplications')}
                </td>
              </tr>
            ) : applications.map((app) => (
              <tr key={app.id}>
                <td data-label={t('common.name')}>{app.task_id ? (taskMap[app.task_id] || app.task_id) : t('application.phaseGate')}</td>
                <td data-label={t('common.type')}>{app.application_type === 'task_submission' ? t('application.typeSubmission') : app.application_type}</td>
                <td data-label={t('application.applicant')}>{userMap[app.applicant_id] || app.applicant_id}</td>
                <td data-label={t('application.reason')}>{app.reason}</td>
                <td data-label={t('application.evidence')}>{app.evidence || '-'}</td>
                <td data-label={t('common.status')}>
                  <span className={`badge ${getStatusBadge(app.status)}`}>{getStatusLabel(app.status)}</span>
                  {app.status === 'rejected' && app.rejection_reason && (
                    <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px' }}>
                      <strong>{t('application.rejectionReason')}:</strong> {app.rejection_reason}
                    </div>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {app.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => handleApprove(app)}>{t('application.approve')}</button>
                      <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setShowRejectModal(app)}>{t('application.reject')}</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showRejectModal && (
        <Modal title={t('application.rejectTitle')} onClose={() => setShowRejectModal(null)}>
          <form onSubmit={handleRejectSubmit}>
            <div className="form-group">
              <label>{t('application.rejectionReason')}</label>
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} required />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowRejectModal(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn" style={{ background: 'var(--danger)', color: '#fff' }}>{t('application.rejectSubmit')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
