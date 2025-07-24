import React, { FC, useState } from 'react'
import { Button, Classes, Dialog, Spinner } from '@blueprintjs/core'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { lang, toast } from 'botpress/shared'
import CardForm from './CardForm'

// For development use
const stripePromise = loadStripe('pk_test_51RLimpPBSMPLjWxm3IUaX63iUb4TqhU5prbUsg7A5RwG2sZsukOa7doAAhPu2RpEkYXZ2dRLNrOA4Pby9IscZOse00unCEcNDG')

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
  const [paymentMethodId, setPaymentMethodId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  let formData = JSON.parse(localStorage.getItem('formData') || '{}')

  const handleCardValidated = (paymentMethodId: string) => {
    setPaymentMethodId(paymentMethodId)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {

      const updatedFormData = {
        ...formData,
        stripePayementId: paymentMethodId
      }

      console.log('Updated Form Data:', updatedFormData)
      const result = await fetch('http://localhost:8000/update-card-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, customerId: formData.stripeCustomerId, paymentMethodId, data: updatedFormData })
      })

      const data = await result.json()

      if (!data.success) {
        toast.failure('Failed to update card details.')
        return
      }

      // Save paymentMethodId to localStorage
      localStorage.setItem('formData', JSON.stringify(updatedFormData))

      // Success alert
      toast.success('Card details updated successfully!')
      props.toggle() // Close the dialog
    } catch (error: any) {
      toast.failure(`An error occurred while saving card details. ${error.message || 'Please try again later.'}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      title="Update Card Details"
      icon="credit-card"
      isOpen={props.isOpen}
      onClose={props.toggle}
      transitionDuration={0}
      canOutsideClickClose={false}
    >
      <Elements stripe={stripePromise}>
        <div className={Classes.DIALOG_BODY}>
          <CardForm onCardValidated={handleCardValidated} />
        </div>
      </Elements>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={handleSave} text={lang.tr('save')} intent="primary" disabled={!paymentMethodId || isSaving} />
        </div>
      </div>
      {isSaving && (
        <div style={loaderOverlayStyle}>
          <Spinner size={50} />
          <div style={loaderTextStyle}>Saving your card details... Please wait...</div>
        </div>
      )}
    </Dialog>
  )
}

export default UpdateCardDetails
