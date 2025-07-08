import { Button, FormGroup, InputGroup, Intent, Spinner, SpinnerSize } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React, { FC, useState } from 'react'
import { useHistory } from 'react-router-dom'

interface Props { }

export const ChangePasswordForm: FC<Props> = props => {
  const [email, setEmail] = useState('')
  const [isEmailValid, setEmailValid] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)

  const [otp, setOtp] = useState('')
  const [receivedOtp, setReceivedOtp] = useState('')
  const [isOtpValid, setOtpValid] = useState(false)
  const [otpChecked, setOtpChecked] = useState(false)

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
    if (!isEmailValid) {
      await checkEmail()
    } else if (!isOtpValid) {
      await validateOtp()
    } else {
      await updatePass()
    }
  }

  const checkEmail = async () => {
    setIsLoading(true)
    setEmailChecked(false)
    try {
      const result = await fetch('http://localhost:8000/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      })

      const data = await result.json()
      if (result.status === 200) {     // Registered email
        setEmailValid(true)
        setEmailChecked(true)
        console.log(data.otp)
        setReceivedOtp(data.otp) // Capture OTP from response
      } else { // Unregistered email
        setEmailValid(false)
        setEmailChecked(true)
      }
    } catch (error) {
      setEmailValid(false)
    } finally {
      setIsLoading(false)
    }
  }

  const validateOtp = async () => {
    setIsLoading(true)
    setOtpChecked(false)
    try {
      if (otp === receivedOtp.toString()) {
        setOtpValid(true)
        setOtpChecked(true)
      } else {
        setOtpValid(false)
        setOtpChecked(true)
      }
    } catch (error) {
      setOtpValid(false)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePass = async () => {
    setIsLoading(true)
    setPassChecked(false)
    try {
      const result = await fetch('http://localhost:8000/forgot-pass', {
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
          pathname: '/login',
        })
      } else {
        setPassSuccess(false)
        setPassChecked(true)
      }
    } catch (error) {
      setPassSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="form-container" style={{ position: 'relative' }}>
      <form onSubmit={onSubmit}>
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

        {!isEmailValid && (
          <Button
            tabIndex={2}
            type="submit"
            text="Check Email"
            id="btn-check-email"
            disabled={isLoading || !email}
            intent={Intent.WARNING}
            rightIcon={isLoading ? <Spinner size={SpinnerSize.SMALL} /> : null}
          />
        )}

        {isEmailValid && !isOtpValid && (
          <>
            <FormGroup label={'OTP'}>
              <InputGroup
                tabIndex={3}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                type="text"
                name="otp"
                id="otp"
                disabled={isLoading}
              />
              {otpChecked && !isOtpValid && (
                <div className="error-message" style={{ color: 'red', marginTop: '5px' }}>
                  Invalid OTP
                </div>
              )}
            </FormGroup>

            <Button
              tabIndex={4}
              type="submit"
              text="Validate OTP"
              id="btn-validate-otp"
              disabled={isLoading || !otp}
              intent={Intent.WARNING}
              rightIcon={isLoading ? <Spinner size={SpinnerSize.SMALL} /> : null}
            />
          </>
        )}

        {isOtpValid && (
          <>
            <FormGroup label={lang.tr('admin.newPassword')}>
              <InputGroup
                tabIndex={5}
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
                tabIndex={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                disabled={isLoading}
              />
            </FormGroup>

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
              tabIndex={7}
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
