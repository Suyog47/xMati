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
import BasicAuthentication from '~/auth/basicAuth'

// For development use
const stripePromise = loadStripe('pk_test_51RLimpPBSMPLjWxm3IUaX63iUb4TqhU5prbUsg7A5RwG2sZsukOa7doAAhPu2RpEkYXZ2dRLNrOA4Pby9IscZOse00unCEcNDG')

//For production use
//const stripePromise = loadStripe('pk_live_51RPPI0EncrURrNgDF2LNkLrh5Wf53SIe3WjqPqjtzqbJWDGfDFeG4VvzUXuC4nCmrPTNOTeFENuAqRBw1mvbNJg600URDxPnuc')

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
      const result = await fetch('https://www.app.xmati.ai/apis/create-payment-intent', {
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

        const result = await fetch('https://www.app.xmati.ai/apis/failed-payment', {
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

        const data = await result.json()

        if (data.status !== true) {
          throw new Error('Subscriber activation failed')
        }

      } catch (err: any) {
        throw new Error('Something went wrong while saving subscription data: ' + err.message)
      }
    }

    return (
      <>
        {/* Fullscreen loader while payment is processing */}
        {isProcessing && (
          <div
            style={{
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
              justifyContent: 'center',
            }}
          >
            {/* Simple CSS spinner */}
            <div
              style={{
                border: '8px solid #f3f3f3',
                borderTop: '8px solid #106ba3',
                borderRadius: '50%',
                width: 60,
                height: 60,
                animation: 'spin 1s linear infinite',
                marginBottom: 24,
              }}
            />
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
            <div style={{ fontSize: 20, color: '#106ba3', fontWeight: 600 }}>
              Your payment is being processed...
            </div>
          </div>
        )}
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
            <p style={{ fontSize: '0.85em', color: '#666', textAlign: 'center' }}>You will be logged-out once the subscription plan has been purchased</p>
          </form>
          {/* Apple/Google Pay Section
          {paymentRequest && (
            <div style={{ marginTop: 30 }}>
              <PaymentRequestButtonElement options={{ paymentRequest }} />
            </div>
          )} */}
        </div>
      </>
    )
  }, [clientSecret, amount, toggle]) // Add required dependencies


  const togglePaymentDialog = async (val) => {
    setIsPaymentDialogOpen(val)

    await new Promise(resolve => setTimeout(resolve, 500))   // A delay of 500 milliseconds to ensure the dialog opens/closes after the state update
  }

  const logout = async () => {
    const auth: BasicAuthentication = new BasicAuthentication()
    await auth.logout()
  }

  return (
    <><Dialog
      title="Subscribe & Pay"
      icon="dollar"
      isOpen={isOpen}
      onOpening={getClientSecret}
      onClose={toggle}
      canOutsideClickClose={false}
      style={{
        width: '99vw',
        maxWidth: '100vw',
        height: '97vh', // Increased height
        maxHeight: '95vh',
        margin: 0,
        borderRadius: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          padding: 32,
          paddingTop: 20,
          paddingLeft: 32,
          paddingRight: 32,
          paddingBottom: 32,
          gap: 20,
        }}
      >
        {/* Left: Subscription Plan Section */}
        <div style={{ flex: 1.4, overflowY: 'auto' }}>
          <div style={{ marginBottom: '5px', textAlign: 'center', fontSize: '1em', color: '#666' }}>
            {subscription && expiryTill && (
              <p>
                Your current subscription plan is <strong><u>{subscription}</u></strong> and it {savedSubData.expired === true ? 'was' : 'is'} valid till <strong><u>{expiryTill}</u></strong>.
              </p>
            )}
          </div>
          <h1 style={{ marginBottom: '5px', fontSize: '1.2em' }}>
            {(subscription && subscription.toLowerCase() === 'Trial')
              ? 'Choose Your Subscription Plan'
              : 'Change Your Subscription Plan'}
          </h1>
          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '10px',
            justifyContent: 'space-between'
          }}>
            {['Starter', 'Professional'].map((plan) => (
              <div
                key={plan}
                onClick={() => setSelectedTab(plan)}
                style={{
                  flex: 1,
                  border: `2px solid ${selectedTab === plan ? '#2196f3' : '#e0e0e0'}`,
                  borderRadius: '6px',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedTab === plan ? '#f8fbff' : 'white'
                }}
              >
                <h3 style={{
                  margin: '0',
                  padding: '0',
                  textAlign: 'center',
                  fontSize: '1.1em',
                  marginBottom: '10px'
                }}>
                  {plan}
                </h3>
                <h3 style={{
                  marginTop: 0,
                  marginBottom: '12px',
                  fontSize: '1.2em'
                }}>
                  {plan === 'Starter' ? '$18/month' : '$100/month'}
                </h3>
                <div style={{
                  marginBottom: '12px',
                  padding: '10px',
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
          {subscription === 'Trial' && (<br></br>)}
          <Button
            type="submit"
            intent="primary"
            fill
            style={{
              marginTop: '10px',
              height: 40,
              width: '100%',
              fontSize: '1.1em',
              fontWeight: 600,
              borderRadius: 6,
            }}
            onClick={() => togglePaymentDialog(true)}
          >
            Subscribe Now
          </Button>
          {subscription !== 'Trial' && (
            <Button
              intent="danger"
              fill
              style={{
                marginTop: '12px',
                height: 40,
                width: '100%',
                fontSize: '1.1em',
                fontWeight: 600,
                borderRadius: 6,
              }}
              onClick={() => {
                // Add your cancel subscription logic here
                alert('Cancel Subscription clicked')
              }}
            >
              Cancel Your Current Subscription
            </Button>
          )}
        </div>

        {/* Vertical Divider */}
        <div
          style={{
            width: 1.5,
            background: '#e0e0e0',
            margin: '0 10px',
            height: '100%',
            alignSelf: 'stretch',
          }}
        />

        {/* Right: Transaction History Section */}
        <div style={{
          flex: 1.6,
          background: '#f5f7fa',
          borderRadius: 8,
          padding: 20,
          minWidth: 300,
          overflowY: 'auto',
          boxShadow: '0 0 8px #e0e0e0'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '1.2em' }}>Transaction History</h2>
          {/* Placeholder for transaction history */}
          <div style={{ color: '#888', fontSize: '1em', textAlign: 'center' }}>
            No transactions yet.
          </div>
        </div>
      </div>
    </Dialog >

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
        onClose={async () => {
          setIsSuccessDialogOpen(false)
          await logout()
        }}
        title="Payment Successful"
        icon="tick-circle"
        canOutsideClickClose={false}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#4caf50', marginBottom: '10px' }}>Thank You!</h2>
          <p style={{ fontSize: '1.1em', color: '#666' }}>
            Your payment was successful...
          </p>
          <div style={{ marginTop: 24, color: '#106ba3', fontWeight: 500, fontSize: 16 }}>
            You now need to log out and will need to log in again.<br />
            After re-login, your new subscription plan will be activated and available for use.
          </div>
          <Button
            intent="primary"
            onClick={async () => {
              setIsSuccessDialogOpen(false)
              await logout()
            }
            }
            style={{ marginTop: '20px' }}
          >
            Logout
          </Button>
        </div>
      </Dialog>
    </>
  )
}

export default Subscription
