import { Button, FormGroup, InputGroup, Intent } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React, { FC, useState } from 'react'
import { PasswordStrengthMeter } from './PasswordStrengthMeter/PasswordStrengthMeter'

interface Props {
  email?: string
  onChangePassword: (newPassword, confirmPassword) => void
}

export const ChangePasswordForm: FC<Props> = props => {
  const [email, setEmail] = useState('')
  const [isEmailValid, setEmailValid] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)


  const onSubmit = e => {
    e.preventDefault()
    //props.onChangePassword(newPassword, confirmPassword)
    console.log(newPassword, ' ', confirmPassword)
  }

  const checkEmail = async e => {
    e.preventDefault()
    setIsLoading(true)
    setEmailChecked(false)
    console.log(isLoading)
    try {
      const result = await fetch('http://localhost:8000/check-user', {
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
        {/* {props.email && (
        <FormGroup label={lang.tr('email')}>
          <InputGroup tabIndex={-1} value={props.email} disabled={true} type="text" id="email-change-password" />
        </FormGroup>
      )} */}

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
