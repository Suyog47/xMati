import React, { FC, useState, useEffect } from 'react'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentRequestButtonElement,
} from '@stripe/react-stripe-js'
import { loadStripe, PaymentRequest } from '@stripe/stripe-js'
import { Dialog, Button, FormGroup } from '@blueprintjs/core'

const stripePromise = loadStripe('pk_test_51RLimpPBSMPLjWxm3IUaX63iUb4TqhU5prbUsg7A5RwG2sZsukOa7doAAhPu2RpEkYXZ2dRLNrOA4Pby9IscZOse00unCEcNDG')

interface Props {
  isOpen: boolean
  toggle: () => void
}

const Subscription: FC<Props> = ({ isOpen, toggle }) => {
  const [clientSecret, setClientSecret] = useState<string>('')

  const getClientSecret = async (): Promise<void> => {
    const result = await fetch('http://138.197.2.118:8000/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1800, currency: 'usd' }),
    }).then(res => res.json())

    setClientSecret(result.client_secret)
  }

  // useEffect(() => {
  //   if (!isOpen) {
  //     return
  //   }

  //   getClientSecret()
  // }, [isOpen])


  const CheckoutForm = () => {
    const stripe = useStripe()
    const elements = useElements()
    const [error, setError] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)

    // Initialize PaymentRequest (Apple/Google Pay)
    useEffect(() => {
      void (async () => {
        if (!stripe) {
          return
        }

        const pr = stripe.paymentRequest({
          country: 'US',
          currency: 'usd',
          total: { label: 'Total', amount: 1800 }, // $18.00
          requestPayerName: true,
          requestPayerEmail: true,
        })

        const result = await pr.canMakePayment()
        if (result) {
          setPaymentRequest(pr)
        }
      })
    }, [stripe])

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!stripe || !elements) {
        return
      }

      setIsProcessing(true)
      setError('')

      try {
        // Validate CardElement
        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          throw new Error('Card details missing')
        }

        const { error: paymentError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement }
        })

        if (paymentError) {
          throw paymentError
        }
        alert('Payment succeeded!')
        toggle()
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsProcessing(false)
      }
    }

    return (
      <div style={{ padding: 20 }}>
        {/* Dedicated Card Section */}
        <form onSubmit={handleSubmit}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Total Amount: $18.00
          </div>

          <FormGroup label="Credit/Debit Card Details">
            <CardElement
              options={{
                style: {
                  base: { fontSize: '16px', color: '#424770' },
                  invalid: { color: '#9e2146' },
                },
                hidePostalCode: true,
              }}
            />
          </FormGroup>

          {error && <div style={{ color: 'red', margin: '15px 0' }}>{error}</div>}

          <Button
            type="submit"
            intent="primary"
            disabled={!stripe || isProcessing}
            loading={isProcessing}
            fill
            style={{ marginTop: '20px' }}
          >
            {isProcessing ? 'Processing...' : 'Pay $18.00'}
          </Button>
        </form>

        {/* Apple/Google Pay Section */}
        {paymentRequest && (
          <div style={{ marginTop: 30 }}>
            <PaymentRequestButtonElement options={{ paymentRequest }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog
      title="Subscribe & Pay"
      isOpen={isOpen}
      onOpening={getClientSecret}
      onClose={toggle}
      style={{ width: '500px' }}
    >
      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm />
        </Elements>
      ) : (
        <div style={{ padding: 20, textAlign: 'center' }}>
          Initializing payment...
        </div>
      )}
    </Dialog>

  )
}

export default Subscription
