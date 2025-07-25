import React, { FC, useState, useEffect } from 'react'
import { Button, Classes, Dialog, Spinner } from '@blueprintjs/core'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { lang, toast } from 'botpress/shared'
import CardForm from './CardForm'

// For development use
const stripePromise = loadStripe('pk_test_51RLimpPBSMPLjWxm3IUaX63iUb4TqhU5prbUsg7A5RwG2sZsukOa7doAAhPu2RpEkYXZ2dRLNrOA4Pby9IscZOse00unCEcNDG')

//For production use
// const stripePromise = loadStripe('pk_live_51RPPI0EncrURrNgDF2LNkLrh5Wf53SIe3WjqPqjtzqbJWDGfDFeG4VvzUXuC4nCmrPTNOTeFENuAqRBw1mvbNJg600URDxPnuc')


interface Props {
  isOpen: boolean
  toggle: () => void
}

interface CardDetails {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  funding?: string
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
    width: '320px',
    height: '180px',
    backgroundColor: '#1E1E2F',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    margin: '0 auto 20px auto',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
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
          <h3 className="stepHeader" style={{ marginTop: 0 }}>Your Payment Information</h3>
          {/* Loader for card details */}
          {isLoadingCard ? (
            <div
              style={{
                width: '300px',
                height: '170px',
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
            !isLoadingCard && cardDetails && (
              <div style={{
                background: cardDetails.brand.toUpperCase() === 'VISA'
                  ? 'linear-gradient(135deg, #ff9900, #ff5e62)'
                  : cardDetails.brand.toUpperCase() === 'MASTERCARD'
                    ? 'linear-gradient(135deg, #f7971e, #ffd200)'
                    : 'linear-gradient(135deg, #4361ee, #3a0ca3)',
                borderRadius: '12px',
                margin: '0 auto 20px auto',
                padding: '16px',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                height: '180px',
                width: '330px', // Fixed width
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: "'Source Sans Pro', sans-serif"
              }}>
                {/* Glossy overlay effect */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%)',
                  transform: 'rotate(20deg)'
                }} />

                {/* Top section with brand and chip */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '30px'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    padding: '6px 10px'
                  }}>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      opacity: 0.8
                    }}>
                      {cardDetails.funding}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    fontStyle: 'italic',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {cardDetails.brand}
                  </div>
                </div>

                {/* Card number section */}
                <div style={{
                  fontSize: '20px',
                  letterSpacing: '3px',
                  marginBottom: '25px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span>•••• •••• •••• {cardDetails.last4}</span>
                </div>

                {/* Bottom section */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end'
                }}>
                  <div>
                    <div style={{
                      fontSize: '10px',
                      opacity: 0.8,
                      marginBottom: '4px'
                    }}>
                      USER
                    </div>
                    <div style={{
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      {formData.fullName || 'YOUR NAME'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '10px',
                      opacity: 0.8,
                      marginBottom: '4px'
                    }}>
                      EXPIRES
                    </div>
                    <div style={{ fontSize: '16px' }}>
                      {String(cardDetails.exp_month).padStart(2, '0')}/{String(cardDetails.exp_year).slice(-2)}
                    </div>
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
