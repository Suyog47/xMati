import React, { FC, useEffect, useState } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Dialog } from '@blueprintjs/core' // Assuming Dialog is from BlueprintJS
const stripePromise = loadStripe('pk_test_51RLimpPBSMPLjWxm3IUaX63iUb4TqhU5prbUsg7A5RwG2sZsukOa7doAAhPu2RpEkYXZ2dRLNrOA4Pby9IscZOse00unCEcNDG')


interface Props {
  isOpen: boolean
  toggle: () => void
}

const Subscription: FC<Props> = props => {
  const [amount, setAmount] = useState<string>('')

  useEffect(() => {

  }, [props.isOpen])

  const CheckoutForm = () => {
    const stripe = useStripe()
    const elements = useElements()
    const [error, setError] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    const handleSubmit = async (e) => {
      e.preventDefault()
      setIsProcessing(true)

      // Step 1: Get clientSecret from your Node.js backend
      const { client_secret } = await fetch('http://localhost:8000/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100, currency: 'usd' }), // $10.00 in cents
      }).then(res => res.json())

      // Step 2: Confirm payment with Stripe
      if (!stripe) {
        setError('Stripe has not been initialized.')
        setIsProcessing(false)
        return
      }

      if (!elements) {
        setError('Elements has not been initialized.')
        setIsProcessing(false)
        return
      }

      // Confirm the payment with the card element
      const { error: stripeError } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement)!, // Use CardElement here
        },
      })

      if (stripeError) {
        setError(stripeError.message || '')
        setIsProcessing(false)
      } else {
        alert('Payment succeeded!')
        setIsProcessing(false)
      }
    }

    return (
      <form onSubmit={handleSubmit}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': { color: '#aab7c4' },
              },
            },
          }}
        />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? 'Processing...' : 'Pay $10.00'}
        </button>
      </form>
    )
  }

  return (
    <Dialog
      title={'Subscription'}
      icon="document"
      isOpen={props.isOpen}
      onClose={props.toggle}
      transitionDuration={0}
      canOutsideClickClose={false}
    >

      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>

    </Dialog>
  )
}

export default Subscription
