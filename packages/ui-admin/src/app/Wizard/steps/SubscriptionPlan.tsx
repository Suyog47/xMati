import React from 'react'

interface SubscriptionPlanProps {
  selectedPlan: string
  setSelectedPlan: (plan: string) => void
  selectedDuration: string
  setSelectedDuration: (duration: string) => void
  price: number
  handleSubmit: () => void
  prevStep: () => void
  isLoading?: boolean
  isPaymentLoading?: boolean
  errorMessage?: string | null
  cardErrorMessage?: string | null
  isValidatingCard?: boolean
  clearErrorMessage?: () => void
  clearCardErrorMessage?: () => void
}

const SubscriptionPlan: React.FC<SubscriptionPlanProps> = ({
  selectedPlan,
  setSelectedPlan,
  selectedDuration,
  setSelectedDuration,
  price,
  handleSubmit,
  prevStep,
  isLoading = false,
  isPaymentLoading = false,
  errorMessage = null,
  cardErrorMessage = null,
  isValidatingCard = false,
  clearErrorMessage,
  clearCardErrorMessage
}) => {
  return (
    <>
      <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left: Subscription Plan Container */}
        <div style={{ flex: 1, marginRight: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '15px', fontSize: '1.3em', color: '#333' }}>
            Select Your Subscription Plan
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
            {['Starter', 'Professional'].map((plan) => {
              let monthlyPrice
              if (selectedDuration === 'monthly') {
                monthlyPrice = plan === 'Starter' ? 19 : 45
              } else if (selectedDuration === 'yearly' && plan === 'Starter') {
                monthlyPrice = 16
              } else if (selectedDuration === 'yearly' && plan === 'Professional') {
                monthlyPrice = 36
              }
              //  else if (selectedDuration === 'half-yearly' && plan === 'Starter') {
              //   monthlyPrice = 17
              // } else if (selectedDuration === 'half-yearly' && plan === 'Professional') {
              //   monthlyPrice = 37
              // }
              return (
                <div
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    flex: 1,
                    margin: '0 10px',
                    border: `2px solid ${selectedPlan === plan ? '#2196f3' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    padding: '20px',
                    cursor: 'pointer',
                    backgroundColor: selectedPlan === plan ? '#f8fbff' : '#fff',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2em' }}>
                    {plan}
                  </h3>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1em', color: '#555' }}>
                    ${monthlyPrice}/month
                  </h4>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.95em', color: '#777' }}>
                    {plan === 'Starter' ? '3 bots included' : '5 bots included'}
                  </p>
                  <div
                    style={{
                      marginTop: '10px',
                      textAlign: 'left',
                      fontSize: '0.9em',
                      color: '#555',
                    }}
                  >
                    <strong>Includes:</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                      <li>LLM Support</li>
                      <li>HITL Enabled</li>
                      <li>Bot Analytics</li>
                    </ul>
                    <strong>Supported Channels:</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                      <li>WhatsApp</li>
                      <li>Web Chat</li>
                      <li>Telegram</li>
                      <li>Slack</li>
                      <li>Facebook Messenger</li>
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Subscription Duration Section */}
        <div style={{ flexBasis: '35%', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'left' }}>
          <h4 style={{ marginBottom: '15px', fontSize: '1.2em', color: '#333' }}>
            Subscription Duration
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '1em', color: '#555' }}>
              <input
                type='radio'
                name='subscriptionDuration'
                value='monthly'
                checked={selectedDuration === 'monthly'}
                onChange={() => setSelectedDuration('monthly')}
                style={{ marginRight: '10px' }}
              />
              Monthly
            </label>
            {/* <label style={{ fontSize: '1em', color: '#555' }}>
              <input
                type='radio'
                name='subscriptionDuration'
                value='half-yearly'
                checked={selectedDuration === 'half-yearly'}
                onChange={() => setSelectedDuration('half-yearly')}
                style={{ marginRight: '10px' }}
              />
              Half-Yearly
            </label> */}
            <label style={{ fontSize: '1em', color: '#555' }}>
              <input
                type='radio'
                name='subscriptionDuration'
                value='yearly'
                checked={selectedDuration === 'yearly'}
                onChange={() => setSelectedDuration('yearly')}
                style={{ marginRight: '10px' }}
              />
              Yearly
            </label>
          </div>
          <div style={{ marginTop: '20px', fontSize: '0.95em', color: '#666' }}>
            <p>
              Enjoy a 30-day free trial. Your subscription will be activated only after the trial period ends.
            </p>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#333' }}>
              Price after 30-day free trial: ${price}
            </p>
          </div>
        </div>
      </div>
      <div className='button-container'>
        <div className='buttons'>
          <button onClick={prevStep}>Back</button>
          <button onClick={handleSubmit} disabled={isLoading}>Submit</button>
        </div>
      </div>
      {(isPaymentLoading || errorMessage) && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            {isPaymentLoading ? (
              <>
                <div className='loader'></div>
                <p>Your payment is being processed... Please wait...</p>
              </>
            ) : (
              <>
                {errorMessage && clearErrorMessage && (
                  <>
                    <p>{errorMessage}</p>
                    <button onClick={clearErrorMessage}>Close</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {(isLoading || errorMessage || cardErrorMessage || isValidatingCard) && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            {isLoading ? (
              <>
                <div className='loader'></div>
                <p>Your xMati account is getting created... Please wait...</p>
              </>
            ) : (
              <>
                {errorMessage && clearErrorMessage && (
                  <>
                    <p>{errorMessage}</p>
                    <button onClick={clearErrorMessage}>Close</button>
                  </>
                )}
                {cardErrorMessage && clearCardErrorMessage && (
                  <>
                    <p>{cardErrorMessage}</p>
                    <button onClick={clearCardErrorMessage}>Close</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default SubscriptionPlan
