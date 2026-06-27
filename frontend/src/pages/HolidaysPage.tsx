import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import Modal from '../components/Modal'

interface Holiday {
  id: string
  project_id: string
  date: string
  name?: string
  is_working_day: string
}

export default function HolidaysPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<Holiday | null>(null)
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayName, setHolidayName] = useState('')
  const [isWorkingDay, setIsWorkingDay] = useState('n')
  const [editName, setEditName] = useState('')
  const [editWorkingDay, setEditWorkingDay] = useState('n')

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/holidays`).then((res) => setHolidays(res.data)).catch(() => {})
  }, [projectId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !holidayDate) return
    try {
      const res = await api.post(`/projects/${projectId}/holidays`, { date: holidayDate, name: holidayName || undefined, is_working_day: isWorkingDay })
      setHolidays([...holidays, res.data])
      setShowAdd(false)
      setHolidayDate(''); setHolidayName(''); setIsWorkingDay('n')
    } catch { alert('Add failed') }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEdit) return
    try {
      const payload: any = {}
      if (editName) payload.name = editName
      payload.is_working_day = editWorkingDay
      const res = await api.put(`/holidays/${showEdit.id}`, payload)
      setHolidays(holidays.map((h) => h.id === showEdit.id ? res.data : h))
      setShowEdit(null)
    } catch { alert('Update failed') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('holiday.deleteConfirm'))) return
    try {
      await api.delete(`/holidays/${id}`)
      setHolidays(holidays.filter((h) => h.id !== id))
    } catch { alert('Delete failed') }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('holiday.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('holiday.add')}</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="responsive-table">
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              <th>{t('common.name')}</th>
              <th>{t('holiday.type')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>{t('holiday.noHolidays')}</td></tr>
            ) : holidays.map((h) => (
              <tr key={h.id}>
                <td data-label={t('common.date')}>{h.date}</td>
                <td data-label={t('common.name')}>{h.name || '-'}</td>
                <td data-label={t('holiday.type')}><span className={`badge ${h.is_working_day === 'y' ? 'badge-active' : 'badge-danger'}`}>{h.is_working_day === 'y' ? t('holiday.workingDay') : t('holiday.holiday')}</span></td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <button className="btn btn-sm" onClick={() => { setShowEdit(h); setEditName(h.name || ''); setEditWorkingDay(h.is_working_day) }}>{t('common.edit')}</button>
                  <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(h.id)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title={t('holiday.addTitle')} onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>{t('common.date')} *</label>
              <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder={t('holiday.namePlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('holiday.type')}</label>
              <select value={isWorkingDay} onChange={(e) => setIsWorkingDay(e.target.value)}>
                <option value="n">{t('holiday.holiday')}</option>
                <option value="y">{t('holiday.workingDay')}</option>
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
        <Modal title={t('holiday.editTitle')} onClose={() => setShowEdit(null)}>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('holiday.type')}</label>
              <select value={editWorkingDay} onChange={(e) => setEditWorkingDay(e.target.value)}>
                <option value="n">{t('holiday.holiday')}</option>
                <option value="y">{t('holiday.workingDay')}</option>
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
