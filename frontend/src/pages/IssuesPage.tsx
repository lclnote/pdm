import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
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
        <h1>Issues</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Issue</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assignee</th>
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
        <Modal title="Add Issue" onClose={() => setShowCreate(false)}>
          <form onSubmit={createIssue}>
            <div className="form-group">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="bug">Bug</option>
                <option value="specification_change">Spec Change</option>
                <option value="request">Request</option>
                <option value="obstacle">Obstacle</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
