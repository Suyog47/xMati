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

// For development use
const stripePromise = loadStripe('pk_test_51RLimpPBSMPLjWxm3IUaX63iUb4TqhU5prbUsg7A5RwG2sZsukOa7doAAhPu2RpEkYXZ2dRLNrOA4Pby9IscZOse00unCEcNDG')

// For production use
// const stripePromise = loadStripe('pk_live_51RPPI0EncrURrNgDF2LNkLrh5Wf53SIe3WjqPqjtzqbJWDGfDFeG4VvzUXuC4nCmrPTNOTeFENuAqRBw1mvbNJg600URDxPnuc')

interface Props {
  isOpen: boolean
  toggle: () => void
}

const Subscription: FC<Props> = ({ isOpen, toggle }) => {
  const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')
  const [clientSecret, setClientSecret] = useState<string>('')
  const [selectedTab, setSelectedTab] = useState<string>('Starter')
  const [isLoadingSecret, setIsLoadingSecret] = useState(false)
  const [paymentError, setPaymentError] = useState<string>('')
  const [subscription, setSubscription] = useState<string>('')
  const [expiryTill, setExpiryTill] = useState<string>('')
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<string>('monthly')

  const amount = useMemo(() => {
    if (selectedDuration === 'half-yearly') {
      return selectedTab === 'Starter' ? 1800 * 6 * 0.97 : 10000 * 6 * 0.97 // 3% discount
    } else if (selectedDuration === 'yearly') {
      return selectedTab === 'Starter' ? 1800 * 12 * 0.95 : 10000 * 12 * 0.95 // 5% discount
    }
    return selectedTab === 'Starter' ? 1800 : 10000 // Default monthly price
  }, [selectedTab, selectedDuration])

  const getClientSecret = useCallback(async () => {
    setIsLoadingSecret(true)
    setPaymentError('')

    try {
      const result = await fetch('http://localhost:8000/create-payment-intent', {
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

    setSubscription(savedSubData.subscription || '')

    const formattedExpiryTill = savedSubData.till
      ? new Date(savedSubData.till).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        // hour: '2-digit',
        // minute: '2-digit',
        // second: '2-digit',
        // hour12: true, // Use 12-hour format
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
        const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement }
        })

        if (paymentError) {
          throw paymentError
        }

        // Check the payment status
        if (paymentIntent?.status !== 'succeeded') {
          void paymentFailedEmail()
          throw new Error('Payment failed. Please try again or use a different payment method.')
        }

        await setSubscriber()
        setIsSuccessDialogOpen(true)
        await togglePaymentDialog(false)
        toggle()
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsProcessing(false)
      }
    }


    const paymentFailedEmail = async () => {
      try {
        const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
        const { fullName, email } = savedFormData

        const result = await fetch('http://localhost:8000/failed-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: fullName, subscription: selectedTab, amount: `$${amount / 100}` }),
        })
        if (!result.ok) {
          throw new Error('Failed to send payment failure email')
        }
      } catch (err: any) {
        console.error('Error sending payment failure email:', err.message)
      }
    }

    const setSubscriber = async () => {
      try {
        const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
        const { fullName, email } = savedFormData

        const result = await fetch('http://localhost:8000/save-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: email, name: fullName, subscription: selectedTab, duration: selectedDuration, amount: `$${amount / 100}` }),
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
      <div style={{ padding: 10 }}>
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

          {/* Divider */}
          <div style={{
            borderTop: '1px solid #e0e0e0',
            margin: '20px 0',
          }}></div>

          {/* Radio Buttons for Half-yearly and Yearly Options */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <h4>Select Subscription Duration</h4>
            <p style={{ fontSize: '0.85em', color: '#666' }}>
              If you purchase a Half-Yearly plan, you will get a <strong>3% discount</strong>, and with a Yearly plan, you will get a <strong>5% discount</strong> and no discount for Monthly plan.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px' }}>
              <label>
                <input
                  type="radio"
                  name="subscriptionDuration"
                  value="monthly"
                  checked={selectedDuration === 'monthly'}
                  disabled={isProcessing} // Disable radio buttons when processing
                  onChange={() =>
                    setSelectedDuration(selectedDuration === 'monthly' ? '' : 'monthly')
                  }
                />
                Monthly
              </label>
              <label>
                <input
                  type="radio"
                  name="subscriptionDuration"
                  value="half-yearly"
                  checked={selectedDuration === 'half-yearly'}
                  disabled={isProcessing} // Disable radio buttons when processing
                  onChange={() =>
                    setSelectedDuration(selectedDuration === 'half-yearly' ? '' : 'half-yearly')
                  }
                />
                Half-yearly
              </label>
              <label>
                <input
                  type="radio"
                  name="subscriptionDuration"
                  value="yearly"
                  checked={selectedDuration === 'yearly'}
                  disabled={isProcessing} // Disable radio buttons when processing
                  onChange={() =>
                    setSelectedDuration(selectedDuration === 'yearly' ? '' : 'yearly')
                  }
                />
                Yearly
              </label>
            </div>
          </div>

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
        {/* Apple/Google Pay Section
        {paymentRequest && (
          <div style={{ marginTop: 30 }}>
            <PaymentRequestButtonElement options={{ paymentRequest }} />
          </div>
        )} */}
      </div>
    )
  }, [clientSecret, amount, toggle]) // Add required dependencies


  const togglePaymentDialog = async (val) => {
    setIsPaymentDialogOpen(val)

    await new Promise(resolve => setTimeout(resolve, 500))   // A delay of 500 milliseconds to ensure the dialog opens/closes after the state update
  }

  return (
    <><Dialog
      title="Subscribe & Pay"
      isOpen={isOpen}
      onOpening={getClientSecret}
      onClose={toggle}
      style={{ width: '600px' }}
    >
      <div style={{ padding: 15 }}> {/* Reduced padding */}

        <div style={{ marginBottom: '5px', textAlign: 'center', fontSize: '1em', color: '#666' }}>
          {subscription && expiryTill && (
            <p>
              Your current subscription plan is <strong><u>{subscription}</u></strong> and it {savedSubData.expired === true ? 'was' : 'is'} valid till <strong><u>{expiryTill}</u></strong>.
            </p>
          )}
        </div>

        <h1 style={{ marginBottom: '5px', fontSize: '1.2em' }}>Choose Your Subscription Plan</h1>

        {/* Subscription Plans Container */}
        <div style={{
          display: 'flex',
          gap: '15px', // Reduced gap
          marginBottom: '10px', // Smaller margin
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
              <h3 style={{
                margin: '0',
                padding: '0',
                textAlign: 'center', // Center-align the header
                fontSize: '1.1em', // Larger font size for the header
                marginBottom: '10px'
              }}>
                {plan}
              </h3>

              <h3 style={{
                marginTop: 0,
                marginBottom: '12px', // Tighter spacing
                fontSize: '1.2em' // Slightly smaller font
              }}>
                {plan === 'Starter' ? '$18/month' : '$100/month'}
              </h3>

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
        <Button
          type="submit"
          intent="primary"
          // disabled={!stripe || isProcessing}
          // loading={isProcessing}
          fill
          style={{ marginTop: '10px' }}
          onClick={() => togglePaymentDialog(true)}
        >
          Subscribe Now
        </Button>
      </div>
    </Dialog>

      <Dialog
        isOpen={isPaymentDialogOpen}
        onClose={() => togglePaymentDialog(false)}
        title="Payment"
        icon="dollar"
        canOutsideClickClose={false}
      >
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
      </Dialog>

      <Dialog
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        title="Payment Successful"
        icon="tick-circle"
        canOutsideClickClose={true}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#4caf50', marginBottom: '10px' }}>Thank You!</h2>
          <p style={{ fontSize: '1em', color: '#666' }}>
            Your payment was successful. Your subscription has been activated.
          </p>
          <Button
            intent="primary"
            onClick={() => setIsSuccessDialogOpen(false)}
            style={{ marginTop: '20px' }}
          >
            Close
          </Button>
        </div>
      </Dialog>
    </>
  )
}

export default Subscription
