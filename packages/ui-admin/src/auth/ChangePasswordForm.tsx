import { Button, FormGroup, InputGroup, Intent } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React, { FC, useState } from 'react'
import { PasswordStrengthMeter } from './PasswordStrengthMeter/PasswordStrengthMeter'
import { useHistory } from 'react-router-dom'

interface Props {
  // email?: string
  // onChangePassword: (newPassword, confirmPassword) => void
}

export const ChangePasswordForm: FC<Props> = props => {
  const [email, setEmail] = useState('')
  const [isEmailValid, setEmailValid] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passSuccess, setPassSuccess] = useState(false)
  const [passChecked, setPassChecked] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const history = useHistory()


  const onSubmit = async e => {
    e.preventDefault()
    await updatePass()
  }

  const updatePass = async () => {
    setIsLoading(true)
    setPassChecked(false)
    try {
      let result = await fetch('http://138.197.2.118:8000/forgot-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: newPassword,
        }),
      })

      if (result.status === 200) {
        setPassSuccess(true)
        setPassChecked(true)
        history.push({
          pathname: '/login'
        })
      } else {
        setPassSuccess(false)
        setPassChecked(true)
      }
    } catch (error) {
      setPassSuccess(false)
      return 'Error uploading credentials to S3'
    } finally {
      setIsLoading(false)
    }
  }

  const checkEmail = async e => {
    e.preventDefault()
    setIsLoading(true)
    setEmailChecked(false)
    try {
      const result = await fetch('http://138.197.2.118:8000/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
        }),
      })

      if (result.status === 400) {    // 400 means email already registered
        setEmailValid(true)
        setEmailChecked(true)
      } else if (result.status === 200) {     // 200 means email is available to register
        setEmailValid(false)
        setEmailChecked(true)
      } else {       // 500 means something went wrong
        setEmailValid(false)
        setEmailChecked(true)
      }
    } catch (error) {
      setEmailValid(false)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="form-container" style={{ position: 'relative' }}>
      <form onSubmit={isEmailValid ? onSubmit : checkEmail}>

        <FormGroup label={'Email'}>
          <InputGroup
            tabIndex={1}
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            name="email"
            id="email"
            disabled={isLoading || isEmailValid}
            autoFocus={true}
          />
          {emailChecked && !isEmailValid && (
            <div className="error-message" style={{ color: 'red', marginTop: '5px' }}>
              This email is not registered
            </div>
          )}
        </FormGroup>

        <Button
          tabIndex={2}
          type="submit"
          text='Check Email'
          id="btn-check-email"
          disabled={isLoading || isEmailValid || !email}
          intent={Intent.WARNING}
        />
        <br /><br />

        {isEmailValid && (
          <>
            <FormGroup label={lang.tr('admin.newPassword')}>
              <InputGroup
                tabIndex={3}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                type="password"
                name="newPassword"
                id="newPassword"
                autoFocus
                disabled={isLoading}
              />
            </FormGroup>

            <FormGroup label={lang.tr('admin.confirmPassword')}>
              <InputGroup
                tabIndex={4}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                disabled={isLoading}
              />
              {!passSuccess && passChecked && (
                <div className="error-message" style={{ color: 'red', marginTop: '5px' }}>
                  Password failed to update
                </div>
              )}
            </FormGroup>

            <PasswordStrengthMeter pwdCandidate={newPassword} />

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div className="error-message" style={{ color: 'red' }}>
                Passwords don't match
              </div>
            )}

            <Button
              tabIndex={5}
              type="submit"
              text={lang.tr('admin.change')}
              id="btn-change-pass"
              disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
              intent={Intent.WARNING}
            />
          </>
        )}
      </form>
    </div>
  )
}
