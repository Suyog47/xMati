import React from 'react'

interface EmailVerificationProps {
  formData: any
  errors: any
  enteredOTP: string
  setEnteredOTP: (val: string) => void
  otpVerified: boolean
  isVerifyingOtp: boolean
  isResendingOtp: boolean
  resendCountdown: number
  otpResentMessage: string
  handleOTPVerification: () => void
  sendOtp: (resent?: boolean) => void
  nextStep: () => void
  prevStep: () => void
}

const EmailVerification: React.FC<EmailVerificationProps> = ({
  formData,
  errors,
  enteredOTP,
  setEnteredOTP,
  otpVerified,
  isVerifyingOtp,
  isResendingOtp,
  resendCountdown,
  otpResentMessage,
  handleOTPVerification,
  sendOtp,
  nextStep,
  prevStep
}) => {
  return (
    <>
      <div className='step'>
        <p className='stepHeader'>Email Verification</p>
        <p className='stepDescription'>
          A 6-digit OTP has been generated and sent to {formData.email}. Please enter it below to verify your email.
        </p>
        <div className='input-container otp-input-container'>
          <input
            type='text'
            name='otp'
            placeholder='Enter OTP'
            value={enteredOTP}
            onChange={(e) => {
              setEnteredOTP(e.target.value)
            }}
            disabled={otpVerified}
            className='custom-input'
            maxLength={6}
            style={{ fontSize: '2em', textAlign: 'center', letterSpacing: '0.5em', padding: '10px' }}
          />
        </div>
        {errors.otp && (
          <p style={{ marginTop: '10px', color: 'red', textAlign: 'center' }}>
            {errors.otp}
          </p>
        )}
        {!otpVerified && (
          <>
            <div style={{ marginTop: '10px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleOTPVerification}
                disabled={otpVerified || isVerifyingOtp}
                style={{
                  padding: '10px 18px',
                  backgroundColor: otpVerified ? '#6c757d' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: otpVerified ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              >
                {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                onClick={() => sendOtp(true)}
                disabled={otpVerified || isResendingOtp || resendCountdown > 0}
                style={{
                  padding: '10px 18px',
                  backgroundColor: otpVerified || resendCountdown > 0 ? '#6c757d' : '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: otpVerified || resendCountdown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              >
                {isResendingOtp ? (
                  <div
                    className='small-loader'
                    style={{
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTop: '3px solid white',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                ) : resendCountdown > 0 ? (
                  `Resend in ${resendCountdown}s`
                ) : (
                  'Resend OTP'
                )}
              </button>
            </div>
          </>
        )}
        {otpVerified && (
          <p style={{ marginTop: '10px', color: 'green', textAlign: 'center' }}>
            OTP Verified!
          </p>
        )}
        {otpResentMessage && (
          <p style={{ marginTop: '10px', color: '#007bff', textAlign: 'center' }}>
            {otpResentMessage}
          </p>
        )}
      </div>
      <div className='button-container'>
        <div className='buttons'>
          <button onClick={prevStep}>Back</button>
          <button onClick={nextStep}>Next</button>
        </div>
      </div>
    </>
  )
}

export default EmailVerification
