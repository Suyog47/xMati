import React, { FC, useState, useEffect } from 'react'
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

interface CardDetails {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  funding: string
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
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null)
  const [isLoadingCard, setIsLoadingCard] = useState(false)
  let formData = JSON.parse(localStorage.getItem('formData') || '{}')

  // Fetch card details on dialog open using POST; loader added for the card area
  useEffect(() => {
    if (props.isOpen) {
      setIsLoadingCard(true)
      const fetchCardDetails = async () => {
        try {
          const res = await fetch('http://localhost:8000/get-card-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethodId: formData.stripePayementId })
          })
          const data = await res.json()
          setCardDetails(data.cardDetails)
        } catch (err) {
          console.error('Failed to fetch card details:', err)
        } finally {
          setIsLoadingCard(false)
        }
      }
      void fetchCardDetails()
    }
  }, [props.isOpen])

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

      const result = await fetch('http://localhost:8000/update-card-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          customerId: formData.stripeCustomerId,
          paymentMethodId,
          data: updatedFormData
        })
      })

      const data = await result.json()

      if (!data.success) {
        toast.failure('Failed to update card details.')
        return
      }

      // Save updated form data (with paymentMethodId) to localStorage
      localStorage.setItem('formData', JSON.stringify(updatedFormData))

      // Success alert and close dialog
      toast.success('Card details updated successfully!')
      props.toggle()
    } catch (error: any) {
      toast.failure(`An error occurred while saving card details. ${error.message || 'Please try again later.'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Credit-card UI style
  const creditCardStyle: React.CSSProperties = {
    width: '340px',
    height: '160px',
    backgroundColor: '#1E1E2F',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    margin: '0 auto 20px auto',
    display: 'flex',
    flexDirection: 'column'
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
      <h3 className="stepHeader" style={{ paddingLeft: '20px' }}>Your Payment Information</h3>
      <Elements stripe={stripePromise}>
        <div className={Classes.DIALOG_BODY}>
          {/* Loader for card details */}
          {isLoadingCard ? (
            <div
              style={{
                width: '320px',
                height: '160px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                backgroundColor: '#f5f5f5',
                borderRadius: '10px'
              }}
            >
              <Spinner size={50} intent="primary" />
            </div>
          ) : (
            // Credit-card like UI displaying current card details
            cardDetails && (
              <div style={creditCardStyle}>
                <div
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: '24px',
                    color: '#fff',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    fontStyle: 'italic',
                  }}
                >
                  {cardDetails.brand}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    marginTop: 'auto'
                  }}
                >
                  <div style={{ fontSize: '17px', color: '#fff' }}>
                    **** **** **** {cardDetails.last4}
                  </div>
                  <div style={{ fontSize: '16px', color: '#fff' }}>
                    Valid: {cardDetails.exp_month}/{cardDetails.exp_year}
                  </div>
                </div>
              </div>
            )
          )}
          {/* Card form for updating/validating card details */}
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
