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
import { toast } from 'botpress/shared'

interface Props {
  isOpen: boolean
  toggle: () => void
}

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PROMISE || 'pk_live_51RPPI0EncrURrNgDF2LNkLrh5Wf53SIe3WjqPqjtzqbJWDGfDFeG4VvzUXuC4nCmrPTNOTeFENuAqRBw1mvbNJg600URDxPnuc')

const Subscription: FC<Props> = ({ isOpen, toggle }) => {
  let savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  let savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')

  const [actualAmount, setActualAmount] = useState<any>(null)
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


  interface CalculatedData {
    status: boolean
    refund: boolean
    action: 'upgrade' | 'downgrade'
    totalMonths?: number
    usedMonth?: number
    usedAmount: number
    daysUsed?: number
    daysRemaining?: number
    dailyAmount?: string
    amountUsedInDays?: number
    totalUsedAmount?: number
    totalLeftAmount: string
    timestamp: Date
    amount: number
    message?: string
    error?: string
  }

  const [calculatedData, setCalculatedData] = useState<CalculatedData | null>(null)
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
    let price: number

    price = selectedTab === 'Starter' ? 1800 : 2500 // Monthly prices: $18 and $25 respectively

    if (selectedDuration === 'half-yearly') {
      price = selectedTab === 'Starter'
        ? Math.round(1800 * 6 * 0.95)    // Starter: 5% discount for half-yearly
        : Math.round(2500 * 6 * 0.95)    // Professional: 5% discount for half-yearly
    } else if (selectedDuration === 'yearly') {
      price = selectedTab === 'Starter'
        ? Math.round(1800 * 12 * 0.85)   // Starter: 15% discount for yearly
        : Math.round(2500 * 12 * 0.85)   // Professional: 15% discount for yearly
    }

    setActualAmount(price / 100)

    if (subscription !== 'Trial' && !savedSubData.expired && !savedSubData.isCancelled && !savedFormData.nextSubs) {
      const durationOrder: { [key: string]: number } = {
        monthly: 1,
        'half-yearly': 2,
        yearly: 3,
      }

      const currentPlan = savedSubData.subscription
      const currentAmount = parseFloat(String(savedSubData.amount).replace(/^\$/, ''))
      const newPlan = selectedTab

      let data

      if (currentPlan === 'Starter' && newPlan === 'Professional') {
        data = calculateUpgradeAmount(
          savedSubData.createdAt,
          savedSubData.till,
          currentPlan,
          currentAmount,
          price / 100
        )
      } else if (currentPlan === 'Professional' && newPlan === 'Starter') {
        data = calculateDowngradeAmount(
          savedSubData.createdAt,
          savedSubData.till,
          currentPlan,
          currentAmount,
          price / 100
        )
      } else if (durationOrder[selectedDuration] > durationOrder[savedSubData.duration]) {
        data = calculateUpgradeAmount(
          savedSubData.createdAt,
          savedSubData.till,
          currentPlan,
          currentAmount,
          price / 100
        )
      } else if (durationOrder[selectedDuration] < durationOrder[savedSubData.duration]) {
        data = calculateDowngradeAmount(
          savedSubData.createdAt,
          savedSubData.till,
          currentPlan,
          currentAmount,
          price / 100
        )
      } else {
        data = calculateUpgradeAmount(
          savedSubData.createdAt,
          savedSubData.till,
          currentPlan,
          currentAmount,
          price / 100
        )
      }

      if (data) {
        setCalculatedData(data) // Update state here
        console.log('data ', data)
        price = (data.amount) * 100 // Convert to cents for Stripe
      }
    }

    return parseFloat(price.toFixed(2)) // Return as string with two decimal places
  }, [selectedTab, selectedDuration])


  const getClientSecret = useCallback(async () => {
    if (!isPaymentDialogOpen) {
      return // Do not fetch client secret if payment dialog is not open
    }

    let amt = amount
    if (!amt || amt <= 0) {
      amt = 100 //If the 'amount' is zero, default to $1.00
    }

    console.log(amt)
    setIsLoadingSecret(true)
    setPaymentError('')
    try {
      savedFormData = JSON.parse(localStorage.getItem('formData') || '{}') // reinitializing to get the latest data
      const result = await fetch(`${API_URL}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt, currency: 'usd',
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
  }, [amount, selectedDuration, isPaymentDialogOpen])


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
        day: 'numeric'
      })
      : ''
    setExpiryTill(formattedExpiryTill)
  }, [isOpen, getClientSecret])


  const fetchTransactions = async () => {
    setIsLoadingTransactions(true)
    try {
      const res = await fetch(`${API_URL}/get-stripe-transactions`, {
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

    const res = await fetch(`${API_URL}/download-csv`, {
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
        res = await fetch(`${API_URL}/cancel-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chargeId: savedSubData.transactionId, reason: '', email, fullName, subscription, amount, refundDetails }),
        })
      } else {
        res = await fetch(`${API_URL}/trial-cancellation`, {
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

  function calculateUpgradeAmount(startDate, expiryDate, subs, currentAmount, newAmount,) {
    try {
      const currentDate = new Date()
      const start = new Date(formatToISODate(startDate))
      const expiry = new Date(formatToISODate(expiryDate))

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(expiry.getTime())) {
        throw new Error('Invalid date format')
      }

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
      const totalCycleDays = Math.ceil((currentCycleEnd.getTime() - currentCycleStart.getTime()) / msInDay)

      // Calculate remaining full months
      const usedMonth = cycleNumber

      // Calculate refund
      const monthlyAmount = (subs === 'Professional') ? 25 : 18
      const usedAmount = usedMonth * monthlyAmount


      // Calculate the days used so far in the current cycle
      const daysUsed = Math.ceil((currentDate.getTime() - currentCycleStart.getTime()) / msInDay)
      const dailyAmount = (monthlyAmount / totalCycleDays).toFixed(2)


      const amountUsedInDays = (parseFloat(dailyAmount) * daysUsed)

      const remainingAmount = (usedAmount + amountUsedInDays).toFixed(2)
      const numericRemainingAmount = parseFloat(remainingAmount)
      const totalUsedAmount = Math.max(0, (numericRemainingAmount === Infinity) ? newAmount : numericRemainingAmount)

      const totalLeftAmount = Math.max(0, currentAmount - totalUsedAmount).toFixed(2)


      const numericTotalLeftAmount = typeof totalLeftAmount === 'string' ? parseFloat(totalLeftAmount) : totalLeftAmount
      const amountToChargeRefund = (Number(newAmount) - numericTotalLeftAmount).toFixed(2)

      return {
        status: true,
        action: 'upgrade',
        refund: (parseFloat(amountToChargeRefund) <= 0) ? true : false,
        usedMonth,
        usedAmount,
        daysUsed,
        dailyAmount,
        amountUsedInDays,
        totalUsedAmount,
        totalLeftAmount,
        amount: Math.abs(parseFloat(amountToChargeRefund)).toFixed(2),
      }
    } catch (error) {
      console.error('Error calculating refund details:', error.message)
      return { status: false, message: 'Failed to calculate refund details', error: error.message }
    }
  }

  function calculateDowngradeAmount(startDate, expiryDate, subs, currentAmount, newAmount) {
    try {
      const currentDate = new Date()
      const start = new Date(formatToISODate(startDate))
      const expiry = new Date(formatToISODate(expiryDate))

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(expiry.getTime())) {
        throw new Error('Invalid date format')
      }


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

      // Calculate remaining full months
      const usedMonth = cycleNumber + 1 // 0-based cycle number, so add 1 for used months

      // Calculate refund
      const monthlyAmount = (subs === 'Professional') ? 25 : 18
      const usedAmount = usedMonth * monthlyAmount

      // Calculate remaining days
      const msInDay = 1000 * 60 * 60 * 24
      const daysRemaining = Math.ceil((currentCycleEnd.getTime() - currentDate.getTime()) / msInDay)

      const remainingAmount = currentAmount - usedAmount
      const totalLeftAmount = Math.max(0, remainingAmount)

      return {
        status: true,
        action: 'downgrade',
        refund: true,
        usedMonth,
        usedAmount,
        daysRemaining,
        totalLeftAmount,
        amount: totalLeftAmount.toFixed(2), // Ensure amount is a string with two decimal places
      }
    } catch (error) {
      console.error('Error calculating refund details:', error.message)
      return { status: false, message: 'Failed to calculate refund details', error: error.message }
    }
  }

  const CheckoutForm = useMemo(() => () => {
    savedFormData = JSON.parse(localStorage.getItem('formData') || '{}') // reinitializing to get the latest data
    savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')
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
        if (calculatedData?.refund && amount > 0) {
          const result = await fetch(`${API_URL}/refund-amount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chargeId: savedSubData.transactionId, reason: '', amount: `$${amount / 100}` }),
          })

          const data = await result.json()

          if (!data.success) {
            throw new Error(data.message || 'Failed to process refund. Please try again later.')
          }

        } else if (!calculatedData?.refund && amount > 0) {
          const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: savedFormData.stripePayementId,
          })

          // Handle payment errors
          if (paymentError) {
            void paymentFailedEmail()
            throw new Error(paymentError.message || 'An error occurred during payment processing.')
          }

          // Check the payment status
          if (paymentIntent?.status !== 'succeeded') {
            setPaymentFailedMessage('Please try again or use a different payment method.')
            setIsPaymentFailedDialogOpen(true)

            void paymentFailedEmail()
            throw new Error('Payment failed. Please try again or use a different payment method.')
          }
        }

        let price = calculatedData?.refund ? `$${actualAmount}` : `$${amount / 100}`
        if (calculatedData?.action === 'upgrade') {
          void removeNextSub()

          void setSubscriber(price)

        } else if (calculatedData?.action === 'downgrade') {
          // Reduce the duration of current subscription until daysRemaining
          void downgradeSub(e, price)

          // Handle next new subscription
          void handleNextSubNow(e, `$${actualAmount}`, true)
        } else {
          void removeNextSub()

          void setSubscriber(`$${amount / 100}`)
        }

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

        const result = await fetch(`${API_URL}/failed-payment`, {
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

    // Upgrade the Trial's next subscription
    const handleNextSubNow = async (e: React.FormEvent, price, isDowngrade = false) => {
      e.preventDefault()

      setIsProcessing(true)
      setError('')

      try {
        const { email } = savedFormData
        const plan = selectedTab
        const duration = selectedDuration

        const response = await fetch(`${API_URL}/nextsub-upgrade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            plan,
            duration,
            price,
            isDowngrade
          }),
        })

        const res = await response.json()

        if (!response.ok || !res.success) {
          throw new Error(res.message || 'Failed to upgrade subscription. Please try again later.')
        }

        // Update local storage or state with the new subscription details
        localStorage.setItem(
          'formData',
          JSON.stringify({
            ...savedFormData,
            nextSubs: {
              ...savedFormData.nextSubs,
              plan,
              duration,
              price
            }
          })
        )
        await togglePaymentDialog(false)
        toggle()
        toast.success('Subscription upgraded successfully!')
      } catch (err: any) {
        console.error('Error upgrading subscription:', err.message)
        setError(err.message || 'An error occurred while upgrading your subscription.')
      } finally {
        setIsProcessing(false) // Reset the loading state
      }
    }

    const downgradeSub = async (e: React.FormEvent, price: string) => {
      savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')

      try {
        const response = await fetch(`${API_URL}/downgrade-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: savedFormData.email,
            fullName: savedFormData.fullName,
            currentSub: savedSubData.subscription,
            daysRemaining: calculatedData?.daysRemaining,
            amount: savedSubData.amount,
          }),
        })

        const res = await response.json()

        if (!response.ok || !res.success) {
          throw new Error(res.message || 'Failed to downgrade subscription. Please try again later.')
        }
      } catch (err: any) {
        console.error('Error downgrading subscription:', err.message)
        setError(err.message || 'An error occurred while downgrading your subscription.')
      }
    }

    const setSubscriber = async (amount) => {
      try {
        const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
        const { fullName, email } = savedFormData

        const result = await fetch(`${API_URL}/save-subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: email, name: fullName, subscription: selectedTab, duration: selectedDuration, amount }),
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

    const removeNextSub = async () => {
      try {
        const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
        const { email } = savedFormData

        const result = await fetch(`${API_URL}/remove-nextsub`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
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
        {/* Fullscreen loader */}
        {isProcessing && (
          <div style={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            background: 'rgba(255,255,255,0.85)',
            zIndex: 99999, display: 'flex',
            flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              border: '8px solid #f3f3f3',
              borderTop: '8px solid #106ba3',
              borderRadius: '50%', width: 60, height: 60,
              animation: 'spin 1s linear infinite',
              marginBottom: 24
            }} />
            <style>
              {'@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}'}
            </style>
            <div style={{ fontSize: 20, color: '#106ba3', fontWeight: 600 }}>
              {savedSubData.subscription === 'Trial'
                ? 'Your Subscription is getting updated...'
                : 'Your payment is being processed...'}
            </div>
          </div>
        )}

        {/* Main container */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            flexWrap: 'nowrap', // Ensure left and right columns stay side by side
            justifyContent: 'space-between', // Add spacing between columns
            marginTop: '10px',
          }}
        >
          {/* LEFT COLUMN */}
          <div
            style={{
              flex: '1 1 380px',
              background: '#fff',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {cardData && (
              <div
                style={{
                  background:
                    cardData.brand.toUpperCase() === 'VISA'
                      ? 'linear-gradient(135deg, #ff9900, #ff5e62)'
                      : cardData.brand.toUpperCase() === 'MASTERCARD'
                        ? 'linear-gradient(135deg, #f7971e, #ffd200)'
                        : 'linear-gradient(135deg, #4361ee, #3a0ca3)',
                  borderRadius: '12px',
                  margin: '0 auto 20px auto',
                  padding: '16px',
                  color: '#fff',
                  height: '180px',
                  width: '330px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                  position: 'relative',
                  overflow: 'hidden',
                  fontFamily: "'Source Sans Pro', sans-serif",
                }}
              >
                {/* Decorative Glow */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-50%',
                    right: '-50%',
                    width: '200%',
                    height: '200%',
                    background:
                      'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)',
                    transform: 'rotate(20deg)',
                  }}
                />

                {/* Card Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      padding: '6px 10px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        letterSpacing: '1px',
                        opacity: 0.8,
                      }}
                    >
                      {cardData.funding.toUpperCase()}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      fontStyle: 'italic',
                      textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    {cardData.brand}
                  </div>
                </div>

                {/* Card Number */}
                <div
                  style={{
                    fontSize: '20px',
                    letterSpacing: '3px',
                    marginBottom: '20px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  •••• •••• •••• {cardData.last4}
                </div>

                {/* Card Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '10px', opacity: 0.8 }}>USER</div>
                    <div
                      style={{
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      {savedFormData.fullName || 'YOUR NAME'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', opacity: 0.8 }}>EXPIRES</div>
                    <div style={{ fontSize: '16px' }}>
                      {String(cardData.exp_month).padStart(2, '0')}/
                      {String(cardData.exp_year).slice(-2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Options */}
            <form
              onSubmit={
                savedSubData.subscription === 'Trial' && !savedSubData.expired && !savedSubData.isCancelled
                  ? (e) => handleNextSubNow(e, `$${amount / 100}`)
                  : handleSubmit
              }
            >

              <h4 style={{ textAlign: 'center', marginBottom: '10px', fontWeight: 600 }}>
                Choose Your plan billing duration
              </h4>
              <p
                style={{
                  fontSize: '0.9em',
                  color: '#555',
                  textAlign: 'center',
                  marginBottom: '12px',
                  lineHeight: '1.4',
                }}
              >
                Select the duration that best suits your needs.
              </p>

              {/* Duration Radio buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '40px',
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'half-yearly', label: 'Half-yearly', discount: '5% discount' },
                  { value: 'yearly', label: 'Yearly', discount: '15% discount' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="subscriptionDuration"
                      value={opt.value}
                      checked={selectedDuration === opt.value}
                      disabled={
                        isProcessing ||
                        (savedSubData.subscription === selectedTab && savedSubData.duration === opt.value)
                      }
                      onChange={() => {
                        console.log(`selectedDuration: ${opt.value}, amount: ${amount}`)
                        setSelectedDuration(opt.value)
                      }}
                    />
                    <span style={{ color: (savedSubData.subscription === selectedTab && savedSubData.duration === opt.value) ? 'grey' : 'inherit' }}>{opt.label}</span>
                    {opt.discount && (
                      <small
                        style={{
                          fontSize: '0.85em',
                          fontWeight: 'bold',
                          color: 'green',
                        }}
                      >
                        ({opt.discount})
                      </small>
                    )}
                    {/* Show (Current) in red if this option is the active one */}
                    {savedSubData.subscription === selectedTab && savedSubData.duration === opt.value && (
                      <div style={{ color: 'red', fontSize: '0.85em' }}>(Current)</div>
                    )}
                  </label>
                ))}
              </div>

              {error && (
                <div style={{ color: 'red', margin: '7px 0', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              {/* Amount Display */}
              {(savedSubData.subscription !== selectedTab || savedSubData.duration !== selectedDuration) ?
                <div
                  style={{
                    fontSize: '1.2em',
                    fontWeight: 600,
                    color: calculatedData?.refund ? '#2a7' : '#106ba3',
                    margin: '16px 0 12px',
                    textAlign: 'center',
                    lineHeight: '1.4',
                  }}
                >
                  {/* Title */}
                  <div style={{ fontSize: '0.9em', marginBottom: '4px', color: '#555' }}>
                    {(amount === 0) ? 'Amount' : calculatedData?.refund ? 'Refund Amount' : 'Payable Amount'}
                  </div>

                  {/* Price Display */}
                  <div>
                    {/* Show original price if discount applies */}
                    {!calculatedData?.refund && (actualAmount !== amount / 100) && (
                      <span
                        style={{
                          textDecoration: 'line-through',
                          color: '#888',
                          fontSize: '0.85em',
                          marginRight: '8px',
                        }}
                      >
                        ${actualAmount}
                      </span>
                    )}

                    {/* Final Amount */}
                    <span style={{ fontSize: '1.3em', fontWeight: 700 }}>
                      ${amount / 100}
                    </span>

                    {calculatedData?.refund && calculatedData.action === 'downgrade' && (
                      <span
                        style={{
                          display: 'block',
                          textAlign: 'center',
                          marginTop: '12px',
                          fontSize: '0.85em',
                          color: '#106ba3',
                        }}
                      >
                        Amount of <strong><u>${actualAmount}</u></strong> will be deducted from your account on the day of expiry.
                      </span>
                    )}

                    {calculatedData?.refund && calculatedData.action === 'upgrade' && (
                      <span
                        style={{
                          display: 'block',
                          textAlign: 'center',
                          marginTop: '12px',
                          fontSize: '0.7em',
                          color: '#106ba3',
                        }}
                      >
                        Actual amount for this plan:- <strong>${actualAmount}</strong>
                      </span>
                    )}
                  </div>

                  {/* Per month / refund breakdown */}
                  {!calculatedData?.refund && (
                    <div style={{ fontSize: '0.85em', color: '#777', marginTop: '2px' }}>
                      {selectedDuration === 'monthly'
                        ? 'per month'
                        : selectedDuration === 'half-yearly'
                          ? `($${((amount / 6) / 100).toFixed(2)}/month)`
                          : `($${((amount / 12) / 100).toFixed(2)}/month)`}
                    </div>
                  )}
                </div> :
                <div
                  style={{
                    color: 'red',
                    fontWeight: 600,
                    textAlign: 'center',
                    margin: '16px 0 12px',
                    fontSize: '1em',
                  }}
                >
                  You can't select your current active plan and duration.
                </div>}


              {/* Payment Button */}
              <Button
                type="submit"
                intent="primary"
                disabled={!stripe || isProcessing || (savedSubData.subscription === selectedTab && savedSubData.duration === selectedDuration)}
                loading={isProcessing}
                fill
                style={{
                  height: '52px',
                  minWidth: '200px',
                  maxWidth: '230px',
                  fontSize: '1.05em',
                  borderRadius: 6,
                  margin: '20px auto 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                {isProcessing
                  ? 'Processing...'
                  : calculatedData && calculatedData?.refund
                    ? (calculatedData.amount > 0 ? 'Refund and Proceed' : 'Proceed')
                    : 'Proceed to Pay'}
              </Button>

              <p
                style={{
                  marginTop: '15px',
                  fontSize: '0.85em',
                  color: '#555',
                  textAlign: 'center',
                  lineHeight: '1.4',
                }}
              >
                Once purchased, your subscription will automatically renew at the end of
                each selected billing cycle unless cancelled beforehand.
              </p>
            </form>
          </div>

          {/* RIGHT COLUMN — Calculations */}
          {(savedSubData.subscription !== 'Trial' && !savedSubData.expired && !savedSubData.isCancelled && !savedFormData.nextSubs) &&
            (calculatedData && (calculatedData.action === 'upgrade' || calculatedData.action === 'downgrade')) &&
            (savedSubData.subscription !== selectedTab || savedSubData.duration !== selectedDuration) && (
              <div style={{
                flex: '1 1 340px',
                background: '#fff',
                borderRadius: '10px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e8e8e8'
              }}>
                <h3 style={{
                  marginBottom: '12px',
                  fontSize: '1.2em',
                  color: calculatedData.action === 'upgrade' ? '#106ba3' : '#d97706'
                }}>
                  {calculatedData.action === 'upgrade' ? 'Plan Upgrade cost Adjustment' : 'Plan Downgrade cost Adjustment'}
                </h3>

                {/* Step 1: Current Plan Info */}
                <div style={{ marginBottom: '14px' }}>
                  <strong>Current Plan:</strong> {subscription}
                  <br />
                  <strong>Duration:</strong> {savedSubData.duration || 'N/A'}
                </div>

                {/* Step 2: Usage Summary */}
                <div style={{ marginBottom: '14px' }}>
                  <h4 style={{ marginBottom: '6px', fontSize: '1.05em', color: '#444' }}>Usage So Far</h4>
                  <ul style={{ paddingLeft: '18px', margin: 0, color: '#555' }}>
                    <li>Your amount with us: <strong>{savedSubData.amount}</strong></li>
                    <li>Total months used ({calculatedData.action === 'upgrade' ? 'excluding' : 'including'} current month): <strong>{calculatedData.usedMonth}</strong></li>
                    <li>Cost per month (discount excluded): <strong>${subscription === 'Starter' ? '18' : '25'}</strong></li>
                    <li>Cost used for {calculatedData.usedMonth} months: <strong>${calculatedData.usedAmount}</strong></li>
                    {calculatedData.daysUsed !== undefined && (
                      <li>Days used in current month cycle: <strong>{calculatedData.daysUsed}</strong></li>
                    )}
                    {calculatedData.dailyAmount !== undefined && (
                      <li>Daily rate: <strong>${calculatedData.dailyAmount}</strong></li>
                    )}
                    {calculatedData.amountUsedInDays !== undefined && (
                      <li>Cost for {calculatedData.daysUsed} days used: <strong>${calculatedData.amountUsedInDays}</strong></li>
                    )}
                    {calculatedData.totalUsedAmount !== undefined && (
                      <li>Amount used till now (months + days): <strong>${calculatedData.totalUsedAmount}</strong></li>
                    )}
                  </ul>
                </div>

                {/* Step 3: Remaining Credit / Additional Charge */}
                <div style={{ marginBottom: '14px' }}>
                  <h4 style={{ marginBottom: '6px', fontSize: '1.05em', color: '#444' }}>Remaining Value</h4>
                  <ul style={{ paddingLeft: '18px', margin: 0, color: '#555' }}>
                    <li>Total unused amount ({`${savedSubData.amount} - $${(calculatedData.action === 'upgrade') ? calculatedData.totalUsedAmount : calculatedData.usedAmount}`}):  <strong>${Number(calculatedData.totalLeftAmount).toFixed(2)}</strong></li>
                    {calculatedData.action === 'downgrade' && (
                      <>
                        <li>Current plan will remain active until: <strong>
                          {new Date(new Date().setDate(new Date().getDate() + (calculatedData.daysRemaining ?? 0)))
                            .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </strong></li>
                        <li>Your new plan will start after <strong>{calculatedData.daysRemaining} days</strong> </li>
                      </>
                    )}
                    {calculatedData.action !== 'downgrade' && (
                      <li>Final amount (${`${actualAmount} - ${Number(calculatedData.totalLeftAmount).toFixed(2)}`}): <strong>${Number(calculatedData.amount).toFixed(2)}</strong></li>
                    )}
                  </ul>
                </div>

                {/* Step 4: Final Amount */}
                <div style={{
                  marginTop: '20px',
                  paddingTop: '12px',
                  borderTop: '2px solid #eee'
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '1.1em', fontWeight: 'bold'
                  }}>
                    <span>{(amount === 0) ? 'Amount' : calculatedData.refund ? 'Refund Amount:' : 'Amount to Pay:'}</span>
                    <span style={{
                      color: calculatedData.refund ? 'green' : '#106ba3'
                    }}>
                      ${calculatedData.amount}
                    </span>
                  </div>
                  {calculatedData.refund
                    ? (amount === 0) ? <p>No amount left to refund.</p> : <p style={{ fontSize: '0.9em', color: '#444', marginTop: '6px' }}>This amount will be credited back to your payment method.</p>
                    : (amount === 0) ? <p>No extra amount to charge.</p> : <p style={{ fontSize: '0.9em', color: '#444', marginTop: '6px' }}>This amount will be charged to your selected payment method.</p>}
                </div>
              </div>
            )}

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
      const monthlyAmount = (subs === 'Professional') ? 25 : 18
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
      {/* Main Screen dialog */}
      <Dialog
        title="Subscribe & Pay"
        icon="dollar"
        isOpen={isOpen}
        onClose={toggle}
        canOutsideClickClose={false}
        style={{
          width: '98vw',
          maxWidth: '100vw',
          height: 'auto', // Adjust height to fit content
          maxHeight: '97vh',
          margin: 0,
          borderRadius: 10,
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
            <div
              style={{
                marginBottom: '10px',
                textAlign: 'center',
                fontSize: '0.95em',
                color: '#666',
                lineHeight: '1.4',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'normal',
                maxHeight: '4.5em', // Limit the height to prevent overflow
              }}
            >
              {subscription && expiryTill && (
                <p style={{ margin: '0' }}>
                  Your current subscription plan is <strong><u>{subscription}</u></strong>, valid till <strong><u>{expiryTill}</u></strong>.
                  {subscription === 'Trial' && !savedSubData.expired && (
                    savedFormData.nextSubs ? (
                      <> You opted for <strong><u>{savedFormData.nextSubs.plan}</u></strong> plan on a <strong><u>{savedFormData.nextSubs.duration}</u></strong> basis after Trial, which you can change anytime.</>
                    ) : (
                      <> You have cancelled your subscription.</>
                    )
                  )}
                  {subscription !== 'Trial' && !savedSubData.expired && (
                    savedFormData.nextSubs ? (
                      <> You have downgraded your plan to <strong><u>{savedFormData.nextSubs.plan}</u></strong> for the <strong><u>{savedFormData.nextSubs.duration}</u></strong> duration, which will be activated on the day of expiry.</>
                    ) : (
                      <></>
                    )
                  )}
                </p>
              )}
            </div>

            <h1 style={{ marginBottom: '5px', fontSize: '1.2em' }}>
              {(subscription === 'Trial' && !savedSubData.expired)
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
                    {plan === 'Starter' ? '$18/month' : '$25/month'} &nbsp;&nbsp; <span style={{ fontSize: '0.75em', color: '#666' }}>(Introductory price)</span>
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
                Update your Subscription
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
        title={` ${selectedTab} Payment`}
        icon="dollar"
        canOutsideClickClose={false}
        style={{
          width: (savedSubData.subscription !== 'Trial' &&
            !savedSubData.expired &&
            !savedSubData.isCancelled &&
            !savedFormData.nextSubs &&
            (savedSubData.subscription !== selectedTab || savedSubData.duration !== selectedDuration)) ? '60vw' : '40vw',
          maxWidth: '90vw'
        }}
      >

        {/* Payment Section */}
        <div style={{ borderTop: '1px solid #e0e0e0', paddingLeft: '15px', paddingRight: '14px', paddingTop: '6px' }}>
          {isLoadingSecret && (
            <div style={{ padding: '25px', textAlign: 'center', fontWeight: 'bold' }}>
              Loading payment details...
            </div>
          )}

          {paymentError && (
            <div style={{ color: 'red', margin: '15px 0', textAlign: 'center' }}>
              {paymentError || 'An error occurred while processing your payment. Please try again.'}
            </div>
          )}

          {/* {!isLoadingSecret && !clientSecret && (
            <div style={{ color: 'red', margin: '15px 0', textAlign: 'center' }}>
              Unable to proceed with payment. Please contact support or try again later.
            </div>
          )} */}

          {(!isLoadingSecret && clientSecret && isValidClientSecret(clientSecret)) ? (
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
                    {Number(refundDetails.refundAmount) <= 0
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
