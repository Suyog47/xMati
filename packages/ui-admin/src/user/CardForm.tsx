import React, { FC, useState } from 'react'
import { Spinner } from '@blueprintjs/core'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'

interface CardFormProps {
  onCardValidated: (paymentMethodId: string) => void
}

const CardForm: FC<CardFormProps> = ({ onCardValidated }) => {
  let formData = JSON.parse(localStorage.getItem('formData') || '{}')
  const stripe = useStripe()
  const elements = useElements()
  const [isValidatingCard, setIsValidatingCard] = useState(false)
  const [cardValidated, setCardValidated] = useState(false)
  const [cardErrorMessage, setCardErrorMessage] = useState<string | null>(null)

  const API_URL = process.env.API_URL || 'https://www.app.xmati.ai/apis'

  const verifyCard = async () => {
    setIsValidatingCard(true)
    setCardValidated(false)
    setCardErrorMessage(null)

    if (!stripe || !elements) {
      setIsValidatingCard(false)
      setCardErrorMessage('Stripe is not loaded yet. Please try again later.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setIsValidatingCard(false)
      setCardErrorMessage('Card Element is not available.')
      return
    }

    try {
      // const { paymentMethod, error } = await stripe.createPaymentMethod({
      //   type: 'card',
      //   card: cardElement,
      //   billing_details: { email: formData.email }
      // })

      // if (error) {
      //   return { success: false, msg: 'Error with card ' + error.message }
      // }

      // if (!paymentMethod) {
      //   setCardErrorMessage(`Issue with card. ${error?.message || 'Please try again.'}`)
      //   return
      // }


      // 1. Create SetupIntent on your backend
      const setupIntentRes = await fetch(`${API_URL}/create-setup-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, customerId: { id: formData.stripeCustomerId } }),
      })

      const { clientSecret } = await setupIntentRes.json()

      // 2. Confirm card setup (handles 3D Secure if needed)
      const res = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { email: formData.email },
        },
      })

      if (res.error) {
        setCardErrorMessage(`Issue with card. ${res.error?.message || 'Please try again.'}`)
        return
      }

      if (typeof res.setupIntent.payment_method === 'string' && res.setupIntent.payment_method) {
        onCardValidated(res.setupIntent.payment_method)
        setCardValidated(true)
      } else {
        setCardErrorMessage('Failed to retrieve payment method ID.')
      }
    } catch (err: any) {
      setCardErrorMessage('An error occurred while verifying the card.')
    } finally {
      setIsValidatingCard(false)
    }
  }

  return (
    <div>
      {/* Loader displayed above the card form */}
      {isValidatingCard && (
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Spinner size={20} intent="primary" />
          <span style={{ fontSize: '14px', color: '#007BFF' }}>Validating your card... Please wait</span>
        </div>
      )}

      <div className="card-element-container">
        <div style={{ marginBottom: '5px' }}>
          <label style={{ fontWeight: 500 }}>Credit/Debit Card Details</label>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  lineHeight: '24px',
                  letterSpacing: '0.025em',
                },
                invalid: { color: '#9e2146' },
              },
              hidePostalCode: true,
            }}
          />
        </div>
        <button
          onClick={verifyCard}
          className="validate-card-button"
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#007BFF',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          disabled={isValidatingCard || !stripe || !elements}
        >
          Verify your Card
        </button>
      </div>

      {cardValidated && (
        <div className="success-message" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="https://cdn-icons-png.flaticon.com/512/845/845646.png"
            alt="Success"
            style={{ width: 24, height: 24 }}
          />
          <span>Your card has been successfully verified.</span>
        </div>
      )}

      {cardErrorMessage && (
        <div
          className="error"
          style={{
            marginTop: '10px',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: 'red'
          }}
        >
          {cardErrorMessage}
        </div>
      )}
    </div>
  )
}

export default CardForm
