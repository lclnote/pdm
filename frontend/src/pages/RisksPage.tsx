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

interface Countermeasure {
  id: string
  risk_id: string
  description: string
  assignee_id: string
  due_date?: string | null
  status: string
}

export default function RisksPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const [risks, setRisks] = useState<Risk[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Risk | null>(null)
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null)
  const [countermeasures, setCountermeasures] = useState<Countermeasure[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('medium')
  const [probability, setProbability] = useState('medium')
  const [status, setStatus] = useState('unaddressed')
  const [cmShowAdd, setCmShowAdd] = useState(false)
  const [cmShowEdit, setCmShowEdit] = useState<Countermeasure | null>(null)
  const [cmDescription, setCmDescription] = useState('')
  const [cmAssigneeId, setCmAssigneeId] = useState('')
  const [cmAssigneeName, setCmAssigneeName] = useState('')
  const [cmDueDate, setCmDueDate] = useState('')
  const [cmStatus, setCmStatus] = useState('planned')
  const [cmShowUserDropdown, setCmShowUserDropdown] = useState(false)

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/risks`).then((res) => setRisks(res.data))
    api.get('/users').then((res) => setUsers(res.data)).catch(() => {})
  }, [projectId])

  useEffect(() => {
    if (!selectedRisk) { setCountermeasures([]); return }
    api.get(`/risks/${selectedRisk.id}/countermeasures`).then((res) => setCountermeasures(res.data)).catch(() => {})
  }, [selectedRisk])

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
      if (selectedRisk?.id === showEdit.id) setSelectedRisk(res.data)
      setShowEdit(null); setName(''); setDescription(''); setImpact('medium'); setProbability('medium'); setStatus('unaddressed')
    } catch { alert('Update failed') }
  }

  const deleteRisk = async (id: string) => {
    if (!confirm(t('risk.deleteConfirm'))) return
    try {
      await api.delete(`/risks/${id}`)
      setRisks(risks.filter((r) => r.id !== id))
      if (selectedRisk?.id === id) setSelectedRisk(null)
    } catch { alert('Delete failed') }
  }

  const addCountermeasure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRisk) return
    try {
      const res = await api.post(`/risks/${selectedRisk.id}/countermeasures`, {
        description: cmDescription,
        assignee_id: cmAssigneeId,
        due_date: cmDueDate || null,
      })
      setCountermeasures([...countermeasures, res.data])
      setCmShowAdd(false)
      setCmDescription(''); setCmAssigneeId(''); setCmAssigneeName(''); setCmDueDate('')
    } catch { alert('Add failed') }
  }

  const updateCountermeasure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRisk || !cmShowEdit) return
    try {
      const res = await api.put(`/risks/${selectedRisk.id}/countermeasures/${cmShowEdit.id}`, {
        description: cmDescription,
        assignee_id: cmAssigneeId,
        due_date: cmDueDate || null,
        status: cmStatus,
      })
      setCountermeasures(countermeasures.map((c) => (c.id === cmShowEdit.id ? res.data : c)))
      setCmShowEdit(null)
      setCmDescription(''); setCmAssigneeId(''); setCmAssigneeName(''); setCmDueDate(''); setCmStatus('planned')
    } catch { alert('Update failed') }
  }

  const deleteCountermeasure = async (cmId: string) => {
    if (!selectedRisk) return
    if (!confirm(t('risk.cmDeleteConfirm'))) return
    try {
      await api.delete(`/risks/${selectedRisk.id}/countermeasures/${cmId}`)
      setCountermeasures(countermeasures.filter((c) => c.id !== cmId))
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

  const cmStatusLabel = (s: string) => {
    switch (s) {
      case 'completed': return t('risk.cmCompleted')
      case 'in_progress': return t('risk.cmInProgress')
      case 'planned': return t('risk.cmPlanned')
      default: return s
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
            <tr key={r.id} onClick={() => setSelectedRisk(r)} style={{ cursor: 'pointer', background: selectedRisk?.id === r.id ? 'var(--hover-bg, #f0f4ff)' : undefined }}>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setShowEdit(r); setName(r.name); setDescription(r.description || ''); setImpact(r.impact); setProbability(r.probability); setStatus(r.status) }}>{t('common.edit')}</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger, #e53e3e)' }} onClick={(e) => { e.stopPropagation(); deleteRisk(r.id) }}>{t('common.delete')}</button>
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

      {selectedRisk && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>{selectedRisk.name}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', marginBottom: '16px' }}>
            <div><strong>{t('common.impact')}</strong> <span className={`badge ${selectedRisk.impact === 'high' ? 'badge-danger' : selectedRisk.impact === 'medium' ? 'badge-pending' : 'badge-completed'}`}>{t(`risk.${selectedRisk.impact}`)}</span></div>
            <div><strong>{t('common.probability')}</strong> <span className={`badge ${selectedRisk.probability === 'high' ? 'badge-danger' : selectedRisk.probability === 'medium' ? 'badge-pending' : 'badge-completed'}`}>{t(`risk.${selectedRisk.probability}`)}</span></div>
            <div><strong>{t('common.priority')}</strong> <span style={{ color: priorityColor(selectedRisk.priority), fontWeight: 600 }}>{t(`risk.${selectedRisk.priority}`, selectedRisk.priority)}</span></div>
            <div><strong>{t('common.status')}</strong> <span className={`badge`}>{t(`risk.status.${selectedRisk.status}`, selectedRisk.status)}</span></div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px' }}>{t('risk.countermeasures')}</strong>
              <button className="btn btn-sm" onClick={() => { setCmShowAdd(true); setCmDescription(''); setCmAssigneeId(''); setCmAssigneeName(''); setCmDueDate('') }}>{t('risk.addCountermeasure')}</button>
            </div>
            {countermeasures.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('risk.noCountermeasures')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {countermeasures.map((cm) => (
                  <div key={cm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}>
                    <div style={{ flex: 1 }}>
                      <div>{cm.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {userMap[cm.assignee_id] || cm.assignee_id}
                        {cm.due_date && <span> | {t('risk.cmDue')}: {cm.due_date}</span>}
                        <span className={`badge`} style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 5px' }}>{cmStatusLabel(cm.status)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sm" onClick={() => { setCmShowEdit(cm); setCmDescription(cm.description); setCmAssigneeId(cm.assignee_id); setCmAssigneeName(userMap[cm.assignee_id] || ''); setCmDueDate(cm.due_date || ''); setCmStatus(cm.status) }}>{t('common.edit')}</button>
                      <button className="btn btn-sm" style={{ color: 'var(--danger, #e53e3e)' }} onClick={() => deleteCountermeasure(cm.id)}>{t('common.delete')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

      {cmShowAdd && selectedRisk && (
        <Modal title={t('risk.addCountermeasure')} onClose={() => setCmShowAdd(false)}>
          <form onSubmit={addCountermeasure}>
            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea value={cmDescription} onChange={(e) => setCmDescription(e.target.value)} rows={3} required />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>{t('common.assignee')}</label>
              <input value={cmAssigneeName} onChange={(e) => { setCmAssigneeName(e.target.value); setCmShowUserDropdown(true) }} onFocus={() => setCmShowUserDropdown(true)} placeholder={t('task.searchUser')} required />
              {cmShowUserDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, width: '100%', maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {users.filter((u) => u.name.toLowerCase().includes(cmAssigneeName.toLowerCase())).map((u) => (
                    <div key={u.id} onClick={() => { setCmAssigneeId(u.id); setCmAssigneeName(u.name); setCmShowUserDropdown(false) }} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '13px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      {u.name} <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>{t('risk.cmDue')}</label>
              <input type="date" value={cmDueDate} onChange={(e) => setCmDueDate(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setCmShowAdd(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.create')}</button>
            </div>
          </form>
        </Modal>
      )}

      {cmShowEdit && selectedRisk && (
        <Modal title={t('risk.editCountermeasure')} onClose={() => { setCmShowEdit(null); setCmDescription(''); setCmAssigneeId(''); setCmAssigneeName(''); setCmDueDate(''); setCmStatus('planned') }}>
          <form onSubmit={updateCountermeasure}>
            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea value={cmDescription} onChange={(e) => setCmDescription(e.target.value)} rows={3} required />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>{t('common.assignee')}</label>
              <input value={cmAssigneeName} onChange={(e) => { setCmAssigneeName(e.target.value); setCmShowUserDropdown(true) }} onFocus={() => setCmShowUserDropdown(true)} placeholder={t('task.searchUser')} required />
              {cmShowUserDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, width: '100%', maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border)', background: 'var(--card-bg, #fff)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {users.filter((u) => u.name.toLowerCase().includes(cmAssigneeName.toLowerCase())).map((u) => (
                    <div key={u.id} onClick={() => { setCmAssigneeId(u.id); setCmAssigneeName(u.name); setCmShowUserDropdown(false) }} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '13px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      {u.name} <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>{t('risk.cmDue')}</label>
              <input type="date" value={cmDueDate} onChange={(e) => setCmDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.status')}</label>
              <select value={cmStatus} onChange={(e) => setCmStatus(e.target.value)}>
                <option value="planned">{t('risk.cmPlanned')}</option>
                <option value="in_progress">{t('risk.cmInProgress')}</option>
                <option value="completed">{t('risk.cmCompleted')}</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setCmShowEdit(null); setCmDescription(''); setCmAssigneeId(''); setCmAssigneeName(''); setCmDueDate(''); setCmStatus('planned') }}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}