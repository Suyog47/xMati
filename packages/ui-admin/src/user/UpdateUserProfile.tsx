import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Spinner } from '@blueprintjs/core'
import { FormFields, lang, toast } from 'botpress/shared'
import { UserProfile } from 'common/typings'
import React, { FC, useEffect, useState } from 'react'
import api from '~/app/api'
import packageJson from '../../../../package.json'

interface Props {
  isOpen: boolean
  profile: UserProfile
  toggle: () => void
  fetchProfile: () => void
}

const countryOptions = [
  { code: '+1', name: 'United States' },
  { code: '+91', name: 'India' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+61', name: 'Australia' },
  { code: '+81', name: 'Japan' },
  { code: '+49', name: 'Germany' },
  { code: '+33', name: 'France' },
  { code: '+86', name: 'China' },
  { code: '+7', name: 'Russia' },
  { code: '+39', name: 'Italy' },
  { code: '+34', name: 'Spain' },
  { code: '+55', name: 'Brazil' },
  { code: '+27', name: 'South Africa' },
  { code: '+82', name: 'South Korea' },
  { code: '+62', name: 'Indonesia' },
  { code: '+234', name: 'Nigeria' },
  { code: '+20', name: 'Egypt' },
  { code: '+63', name: 'Philippines' },
  { code: '+90', name: 'Turkey' },
  { code: '+966', name: 'Saudi Arabia' }
]

const loaderOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(255,255,255,0.85)',
  zIndex: 99999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
}

const loaderTextStyle: React.CSSProperties = {
  marginTop: 24,
  fontSize: 20,
  fontWeight: 500,
  color: 'black'
}

const CURRENT_VERSION = packageJson.version
const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

const UpdateUserProfile: FC<Props> = props => {
  const [fullName, setFullname] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [industryType, setIndustryType] = useState<string>('')
  const [organisationName, setOrganisationName] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [subIndustryType, setSubIndustryType] = useState<string>('')
  const [countryCode, setCountryCode] = useState<string>(countryOptions[0].code)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const token = JSON.parse(localStorage.getItem('token') || '{}')
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')

  useEffect(() => {
    setFullname(savedFormData.fullName || '')
    setEmail(savedFormData.email || '')
    setIndustryType(savedFormData.industryType || '')
    setOrganisationName(savedFormData.organisationName || '')
    setPhoneNumber(savedFormData.phoneNumber || '')
    setSubIndustryType(savedFormData.subIndustryType || '')
    setCountryCode(savedFormData.countryCode || countryOptions[0].code)
    setErrors({})
  }, [props.isOpen])

  const validate = (formData: any) => {
    const newErrors: { [key: string]: string } = {}

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required'
    } else if (formData.fullName.trim().length > 20) {
      newErrors.fullName = 'Full Name cannot exceed 20 characters'
    }

    // Phone Number validation
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone Number is required'
    } else {
      const phoneRegex = /^[0-9]{7,15}$/
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        newErrors.phoneNumber = 'Please enter valid phone number with no special characters or spaces'
      }
    }

    // Organisation Name validation
    if (!formData.organisationName.trim()) {
      newErrors.organisationName = 'Organisation Name is required'
    } else if (formData.organisationName.trim().length > 50) {
      newErrors.organisationName = 'Organization Name cannot exceed 50 characters'
    }

    return newErrors
  }

  const submit = async event => {
    event.preventDefault()
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    // Trim all fields before validation and update
    const formData = {
      ...savedFormData,
      fullName: fullName.trim(),
      organisationName: organisationName.trim(),
      phoneNumber: phoneNumber.trim(),
      countryCode: countryCode.trim()
    }

    const validationErrors = validate(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsLoading(true)
    try {
      const res = await s3Call(formData)
      if (!res.success) {
        toast.failure(res.msg)
        setIsLoading(false)
        return
      }

      props.toggle()
      toast.success(res.msg)
      localStorage.setItem('formData', JSON.stringify(formData))
      setTimeout(() => {
        window.location.reload()
      }, 200)
    } catch (err) {
      toast.failure(lang.tr('admin.errorUpdatingProfile', { msg: err.message }))
    } finally {
      setIsLoading(false)
    }
  }

  const s3Call = async (data) => {
    try {
      const result = await fetch(`${API_URL}/update-profile`, {
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

  return (
    <>
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
            <FormGroup
              label={'Full Name'}
              labelFor="input-fullname"
              intent={errors.fullName ? Intent.DANGER : Intent.NONE}
              helperText={errors.fullName}
            >
              <InputGroup
                id="input-fullname"
                value={fullName}
                onChange={e => setFullname(e.target.value)}
                tabIndex={1}
                autoFocus={true}
                disabled={isLoading}
                intent={errors.fullName ? Intent.DANGER : Intent.NONE}
              />
            </FormGroup>
            <FormGroup label={'Email'} labelFor="input-email">
              <InputGroup
                id="input-email"
                value={email}
                disabled
                tabIndex={2}
              />
            </FormGroup>

            <FormGroup
              label={'Organisation Name'}
              labelFor="input-organisation-name"
              intent={errors.organisationName ? Intent.DANGER : Intent.NONE}
              helperText={errors.organisationName}
            >
              <InputGroup
                id="input-organisation-name"
                value={organisationName}
                onChange={e => setOrganisationName(e.target.value)}
                tabIndex={4}
                disabled={isLoading}
                intent={errors.organisationName ? Intent.DANGER : Intent.NONE}
              />
            </FormGroup>

            <FormGroup
              label={'Phone Number'}
              labelFor="input-phone-number"
              intent={errors.phoneNumber ? Intent.DANGER : Intent.NONE}
              helperText={errors.phoneNumber}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  style={{ width: 80, borderRadius: 3, border: '1px solid #CED9E0', padding: '6px 8px' }}
                  tabIndex={5}
                  disabled={isLoading}
                >
                  {countryOptions.map(opt => (
                    <option key={opt.code} value={opt.code}>
                      {opt.code}   ({opt.name})
                    </option>
                  ))}
                </select>
                <InputGroup
                  id="input-phone-number"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  tabIndex={6}
                  style={{ flex: 1 }}
                  disabled={isLoading}
                  intent={errors.phoneNumber ? Intent.DANGER : Intent.NONE}
                />
              </div>
            </FormGroup>

            <FormGroup label={'Industry Type'} labelFor="input-industry-type">
              <InputGroup
                id="input-industry-type"
                value={industryType}
                disabled
                tabIndex={7}
              />
            </FormGroup>

            <FormGroup label={'Sub-Industry Type'} labelFor="input-sub-industry-type">
              <InputGroup
                id="input-sub-industry-type"
                value={subIndustryType}
                disabled
                tabIndex={8}
              />
            </FormGroup>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                id="btn-submit-update-user"
                type="submit"
                text={lang.tr('save')}
                tabIndex={9}
                intent={Intent.PRIMARY}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>
        {isLoading && (
          <div style={loaderOverlayStyle}>
            <Spinner size={50} />
            <div style={loaderTextStyle}>Your profile is getting updated</div>
          </div>
        )}
      </Dialog>
    </>
  )
}

export default UpdateUserProfile
