import React, { FC, useState } from 'react'
import { Button, Classes, Dialog, Spinner } from '@blueprintjs/core'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { lang, toast } from 'botpress/shared'
import CardForm from './CardForm'

// For development use
const stripePromise = loadStripe('pk_test_51RLimpPBSMPLjWxm3IUaX63iUb4TqhU5prbUsg7A5RwG2sZsukOa7doAAhPu2RpEkYXZ2dRLNrOA4Pby9IscZOse00unCEcNDG')

//For production use
//const stripePromise = loadStripe('pk_live_51RPPI0EncrURrNgDF2LNkLrh5Wf53SIe3WjqPqjtzqbJWDGfDFeG4VvzUXuC4nCmrPTNOTeFENuAqRBw1mvbNJg600URDxPnuc')


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
  let formData = JSON.parse(localStorage.getItem('formData') || '{}')

  const handleCardValidated = async (paymentMethodId: string) => {
    setPaymentMethodId(paymentMethodId)
    console.log('Payment Method ID:', paymentMethodId)
  }

  const handleSave = async () => {
    try {
      const result = await fetch('http://localhost:8000/create-stripe-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, paymentMethodId }),
      })

      let data = await result.json()

      if (!data.success) {
        toast.failure('Failed to update card details.')
      }

      // success alert
      toast.success('Card details updated successfully!')
    } catch (error) {
      toast.failure(`An error occurred while saving card details. ${error.message || 'Please try again later.'}`)
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
          <Button onClick={handleSave} text={lang.tr('save')} intent="primary" />
        </div>
      </div>
    </Dialog>
  )
}

export default UpdateCardDetails
