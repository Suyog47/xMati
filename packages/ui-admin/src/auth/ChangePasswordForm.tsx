import { Button, FormGroup, InputGroup, Intent, Spinner, SpinnerSize } from '@blueprintjs/core'
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
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const history = useHistory()


  const validatePassword = (password: string) => {
    const minLength = 8
    const maxLength = 16
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (password.length < minLength) {
      return `Password must be at least ${minLength} characters long`
    }
    if (password.length > maxLength) {
      return `Password must not be more than ${maxLength} characters`
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!hasNumber) {
      return 'Password must contain at least one number'
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character'
    }
    return null
  }

  const handlePasswordChange = (password: string) => {
    setNewPassword(password)
    const error = validatePassword(password)
    setPasswordError(error)
  }

  const onSubmit = async e => {
    e.preventDefault()
    await updatePass()
  }

  const updatePass = async () => {
    setIsLoading(true)
    setPassChecked(false)
    try {
      let result = await fetch('https://www.app.xmati.ai/apis/forgot-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: newPassword.trim(),
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
      const result = await fetch('https://www.app.xmati.ai/apis/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
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
          rightIcon={isLoading ? <Spinner size={SpinnerSize.SMALL} /> : null}
        />
        <br /><br />

        {isEmailValid && (
          <>
            <FormGroup label={lang.tr('admin.newPassword')}>
              <InputGroup
                tabIndex={3}
                value={newPassword}
                onChange={e => handlePasswordChange(e.target.value)}
                type="password"
                name="newPassword"
                id="newPassword"
                autoFocus
                disabled={isLoading}
              />
              {passwordError && (
                <div className="error-message" style={{ color: 'red', marginTop: '5px' }}>
                  {passwordError}
                </div>
              )}
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

            </FormGroup>

            {/* <PasswordStrengthMeter pwdCandidate={newPassword} /> */}
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div className="error-message" style={{ color: 'red' }}>
                Passwords don't match
              </div>
            )}

            {!passSuccess && passChecked && (
              <div className="error-message" style={{ color: 'red', marginTop: '5px' }}>
                Password failed to update
              </div>
            )}

            <Button
              tabIndex={5}
              type="submit"
              text={lang.tr('admin.change')}
              id="btn-change-pass"
              disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || !!passwordError}
              intent={Intent.WARNING}
              rightIcon={isLoading ? <Spinner size={SpinnerSize.SMALL} /> : null}
            />
          </>
        )}
      </form>
    </div>
  )
}
