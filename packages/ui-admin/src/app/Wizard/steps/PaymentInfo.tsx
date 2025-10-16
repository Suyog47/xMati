import { FormGroup } from '@blueprintjs/core'
import { CardElement } from '@stripe/react-stripe-js'
import React from 'react'

interface PaymentInfoProps {
  verifyCard: () => void
  isValidatingCard: boolean
  cardValidated: boolean
  isLoading?: boolean
  errorMessage: string | null
  cardErrorMessage: string | null
  nextStep: () => void
  prevStep: () => void
  clearErrorMessage: () => void
  clearCardErrorMessage: () => void
}

const PaymentInfo: React.FC<PaymentInfoProps> = ({
  verifyCard,
  isValidatingCard,
  cardValidated,
  cardErrorMessage,
  nextStep,
  prevStep,
  clearErrorMessage,
  clearCardErrorMessage
}) => {
  return (
    <>
      <div className='step'>
        <p className='stepHeader'>Payment Information</p>
        <p className='stepSubtitleSmall'>
          We are securely saving your credit card details to simplify future subscription plan purchases.
          No charges will be made at this time.
        </p>
        <div className='card-element-container'>
          <FormGroup label='Credit/Debit Card Details'>
            <CardElement
              options={{
                style: {
                  base: { fontSize: '16px', color: '#424770', lineHeight: '24px', letterSpacing: '0.025em' },
                  invalid: { color: '#9e2146' },
                },
                hidePostalCode: true,
              }}
            />
            <button
              onClick={verifyCard}
              className='validate-card-button'
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#007BFF',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
              disabled={isValidatingCard}
            >
              {isValidatingCard ? 'Validating Card...' : 'Verify your Card'}
            </button>
          </FormGroup>

          {cardValidated && (
            <div className='success-message'>
              <img
                src='https://cdn-icons-png.flaticon.com/512/845/845646.png'
                alt='Success'
                className='success-icon'
              />
              <span>Your card has been successfully verified.</span>
            </div>
          )}
        </div>
      </div>
      <div className='button-container'>
        <div className='buttons'>
          <button onClick={prevStep}>Back</button>
          <button onClick={nextStep}>
            Next
          </button>
        </div>
      </div>
      {(isValidatingCard || cardErrorMessage) && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            {isValidatingCard ? (
              <>
                <div className='loader'></div>
                <p>Your card is being validated... Please wait...</p>
              </>
            ) : (
              <>
                {cardErrorMessage && (
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

export default PaymentInfo
