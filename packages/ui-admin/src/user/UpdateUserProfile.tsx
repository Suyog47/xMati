import { Button, Classes, Dialog, FormGroup, InputGroup, Intent } from '@blueprintjs/core'
import { FormFields, lang, toast } from 'botpress/shared'
import { UserProfile } from 'common/typings'
import React, { FC, useEffect, useState } from 'react'
import api from '~/app/api'

interface Props {
  isOpen: boolean
  profile: UserProfile
  toggle: () => void
  fetchProfile: () => void
}

const UpdateUserProfile: FC<Props> = props => {
  const [fullName, setFullname] = useState<string>('')
  // const [lastname, setLastname] = useState<string>()
  // const [picture_url, setPictureUrl] = useState<string>()

  useEffect(() => {
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    if (savedFormData.fullName) {
      setFullname(savedFormData.fullName)
    } else {
      setFullname('') // fallback
    }
  }, [props.isOpen])

  const submit = async event => {
    event.preventDefault()
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')

    try {
      const updatedFormData = { ...savedFormData, fullName }
      let res = await s3Call(updatedFormData)
      if (!res.success) {
        toast.failure(res.msg)
        return
      }

      props.toggle()
      toast.success(res.msg)

      localStorage.setItem('formData', JSON.stringify(updatedFormData))

      let data = JSON.parse(localStorage.getItem('formData') || '{}')
    } catch (err) {
      toast.failure(lang.tr('admin.errorUpdatingProfile', { msg: err.message }))
    }
  }

  const s3Call = async (data) => {
    try {
      const result = await fetch('http://localhost:8000/user-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          from: 'updateProfile'
        }),
      })

      return result.json()
    } catch (error) {
      return { success: false, msg: 'Error uploading credentials to S3' }
    }
  }

  // const uploadFieldChange = (url: string | undefined) => {
  //   setPictureUrl(url)
  // }

  const v1Client = api.getSecured({ useV1: true })

  return (
    <Dialog
      title={lang.tr('admin.updateYourProfile')}
      icon="user"
      isOpen={props.isOpen}
      onClose={props.toggle}
      transitionDuration={0}
      canOutsideClickClose={false}
    >
      <form onSubmit={submit}>
        <div className={Classes.DIALOG_BODY}>
          <FormGroup label={'Fullname'} labelFor="input-fullname">
            <InputGroup
              id="input-fullname"
              value={fullName}
              onChange={e => setFullname(e.target.value)}
              tabIndex={1}
              autoFocus={true}
            />
          </FormGroup>

          {/* <FormGroup label={lang.tr('admin.lastName')} labelFor="input-lastname">
            <InputGroup id="input-lastname" value={lastname} onChange={e => setLastname(e.target.value)} tabIndex={2} />
          </FormGroup> */}

          {/* <FormGroup label={lang.tr('admin.profilePicture')}>
            <FormFields.Upload axios={v1Client} onChange={uploadFieldChange} value={picture_url} type="image" />
          </FormGroup> */}
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              id="btn-submit-update-user"
              type="submit"
              text={lang.tr('save')}
              tabIndex={3}
              intent={Intent.PRIMARY}
              disabled={!fullName}
            />
          </div>
        </div>
      </form>
    </Dialog>
  )
}

export default UpdateUserProfile
