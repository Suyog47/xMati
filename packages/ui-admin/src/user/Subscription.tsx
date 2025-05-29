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
  const [selectedTab, setSelectedTab] = useState<string>('Starter')
  const [isLoadingSecret, setIsLoadingSecret] = useState(false)
  const [paymentError, setPaymentError] = useState<string>('')
  const [subscription, setSubscription] = useState<string>('')
  const [expiryTill, setExpiryTill] = useState<string>('')


  const amount = useMemo(() => (
    selectedTab === 'Starter' ? 1800 : 10000
  ), [selectedTab])

  const getClientSecret = useCallback(async () => {
    setIsLoadingSecret(true)
    setPaymentError('')

    try {
      const result = await fetch('http://138.197.2.118:8000/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'usd' }),
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
  }, [amount])

  useEffect(() => {
    if (isOpen) {
      void getClientSecret()
    }
    const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')
    setSubscription(savedSubData.subscription || '')

    const formattedExpiryTill = savedSubData.till
      ? new Date(savedSubData.till).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true, // Use 12-hour format
      })
      : ''
    setExpiryTill(formattedExpiryTill)
  }, [isOpen, getClientSecret])


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
            {isProcessing ? 'Processing...' : 'Pay'}
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
      style={{ width: '600px' }}
    >
      <div style={{ padding: 15 }}> {/* Reduced padding */}

        <div style={{ marginBottom: '10px', textAlign: 'center', fontSize: '1em', color: '#666' }}>
          {subscription && expiryTill && (
            <p>
              Your current subscription plan is <strong><u>{subscription}</u></strong> and it is valid till <strong><u>{expiryTill}</u></strong>.
            </p>
          )}
        </div>

        <h1 style={{ marginBottom: '10px', fontSize: '1.2em' }}>Choose Your Subscription Plan</h1>

        {/* Subscription Plans Container */}
        <div style={{
          display: 'flex',
          gap: '15px', // Reduced gap
          marginBottom: '15px', // Smaller margin
          justifyContent: 'space-between'
        }}>
          {['Starter', 'Professional'].map((plan) => (
            <div
              key={plan}
              onClick={() => setSelectedTab(plan)}
              style={{
                flex: 1,
                border: `2px solid ${selectedTab === plan ? '#2196f3' : '#e0e0e0'}`,
                borderRadius: '6px', // Slightly smaller radius
                padding: '15px', // Reduced padding
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: selectedTab === plan ? '#f8fbff' : 'white'
              }}
            >
              <h2 style={{
                marginTop: 0,
                marginBottom: '12px', // Tighter spacing
                fontSize: '1.2em' // Slightly smaller font
              }}>
                {plan === 'Starter' ? '$18/month' : '$100/month'}
              </h2>

              <div style={{
                marginBottom: '12px',
                padding: '10px', // Smaller padding
                background: '#f8f9fa',
                borderRadius: '3px'
              }}>
                <strong style={{ fontSize: '0.95em' }}>
                  {plan === 'Starter' ? '3 bots included' : '5 bots included'}
                </strong>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{
                  color: '#666',
                  marginBottom: '10px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #eee',
                  fontSize: '0.95em'
                }}>
                  Includes:
                </div>

                {/* Features list */}
                {['LLM Support', 'HITL (Human in the Loop) Enabled', 'Bot Analytics'].map((feature) => (
                  <div
                    key={feature}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '6px',
                      fontSize: '0.9em'
                    }}
                  >
                    <span style={{ color: '#4caf50', marginRight: '6px' }}>✓</span>
                    {feature}
                  </div>
                ))}

                <div style={{
                  color: '#666',
                  marginBottom: '10px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #eee',
                  fontSize: '0.95em'
                }}>
                  Supported Channels:
                </div>

                {/* Features list */}
                {['Web Channel', 'Telegram', 'Slack', 'Facebook Messenger'].map((feature) => (
                  <div
                    key={feature}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '6px',
                      fontSize: '0.9em'
                    }}
                  >
                    <span style={{ color: '#4caf50', marginRight: '6px' }}>✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Payment Section */}
        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '10px' }}>
          {isLoadingSecret && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              Loading payment details...
            </div>
          )}

          {paymentError && (
            <div style={{ color: 'red', margin: '15px 0' }}>{paymentError}</div>
          )}

          {!isLoadingSecret && clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm />
            </Elements>
          )}
        </div>
      </div>
    </Dialog>
  )
}

export default Subscription
