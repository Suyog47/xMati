import React, { FC, useEffect, useState } from 'react'
import {
  Elements,
  CardElement,
  PaymentElement,
  useStripe,
  useElements,
  PaymentRequestButtonElement,
} from '@stripe/react-stripe-js'
import { loadStripe, PaymentRequest } from '@stripe/stripe-js'
import { Dialog, FormGroup, InputGroup, Button, Spinner } from '@blueprintjs/core'
import { CANCELLED } from 'dns'

const stripePromise = loadStripe('pk_test_51RLimpPBSMPLjWxm3IUaX63iUb4TqhU5prbUsg7A5RwG2sZsukOa7doAAhPu2RpEkYXZ2dRLNrOA4Pby9IscZOse00unCEcNDG')

interface Props {
  isOpen: boolean
  toggle: () => void
}

const Subscription: FC<Props> = ({ isOpen, toggle }) => {
  const [amount, setAmount] = useState<string>('10.00')
  const [currency, setCurrency] = useState<string>('usd')

  const CheckoutForm = () => {
    const stripe = useStripe()
    const elements = useElements()
    const [error, setError] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
    const [clientSecret, setClientSecret] = useState('')

    useEffect(() => {
      if (!stripe) {
        return
      }

      void (async () => {
        const pr = stripe.paymentRequest({
          country: 'US',
          currency,
          total: {
            label: 'Total',
            amount: parseInt(amount || '0'),
          },
          requestPayerName: true,
          requestPayerEmail: true,
        })

        const result = await pr.canMakePayment()
        if (result) {
          setPaymentRequest(pr)
        }
      })()
    }, [stripe, amount, currency])


    const handleCardSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setIsProcessing(true)

      // 1. Validate the payment form FIRST
      if (!stripe || !elements) {
        setError('Payment elements not initialized')
        setIsProcessing(false)
        return
      }

      const { error: elementsError } = await elements.submit()
      if (elementsError) {
        setError(elementsError.message || '')
        setIsProcessing(false)
        return
      }

      const { client_secret } = await fetch('http://localhost:8000/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(parseFloat(amount) * 100), // convert to cents
          currency,
        }),
      }).then(res => res.json())

      console.log('client_secret', client_secret)

      if (!stripe || !elements) {
        setError('Stripe not ready')
        setIsProcessing(false)
        return
      }

      const result = await stripe.confirmPayment({
        elements,
        clientSecret: client_secret,
        confirmParams: {
          return_url: 'http://localhost:3000/success',
        },
      })

      if (result.error) {
        setError(result.error.message || 'Payment failed')
      }

      setIsProcessing(false)
    }

    return (
      <div style={{ padding: 20 }}>
        <form onSubmit={handleCardSubmit} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#2D3748',
            textAlign: 'center'
          }}>
            Total Amount: $18.00
          </div>

          {/* Dedicated Card Payment Section */}
          <FormGroup label="Credit/Debit Card Details">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': { color: '#aab7c4' },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
                hidePostalCode: true // Optional: Hide postal code field
              }}
            />
          </FormGroup>


          <FormGroup>
            <PaymentElement
              options={{
                layout: {
                  type: 'accordion',
                  defaultCollapsed: false,
                },
                fields: {
                  billingDetails: {
                    email: 'auto',
                  },
                },
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto',
                },
              }}
            />
          </FormGroup>

          {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}

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

        {paymentRequest && (
          <>
            <h4 style={{ marginTop: 30 }}>Or pay with:</h4>
            <PaymentRequestButtonElement options={{ paymentRequest }} />
          </>
        )}
      </div>
    )
  }

  return (
    <Dialog
      title="Subscribe & Pay"
      icon="credit-card"
      isOpen={isOpen}
      onClose={toggle}
      transitionDuration={0}
      canOutsideClickClose={false}
      style={{ width: '500px' }}
    >
      <Elements stripe={stripePromise} options={{ appearance: { theme: 'flat' }, mode: 'payment', amount: Number(amount), currency }}>
        <CheckoutForm />
      </Elements>
    </Dialog>
  )
}

export default Subscription
