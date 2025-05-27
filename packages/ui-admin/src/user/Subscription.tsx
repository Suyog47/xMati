import React, { FC, useState, useEffect, useMemo, useCallback } from 'react'
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
  const [selectedTab, setSelectedTab] = useState('Starter')
  const [isLoadingSecret, setIsLoadingSecret] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  // Calculate amount dynamically based on selectedTab
  const amount = useMemo(() => (
    selectedTab === 'Starter' ? 1800 : 10000
  ), [selectedTab])


  // Fetch client secret with error handling
  const getClientSecret = useCallback(async () => {
    setIsLoadingSecret(true)
    setPaymentError('')

    try {
      const result = await fetch('http://138.197.2.118:8000/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'usd' }), // Use memoized amount
      })

      if (!result.ok) {
        throw new Error('Payment setup failed')
      }

      const data = await result.json()
      if (!data.client_secret) {
        throw new Error('Invalid server response')
      }

      setClientSecret(data.client_secret)
    } catch (err: any) {
      setPaymentError(err.message)
      setClientSecret('')
    } finally {
      setIsLoadingSecret(false)
    }
  }, [amount]) // Re-run when amount changes

  // Refresh client secret when tab changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      void (async () => {
        try {
          await getClientSecret()
        } catch (error) {
          console.error('Payment setup failed:', error)
          // Set error state here if needed
        }
      })()
    }
  }, [isOpen, getClientSecret]) // Add getClientSecret to dependencies



  const CheckoutForm = useMemo(() => () => {
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

        console.log(amount)
        const pr = stripe.paymentRequest({
          country: 'US',
          currency: 'usd',
          total: { label: 'Total', amount },
          requestPayerName: true,
          requestPayerEmail: true,
        })
        const result = await pr.canMakePayment()
        if (result) {
          setPaymentRequest(pr)
        }
      })
    }, [stripe, amount])

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!stripe || !elements || !clientSecret) {
        return // Add clientSecret check
      }

      setIsProcessing(true)
      setError('')

      try {
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

        await setSubscriber()
        alert('Payment succeeded!')
        toggle()
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsProcessing(false)
      }
    }


    const setSubscriber = async () => {
      try {
        const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
        const { email } = savedFormData

        const result = await fetch('http://localhost:8000/save-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: email, subscription: selectedTab }),
        })

        if (!result.ok) {
          throw new Error('Subscriber saving failed')
        }

        const data = await result.json()
        if (!data.client_secret) {
          throw new Error('Invalid server response')
        }
      } catch (err: any) {

      }
    }

    return (
      <div style={{ padding: 20 }}>
        {/* Dedicated Card Section */}
        <form onSubmit={handleSubmit}>

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
            {isProcessing ? 'Processing...' : `Pay $${amount / 100}`}
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
  }, [clientSecret, amount, toggle]) // Add required dependencies

  return (
    <Dialog
      title="Subscribe & Pay"
      isOpen={isOpen}
      onOpening={getClientSecret}
      onClose={toggle}
      style={{ width: '500px' }}
    >
      <div style={{ padding: 20 }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          marginBottom: 20,
          borderBottom: '1px solid #e0e0e0'
        }}>
          {['Starter', 'Professional'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              style={{
                flex: 1,
                padding: '12px 0',
                border: 'none',
                outline: 'none', // Removes focus border
                background: selectedTab === tab ? '#fff' : '#f5f5f5',
                borderBottom: selectedTab === tab ? '2px solid #2196f3' : 'none',
                cursor: 'pointer',
                fontWeight: 500,
                color: selectedTab === tab ? '#2196f3' : '#666',
                margin: '0 4px', // Adds space between tabs
                borderRadius: '4px 4px 0 0',
                boxShadow: 'none', // Removes any shadow on click
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Pricing Card */}
        <div style={{
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          padding: 20,
          paddingBottom: 10,
          marginBottom: 10
        }}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>
            {selectedTab === 'Starter' ? '$18/month' : '$100/month'}
          </h2>

          <div style={{
            marginBottom: 16,
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: 4
          }}>
            <strong>
              {selectedTab === 'Starter' ? '3 bots included' : '5 bots included'}
            </strong>
          </div>

          {/* Common Features */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              color: '#666',
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: '1px solid #eee'
            }}>
              Includes:
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#4caf50', marginRight: 8 }}>✓</span>
              LLM Support
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#4caf50', marginRight: 8 }}>✓</span>
              HITL (Human in the Loop) Enabled
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#4caf50', marginRight: 8 }}>✓</span>
              Bot Analytics
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            color: '#666',
            fontSize: 14
          }}>

            {isLoadingSecret && (
              <div style={{ padding: 20, textAlign: 'center' }}>
                Loading payment details...
              </div>
            )}

            {/* Show errors */}
            {paymentError && (
              <div style={{ color: 'red', margin: '15px 0' }}>{paymentError}</div>
            )}

            {!isLoadingSecret && clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm />
              </Elements>
            )}
          </div>


          {/* <button
            style={{
              width: '100%',
              padding: '12px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 500
            }}
            onClick={getClientSecret}
          >
            Subscribe to {selectedTab}
          </button> */}
        </div>
      </div>

    </Dialog>
  )
}

export default Subscription
