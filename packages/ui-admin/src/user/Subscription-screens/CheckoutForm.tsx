import { Button } from '@blueprintjs/core'
import { useStripe, useElements } from '@stripe/react-stripe-js'
import { toast } from 'botpress/shared'
import React, { useState, useEffect } from 'react'

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

interface CheckoutFormProps {
  clientSecret: string
  amount: number
  actualAmount: number
  calculatedData: any
  selectedPlan: any
  selectedDuration: any
  setSelectedDuration: React.Dispatch<React.SetStateAction<string>>
  cardData: any
  togglePaymentDialog: (val: boolean) => Promise<void>
  toggle: () => void
  setPaymentFailedMessage: (msg: string) => void
  setIsPaymentFailedDialogOpen: (val: boolean) => void
  //setIsSuccessDialogOpen: (val: boolean) => void
  setIsLicenseDialogOpen: (val: boolean) => void
}

const isValidClientSecret = (secret: string) => {
  return /^pi_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+$/.test(secret)
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  clientSecret,
  amount,
  actualAmount,
  calculatedData,
  selectedPlan,
  selectedDuration,
  cardData,
  setSelectedDuration,
  togglePaymentDialog,
  toggle,
  setPaymentFailedMessage,
  setIsPaymentFailedDialogOpen,
  //setIsSuccessDialogOpen,
  setIsLicenseDialogOpen
}) => {
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')
  const token = JSON.parse(localStorage.getItem('token') || '{}')

  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  // const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)

  // useEffect(() => {
  //   const initPaymentRequest = async () => {
  //     if (!stripe) return
  //     const pr = stripe.paymentRequest({
  //       country: 'US',
  //       currency: 'usd',
  //       total: { label: 'Total', amount },
  //       requestPayerName: true,
  //       requestPayerEmail: true,
  //     })
  //     const result = await pr.canMakePayment()
  //     if (result) {
  //       setPaymentRequest(pr)
  //     }
  //   }
  //   initPaymentRequest()
  // }, [stripe, amount])

  const setSubscriber = async (amount) => {
    try {
      const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
      const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')

      const { fullName, email } = savedFormData

      const result = await fetch(`${API_URL}/save-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key: email, name: fullName, subscription: selectedPlan, duration: selectedDuration, amount }),
      })

      const data = await result.json()

      if (data.status !== true) {
        throw new Error(data.msg)
      }

      localStorage.setItem('subData', JSON.stringify({ ...savedSubData, subscription: selectedPlan, duration: selectedDuration, amount: `$${amount / 100}`, expired: false, canCancel: true, subsChanged: true }))
    } catch (err: any) {
      throw new Error('Something went wrong while saving subscription data: ' + err.message)
    }
  }

  const removeNextSub = async () => {
    try {
      const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
      const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')

      const { email } = savedFormData

      const result = await fetch(`${API_URL}/remove-nextsub`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email }),
      })

      const data = await result.json()

      if (data.status !== true) {
        throw new Error(data.msg)
      }

      localStorage.setItem('subData', JSON.stringify({ ...savedSubData, subscription: selectedPlan, duration: selectedDuration, amount: `$${amount / 100}`, expired: false, canCancel: true, subsChanged: true }))
    } catch (err: any) {
      throw new Error('Something went wrong while saving subscription data: ' + err.message)
    }
  }

  const paymentFailedEmail = async () => {
    try {
      const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
      const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')
      const { fullName, email } = savedFormData

      const result = await fetch(`${API_URL}/failed-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          email,
          name: fullName,
          subscription: savedSubData.subscription || '',
          amount: `$${amount / 100}`,
        }),
      })
      if (!result.ok) {
        throw new Error('Failed to send payment failure email')
      }
    } catch (err: any) {
      console.error('Error sending payment failure email:', err.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setPaymentFailedMessage('Stripe is not initialized. Please try again later.')
      setIsPaymentFailedDialogOpen(true)
      throw new Error('Stripe is not initialized. Please try again later.')
    }

    if (!clientSecret || !isValidClientSecret(clientSecret)) {
      setPaymentFailedMessage('Invalid client secret. Please contact support.')
      setIsPaymentFailedDialogOpen(true)
      throw new Error('Invalid client secret. Please contact support.')
    }

    setIsProcessing(true)
    setError('')

    try {
      const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
      const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')

      if (calculatedData?.refund && amount > 0) {
        const result = await fetch(`${API_URL}/refund-amount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            chargeId: savedSubData.transactionId,
            reason: '',
            amount: `$${amount / 100}`,
          }),
        })
        const data = await result.json()
        if (!data.success) {
          throw new Error(data.message || 'Failed to process refund. Please try again later.')
        }
      } else if (!calculatedData?.refund && amount > 0) {
        const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: savedFormData.stripePayementId,
        })

        if (paymentError) {
          await paymentFailedEmail()
          throw new Error(paymentError.message || 'An error occurred during payment processing.')
        }

        if (paymentIntent?.status !== 'succeeded') {
          setPaymentFailedMessage('Please try again or use a different payment method.')
          setIsPaymentFailedDialogOpen(true)
          await paymentFailedEmail()
          throw new Error('Payment failed. Please try again or use a different payment method.')
        }
      }

      const price = calculatedData?.refund ? `$${actualAmount}` : `$${amount / 100}`
      if (calculatedData?.action === 'upgrade') {
        await removeNextSub()
        await setSubscriber(price)
      } else if (calculatedData?.action === 'downgrade') {
        await downgradeSub(e, price)
        await handleNextSubNow(e, `$${actualAmount}`, true)
      } else {
        await removeNextSub()
        await setSubscriber(`$${amount / 100}`)
      }

      //setIsSuccessDialogOpen(true)
      setIsLicenseDialogOpen(true)
      await togglePaymentDialog(false)
      toggle()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNextSubNow = async (e: React.FormEvent, price, isDowngrade = false) => {
    e.preventDefault()

    setIsProcessing(true)
    setError('')

    try {
      const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')

      const { email } = savedFormData
      const plan = selectedPlan
      const duration = selectedDuration

      const response = await fetch(`${API_URL}/nextsub-upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')

    try {
      const response = await fetch(`${API_URL}/downgrade-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
                { value: 'half-yearly', label: 'Half-yearly' },
                { value: 'yearly', label: 'Yearly' },
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
                      (savedSubData.subscription === selectedPlan && savedSubData.duration === opt.value)
                    }
                    onChange={() => {
                      setSelectedDuration(opt.value)
                    }}
                  />
                  <span style={{ color: (savedSubData.subscription === selectedPlan && savedSubData.duration === opt.value) ? 'grey' : 'inherit' }}>{opt.label}</span>
                  {/* Show (Current) in red if this option is the active one */}
                  {savedSubData.subscription === selectedPlan && savedSubData.duration === opt.value && (
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
            {(savedSubData.subscription !== selectedPlan || savedSubData.duration !== selectedDuration) ?
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
                        ? `($${(Math.ceil(amount / 6) / 100).toFixed(2)}/month)`
                        : `($${(Math.ceil(amount / 12) / 100).toFixed(2)}/month)`}
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
              disabled={!stripe || isProcessing || (savedSubData.subscription === selectedPlan && savedSubData.duration === selectedDuration)}
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
                : (savedSubData.subscription === 'Trial' && !savedSubData.expired && !savedSubData.isCancelled) ? 'Proceed to Update' : (calculatedData && calculatedData?.refund)
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
          (savedSubData.subscription !== selectedPlan || savedSubData.duration !== selectedDuration) && (
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
                <strong>Current Plan:</strong> {savedSubData.subscription}
                <br />
                <strong>Duration:</strong> {savedSubData.duration || 'N/A'}
              </div>

              {/* Step 2: Usage Summary */}
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ marginBottom: '6px', fontSize: '1.05em', color: '#444' }}>Usage So Far</h4>
                <ul style={{ paddingLeft: '18px', margin: 0, color: '#555' }}>
                  <li>Your amount with us: <strong>{savedSubData.amount}</strong></li>
                  <li>Total months used ({calculatedData.action === 'upgrade' ? 'excluding' : 'including'} current month): <strong>{calculatedData.usedMonth}</strong></li>
                  <li>Cost per month (discount excluded): <strong>${savedSubData.subscription === 'Starter' ? '19' : '45'}</strong></li>
                  <li>Cost used for {calculatedData.usedMonth} months: <strong>${(calculatedData.usedAmount).toFixed(2)}</strong></li>
                  {calculatedData.daysUsed !== undefined && (
                    <li>Days used in current month cycle: <strong>{calculatedData.daysUsed}</strong></li>
                  )}
                  {calculatedData.dailyAmount !== undefined && (
                    <li>Daily rate: <strong>${calculatedData.dailyAmount}</strong></li>
                  )}
                  {calculatedData.amountUsedInDays !== undefined && (
                    <li>Cost for {calculatedData.daysUsed} days used: <strong>${(calculatedData.amountUsedInDays).toFixed(2)}</strong></li>
                  )}
                  {calculatedData.totalUsedAmount !== undefined && (
                    <li>Amount used till now (months + days): <strong>${(calculatedData.totalUsedAmount).toFixed(2)}</strong></li>
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
                    <li>Final amount (${`${actualAmount} - $${Number(calculatedData.totalLeftAmount).toFixed(2)}`}): <strong>${Number(calculatedData.amount).toFixed(2)}</strong></li>
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
}

export default CheckoutForm
