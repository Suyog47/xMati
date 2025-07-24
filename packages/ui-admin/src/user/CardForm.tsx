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
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { email: formData.email }
      })

      if (!paymentMethod) {
        return { success: false, msg: 'Error creating payment method' }
      }

      onCardValidated(paymentMethod.id)
      setCardValidated(true)
    } catch (err: any) {
      setCardErrorMessage('An error occurred while verifying the card.')
    } finally {
      setIsValidatingCard(false)
    }
  }

  return (
    <div>
      <h3 className="stepHeader">Payment Information</h3>
      {/* <p className="stepSubtitleSmall">
        We are securely saving your credit card details to simplify future subscription plan purchases. No charges will be made at this time.
      </p> */}
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
            gap: '10px',
          }}
          disabled={isValidatingCard || !stripe || !elements}
        >
          {isValidatingCard && <div className="small-loader"><Spinner size={16} /></div>}
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
        <div className="error" style={{ marginTop: '10px', color: 'red' }}>
          {cardErrorMessage}
        </div>
      )}
    </div>
  )
}

export default CardForm
