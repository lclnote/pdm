import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/projects')
    } catch {
      setError(t('auth.loginFailed'))
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{t('auth.signIn')}</button>
        </form>
      </div>
    </div>
  )
}
