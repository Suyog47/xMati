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
    } else if (!/^\d{15,16}$/.test(formData.cardNumber.trim())) {
      newErrors.cardNumber = 'Card Number must be 15 or 16 digits only'
    } else if (!validateCardNumber(formData.cardNumber.trim())) {
      newErrors.cardNumber = 'The Card Number is Invalid'
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

  // Function to validate card number
  function validateCardNumber(cardNumber) {
    // Remove spaces or dashes from the card number
    cardNumber = cardNumber.replace(/\s|-/g, '')

    // Define regex patterns for card types
    const cardPatterns = {
      VISA: /^4[0-9]{12}(?:[0-9]{3})?$/,
      MASTERCARD: /^5[1-5][0-9]{14}$/,
      AMEX: /^3[47][0-9]{13}$/,
      DISCOVER: /^6(?:011|5[0-9]{2})[0-9]{12}$/, // Discover cards (USA)
      DINERS_CLUB: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/, // Diners Club
      JCB: /^(?:2131|1800|35\d{3})\d{11}$/, // JCB cards
      RUPAY: /^(60|65|81|82)[0-9]{14}$/, // RuPay cards (India)
      UNIONPAY: /^(62[0-9]{14,17})$/, // UnionPay cards
      MAESTRO: /^(5[0678]\d{11,18}|6\d{12,17})$/, // Maestro cards
    }

    if (!/^\d+$/.test(cardNumber)) {
      return false
    }

    // Check card type
    let cardType: string | null = null
    for (const [type, pattern] of Object.entries(cardPatterns)) {
      if (pattern.test(cardNumber)) {
        cardType = type
        break
      }
    }

    console.log('Card Type:', cardType)

    if (!cardType) {
      return false
    }

    // Validate using Luhn algorithm
    if (!isValidLuhn(cardNumber)) {
      return false
    }

    return true
  }

  // Luhn algorithm implementation
  function isValidLuhn(cardNumber) {
    let sum = 0
    let shouldDouble = false

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10)

      if (shouldDouble) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }

      sum += digit
      shouldDouble = !shouldDouble
    }

    return sum % 10 === 0
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
