import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { auth } from 'botpress/shared'
import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import api from '~/app/api'
import bgImage from '../../assets/images/background.jpg'
import Check from '../../assets/images/check.png'
import logo from '../../assets/images/xmati.png'
import EmailVerification from './steps/EmailVerification'
import OrganizationInfo from './steps/OrganizationInfo'
import PaymentInfo from './steps/PaymentInfo'
import PersonalInfo from './steps/PersonalInfo'
import SubscriptionPlan from './steps/SubscriptionPlan'
import './style.css'

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

interface FormData {
  fullName: string
  email: string
  phoneNumber: string
  countryCode: string // <-- add this
  password: string
  organisationName: string
  industryType: string
  subIndustryType: string
  cardNumber: string
  cardCVC: string
  cardExpiry: string
  token: string
}

interface Errors {
  fullName?: string
  email?: string
  phoneNumber?: string
  countryCode?: string // <-- add this
  password?: string
  organisationName?: string
  industryType?: string
  subIndustryType?: string
  cardNumber?: string
  cardCVC?: string
  cardExpiry?: string
  otp?: string  // <-- added for OTP validation
}

const CustomerWizard: React.FC = () => {
  const steps = [
    'Personal Info',
    'Email verification',
    'Company Info',
    'Payment',
    'Subscriptions'
  ]

  const industryData = [
    {
      industry: 'Agriculture',
      subIndustries: ['Precision Farming', 'Organic Farming', 'Agri-Tech']
    },
    {
      industry: 'Technology',
      subIndustries: ['Artificial Intelligence', 'Cybersecurity', 'Cloud Computing']
    },
    {
      industry: 'Finance',
      subIndustries: ['Investment Banking', 'Personal Finance', 'Cryptocurrency']
    },
    {
      industry: 'Healthcare',
      subIndustries: ['Telemedicine', 'Pharmaceuticals', 'Medical Devices']
    },
    {
      industry: 'Entertainment',
      subIndustries: ['Virtual Reality Gaming', 'Film Production', 'Music Streaming']
    },
    {
      industry: 'Education',
      subIndustries: ['E-Learning', 'EdTech', 'Corporate Training']
    },
    {
      industry: 'Retail',
      subIndustries: ['E-Commerce', 'Brick-and-Mortar', 'Supply Chain Management']
    },
    {
      industry: 'Energy',
      subIndustries: ['Renewable Energy', 'Oil and Gas', 'Energy Storage']
    },
    {
      industry: 'Transportation',
      subIndustries: ['Logistics', 'Ride-Sharing', 'Autonomous Vehicles']
    }
  ]

  const history = useHistory()
  const [step, setStep] = useState<number>(1)
  const [customerId, setCustomerId] = useState<string>('')
  const [paymentMethodId, setPaymentMethodId] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    countryCode: '+1', // <-- default country code
    password: '',
    organisationName: '',
    industryType: '',
    subIndustryType: '',
    cardNumber: '',
    cardCVC: '',
    cardExpiry: '',
    token: ''
  })
  const [errors, setErrors] = useState<Errors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // Big loader for 'Check User'
  const [isPaymentLoading, setIsPaymentLoading] = useState(false) // Big loader for 'Check User'
  const [isValidatingCard, setIsValidatingCard] = useState(false) // Small loader for 'Validate Card'
  const [cardValidated, setCardValidated] = useState(false) // State to track card validation success
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cardErrorMessage, setCardErrorMessage] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('Starter')
  const [selectedDuration, setSelectedDuration] = useState<string>('monthly')
  const [price, setPrice] = useState(19)
  // New state variables for OTP
  const [generatedOTP, setGeneratedOTP] = useState<string>('')
  const [enteredOTP, setEnteredOTP] = useState<string>('')
  const [otpVerified, setOtpVerified] = useState<boolean>(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false)
  const [isResendingOtp, setIsResendingOtp] = useState<boolean>(false)
  const [otpResentMessage, setOtpResentMessage] = useState<string>('')
  // New state for resend OTP countdown timer
  const [resendCountdown, setResendCountdown] = useState<number>(0)

  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState)
  }
  const stripe = useStripe()
  const elements = useElements()

  const countryOptions = [
    { code: '+1', name: 'United States' },
    { code: '+91', name: 'India' },
    { code: '+44', name: 'United Kingdom' },
    { code: '+61', name: 'Australia' },
    { code: '+81', name: 'Japan' },
    { code: '+49', name: 'Germany' },
    { code: '+33', name: 'France' },
    { code: '+86', name: 'China' },
    { code: '+7', name: 'Russia' },
    { code: '+39', name: 'Italy' },
    { code: '+34', name: 'Spain' },
    { code: '+55', name: 'Brazil' },
    { code: '+27', name: 'South Africa' },
    { code: '+82', name: 'South Korea' },
    { code: '+62', name: 'Indonesia' },
    { code: '+234', name: 'Nigeria' },
    { code: '+20', name: 'Egypt' },
    { code: '+63', name: 'Philippines' },
    { code: '+90', name: 'Turkey' },
    { code: '+966', name: 'Saudi Arabia' }
  ]

  useEffect(() => {
    setFormData((prevData) => ({
      ...prevData,
      subIndustryType: '',
    }))
  }, [formData.industryType])

  // useEffect to handle countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timerId = setTimeout(() => {
        setResendCountdown(resendCountdown - 1)
      }, 1000)
      return () => clearTimeout(timerId)
    }
  }, [resendCountdown])


  useEffect(() => {
    let finalPrice = 0

    if (selectedDuration === 'monthly') {
      finalPrice = selectedPlan === 'Starter' ? 19 : 45
    } else if (selectedDuration === 'half-yearly' && selectedPlan === 'Starter') {
      finalPrice = Math.ceil(17 * 6 * 100) / 100
    } else if (selectedDuration === 'half-yearly' && selectedPlan === 'Professional') {
      finalPrice = Math.ceil(37 * 6 * 100) / 100
    } else if (selectedDuration === 'yearly' && selectedPlan === 'Starter') {
      finalPrice = Math.ceil(16 * 12 * 100) / 100
    } else if (selectedDuration === 'yearly' && selectedPlan === 'Professional') {
      finalPrice = Math.ceil(36 * 12 * 100) / 100
    }
    setPrice(finalPrice)
  }, [selectedPlan, selectedDuration])


  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target

    if (name === 'industryType') {
      setFormData({
        ...formData,
        [name]: value,
        subIndustryType: '' // Reset sub-industry when industry changes
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }

    if (errors[name as keyof Errors]) {
      setErrors({
        ...errors,
        [name]: ''
      })
    }
  }

  const handleOTPVerification = async () => {
    setIsVerifyingOtp(true)
    if (enteredOTP.trim() === generatedOTP) {
      setOtpVerified(true)
      setOtpResentMessage('')
      setErrors((prevErrors) => ({ ...prevErrors, otp: '' }))
    } else {
      setOtpVerified(false)
      setErrors((prevErrors) => ({ ...prevErrors, otp: 'Invalid OTP. Please try again' }))
    }
    setIsVerifyingOtp(false)
  }

  const validateStep = async (): Promise<boolean> => {
    const newErrors: Errors = {}

    if (step === 1) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full Name is required'
      } else if (formData.fullName.trim().length > 20) {
        newErrors.fullName = 'Full Name cannot exceed 20 characters'
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'
      } else {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailRegex.test(formData.email.trim())) {
          newErrors.email = 'Please enter valid email id'
        }
      }
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone Number is required'
      } else {
        const phoneRegex = /^(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?$/
        if (!phoneRegex.test(formData.phoneNumber.trim())) {
          newErrors.phoneNumber = 'Please enter valid phone number with no special characters or spaces'
        }
      }
      if (!formData.password || !formData.password.trim()) {
        newErrors.password = 'Password is required'
      } else {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/
        if (!passwordRegex.test(formData.password.trim())) {
          newErrors.password = 'Password must be 8-16 character with 1 uppercase, 1 lowercase, 1 number & 1 special character'
        }
      }

      // Call checkUser only if no other errors exist
      if (Object.keys(newErrors).length === 0) {
        if (await checkUser()) {
          newErrors.email = 'This email already exists, please try another one'
        }
      }
    } else if (step === 2) {
      if (!enteredOTP.trim()) {
        newErrors.otp = 'OTP is required'
      } else if (enteredOTP.trim().length !== 6) {
        newErrors.otp = 'OTP must be 6 digits'
      } else if (!otpVerified) {
        newErrors.otp = 'Please verify OTP'
      }
    } else if (step === 3) {
      if (!formData.organisationName.trim()) {
        newErrors.organisationName = 'Organisation Name is required'
      } else if (formData.organisationName.trim().length > 50) {
        newErrors.organisationName = 'Organization Name cannot exceed 50 characters'
      }

      if (!formData.industryType.trim()) {
        newErrors.industryType = 'Industry Type is required'
      }
      if (!formData.subIndustryType.trim()) {
        newErrors.subIndustryType = 'Sub-Industry Type is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = async () => {
    // For step 2: if OTP not verified, show an alert and do not proceed
    if (step === 2 && !otpVerified) {
      alert('Please verify the otp')
      return
    }

    if (await validateStep()) {
      if (step === 1) {
        setEnteredOTP('')
        setOtpResentMessage('') // Reset OTP resend message
        setOtpVerified(false) // Reset OTP verification state
      }

      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    try {
      setErrorMessage(null) // Clear any previous errors
      if (!paymentMethodId) {
        setCardErrorMessage('Please validate your card before submitting.')
        return
      }

      if (await validateStep()) {
        if (formData && typeof formData === 'object') {
          setIsLoading(true)

          // Step 1: Register user first (this is easier to rollback)
          const registrationResult = await register()
          if (!registrationResult) {
            throw new Error('Registration failed')
          }

          // Step 2: Process payment if needed
          if (selectedPlan === 'Starter') {
            const paymentResult = await initiatePayment()
            if (paymentResult) {
              // If payment fails, rollback the registration
              await rollbackRegistration()
              throw new Error('Payment failed. Registration has been cancelled.')
            }
          }

          // Step 3: Complete setup
          await setLocalData()
          history.push({
            pathname: '/login',
          })
          history.replace('/home')
        } else {
          setErrorMessage(`formData is not a valid object: ${formData}`)
          console.error('formData is not a valid object:', formData)
        }
      }
    } catch (err: any) {
      setErrorMessage(`Error in form submission: ${err.message || err}`)
      console.error('Error in form submission:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)

      // upload creds to s3 (this flow is designed to make this project a multi-tenant)
      const s3Stat = await dbUpload()
      formData.token = s3Stat.dbData.token
      if (!s3Stat.success) {
        setIsLoading(false)
        setErrorMessage(s3Stat.msg)
        return false
      }

      // make an api call for internal login
      const { data } = await api.getAnonymous({ toastErrors: false }).post('/admin/auth/login/basic/default', {
        email: 'admin@gmail.com',
        password: 'Admin@123'
      })

      //set auth token after login
      auth.setToken(data.payload)

      // set stripe customer
      void setStripeCustomer()
      return true
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || 'Oops something went wrong while authenticating... Please try again later'
      setIsLoading(false)
      setErrorMessage(`Registration Failed : ${errorMsg}`)
      return false
    }
  }

  const dbUpload = async () => {
    try {
      const updatedFormData = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
        password: formData.password,
        organisationName: formData.organisationName,
        industryType: formData.industryType,
        subIndustryType: formData.subIndustryType,
        stripeCustomerId: customerId,
        stripePayementId: paymentMethodId,
        nextSubs: {
          plan: selectedPlan,
          duration: selectedDuration,
          price,
          suggested: false,
          isDowngrade: false // Default to false
        }
      }

      const result = await fetch(`${API_URL}/user-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: updatedFormData,
          from: 'register'
        }),
      })

      return result.json()
    } catch (error) {
      setIsLoading(false)
      return { success: false, msg: 'Error uploading credentials to S3' }
    }
  }

  const setStripeCustomer = async () => {
    try {
      if (!stripe || !elements) {
        return { success: false, msg: 'Stripe not loaded' }
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        return { success: false, msg: 'Card Element not available' }
      }

      const setupIntentRes = await fetch(`${API_URL}/create-setup-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, customerId: '-' }),
      })

      const { clientSecret, customerId } = await setupIntentRes.json()

      const res = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { email: formData.email },
        },
      })

      if (res.error) {
        return { success: false, msg: res.error.message }
      }

      let result
      if (typeof res.setupIntent.payment_method === 'string' && res.setupIntent.payment_method) {
        result = await fetch(`${API_URL}/attach-payment-method`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, paymentMethodId: res.setupIntent.payment_method || '', customerId: { id: customerId || '' } }),
        })
      } else {
        return { success: false, msg: 'Payment method ID is not valid' }
      }

      const data = await result.json()

      if (!data.success) {
        return { success: false, msg: result.status === 500 ? 'We are unable to validate your card... You can try with another one' : data.msg }
      }

      setCustomerId(data.customerId)
      setPaymentMethodId(data.paymentMethodId)
      return { success: true, msg: data.msg, data }
    } catch (err: any) {
      setIsLoading(false)
      return { success: false, msg: 'Card not verified due to some reason' }
    }
  }

  const initiatePayment = async () => {
    setIsPaymentLoading(true)
    try {
      const result = await fetch(`${API_URL}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({
          amount: price * 100, currency: 'usd',
          customerId: { id: customerId },
          paymentMethodId,
          email: formData.email,
          subscription: selectedPlan,
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

      if (!stripe) {
        throw new Error('Stripe not initialized')
      }

      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(data.client_secret.client_secret, {
        payment_method: paymentMethodId,
      })

      if (paymentError) {
        setErrorMessage(`Payment Failed: ${paymentError.message}`)
        return false
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        return true
      }
    } catch (error) {
      setErrorMessage(`Error during payment: ${error}`)
      return false
    } finally {
      setIsPaymentLoading(false)
    }
  }

  const checkUser = async () => {
    setIsLoading(true) // Show big loader
    try {
      const result = await fetch(`${API_URL}/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          from: 'register'
        }),
      })

      if (result.status === 200) {
        return true // Email already registered
      } else if (result.status === 400) {
        void sendOtp()
        return false // Email available to register
      } else {
        return false // Something went wrong
      }
    } catch (error) {
      return false
    } finally {
      setIsLoading(false) // Hide big loader
    }
  }

  // Send an otp to the user's email
  const sendOtp = async (resent = false) => {
    setIsResendingOtp(true)
    try {
      // Generate a random 6-digit OTP and save it
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedOTP(otp)
      await fetch(`${API_URL}/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          otp
        }),
      })

      if (resent) {
        setOtpResentMessage('OTP has been resent successfully')
        setResendCountdown(30) // Start the 30-second timer
      }
    } catch (error) {
      console.log('Error sending OTP:', error)
    } finally {
      setIsResendingOtp(false)
    }
  }

  const setLocalData = async () => {

    const updatedFormData = {
      fullName: formData.fullName,
      email: formData.email,
      phoneNumber: formData.phoneNumber, // Save full number
      countryCode: formData.countryCode, // Save separately as well if needed
      password: formData.password,
      organisationName: formData.organisationName,
      industryType: formData.industryType,
      subIndustryType: formData.subIndustryType,
      stripeCustomerId: customerId,
      stripePayementId: paymentMethodId,
      ...(selectedPlan !== 'Starter' && {
        nextSubs: {
          plan: selectedPlan,
          duration: selectedDuration,
          price,
          suggested: false,
          isDowngrade: false // Default to false
        }
      })
    }

    const currentUTC = new Date().toISOString().split('T')[0] // Always UTC
    const currentDate = new Date(currentUTC)

    const tillDateUTC = new Date()

    if (selectedPlan === 'Starter') {
      if (selectedDuration === 'monthly') {
        tillDateUTC.setMonth(currentDate.getMonth() + 1)
      } else {
        tillDateUTC.setFullYear(currentDate.getFullYear() + 1)
      }
    } else {
      tillDateUTC.setDate(currentDate.getDate() + 5)
    }

    const tillDate = new Date(tillDateUTC.toISOString().split('T')[0]) // Ensure it's in the same format

    // Check the days remaining
    const timeDifference = tillDate.getTime() - currentDate.getTime()
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24))

    const updatedSubData = {
      subscription: (selectedPlan === 'Starter') ? 'Starter' : 'Trial',
      createdAt: currentDate,
      till: tillDate,
      expired: false,
      daysRemaining,
      promptRun: false,  // set the prompt run to false
      amount: (selectedPlan === 'Starter') ? price : 0,
      duration: (selectedPlan === 'Starter') ? selectedDuration : '5d',
      canCancel: true,
      subsChanged: false,
      isCancelled: false, // Default to false
    }

    localStorage.setItem('formData', JSON.stringify(updatedFormData))
    localStorage.setItem('subData', JSON.stringify(updatedSubData))
    localStorage.setItem('token', JSON.stringify(formData.token))
  }

  const verifyCard = async () => {
    setIsValidatingCard(true) // Show small loader
    setCardValidated(false) // Reset card validation state
    setCardErrorMessage(null) // Clear any previous error messages

    if (!stripe || !elements) {
      setIsValidatingCard(false)
      setCardErrorMessage('Stripe is not loaded yet. Please try again later.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setIsValidatingCard(false)
      setCardErrorMessage('Card Element not available.')
      return
    }

    try {
      const { token, error } = await stripe.createToken(cardElement)
      if (error) {
        setIsValidatingCard(false)
        setCardErrorMessage(`Card verification failed: ${error.message}`)
        return
      }

      const stripeCustomerResponse = await setStripeCustomer()
      if (stripeCustomerResponse.success) {
        setCardValidated(true) // Set card validation success
      } else {
        setCardErrorMessage(stripeCustomerResponse.msg)
      }
    } catch (err) {
      setCardErrorMessage(`An error occurred while verifying the card: ${err.message || 'Please try again later.'}`)
    } finally {
      setIsValidatingCard(false) // Hide small loader
    }
  }

  const rollbackRegistration = async () => {
    try {
      const result = await fetch(`${API_URL}/rollback-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        }),
      })

      if (!result.status) {
        console.error('Rollback API call failed:', result.status, result.statusText)
        return false
      }

      const data = await result.json()
      return data.success
    } catch (error) {
      console.error('Rollback failed:', error)
      return false
    }
  }

  return (
    <div className='parent-wizard-container' style={{
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      width: '100%',
      minHeight: '100vh',
    }}>
      <div className='wizard-header-container' style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        whiteSpace: 'nowrap'
      }}>
        <img src={logo} alt='logo' className='wizard-header-logo' />
        <h3 style={{
          flex: 1,
          textAlign: 'center',
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          Register Wizard
        </h3>
        <button
          onClick={() => history.push('/login/:strategy?/:workspace?')}
          style={{
            marginLeft: '10px',
            padding: '8px 8px',
            background: '#fff',
            color: '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600
          }}>
          Back to Login
        </button>
      </div>
      <div className='wizard-container'>
        <div className='stepper'>
          <div className='stepper-steps'>
            {steps.map((label, index) => {
              const stepNumber = index + 1
              const isActive = step === stepNumber
              const isCompleted = step > stepNumber
              return (
                <div key={label} className='step-container'>
                  <div className={`step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className='step-title'>
                      {isCompleted && (
                        <img src={Check} alt='Completed' className='completed-icon' />
                      )}
                      <p>{label}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className='wizard-body'>
          {step === 1 && (
            <PersonalInfo
              formData={formData}
              errors={errors}
              handleChange={handleChange}
              togglePasswordVisibility={togglePasswordVisibility}
              showPassword={showPassword}
              countryOptions={countryOptions}
              nextStep={nextStep}
              isLoading={isLoading}
              history={history}
            />
          )}
          {step === 2 && (
            <EmailVerification
              formData={formData}
              errors={errors}
              enteredOTP={enteredOTP}
              setEnteredOTP={setEnteredOTP}
              otpVerified={otpVerified}
              isVerifyingOtp={isVerifyingOtp}
              isResendingOtp={isResendingOtp}
              resendCountdown={resendCountdown}
              otpResentMessage={otpResentMessage}
              handleOTPVerification={handleOTPVerification}
              sendOtp={sendOtp}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          )}
          {step === 3 && (
            <OrganizationInfo
              formData={formData}
              errors={errors}
              industryData={industryData}
              handleChange={handleChange}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          )}
          {step === 4 && (
            <PaymentInfo
              verifyCard={verifyCard}
              isValidatingCard={isValidatingCard}
              cardValidated={cardValidated}
              isLoading={isLoading}
              errorMessage={errorMessage}
              cardErrorMessage={cardErrorMessage}
              nextStep={nextStep}
              prevStep={prevStep}
              clearErrorMessage={() => setErrorMessage(null)}
              clearCardErrorMessage={() => setCardErrorMessage(null)}
            />
          )}
          {step === 5 && (
            <SubscriptionPlan
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
              selectedDuration={selectedDuration}
              setSelectedDuration={setSelectedDuration}
              price={price}
              handleSubmit={handleSubmit}
              prevStep={prevStep}
              isPaymentLoading={isPaymentLoading}
              isLoading={isLoading}
              errorMessage={errorMessage}
              cardErrorMessage={cardErrorMessage}
              isValidatingCard={isValidatingCard}
              clearErrorMessage={() => setErrorMessage(null)}
              clearCardErrorMessage={() => setCardErrorMessage(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerWizard

