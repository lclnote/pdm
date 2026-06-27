import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { Phase } from '../types'
import Modal from '../components/Modal'

interface TaskTemplate {
  id: string
  name: string
  description?: string
  tasks_json: any
  created_at: string
}

export default function PhasesPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  
  // Phase states
  const [phases, setPhases] = useState<Phase[]>([])
  const [taskWarns, setTaskWarns] = useState<Record<string, number>>({})
  const [projStartDate, setProjStartDate] = useState('')
  const [projEndDate, setProjEndDate] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<Phase | null>(null)
  const [showGateModal, setShowGateModal] = useState<Phase | null>(null)
  const [gateReason, setGateReason] = useState('')
  const [gateEvidence, setGateEvidence] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')

  // Task Template states
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState<Phase | null>(null)
  const [tplName, setTplName] = useState('')
  const [tplDescription, setTplDescription] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [targetPhaseId, setTargetPhaseId] = useState('')

  const phaseStatusBadge = (s: string) => {
    if (s === 'active') return 'badge-active'
    if (s === 'completed' || s === 'closed') return 'badge-completed'
    if (s === 'gate_waiting') return 'badge-pending'
    return 'badge-pending'
  }

  const submitGateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showGateModal) return
    try {
      await api.post(`/phases/${showGateModal.id}/gate-request`, { reason: gateReason, evidence: gateEvidence || undefined })
      setPhases(phases.map((p) => p.id === showGateModal.id ? { ...p, status: 'gate_waiting' } : p))
      setShowGateModal(null); setGateReason(''); setGateEvidence('')
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Gate request failed')
    }
  }

  function dateRangeWarning(start?: string, end?: string, projStart?: string, projEnd?: string): string | null {
    if (!start && !end) return null
    if (projStart && start && start < projStart) return t('warning.phaseStartBeforeProject')
    if (projEnd && end && end > projEnd) return t('warning.phaseEndAfterProject')
    if (projStart && end && end < projStart) return t('warning.phaseEndBeforeProjectStart')
    if (projEnd && start && start > projEnd) return t('warning.phaseStartAfterProjectEnd')
    if (start && end && end < start) return t('warning.phaseEndBeforeStart')
    return null
  }

  function taskDateWarning(start?: string, end?: string, pStart?: string, pEnd?: string): string | null {
    if (!start && !end) return null
    if (pStart && start && start < pStart) return t('warning.taskStartBeforePhaseStart')
    if (pEnd && end && end > pEnd) return t('warning.taskEndAfterPhaseEnd')
    if (pStart && end && end < pStart) return t('warning.taskEndBeforePhaseStart')
    if (pEnd && start && start > pEnd) return t('warning.taskStartAfterPhaseEnd')
    if (start && end && end < start) return t('warning.taskEndBeforeStart')
    return null
  }

  useEffect(() => { if (projectId) loadPage() }, [projectId])

  const loadPage = async () => {
    if (!projectId) return
    try {
      const [phRes, projRes] = await Promise.all([
        api.get(`/projects/${projectId}/phases`),
        api.get(`/projects/${projectId}`),
      ])
      const phs: Phase[] = phRes.data
      phs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      setPhases(phs)
      setProjStartDate(projRes.data.start_date || '')
      setProjEndDate(projRes.data.end_date || '')
      const warns: Record<string, number> = {}
      await Promise.all(phs.map(async (ph) => {
        try {
          const tRes = await api.get(`/phases/${ph.id}/tasks`)
          let count = 0
          for (const t of tRes.data) {
            if (t.start_date || t.end_date) {
              if (taskDateWarning(t.start_date || undefined, t.end_date || undefined, ph.start_date || undefined, ph.end_date || undefined)) count++
            }
          }
          if (count > 0) warns[ph.id] = count
        } catch {}
      }))
      setTaskWarns({ ...warns })
    } catch (e) { console.error(e) }
  }

  const loadTemplates = async () => {
    try {
      const res = await api.get('/task-templates')
      setTemplates(res.data)
    } catch {}
  }

  const createPhase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    const payload: any = { name }
    if (startDate) payload.start_date = startDate
    if (endDate) payload.end_date = endDate
    const res = await api.post(`/projects/${projectId}/phases`, payload)
    setPhases([...phases, res.data])
    setShowCreate(false)
    setName(''); setStartDate(''); setEndDate('')
  }

  const updatePhase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEdit) return
    try {
      const payload: any = { name, description }
      if (startDate) payload.start_date = startDate
      if (endDate) payload.end_date = endDate
      if (status) payload.status = status
      const res = await api.put(`/phases/${showEdit.id}`, payload)
      setPhases(phases.map((p) => (p.id === showEdit.id ? res.data : p)))
      setShowEdit(null); setName(''); setDescription(''); setStartDate(''); setEndDate('')
    } catch (e) { console.error(e) }
  }

  const deletePhase = async (id: string) => {
    if (!confirm(t('phase.deleteConfirm'))) return
    try {
      await api.delete(`/phases/${id}`)
      setPhases(phases.filter((p) => p.id !== id))
    } catch (e) { console.error(e) }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (dragIndex === dropIndex) return

    const updatedPhases = [...phases]
    const [draggedItem] = updatedPhases.splice(dragIndex, 1)
    updatedPhases.splice(dropIndex, 0, draggedItem)

    const reordered = updatedPhases.map((ph, idx) => ({ ...ph, sort_order: idx + 1 }))
    setPhases(reordered)

    try {
      await Promise.all(reordered.map((ph) => 
        api.put(`/phases/${ph.id}`, { sort_order: ph.sort_order })
      ))
    } catch {
      alert('Failed to save phase order')
    }
  }

  // Task Template Actions
  const handleOpenSaveTemplate = (ph: Phase) => {
    setTplName(`${ph.name} Template`)
    setTplDescription('')
    setShowSaveTemplate(ph)
  }

  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showSaveTemplate) return
    try {
      // 1. Fetch tasks tree inside phase
      const res = await api.get(`/phases/${showSaveTemplate.id}/tasks`)
      const tasksTree = res.data

      if (tasksTree.length === 0) {
        alert(t('template.noTasksError'))
        return
      }

      // 2. Submit the template to backend
      await api.post('/task-templates', {
        name: tplName,
        description: tplDescription || undefined,
        tasks_json: tasksTree,
      })

      alert(t('template.saveSuccess'))
      setShowSaveTemplate(null)
    } catch {
      alert('Failed to save template')
    }
  }

  const handleOpenTemplateManager = () => {
    loadTemplates()
    setSelectedTemplateId('')
    setTargetPhaseId('')
    setShowTemplateManager(true)
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(t('template.deleteConfirm'))) return
    try {
      await api.delete(`/task-templates/${id}`)
      setTemplates(templates.filter((t) => t.id !== id))
      if (selectedTemplateId === id) setSelectedTemplateId('')
    } catch { alert('Delete template failed') }
  }

  const handleApplyTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplateId || !targetPhaseId) return
    try {
      await api.post(`/phases/${targetPhaseId}/apply-template/${selectedTemplateId}`)
      alert(t('template.applySuccess'))
      setShowTemplateManager(false)
      loadPage() // Reload to update warnings count if any
    } catch { alert('Failed to apply template') }
  }

  const formWarning = dateRangeWarning(startDate, endDate, projStartDate, projEndDate)
  const totalTaskWarns = Object.values(taskWarns).reduce((s, c) => s + c, 0)

  return (
    <div>
      <div className="page-header">
        <h1>{t('phase.title')}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={handleOpenTemplateManager}>{t('template.manageTemplates')}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t('phase.addPhase')}</button>
        </div>
      </div>

      {projStartDate && projEndDate && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {t('project.projectPeriod', { start: projStartDate, end: projEndDate })}
          {(phases.filter((ph) => dateRangeWarning(ph.start_date || undefined, ph.end_date || undefined, projStartDate, projEndDate)).length > 0 || totalTaskWarns > 0) && (
            <span style={{ marginLeft: '12px', color: '#e37400' }}>
              {t('warning.summary', { count: phases.filter((ph) => dateRangeWarning(ph.start_date || undefined, ph.end_date || undefined, projStartDate, projEndDate)).length + totalTaskWarns })}
            </span>
          )}
        </div>
      )}

      <div className="grid">
        {phases.map((ph, index) => {
          const warn = dateRangeWarning(ph.start_date || undefined, ph.end_date || undefined, projStartDate, projEndDate)
          const tCount = taskWarns[ph.id] || 0
          return (
            <div
              key={ph.id}
              className="card"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                cursor: 'grab',
                borderLeft: (warn || tCount > 0) ? '4px solid var(--warning)' : undefined
              }}
            >
              <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${projectId}/phases/${ph.id}/tasks`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>
                    {ph.name}
                    {(warn || tCount > 0) && <span title={warn || t('warning.taskWarnings', {count: tCount})} style={{ marginLeft: '6px', cursor: 'help' }}>⚠️</span>}
                  </strong>
                  <span className={`badge ${phaseStatusBadge(ph.status)}`}>
                    {t(`phase.status.${ph.status}`, ph.status)}
                  </span>
                </div>
                {ph.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{ph.description}</p>}
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {ph.start_date || ph.end_date ? t('dateRange.format', { start: ph.start_date || '...', end: ph.end_date || '...' }) : ''}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {t('common.order')}: {ph.sort_order}
                  {ph.parallel_execution && t('common.parallel')}
                </div>
                {warn && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>⚠️ {warn}</div>}
                {tCount > 0 && <div style={{ fontSize: '12px', color: '#e37400', marginTop: '4px' }}>⚠️ {t('warning.taskWarnings', {count: tCount})}</div>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                <button className="btn" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); setShowEdit(ph); setName(ph.name); setDescription(ph.description || ''); setStartDate(ph.start_date || ''); setEndDate(ph.end_date || ''); setStatus(ph.status) }}>{t('common.edit')}</button>
                <button className="btn" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); handleOpenSaveTemplate(ph) }}>{t('template.saveAsTemplate')}</button>
                <button className="btn" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--danger, #e53e3e)' }} onClick={(e) => { e.stopPropagation(); deletePhase(ph.id) }}>{t('common.delete')}</button>
                {ph.status === 'active' && (
                  <button className="btn" style={{ fontSize: '12px', padding: '4px 8px', marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); setShowGateModal(ph); setGateReason(''); setGateEvidence('') }}>{t('phase.gateRequest')}</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showCreate && (
        <Modal title={t('phase.createPhase')} onClose={() => { setShowCreate(false); setStartDate(''); setEndDate('') }}>
          <form onSubmit={createPhase}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {formWarning && <div style={{ fontSize: '13px', color: '#e37400', marginBottom: '12px' }}>⚠️ {formWarning}</div>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowCreate(false); setStartDate(''); setEndDate('') }}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.create')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showEdit && (
        <Modal title={t('phase.editPhase')} onClose={() => { setShowEdit(null); setName(''); setDescription(''); setStartDate(''); setEndDate(''); setStatus('') }}>
          <form onSubmit={updatePhase}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
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
              <label>{t('common.status')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {['planned', 'active', 'gate_waiting', 'completed', 'closed'].map((s) => (
                  <option key={s} value={s}>{t(`phase.status.${s}`)}</option>
                ))}
              </select>
            </div>
            {formWarning && <div style={{ fontSize: '13px', color: '#e37400', marginBottom: '12px' }}>⚠️ {formWarning}</div>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowEdit(null); setName(''); setDescription(''); setStartDate(''); setEndDate(''); setStatus('') }}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showGateModal && (
        <Modal title={t('phase.gateRequestTitle')} onClose={() => { setShowGateModal(null); setGateReason(''); setGateEvidence('') }}>
          <form onSubmit={submitGateRequest}>
            <div className="form-group">
              <label>{t('phase.gateReason')}</label>
              <textarea value={gateReason} onChange={(e) => setGateReason(e.target.value)} rows={3} required />
            </div>
            <div className="form-group">
              <label>{t('phase.gateEvidence')}</label>
              <input value={gateEvidence} onChange={(e) => setGateEvidence(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowGateModal(null); setGateReason(''); setGateEvidence('') }}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('phase.submitRequest')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Save Phase as Template Modal */}
      {showSaveTemplate && (
        <Modal title={t('template.saveTitle')} onClose={() => setShowSaveTemplate(null)}>
          <form onSubmit={handleSaveTemplateSubmit}>
            <div className="form-group">
              <label>{t('common.name')} *</label>
              <input value={tplName} onChange={(e) => setTplName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea value={tplDescription} onChange={(e) => setTplDescription(e.target.value)} rows={3} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowSaveTemplate(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Template Manager / Apply Modal */}
      {showTemplateManager && (
        <Modal title={t('template.managerTitle')} onClose={() => setShowTemplateManager(false)}>
          <form onSubmit={handleApplyTemplate}>
            <div className="form-group">
              <label>{t('template.selectTemplate')} *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', background: 'var(--hover-bg, #f8f9fa)', marginBottom: '12px' }}>
                {templates.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>{t('template.noTemplates')}</div>
                ) : templates.map((tpl) => (
                  <div key={tpl.id} onClick={() => setSelectedTemplateId(tpl.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: selectedTemplateId === tpl.id ? '#e8f0fe' : 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{tpl.name}</strong>
                      {tpl.description && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tpl.description}</div>}
                    </div>
                    <button type="button" className="btn btn-sm" style={{ color: 'var(--danger, #e53e3e)', marginLeft: '8px' }} onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id) }}>{t('common.delete')}</button>
                  </div>
                ))}
              </div>
            </div>

            {selectedTemplateId && (
              <div className="form-group">
                <label>{t('template.selectTargetPhase')} *</label>
                <select value={targetPhaseId} onChange={(e) => setTargetPhaseId(e.target.value)} required>
                  <option value="">-- {t('template.selectTargetPhasePlaceholder')} --</option>
                  {phases.map((ph) => (
                    <option key={ph.id} value={ph.id}>{ph.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowTemplateManager(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={!selectedTemplateId || !targetPhaseId}>{t('template.apply')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
