import { Button, FormGroup, InputGroup, Intent, Spinner, SpinnerSize } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React, { FC, useState, useRef, useEffect } from 'react' // added useEffect
import { useHistory } from 'react-router-dom'

interface Props { }

export const ChangePasswordForm: FC<Props> = props => {
  const [email, setEmail] = useState('')
  const [isEmailValid, setEmailValid] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)

  const [otp, setOtp] = useState(['', '', '', '']) // Array for 4 OTP boxes
  const [receivedOtp, setReceivedOtp] = useState('')
  const [isOtpValid, setOtpValid] = useState(false)
  const [otpChecked, setOtpChecked] = useState(false)
  const [otpSentMessage, setOtpSentMessage] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0) // New state for timer

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passSuccess, setPassSuccess] = useState(false)
  const [passChecked, setPassChecked] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const history = useHistory()

  const otpRefs = useRef<HTMLInputElement[]>([]) // Refs for OTP input fields

  const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

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
      await checkEmail(false)
    } else if (!isOtpValid) {
      await validateOtp()
    } else {
      await updatePass()
    }
  }

  const checkEmail = async (resend: boolean) => {
    setIsLoading(true)
    setEmailChecked(false)
    try {
      const result = await fetch(`${API_URL}/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          from: 'forgot-pass',
        }),
      })

      const data = await result.json()
      if (result.status === 200) { // Registered email
        setEmailValid(true)
        setEmailChecked(true)
        setReceivedOtp(data.otp) // Capture OTP from response
        const message = resend ? `Your OTP has been resent to ${email}` : `Your OTP has been sent to ${email}`
        setOtpSentMessage(message)
        setResendCountdown(30) // Start the 30 sec timer
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
      const enteredOtp = otp.join('') // Combine the 4 OTP boxes into a single string
      if (enteredOtp === receivedOtp.toString()) {
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
      const result = await fetch(`${API_URL}/forgot-pass`, {
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

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)

      // Automatically focus the next input field
      if (value && index < otpRefs.current.length - 1) {
        otpRefs.current[index + 1]?.focus()
      }

      // If clearing, focus back to the current or previous input field
      if (!value && index > 0) {
        otpRefs.current[index - 1]?.focus()
      }
    }
  }

  // useEffect to handle countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timerId = setTimeout(() => {
        setResendCountdown(resendCountdown - 1)
      }, 1000)
      return () => clearTimeout(timerId)
    }
  }, [resendCountdown])

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
            <div style={{ marginBottom: '10px', color: 'green' }}>{otpSentMessage}</div>
            <FormGroup label={'OTP'}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {otp.map((value, index) => (
                  <InputGroup
                    key={index}
                    value={value}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    type="text"
                    maxLength={1}
                    style={{ width: '50px', textAlign: 'center' }}
                    disabled={isLoading}
                    inputRef={el => (otpRefs.current[index] = el!)} // Assign ref to each input
                  />
                ))}
              </div>
              {otpChecked && !isOtpValid && (
                <div className="error-message" style={{ color: 'red', marginTop: '5px' }}>
                  Invalid OTP
                </div>
              )}
              {resendCountdown > 0 && ( // timer display
                <div style={{ marginTop: '5px' }}>
                  Resend OTP available in <strong>{resendCountdown}</strong> second{resendCountdown !== 1 ? 's' : ''}
                </div>
              )}
            </FormGroup>

            <Button
              tabIndex={4}
              type="submit"
              text="Validate OTP"
              id="btn-validate-otp"
              disabled={isLoading || otp.some(value => value === '')}
              intent={Intent.WARNING}
              rightIcon={isLoading ? <Spinner size={SpinnerSize.SMALL} /> : null}
            />

            <Button
              tabIndex={5}
              text="Resend OTP"
              id="btn-resend-otp"
              onClick={() => checkEmail(true)}
              disabled={isLoading || resendCountdown > 0} // disable while timer is active
              intent={Intent.PRIMARY}
              style={{ marginTop: '10px' }}
            />
          </>
        )}

        {isOtpValid && (
          <>
            <FormGroup label={lang.tr('admin.newPassword')}>
              <InputGroup
                tabIndex={6}
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
                tabIndex={7}
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
              tabIndex={8}
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
