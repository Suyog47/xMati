import { Button, FormGroup, InputGroup, Intent, Spinner, SpinnerSize, Icon } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React, { FC, useState, useRef, useEffect } from 'react' // added useEffect
import { useHistory } from 'react-router-dom'
import '../app/Wizard/style.css'
import packageJson from '../../../../package.json'

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

  const CURRENT_VERSION = packageJson.version
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
          'X-App-Version': CURRENT_VERSION
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
      } else if (result.status === 400) { // Unregistered email
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
          'X-App-Version': CURRENT_VERSION
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
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <form onSubmit={onSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className='input-container' style={{ marginBottom: '15px' }}>
          <Icon icon="envelope" className="input-icon" style={{ marginRight: '10px' }} />
          <input
            className='custom-input'
            tabIndex={1}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            name="email"
            id="email"
            disabled={isLoading || isEmailValid}
            autoFocus={true}
          />
        </div>
        {emailChecked && !isEmailValid && (
          <div className="error" style={{ marginBottom: '10px' }}>
            This email is not registered
          </div>
        )}

        {!isEmailValid && (
          <div className='button-container' style={{ width: '80%' }}>
            <button
              tabIndex={2}
              type="submit"
              id="btn-check-email"
              disabled={isLoading || !email}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {isLoading && <div className="loader" style={{ width: '16px', height: '16px', margin: '0' }}></div>}
              Check Email
            </button>
          </div>
        )}

        {isEmailValid && !isOtpValid && (
          <>
            <div className='stepSubtitle' style={{ color: 'green', marginBottom: '20px', textAlign: 'center' }}>{otpSentMessage}</div>
            <div className='stepSubtitle' style={{ marginBottom: '10px' }}>Enter the 4-digit OTP</div>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              {otp.map((value, index) => (
                <input
                  key={index}
                  className='custom-input'
                  value={value}
                  onChange={e => handleOtpChange(index, e.target.value)}
                  type="text"
                  maxLength={1}
                  style={{
                    width: '50px',
                    height: '50px',
                    textAlign: 'center',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    border: '1px solid #f2f2f2',
                    backgroundColor: '#f9f9f9'
                  }}
                  disabled={isLoading}
                  ref={el => (otpRefs.current[index] = el!)}
                />
              ))}
            </div>
            {otpChecked && !isOtpValid && (
              <div className="error" style={{ marginBottom: '10px' }}>
                Invalid OTP
              </div>
            )}
            {resendCountdown > 0 && (
              <div className='stepSubtitleSmall' style={{ marginBottom: '20px', textAlign: 'center' }}>
                Resend OTP available in <strong>{resendCountdown}</strong> second{resendCountdown !== 1 ? 's' : ''}
              </div>
            )}

            <div className='button-container' style={{ width: '80%', marginBottom: '10px' }}>
              <button
                tabIndex={4}
                type="submit"
                id="btn-validate-otp"
                disabled={isLoading || otp.some(value => value === '')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                {isLoading && <div className="loader" style={{ width: '16px', height: '16px', margin: '0' }}></div>}
                Validate OTP
              </button>
            </div>

            <div className='button-container' style={{ width: '80%' }}>
              <button
                tabIndex={5}
                type="button"
                id="btn-resend-otp"
                onClick={() => checkEmail(true)}
                disabled={isLoading || resendCountdown > 0}
                style={{
                  width: '100%',
                  backgroundColor: resendCountdown > 0 ? '#ccc' : '#6c757d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                Resend OTP
              </button>
            </div>
          </>
        )}

        {isOtpValid && (
          <>
            <div className='stepSubtitle' style={{ marginBottom: '20px' }}>Create New Password</div>
            <div className='input-container'>
              <Icon icon="lock" className="input-icon" style={{ marginRight: '10px' }} />
              <input
                className='custom-input'
                tabIndex={6}
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => handlePasswordChange(e.target.value)}
                name="newPassword"
                id="newPassword"
                autoFocus
                disabled={isLoading}
              />
            </div>
            {passwordError && (
              <div className="error" style={{ marginBottom: '10px' }}>
                {passwordError}
              </div>
            )}

            <div className='input-container'>
              <Icon icon="lock" className="input-icon" style={{ marginRight: '10px' }} />
              <input
                className='custom-input'
                tabIndex={7}
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                name="confirmPassword"
                id="confirmPassword"
                disabled={isLoading}
              />
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div className="error" style={{ marginBottom: '10px' }}>
                Passwords don't match
              </div>
            )}

            {!passSuccess && passChecked && (
              <div className="error" style={{ marginBottom: '10px' }}>
                Password failed to update
              </div>
            )}

            <div className='button-container' style={{ width: '80%' }}>
              <button
                tabIndex={8}
                type="submit"
                id="btn-change-pass"
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || !!passwordError}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                {isLoading && <div className="loader" style={{ width: '16px', height: '16px', margin: '0' }}></div>}
                Update Password
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
