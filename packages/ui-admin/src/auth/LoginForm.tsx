import { Button, FormGroup, InputGroup, Intent, Spinner, SpinnerSize, Icon } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React, { FC, useState } from 'react'
import { Link } from 'react-router-dom'
import '../app/Wizard/style.css'

interface Props {
  onLogin: (email, password) => Promise<void>
}

export const LoginForm: FC<Props> = props => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    await props.onLogin(email.trim(), password.trim()) // Trim email here
    setLoading(false)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <form onSubmit={onSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className='input-container' style={{ marginBottom: '20px' }}>
        <Icon icon="envelope" className="input-icon" style={{ marginRight: '10px' }} />
        <input
          className='custom-input'
          tabIndex={1}
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          id="email-login"
          autoFocus={true}
          disabled={loading}
        />
      </div>

      <div className='input-container' style={{ marginBottom: '15px' }}>
        <Icon icon="lock" className="input-icon" style={{ marginRight: '10px' }} />
        <input
          className='custom-input'
          tabIndex={2}
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          id="password-login"
          disabled={loading}
        />
        <Icon
          icon={showPassword ? 'eye-off' : 'eye-open'}
          className="eye-icon"
          onClick={togglePasswordVisibility}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div style={{ width: '80%', display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <Link
          to="/changePassword"
          onClick={e => loading && e.preventDefault()}
          style={{
            pointerEvents: loading ? 'none' : 'auto',
            color: loading ? 'gray' : '#04A9E1',
            textDecoration: loading ? 'none' : 'underline',
            fontSize: '13px',
            fontFamily: 'Lato, sans-serif'
          }}
        >
          Forgot password?
        </Link>
      </div>

      <div className='button-container' style={{ width: '80%' }}>
        <button
          tabIndex={3}
          type="submit"
          id="btn-signin"
          disabled={!email || !password || loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          {loading && <div className="loader" style={{ width: '16px', height: '16px', margin: '0' }}></div>}
          Sign In
        </button>
      </div>

      <div style={{
        width: '80%',
        textAlign: 'center',
        marginTop: '15px',
        marginBottom: '15px',
        fontFamily: 'Lato, sans-serif',
        fontSize: '13px',
        color: '#666'
      }}>
        or
      </div>

      <div className='button-container' style={{ width: '80%' }}>
        <a
          href="http://localhost:7001/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => loading && e.preventDefault()}
          style={{
            pointerEvents: loading ? 'none' : 'auto',
            textDecoration: 'none',
            width: '100%'
          }}
        >
          <button
            type="button"
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              backgroundColor: loading ? '#ccc' : 'transparent',
              border: `1px solid ${loading ? '#ccc' : '#05a8e1'}`,
              color: loading ? '#666' : '#05a8e1',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Create Account
          </button>
        </a>
      </div>
    </form>
  )
}
