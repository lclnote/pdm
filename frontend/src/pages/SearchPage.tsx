import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { User } from '../types'

interface SearchResult {
  id: string
  type: 'task' | 'risk' | 'issue'
  name: string
  description?: string
  status: string
  assignee_id?: string
  start_date?: string
  end_date?: string
  priority?: string
  link: string
}

export default function SearchPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()

  // Data states
  const [tasks, setTasks] = useState<any[]>([])
  const [risks, setRisks] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [users, setUsers] = useState<User[]>([])

  // Filter states
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedAssignee, setSelectedAssignee] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (!projectId) return
    api.get('/users').then((res) => setUsers(res.data)).catch(() => {})

    // Load risks
    api.get(`/projects/${projectId}/risks`).then((res) => setRisks(res.data)).catch(() => {})

    // Load issues
    api.get(`/projects/${projectId}/issues`).then((res) => setIssues(res.data)).catch(() => {})

    // Load phases and tasks
    api.get(`/projects/${projectId}/phases`).then((phaseRes) => {
      const phs = phaseRes.data
      const promises = phs.map((p: any) => api.get(`/phases/${p.id}/tasks`))
      Promise.all(promises).then((results) => {
        const allTasks = results.flatMap((r: any) => r.data)
        setTasks(allTasks)
      }).catch(() => {})
    }).catch(() => {})
  }, [projectId])

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  // Compile all data into unified results
  const rawResults: SearchResult[] = [
    ...tasks.map((tk) => ({
      id: tk.id,
      type: 'task' as const,
      name: tk.name,
      description: tk.description,
      status: tk.status,
      assignee_id: tk.assignee_id,
      start_date: tk.start_date,
      end_date: tk.end_date,
      link: `/projects/${projectId}/phases/${tk.phase_id}/tasks`,
    })),
    ...risks.map((r) => ({
      id: r.id,
      type: 'risk' as const,
      name: r.name,
      description: r.description,
      status: r.status,
      assignee_id: undefined,
      start_date: undefined,
      end_date: undefined,
      priority: r.priority,
      link: `/projects/${projectId}/risks`,
    })),
    ...issues.map((i) => ({
      id: i.id,
      type: 'issue' as const,
      name: i.name,
      description: i.description,
      status: i.status,
      assignee_id: i.assignee_id,
      start_date: undefined,
      end_date: undefined,
      priority: i.priority,
      link: `/projects/${projectId}/issues`,
    })),
  ]

  // Apply filters in real-time
  const filteredResults = rawResults.filter((item) => {
    // 1. Text keyword search (Name and Description)
    if (query.trim() !== '') {
      const text = `${item.name} ${item.description || ''}`.toLowerCase()
      if (!text.includes(query.toLowerCase())) return false
    }

    // 2. Type filter
    if (selectedType !== 'all' && item.type !== selectedType) return false

    // 3. Status filter (exact match when a specific status is selected)
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false

    // 4. Assignee filter
    if (selectedAssignee !== 'all' && item.assignee_id !== selectedAssignee) return false

    // 5. Date range filter
    if (startDate) {
      if (item.start_date && item.start_date < startDate) return false
    }
    if (endDate) {
      if (item.end_date && item.end_date > endDate) return false
    }

    return true
  })

  const getStatusLabel = (status: string, type: string) => {
    if (type === 'task') return t(`task.status.${status}`, status)
    if (type === 'risk') return t(`risk.status.${status}`, status)
    return t(`issue.status.${status}`, status)
  }

  const getStatusBadge = (status: string) => {
    if (['completed', 'resolved', 'closed', 'addressed', 'mitigated'].includes(status)) return 'badge-completed'
    if (['in_progress', 'active'].includes(status)) return 'badge-active'
    return 'badge-pending'
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('search.title')}</h1>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {/* Main search input */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            style={{ fontSize: '15px', padding: '10px' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {/* Type Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '12px', marginBottom: '4px' }}>{t('common.type')}</label>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="all">{t('search.types.all')}</option>
                <option value="task">{t('search.types.task')}</option>
                <option value="risk">{t('search.types.risk')}</option>
                <option value="issue">{t('search.types.issue')}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '12px', marginBottom: '4px' }}>{t('common.status')}</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="all">{t('search.status.all')}</option>
                <option value="unaddressed">{t('task.status.unaddressed')}</option>
                <option value="in_progress">{t('task.status.in_progress')}</option>
                <option value="awaiting_approval">{t('task.status.awaiting_approval')}</option>
                <option value="completed">{t('issue.status.completed')}</option>
                <option value="on_hold">{t('task.status.on_hold')}</option>
                <option value="suspended">{t('task.status.suspended')}</option>
                <option value="rejected">{t('issue.status.rejected')}</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '12px', marginBottom: '4px' }}>{t('common.assignee')}</label>
              <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)}>
                <option value="all">{t('search.assignee.all')}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Date range filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '12px', marginBottom: '4px' }}>{t('common.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '4px 8px', fontSize: '13px' }} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '12px', marginBottom: '4px' }}>{t('common.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '4px 8px', fontSize: '13px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div style={{ overflowX: 'auto' }}>
        <table className="responsive-table">
          <thead>
            <tr>
              <th>{t('common.type')}</th>
              <th>{t('common.name')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.assignee')}</th>
              <th>{t('common.period')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>
                  {t('search.noResults')}
                </td>
              </tr>
            ) : filteredResults.map((item) => (
              <tr key={`${item.type}-${item.id}`} onClick={() => navigate(item.link)} style={{ cursor: 'pointer' }} className="hover-row">
                <td data-label={t('common.type')}>
                  <span className={`badge ${item.type === 'task' ? 'badge-active' : item.type === 'risk' ? 'badge-danger' : 'badge-pending'}`} style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                    {t(`search.types.${item.type}`)}
                  </span>
                </td>
                <td data-label={t('common.name')}>
                  <strong>{item.name}</strong>
                  {item.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{item.description}</div>}
                </td>
                <td data-label={t('common.status')}>
                  <span className={`badge ${getStatusBadge(item.status)}`}>{getStatusLabel(item.status, item.type)}</span>
                </td>
                <td data-label={t('common.assignee')}>{item.assignee_id ? (userMap[item.assignee_id] || item.assignee_id) : '-'}</td>
                <td data-label={t('common.period')}>
                  {item.start_date || item.end_date ? (
                    `${item.start_date || '...'} ~ ${item.end_date || '...'}`
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
