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
  const [name, setName] = useState('')
  const [impact, setImpact] = useState('medium')
  const [probability, setProbability] = useState('medium')

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

      <table>
        <thead>
          <tr>
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
              <td>{r.name}</td>
              <td><span className={`badge ${r.impact === 'high' ? 'badge-danger' : r.impact === 'medium' ? 'badge-pending' : 'badge-completed'}`}>{r.impact}</span></td>
              <td><span className={`badge ${r.probability === 'high' ? 'badge-danger' : r.probability === 'medium' ? 'badge-pending' : 'badge-completed'}`}>{r.probability}</span></td>
              <td><span style={{ color: priorityColor(r.priority), fontWeight: 600 }}>{r.priority}</span></td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
    </div>
  )
}
