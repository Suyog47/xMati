import React, { FC, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentRequestButtonElement,
} from '@stripe/react-stripe-js'
import { loadStripe, PaymentRequest } from '@stripe/stripe-js'
import { Dialog, Button, FormGroup, Icon, Spinner } from '@blueprintjs/core'
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
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')

  const [clientSecret, setClientSecret] = useState<string>('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedTab, setSelectedTab] = useState<string>('Starter')
  const [isLoadingSecret, setIsLoadingSecret] = useState(false)
  const [paymentError, setPaymentError] = useState<string>('')
  const [subscription, setSubscription] = useState<string>('')
  const [expiryTill, setExpiryTill] = useState<string>('')
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const [isConfirmCancelDialogOpen, setIsConfirmCancelDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isCancelProcessing, setIsCancelProcessing] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<string>('monthly')
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [isPaymentFailedDialogOpen, setIsPaymentFailedDialogOpen] = useState(false)
  const [paymentFailedMessage, setPaymentFailedMessage] = useState('')
  const [isFailedCancelDialogOpen, setIsFailedCancelDialogOpen] = useState(false)
  const [failedCancelMessage, setFailedCancelMessage] = useState('')
  const [cardData, setCardData] = useState<any>(null) // State to store card_data

  // Add a new state to store refund details
  const [refundDetails, setRefundDetails] = useState<{
    status: boolean
    daysRemainingInCycle?: number
    remainingMonths?: number
    refundAmount?: string
    message?: string
  } | null>(null)


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
        body: JSON.stringify({
          amount, currency: 'usd',
          customerId: { id: savedFormData.stripeCustomerId },
          paymentMethodId: savedFormData.stripePayementId,
          email: savedFormData.email,
          subscription: selectedTab,
          duration: selectedDuration
        }),
      })

      if (!result.ok) {
        throw new Error('Payment setup failed')
      }
      const data = await result.json()

      if (!data.client_secret) {
        throw new Error('Invalid server response')
      }
      setClientSecret(data.client_secret.client_secret)
      setCardData(data.card_data)
    } catch (err: any) {
      setPaymentError(err.message)
      setClientSecret('')
    } finally {
      setIsLoadingSecret(false)
    }
  }, [amount])


  const fetchedOnceRef = useRef(false)
  useEffect(() => {
    if (isOpen) {
      void getClientSecret()

      // Only fetch transactions once
      if (!fetchedOnceRef.current) {
        void fetchTransactions()
        fetchedOnceRef.current = true
      }
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


  const fetchTransactions = async () => {
    setIsLoadingTransactions(true)
    try {
      const res = await fetch('http://localhost:8000/get-stripe-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedFormData.email })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      if (!data || !Array.isArray(data.charges)) {
        throw new Error('Invalid data of transactions.')
      }

      const latestCharge = data?.charges?.[0]
      if (latestCharge?.id) {
        localStorage.setItem('subData', JSON.stringify({ ...savedSubData, transactionId: latestCharge.id }))
      }

      if (data.charges) {
        setTransactions(data.charges)
      }
    } catch (error) {
      alert(error)
      console.error('Failed to fetch transactions:', error)
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  const downloadCSV = async () => {
    const email = savedFormData.email

    const res = await fetch('http://localhost:8000/download-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: transactions, email }),
    })

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${email}-data.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const cancelSubscription = async () => {
    const { fullName, email, } = savedFormData
    const { subscription, amount, createdAt, till } = savedSubData
    setIsCancelProcessing(true)

    try {
      let res
      if (subscription !== 'Trial') {
        res = await fetch('http://localhost:8000/cancel-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chargeId: savedSubData.transactionId, reason: '', email, fullName, subscription, amount, start: createdAt, expiry: till }),
        })
      } else {
        res = await fetch('http://localhost:8000/trial-cancellation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })
      }

      const data = await res.json()

      if (data.success) {
        //await revokeSubscription()
        setIsConfirmCancelDialogOpen(false)
        setIsCancelDialogOpen(true)
        toggle()
      } else {
        setFailedCancelMessage(data.message || 'Cancellation failed. Please try again later.')
        setIsFailedCancelDialogOpen(true)
      }
    } catch (err: any) {
      setFailedCancelMessage(err.message || 'An error occurred while processing your cancellation.')
      setIsFailedCancelDialogOpen(true)
    } finally {
      setIsCancelProcessing(false)
    }
  }

  const CheckoutForm = useMemo(() => () => {
    const stripe = useStripe()
    const elements = useElements()
    const [error, setError] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)

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
      })()
    }, [stripe, amount])

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      // Validate Stripe and Elements instances
      if (!stripe || !elements) {
        setPaymentFailedMessage('Stripe is not initialized. Please try again later.')
        setIsPaymentFailedDialogOpen(true)

        throw new Error('Stripe is not initialized. Please try again later.')
      }

      // Validate clientSecret
      if (!clientSecret || !isValidClientSecret(clientSecret)) {
        setPaymentFailedMessage('Invalid client secret. Please contact support.')
        setIsPaymentFailedDialogOpen(true)

        throw new Error('Invalid client secret. Please contact support.')
      }

      setIsProcessing(true)
      setError('')

      try {
        // const cardElement = elements.getElement(CardElement)
        // if (!cardElement) {
        //   throw new Error('Card details are missing. Please enter your card information.')
        // }
        const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: savedFormData.stripePayementId,
        })

        // Handle payment errors
        if (paymentError) {
          throw new Error(paymentError.message || 'An error occurred during payment processing.')
        }

        // Check the payment status
        if (paymentIntent?.status !== 'succeeded') {
          setPaymentFailedMessage('Please try again or use a different payment method.')
          setIsPaymentFailedDialogOpen(true)

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

        const data = await result.json()

        if (data.status !== true) {
          throw new Error(data.msg)
        }

        localStorage.setItem('subData', JSON.stringify({ ...savedSubData, subscription: selectedTab, duration: selectedDuration, amount: `$${amount / 100}`, expired: false, canCancel: true, subsChanged: true }))
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
        <div style={{ padding: 10, textAlign: 'center' }}>
          {/* Display card_data */}
          {cardData && (
            <div
              style={{
                marginBottom: '20px',
                padding: '20px',
                background: '#ffffff',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                maxWidth: '400px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <h4
                style={{
                  marginBottom: '15px',
                  fontSize: '1.4em',
                  color: '#333333',
                  textAlign: 'center',
                  borderBottom: '1px solid #f0f0f0',
                  paddingBottom: '10px',
                }}
              >
                Your Card Details
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, color: '#555555' }}>Card Brand:</span>
                <span style={{ color: '#777777' }}>{cardData.brand}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, color: '#555555' }}>Last 4 Digits:</span>
                <span style={{ color: '#777777' }}>**** **** **** {cardData.last4}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: '#555555' }}>Expiry:</span>
                <span style={{ color: '#777777' }}>
                  {cardData.exp_month}/{cardData.exp_year}
                </span>
              </div>
            </div>
          )}


          {/* Divider */}
          <div style={{
            borderTop: '1px solid #e0e0e0',
            margin: '20px 0',
          }}></div>


          {/* Payment Form */}
          <form onSubmit={handleSubmit}>
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
              onSubmit={handleSubmit}
            >
              {isProcessing ? 'Processing...' : `Pay $${amount / 100}`}
            </Button>

            <p
              style={{
                marginTop: '10px',
                fontSize: '0.85em',
                color: '#555',
                textAlign: 'center',
                lineHeight: '1.4',
              }}
            >
              Once a plan has been purchased, the subscription will auto-renew based on the selected duration.
            </p>
            {/* <FormGroup label="Credit/Debit Card Details">
              <CardElement
                options={{
                  style: {
                    base: { fontSize: '16px', color: '#424770' },
                    invalid: { color: '#9e2146' },
                  },
                  hidePostalCode: true,
                }}
              />
            </FormGroup> */}

            {/* Apple/Google Pay Section
          {paymentRequest && (
            <div style={{ marginTop: 30 }}>
              <PaymentRequestButtonElement options={{ paymentRequest }} />
            </div>
          )} */}
            {error && <div style={{ color: 'red', margin: '15px 0' }}>{error}</div>}
          </form>
        </div>
      </>
    )
  }, [clientSecret, amount, cardData, toggle])


  const togglePaymentDialog = async (val) => {
    setIsPaymentDialogOpen(val)

    await new Promise(resolve => setTimeout(resolve, 500))   // A delay of 500 milliseconds to ensure the dialog opens/closes after the state update
  }

  const logout = async () => {
    const auth: BasicAuthentication = new BasicAuthentication()
    await auth.logout()
  }

  function formatToISODate(date) {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0') // 0-based
    const day = String(d.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getMonthDifference(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const years = end.getFullYear() - start.getFullYear()
    const months = end.getMonth() - start.getMonth()
    const totalMonths = years * 12 + months

    return totalMonths
  }

  function calculateRefundDetails(startDate, expiryDate, totalAmount, subs) {
    try {
      const currentDate = new Date()
      const start = new Date(formatToISODate(startDate))
      const expiry = new Date(formatToISODate(expiryDate))

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(expiry.getTime())) {
        throw new Error('Invalid date format')
      }

      // Total number of months in the subscription
      let totalMonths = getMonthDifference(start, expiry)

      // Find current cycle number (0-based)
      let currentCycleStart = new Date(start)
      let cycleNumber = 0

      while (currentCycleStart <= currentDate) {
        const nextCycleStart = new Date(currentCycleStart)
        nextCycleStart.setMonth(nextCycleStart.getMonth() + 1)

        if (currentDate < nextCycleStart) {
          break
        }
        currentCycleStart = nextCycleStart
        cycleNumber++
      }

      // Calculate current cycle end
      const tentativeCycleEnd = new Date(currentCycleStart)
      tentativeCycleEnd.setMonth(tentativeCycleEnd.getMonth() + 1)
      const currentCycleEnd = tentativeCycleEnd > expiry ? expiry : tentativeCycleEnd

      // Calculate remaining days
      const msInDay = 1000 * 60 * 60 * 24
      const daysRemaining = Math.ceil((currentCycleEnd.getTime() - currentDate.getTime()) / msInDay)

      // Calculate remaining full months
      const usedMonth = cycleNumber + 1 // 0-based cycle number, so add 1 for used months
      const remainingMonths = totalMonths - usedMonth

      // Calculate refund
      const monthlyAmount = (subs === 'Professional') ? 100 : 18 //totalAmount / totalMonths
      const usedAmount = usedMonth * monthlyAmount
      const remainingAmount = totalAmount - usedAmount
      const refundAmount = Math.max(0, remainingAmount)

      return {
        status: true,
        daysRemainingInCycle: daysRemaining,
        remainingMonths,
        refundAmount: refundAmount.toFixed(2),
      }
    } catch (error) {
      console.error('Error calculating refund details:', error.message)
      return { status: false, message: 'Failed to calculate refund details', error: error.message }
    }
  }

  // Function to calculate refund details
  const handleCalculateRefundDetails = useCallback(() => {
    const { createdAt: startDate, till: expiryDate, amount: totalAmount, subscription: subs } = savedSubData

    const numericAmount = parseFloat(totalAmount.replace(/^\$/, ''))
    if (startDate && expiryDate && numericAmount) {
      const refundData = calculateRefundDetails(startDate, expiryDate, numericAmount, subs)
      setRefundDetails(refundData)
    } else {
      setRefundDetails({ status: false, message: 'Invalid subscription data' })
    }
  }, [savedSubData])

  // Trigger refund calculation when the confirm cancel dialog is opened
  useEffect(() => {
    // Don't need the refund calculation for trial subscriptions as it is free
    if (subscription !== 'Trial') {
      if (isConfirmCancelDialogOpen) {
        handleCalculateRefundDetails()
      }
    }
  }, [isConfirmCancelDialogOpen])

  const isValidClientSecret = (secret: string) => {
    return /^pi_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+$/.test(secret)
  }

  return (
    <>
      <Dialog
        title="Subscribe & Pay"
        icon="dollar"
        isOpen={isOpen}
        onClose={toggle}
        canOutsideClickClose={false}
        style={{
          width: '98vw',
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
          <div style={{ flex: 1.5, overflowY: 'auto' }}>
            <div style={{ marginBottom: '5px', textAlign: 'center', fontSize: '1em', color: '#666' }}>
              {subscription && expiryTill && (
                <p>
                  Your current subscription plan is <strong><u>{subscription}</u></strong> and it {savedSubData.expired === true ? 'was' : 'is'} valid till <strong><u>{expiryTill}</u></strong>.
                </p>
              )}
            </div>
            <h1 style={{ marginBottom: '5px', fontSize: '1.2em' }}>
              {(subscription === 'Trial')
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
                    {['Whatsapp', 'Web Channel', 'Telegram', 'Slack', 'Facebook Messenger'].map((feature) => (
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

            {/* {(subscription === 'Trial' || savedSubData.expired === true) && (<br />)} */}

            <div
              style={{
                display: 'flex',
                gap: '12px', // spacing between buttons
                marginTop: '15px',
                width: '100%',
              }}
            >
              <Button
                type="submit"
                intent="primary"
                fill
                style={{
                  height: 50,
                  fontSize: '1.1em',
                  fontWeight: 600,
                  borderRadius: 6,
                  flex: 1,
                }}
                onClick={() => togglePaymentDialog(true)}
              >
                Subscribe Now
              </Button>

              {savedSubData.canCancel === true &&
                savedSubData.isCancelled === false &&
                savedSubData.expired === false && (
                  <Button
                    intent="danger"
                    fill
                    style={{
                      height: 50,
                      fontSize: '1.1em',
                      fontWeight: 600,
                      borderRadius: 6,
                      flex: 1,
                    }}
                    onClick={() => {
                      setIsConfirmCancelDialogOpen(true)
                    }}
                    disabled={isLoadingTransactions}
                  >
                    Cancel Your Subscription
                  </Button>
                )}
            </div>

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
          <div
            style={{
              flex: 1.5,
              background: '#f5f7fa',
              borderRadius: 8,
              padding: 20,
              minWidth: 300,
              height: 570, // Fixed height
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 0 8px #e0e0e0',
            }}
          >
            {/* Header with title + reload button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.2em' }}>Transaction History</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <Icon
                  icon="refresh"
                  iconSize={18}
                  intent="primary"
                  style={{
                    cursor: isLoadingTransactions ? 'not-allowed' : 'pointer',
                    opacity: isLoadingTransactions ? 0.4 : 1,
                  }}
                  onClick={() => {
                    if (!isLoadingTransactions) {
                      void fetchTransactions()
                    }
                  }}
                  title="Reload"
                />

                <button
                  onClick={() => {
                    if (!isLoadingTransactions && transactions.length > 0) {
                      void downloadCSV()
                    }
                  }}
                  style={{
                    backgroundColor: '#106ba3',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '1em',
                    fontWeight: 500,
                    cursor: (transactions.length === 0 || isLoadingTransactions) ? 'not-allowed' : 'pointer',
                    opacity: (transactions.length === 0 || isLoadingTransactions) ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  disabled={transactions.length === 0 || isLoadingTransactions} // Disable button if no transactions or loading
                >
                  <span role="img" aria-label="download">📥</span> Download CSV
                </button>

              </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoadingTransactions ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    width: '100%',
                  }}
                >
                  <Spinner size={38} />
                </div>
              ) : (
                <div style={{ color: '#888', fontSize: '1em' }}>
                  {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center' }}>No transactions yet.</div>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {transactions.map((txn, idx) => (
                        <li
                          key={idx}
                          style={{
                            background: 'white',
                            marginBottom: '12px',
                            padding: '16px',
                            borderRadius: '6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            borderLeft: '4px solid #106ba3',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            {/* Subscription Header */}
                            <div style={{
                              fontWeight: 700,
                              fontSize: '1.1em',
                              color: '#102a43',
                              marginBottom: '6px'
                            }}>
                              {`Subscription: ${txn.metadata?.subscription || '---'}`}
                            </div>

                            <div style={{ fontWeight: 600, fontSize: '1em', color: '#102a43', marginBottom: 4 }}>
                              Transaction ID:{' '}
                              <span style={{ fontFamily: 'monospace', color: '#5c7080' }}>{txn.id}</span>
                            </div>
                            <div style={{ fontSize: '0.9em', color: '#5c7080', marginBottom: 4 }}>
                              {new Date(txn.created * 1000).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </div>

                            {/* Duration */}
                            <div style={{
                              fontSize: '0.9em',
                              color: '#5c7080',
                              marginBottom: '4px',
                              fontWeight: 500
                            }}>
                              Duration: {txn.metadata?.duration || 'N/A'}
                            </div>

                            <div
                              style={{
                                fontSize: '0.85em',
                                color: txn.refunded ? 'red' : txn.status === 'succeeded' ? 'green' : 'red'
                              }}
                            >
                              Status: {txn.refunded ? 'Refunded' : txn.status}
                            </div>

                            {/* Partial Refund Details */}
                            {!txn.refunded && txn.refunds?.data?.length > 0 && (
                              <div style={{ fontSize: '0.8em', color: '#b58900', marginTop: '6px' }}>
                                <strong>Partial Refund:</strong>
                                <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                                  {txn.refunds.data.map((refund, refundIdx) => (
                                    <li key={refundIdx}>
                                      Amount Refunded: ${refund.amount / 100} on{' '}
                                      {new Date(refund.created * 1000).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                      })}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: 22, fontWeight: 700, color: txn.refunded ? 'red' : '#28a745', textAlign: 'right' }}>
                            ${txn.amount / 100}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog >

      {/* Payemnt dialog  */}
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
            <div style={{ color: 'red', margin: '15px 0', textAlign: 'center' }}>
              {paymentError || 'An error occurred while processing your payment. Please try again.'}
            </div>
          )}

          {!isLoadingSecret && !clientSecret && (
            <div style={{ color: 'red', margin: '15px 0', textAlign: 'center' }}>
              Unable to proceed with payment. Please contact support or try again later.
            </div>
          )}

          {!isLoadingSecret && clientSecret && isValidClientSecret(clientSecret) ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm />
            </Elements>
          ) : (
            !isLoadingSecret && (
              <div style={{ color: 'red', margin: '15px 0', textAlign: 'center' }}>
                {paymentError || 'Got Invalid Client secret. Please try again later.'}
              </div>
            )
          )}
        </div>
      </Dialog>

      {/* Payment success dialog */}
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
            Your payment is successful...
          </p>
          <div style={{ marginTop: 10, color: '#106ba3', fontWeight: 500, fontSize: 15 }}>
            You now need to log out and will need to log in again.<br />
          </div>

          {/* 🔴 Important Warning Message */}
          <div style={{ marginTop: 24, color: 'red', fontWeight: 600, fontSize: 17 }}>
            *DO NOT Refresh this page and logout is mandatory for full subscription activation*.
          </div>
          <Button
            intent="primary"
            onClick={async () => {
              setIsSuccessDialogOpen(false)
              await logout()
            }}
            style={{
              marginTop: '20px',
              padding: '14px 32px',
              fontSize: '1.05em',
              fontWeight: 'bold',
              minWidth: '250px',
              borderRadius: 6,
            }}
          >
            Logout
          </Button>
        </div>
      </Dialog>

      {/* Subscription cancel confirm dialog */}
      <Dialog
        isOpen={isConfirmCancelDialogOpen}
        onClose={() => setIsConfirmCancelDialogOpen(false)}
        title="Confirm Subscription Cancellation"
        icon="warning-sign"
        canOutsideClickClose={false}
      >
        {/* Fullscreen loader while refund is processing */}
        {isCancelProcessing && (
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
              Your Cancellation is in progress...
            </div>
          </div>
        )}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#d9822b', marginBottom: '10px' }}>Are you sure?</h2>
          <p style={{ fontSize: '1.1em', color: '#666' }}>
            {subscription === 'Trial' ? 'Cancelling will stop the subscription plan from getting activated after Trial period. Till then you can use the service.'
              : refundDetails && typeof refundDetails.daysRemainingInCycle === 'number'
                ? (
                  <>
                    Cancelling your account will keep your subscription active until{' '}
                    <strong>
                      {new Date(
                        new Date().setDate(new Date().getDate() + refundDetails.daysRemainingInCycle)
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </strong>.
                    {' '}
                    {Number(refundDetails.refundAmount) === 0
                      ? 'No refund will be processed.'
                      : (
                        <>
                          A refund of $<strong>{refundDetails.refundAmount}</strong> will be processed for the remaining <strong>{refundDetails.remainingMonths}</strong> months.
                        </>
                      )
                    }
                  </>
                )
                : 'Cancelling your account will keep your subscription active until the end of your current cycle. Any applicable refund for the remaining months (if any) will be processed shortly.'}
          </p>

          {/* Display refund details */}
          <div style={{ marginTop: 24, color: '#c23030', fontWeight: 500, fontSize: 16 }}>
            This action is irreversible. You will need to <strong>log in again</strong> to continue using the plan.
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: 30 }}>
            <Button
              intent="danger"
              onClick={async () => {
                void cancelSubscription()
              }}
              style={{
                marginTop: '16px',
                padding: '14px 32px',
                fontSize: '1.05em',
                fontWeight: 'bold',
                minWidth: '250px',
                borderRadius: 6,
                cursor: isLoadingTransactions ? 'not-allowed' : 'pointer',
                opacity: isLoadingTransactions ? 0.4 : 1,
              }}
              disabled={isLoadingTransactions}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Subscription cancelled dialog */}
      <Dialog
        isOpen={isCancelDialogOpen}
        onClose={async () => {
          setIsCancelDialogOpen(false)
          await logout()
        }}
        title="Subscription Cancelled"
        icon="tick-circle"
        canOutsideClickClose={false}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#4caf50', marginBottom: '10px' }}>Thank You!</h2>
          <p style={{ fontSize: '1.1em', color: '#666' }}>
            Your Subscription has been cancelled and revoked back to 3-day trial...
          </p>
          <div style={{ marginTop: 10, color: '#106ba3', fontWeight: 500, fontSize: 15 }}>
            You now need to log out and will need to log in again.<br />
          </div>

          {/* 🔴 Important Warning Message */}
          <div style={{ marginTop: 24, color: 'red', fontWeight: 600, fontSize: 17 }}>
            *DO NOT Refresh this page and logout is mandatory for full subscription activation*.
          </div>

          <Button
            intent="primary"
            onClick={async () => {
              setIsCancelDialogOpen(false)
              await logout()
            }}
            style={{
              marginTop: '20px',
              padding: '14px 32px',
              fontSize: '1.05em',
              fontWeight: 'bold',
              minWidth: '250px',
              borderRadius: 6,
            }}
          >
            Logout
          </Button>
        </div>
      </Dialog>

      {/* Payment Failed dialog */}
      <Dialog
        isOpen={isPaymentFailedDialogOpen}
        onClose={() => {
          setIsPaymentDialogOpen(false)
          setIsPaymentFailedDialogOpen(false)
        }}
        title="Payment Failed"
        icon="error"
        canOutsideClickClose={true}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#c23030', marginBottom: '10px' }}>Payment Failed</h2>
          <p style={{ fontSize: '1.1em', color: '#666' }}>
            Unfortunately, your payment could not be processed.
          </p>
          <div style={{ marginTop: 10, color: '#c23030', fontWeight: 500, fontSize: 15 }}>
            {paymentFailedMessage || 'An unknown error occurred. Please try again later.'}
          </div>
          <Button
            intent="primary"
            onClick={() => {
              setIsPaymentDialogOpen(false)
              setIsPaymentFailedDialogOpen(false)
            }}
            style={{
              marginTop: '20px',
              padding: '14px 32px',
              fontSize: '1.05em',
              fontWeight: 'bold',
              minWidth: '250px',
              borderRadius: 6,
            }}
          >
            Close
          </Button>
        </div>
      </Dialog>

      {/* Cancellation Failed dialog */}
      <Dialog
        isOpen={isFailedCancelDialogOpen}
        onClose={() => {
          setIsConfirmCancelDialogOpen(false)
          setIsFailedCancelDialogOpen(false)
        }}
        title="Cancellation Failed"
        icon="error"
        canOutsideClickClose={true}
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#c23030', marginBottom: '10px' }}>Cancellation Failed</h2>
          <p style={{ fontSize: '1.1em', color: '#666' }}>
            Unfortunately, we could not cancel your subscription at this time.
          </p>
          <div style={{ marginTop: 10, color: '#c23030', fontWeight: 500, fontSize: 15 }}>
            {failedCancelMessage || 'An unknown error occurred. Please try again later or contact support.'}
          </div>
          <Button
            intent="primary"
            onClick={() => {
              setIsConfirmCancelDialogOpen(false)
              setIsFailedCancelDialogOpen(false)
            }}
            style={{
              marginTop: '20px',
              padding: '14px 32px',
              fontSize: '1.05em',
              fontWeight: 'bold',
              minWidth: '250px',
              borderRadius: 6,
            }}
          >
            Close
          </Button>
        </div>
      </Dialog>
    </>
  )
}

export default Subscription
