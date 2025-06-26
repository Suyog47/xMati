import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Spinner } from '@blueprintjs/core'
import { lang, toast } from 'botpress/shared'
import React, { FC, useEffect, useState } from 'react'

interface Props {
  isOpen: boolean
  toggle: () => void
}

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

const UpdateCardDetails: FC<Props> = props => {
  const [cardNumber, setCardNumber] = useState<string>('')
  const [cardCVC, setCardCVC] = useState<string>('')
  const [cardExpiry, setCardExpiry] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    console.log('Saved Form Data:', savedFormData)
    setCardNumber(savedFormData.card || '')
    setCardCVC(savedFormData.cardCVC || '')
    setCardExpiry(savedFormData.cardExpiry || '')
    setErrors({})
  }, [props.isOpen])

  const validate = (formData: any) => {
    const newErrors: { [key: string]: string } = {}

    // Card Number validation
    if (!formData.cardNumber.trim()) {
      newErrors.cardNumber = 'Card Number is required'
    } else if (!/^\d{16}$/.test(formData.cardNumber.trim())) {
      newErrors.cardNumber = 'Card Number must be 16 digits'
    }

    // Card CVC validation
    if (!formData.cardCVC.trim()) {
      newErrors.cardCVC = 'CVC/CVV is required'
    } else if (!/^\d{3,4}$/.test(formData.cardCVC.trim())) {
      newErrors.cardCVC = 'CVC/CVV must be 3 or 4 digits'
    }

    // Card Expiry validation
    if (!formData.cardExpiry.trim()) {
      newErrors.cardExpiry = 'Expiry Date is required'
    } else {
      const [month, year] = formData.cardExpiry.split('/').map(Number)
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = parseInt(currentDate.getFullYear().toString().slice(-2))

      if (
        !month ||
        !year ||
        month < 1 ||
        month > 12 ||
        year < currentYear ||
        (year === currentYear && month < currentMonth)
      ) {
        newErrors.cardExpiry = 'Expiry Date must be valid and not in the past'
      }
    }

    return newErrors
  }

  const submit = async event => {
    event.preventDefault()
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    // Trim all fields before validation and update
    const formData = {
      ...savedFormData,
      card: cardNumber.trim(),
      cardCVC: cardCVC.trim(),
      cardExpiry: cardExpiry.trim()
    }

    const validationErrors = validate({
      cardNumber: formData.card,
      cardCVC: formData.cardCVC,
      cardExpiry: formData.cardExpiry
    })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsLoading(true)
    try {
      let res = await s3Call(formData)
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
      const result = await fetch('https://www.app.xmati.ai/apis/user-auth', {
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
      return { success: false, msg: 'Error uploading card details to S3' }
    }
  }

  return (
    <>
      <Dialog
        title="Update Card Details"
        icon="credit-card"
        isOpen={props.isOpen}
        onClose={props.toggle}
        transitionDuration={0}
        canOutsideClickClose={false}
      >
        <form onSubmit={submit}>
          <div className={Classes.DIALOG_BODY}>
            <FormGroup
              label={'Card Number'}
              labelFor="input-card-number"
              intent={errors.cardNumber ? Intent.DANGER : Intent.NONE}
              helperText={errors.cardNumber}
            >
              <InputGroup
                id="input-card-number"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                tabIndex={1}
                autoFocus={true}
                disabled={isLoading}
                intent={errors.cardNumber ? Intent.DANGER : Intent.NONE}
                maxLength={16}
                placeholder="Enter 16-digit card number"
              />
            </FormGroup>
            <FormGroup
              label={'CVC/CVV'}
              labelFor="input-card-cvc"
              intent={errors.cardCVC ? Intent.DANGER : Intent.NONE}
              helperText={errors.cardCVC}
            >
              <InputGroup
                id="input-card-cvc"
                value={cardCVC}
                onChange={e => setCardCVC(e.target.value)}
                tabIndex={2}
                disabled={isLoading}
                intent={errors.cardCVC ? Intent.DANGER : Intent.NONE}
                maxLength={4}
                placeholder="Enter 3 or 4 digit CVC"
              />
            </FormGroup>
            <FormGroup
              label={'Expiry Date (MM/YY)'}
              labelFor="input-card-expiry"
              intent={errors.cardExpiry ? Intent.DANGER : Intent.NONE}
              helperText={errors.cardExpiry}
            >
              <InputGroup
                id="input-card-expiry"
                value={cardExpiry}
                onChange={e => setCardExpiry(e.target.value)}
                tabIndex={3}
                disabled={isLoading}
                intent={errors.cardExpiry ? Intent.DANGER : Intent.NONE}
                maxLength={5}
                placeholder="MM/YY"
              />
            </FormGroup>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                id="btn-submit-update-card"
                type="submit"
                text={lang.tr('save')}
                tabIndex={4}
                intent={Intent.PRIMARY}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>
        {isLoading && (
          <div style={loaderOverlayStyle}>
            <Spinner size={50} />
            <div style={loaderTextStyle}>Your card details are getting updated</div>
          </div>
        )}
      </Dialog>
    </>
  )
}

export default UpdateCardDetails
