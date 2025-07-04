import { Button, FormGroup, InputGroup, Intent, Spinner, SpinnerSize } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React, { FC, useState } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  onLogin: (email, password) => Promise<void>
}

export const LoginForm: FC<Props> = props => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    await props.onLogin(email.trim(), password.trim()) // Trim email here
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmit}>
      <FormGroup label={lang.tr('email')}>
        <InputGroup
          tabIndex={1}
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="text"
          id="email-login"
          autoFocus={true}
        />
      </FormGroup>

      <FormGroup label={lang.tr('admin.password')}>
        <InputGroup
          tabIndex={2}
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          id="password-login"
        />
      </FormGroup>

      <Link
        to="/changePassword"
        onClick={e => loading && e.preventDefault()} // Prevent navigation if loading is true
        style={{
          pointerEvents: loading ? 'none' : 'auto', // Disable interaction when loading
          color: loading ? 'gray' : '#04A9E1', // Change color to indicate disabled state
          textDecoration: loading ? 'none' : 'underline', // Optional: visually indicate disabled state
        }}
      >
        Forgot password?
      </Link>

      <Button
        tabIndex={3}
        type="submit"
        id="btn-signin"
        text={lang.tr('admin.signIn')}
        disabled={!email || !password || loading}
        intent={Intent.WARNING}
        rightIcon={loading ? <Spinner size={SpinnerSize.SMALL} /> : null}
      /> <br />

      <p>
        Don't have an account?
        <Link to="/botCreation"
          onClick={e => loading && e.preventDefault()} // Prevent navigation if loading is true
          style={{
            pointerEvents: loading ? 'none' : 'auto', // Disable interaction when loading
            color: loading ? 'gray' : '#04A9E1', // Change color to indicate disabled state
            textDecoration: loading ? 'none' : 'underline', // Optional: visually indicate disabled state
          }}> Register</Link>
      </p>
    </form>
  )
}
