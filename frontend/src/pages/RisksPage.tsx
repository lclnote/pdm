import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import Modal from '../components/Modal'

interface Risk {
  id: string
  name: string
  description?: string
  impact: string
  probability: string
  priority: string
  status: string
}

export default function RisksPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const [risks, setRisks] = useState<Risk[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Risk | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('medium')
  const [probability, setProbability] = useState('medium')
  const [status, setStatus] = useState('unaddressed')

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/risks`).then((res) => setRisks(res.data))
  }, [projectId])

  const createRisk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    const res = await api.post(`/projects/${projectId}/risks`, { name, impact, probability })
    setRisks([res.data, ...risks])
    setShowCreate(false)
    setName(''); setImpact('medium'); setProbability('medium')
  }

  const updateRisk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEdit) return
    try {
      const payload: any = { name, description, impact, probability, status }
      const res = await api.put(`/risks/${showEdit.id}`, payload)
      setRisks(risks.map((r) => (r.id === showEdit.id ? res.data : r)))
      setShowEdit(null); setName(''); setDescription(''); setImpact('medium'); setProbability('medium'); setStatus('unaddressed')
    } catch { alert('Update failed') }
  }

  const deleteRisk = async (id: string) => {
    if (!confirm(t('risk.deleteConfirm'))) return
    try {
      await api.delete(`/risks/${id}`)
      setRisks(risks.filter((r) => r.id !== id))
    } catch { alert('Delete failed') }
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'var(--danger)'
      case 'high': return '#e37400'
      case 'medium': return 'var(--warning)'
      default: return 'var(--success)'
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('risk.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('risk.addRisk')}</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
      <table className="responsive-table">
        <thead>
          <tr>
            <th></th>
            <th>{t('common.name')}</th>
            <th>{t('common.impact')}</th>
            <th>{t('common.probability')}</th>
            <th>{t('common.priority')}</th>
            <th>{t('common.status')}</th>
          </tr>
        </thead>
        <tbody>
          {risks.map((r) => (
            <tr key={r.id}>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm" onClick={() => { setShowEdit(r); setName(r.name); setDescription(r.description || ''); setImpact(r.impact); setProbability(r.probability); setStatus(r.status) }}>{t('common.edit')}</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger, #e53e3e)' }} onClick={() => deleteRisk(r.id)}>{t('common.delete')}</button>
              </td>
              <td data-label={t('common.name')}>{r.name}</td>
              <td data-label={t('common.impact')}><span className={`badge ${r.impact === 'high' ? 'badge-danger' : r.impact === 'medium' ? 'badge-pending' : 'badge-completed'}`}>{t(`risk.${r.impact}`)}</span></td>
              <td data-label={t('common.probability')}><span className={`badge ${r.probability === 'high' ? 'badge-danger' : r.probability === 'medium' ? 'badge-pending' : 'badge-completed'}`}>{t(`risk.${r.probability}`)}</span></td>
              <td data-label={t('common.priority')}><span style={{ color: priorityColor(r.priority), fontWeight: 600 }}>{t(`risk.${r.priority}`, r.priority)}</span></td>
              <td data-label={t('common.status')}><span className={`badge ${r.status === 'occurred' ? 'badge-danger' : r.status === 'addressed' || r.status === 'mitigated' ? 'badge-active' : r.status === 'closed' ? 'badge-completed' : 'badge-pending'}`}>{t(`risk.status.${r.status}`, r.status)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {showCreate && (
        <Modal title={t('risk.createRisk')} onClose={() => setShowCreate(false)}>
          <form onSubmit={createRisk}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.impact')}</label>
              <select value={impact} onChange={(e) => setImpact(e.target.value)}>
                <option value="high">{t('risk.high')}</option>
                <option value="medium">{t('risk.medium')}</option>
                <option value="low">{t('risk.low')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('common.probability')}</label>
              <select value={probability} onChange={(e) => setProbability(e.target.value)}>
                <option value="high">{t('risk.high')}</option>
                <option value="medium">{t('risk.medium')}</option>
                <option value="low">{t('risk.low')}</option>
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
        <Modal title={t('risk.editRisk')} onClose={() => { setShowEdit(null); setName(''); setDescription(''); setImpact('medium'); setProbability('medium'); setStatus('unaddressed') }}>
          <form onSubmit={updateRisk}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="form-group">
              <label>{t('common.impact')}</label>
              <select value={impact} onChange={(e) => setImpact(e.target.value)}>
                <option value="high">{t('risk.high')}</option>
                <option value="medium">{t('risk.medium')}</option>
                <option value="low">{t('risk.low')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('common.probability')}</label>
              <select value={probability} onChange={(e) => setProbability(e.target.value)}>
                <option value="high">{t('risk.high')}</option>
                <option value="medium">{t('risk.medium')}</option>
                <option value="low">{t('risk.low')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('common.status')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {['unaddressed', 'addressed', 'occurred', 'mitigated', 'closed'].map((s) => (
                  <option key={s} value={s}>{t(`risk.status.${s}`)}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowEdit(null); setName(''); setDescription(''); setImpact('medium'); setProbability('medium'); setStatus('unaddressed') }}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
