import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Spinner } from '@blueprintjs/core'
import { lang, toast } from 'botpress/shared'
import { UserProfile } from 'common/typings'
import React, { FC, useState } from 'react'
import api from '~/app/api'
import { PasswordStrengthMeter } from '~/auth/PasswordStrengthMeter/PasswordStrengthMeter'
import packageJson from '../../../../package.json'

interface Props {
  isOpen: boolean
  profile: UserProfile
  toggle: () => void
}

const UpdatePassword: FC<Props> = props => {
  const [password, setPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const token = sessionStorage.getItem('token') || ''

  const loaderOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 99999, // Ensure it overlays the dialog
  }

  const loaderTextStyle: React.CSSProperties = {
    marginTop: 24,
    fontSize: 20,
    fontWeight: 500,
    color: 'black'
  }

  const submit = async event => {
    event.preventDefault()

    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    if (savedFormData.password !== password) {
      toast.failure('Wrong current password')
      return
    }

    setIsLoading(true)

    const updatedFormData = { ...savedFormData, password: newPassword }
    const res = await s3Call(updatedFormData)
    setIsLoading(false)

    if (!res.success) {
      toast.failure(res.msg)
      return
    }

    props.toggle()
    toast.success(res.msg)

    localStorage.setItem('formData', JSON.stringify(updatedFormData))
  }

  const CURRENT_VERSION = packageJson.version
  const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

  const s3Call = async (data) => {
    try {
      const result = await fetch(`${API_URL}/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-App-Version': CURRENT_VERSION
        },
        body: JSON.stringify({
          data,
        }),
      })

      return result.json()
    } catch (error) {
      return { success: false, msg: 'Error uploading credentials to S3' }
    }
  }

  const clear = () => {
    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <>
      <Dialog
        title={lang.tr('admin.changeYourPassword')}
        icon="key"
        isOpen={props.isOpen}
        onClose={props.toggle}
        onClosed={clear}
        transitionDuration={0}
        canOutsideClickClose={false}
      >
        <form onSubmit={submit}>
          <div className={Classes.DIALOG_BODY}>
            <FormGroup label={lang.tr('admin.currentPassword')}>
              <InputGroup
                id="input-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                tabIndex={1}
                autoFocus={true}
              />
            </FormGroup>

            <FormGroup label={lang.tr('admin.newPassword')}>
              <InputGroup
                id="input-newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                tabIndex={2}
              />
            </FormGroup>

            <FormGroup label={lang.tr('admin.confirmPassword')}>
              <InputGroup
                id="input-confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                tabIndex={3}
              />
            </FormGroup>
            <PasswordStrengthMeter pwdCandidate={newPassword} />
          </div>

          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                id="btn-submit-update-password"
                type="submit"
                text={lang.tr('save')}
                tabIndex={4}
                intent={Intent.PRIMARY}
                disabled={!password || !newPassword || newPassword !== confirmPassword}
              />
            </div>
          </div>
        </form>
        {isLoading && (
          <div style={loaderOverlayStyle}>
            <Spinner size={50} />
            <div style={loaderTextStyle}>Your password is being updated</div>
          </div>
        )}
      </Dialog>
    </>
  )
}

export default UpdatePassword
