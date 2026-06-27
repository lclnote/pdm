import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
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
        <h1>Risks</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Risk</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Impact</th>
            <th>Probability</th>
            <th>Priority</th>
            <th>Status</th>
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
        <Modal title="Add Risk" onClose={() => setShowCreate(false)}>
          <form onSubmit={createRisk}>
            <div className="form-group">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Impact</label>
              <select value={impact} onChange={(e) => setImpact(e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="form-group">
              <label>Probability</label>
              <select value={probability} onChange={(e) => setProbability(e.target.value)}>
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
