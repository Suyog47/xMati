import React, { useState, useEffect } from 'react'
import { IoIosCall, IoMdPerson, IoMdMail, IoMdBusiness, IoIosLock, IoMdEye, IoMdEyeOff } from 'react-icons/io'
import Check from '../../assets/images/check.png'
import './style.css'
import { useHistory } from 'react-router-dom'
import bgImage from '../../assets/images/background.jpg'
import logo from '../../assets/images/xmati.png'
import api from '~/app/api'
import { auth } from 'botpress/shared'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { FormGroup } from '@blueprintjs/core'

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
}


const CustomerWizard: React.FC = () => {
  const steps = [
    'Personal Info',
    'Industry Type',
    'Subscriptions',
    'Payment'
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
    cardExpiry: ''
  })
  const [errors, setErrors] = useState<Errors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // Big loader for "Check User"
  const [isValidatingCard, setIsValidatingCard] = useState(false) // Small loader for "Validate Card"
  const [cardValidated, setCardValidated] = useState(false) // State to track card validation success
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cardErrorMessage, setCardErrorMessage] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('Starter')
  const [selectedDuration, setSelectedDuration] = useState<string>('monthly')
  const [price, setPrice] = useState(18)
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


  useEffect(() => {
    let finalPrice = 0
    if (selectedDuration === 'monthly') {
      finalPrice = selectedPlan === 'Starter' ? 18 : 100
    } else if (selectedDuration === 'half-yearly') {
      const raw = selectedPlan === 'Starter' ? 18 * 6 * 0.97 : 100 * 6 * 0.97
      finalPrice = Math.round(raw * 100) / 100
    } else if (selectedDuration === 'yearly') {
      const raw = selectedPlan === 'Starter' ? 18 * 12 * 0.95 : 100 * 12 * 0.95
      finalPrice = Math.round(raw * 100) / 100
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

  // const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const rawValue = e.target.value.replace(/-/g, '').replace(/\D/g, '') // Remove '-' and non-digit characters
  //   const formattedValue = rawValue
  //     .match(/.{1,4}/g) // Group digits in chunks of 4
  //     ?.join('-') || '' // Join with '-' if there are groups

  //   setFormData({
  //     ...formData,
  //     cardNumber: formattedValue,
  //   })

  //   if (errors.cardNumber) {
  //     setErrors({
  //       ...errors,
  //       cardNumber: '',
  //     })
  //   }
  // }

  // const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const rawValue = e.target.value.replace(/\D/g, '') // Remove non-digit characters
  //   let formattedValue = rawValue

  //   if (rawValue.length > 2) {
  //     formattedValue = `${rawValue.slice(0, 2)}/${rawValue.slice(2, 4)}` // Add '/' after the first 2 digits
  //   }

  //   setFormData({
  //     ...formData,
  //     cardExpiry: formattedValue,
  //   })

  //   if (errors.cardExpiry) {
  //     setErrors({
  //       ...errors,
  //       cardExpiry: '',
  //     })
  //   }
  // }

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
          newErrors.email = newErrors.email = 'Please enter valid email id'
        }

        if (await checkUser()) {
          newErrors.email = newErrors.email = 'This email already exists, please try another one'
        }
      }
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone Number is required'
      } else {
        const phoneRegex = /^(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?$/
        if (!phoneRegex.test(formData.phoneNumber.trim())) {
          newErrors.phoneNumber = newErrors.phoneNumber = 'Please enter valid phone number with no special characters or spaces'
        }
      }
      if (!formData.password || !formData.password.trim()) {
        newErrors.password = 'Password is required'
      } else {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/
        if (!passwordRegex.test(formData.password.trim())) {
          newErrors.password = newErrors.password = 'Password must be 8-16 character with 1 uppercase, 1 lowercase, 1 number & 1 special character'
        }
      }
      if (!formData.organisationName.trim()) {
        newErrors.organisationName = 'Organisation Name is required'
      } else if (formData.organisationName.trim().length > 50) {
        newErrors.organisationName = 'Organization Name cannot exceed 50 characters'
      }


    } else if (step === 2) {
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
    if (await validateStep()) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!paymentMethodId) {
      setCardErrorMessage('Please validate your card before submitting.')
      return
    }

    if (await validateStep()) {
      if (formData && typeof formData === 'object') {
        let status = await register()
        setIsLoading(false)
        if (status) {
          await setLocalData()
          history.push({
            pathname: '/login',
          })
          history.replace('/home')
        }
      } else {
        console.error('formData is not a valid object:', formData)
      }
    }
  }

  const register = async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)

      // upload creds to s3 (this flow is designed to make this project a multi-tenant)
      const s3Stat = await s3Upload()
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

  const s3Upload = async () => {
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
          suggested: false
        }
      }

      const result = await fetch('https://www.app.xmati.ai/apis/user-auth', {
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

      // const { paymentMethod, error } = await stripe.createPaymentMethod({
      //   type: 'card',
      //   card: cardElement,
      //   billing_details: { email: formData.email }
      // })

      // if (error) {
      //   return { success: false, msg: 'Error with card ' + error.message }
      // }

      // if (!paymentMethod) {
      //   return { success: false, msg: 'Error creating payment method' }
      // }


      // 1. Create SetupIntent on your backend
      const setupIntentRes = await fetch('https://www.app.xmati.ai/apis/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, customerId: '' }),
      })

      const { clientSecret, customerId } = await setupIntentRes.json()

      // 2. Confirm card setup (handles 3D Secure if needed)
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
        result = await fetch('https://www.app.xmati.ai/apis/attach-payment-method', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, paymentMethodId: res.setupIntent.payment_method || '', customerId: { id: customerId || '' } }),
        })
      } else {
        return { success: false, msg: 'Payment method ID is not valid' }
      }

      let data = await result.json()

      if (!data.success) {
        return { success: false, msg: result.status === 500 ? 'We are unable to validate your card... You can try with another one' : data.msg }
      }

      setCustomerId(data.customerId)
      setPaymentMethodId(data.paymentMethodId)
      return { success: true, msg: data.msg, data }
    } catch (err: any) {
      setIsLoading(false)
      return { success: false, msg: 'Error uploading subscription to S3' }
    }
  }

  const checkUser = async () => {
    setIsLoading(true) // Show big loader
    try {
      const result = await fetch('https://www.app.xmati.ai/apis/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      })

      if (result.status === 200) {
        return true // Email already registered
      } else if (result.status === 400) {
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
      nextSubs: {
        plan: selectedPlan,
        duration: selectedDuration,
        price,
        suggested: false
      }
    }

    const currentUTC = new Date().toISOString().split('T')[0] // Always UTC
    const tillDateUTC = new Date()
    tillDateUTC.setDate(tillDateUTC.getDate() + 5) // Add 15 days

    const currentDate = new Date(currentUTC)
    const tillDate = new Date(tillDateUTC.toISOString().split('T')[0]) // Ensure it's in the same format

    const updatedSubData = {
      subscription: 'Trial',
      createdAt: currentDate,
      till: tillDate,
      expired: false,
      daysRemaining: 5,
      promptRun: false,  // set the prompt run to false
      amount: 0,
      duration: '5d',
      canCancel: true,
      subsChanged: false,
      isCancelled: false, // Default to false
    }

    localStorage.setItem('formData', JSON.stringify(updatedFormData))
    localStorage.setItem('subData', JSON.stringify(updatedSubData))
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
      setCardErrorMessage('Card Element is not available.')
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

  return (
    <div className='parent-wizard-container' style={{
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      width: '100%',
      minHeight: '100vh',
    }}>
      <div className='wizard-header-container'>
        <img src={logo} alt='logo' className='wizard-header-logo' />
        <h3 style={{ textAlign: 'center', width: '100%', color: 'white' }}>Register Wizard</h3>
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
                  <div
                    className={`step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''
                      }`}
                  >
                    <div className='step-title'>
                      {isCompleted && (
                        <img
                          src={Check}
                          alt='Completed'
                          className='completed-icon'
                        />
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
            <>
              <div className='step'>
                <p className='stepHeader'>Personal Information</p>
                <div className='input-container'>
                  <IoMdPerson className='input-icon' />
                  <input
                    type='text'
                    name='fullName'
                    placeholder='Full Name'
                    value={formData.fullName}
                    onChange={handleChange}
                    className='custom-input'
                  />
                </div>
                {errors.fullName && (
                  <span className='error'>{errors.fullName}</span>
                )}

                <div className='input-container'>
                  <IoMdMail className='input-icon' />
                  <input
                    type='email'
                    name='email'
                    placeholder='Email'
                    value={formData.email}
                    onChange={handleChange}
                    className='custom-input'
                  />
                </div>
                {errors.email && <span className='error'>{errors.email}</span>}

                <div className='input-container' style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoIosCall className='input-icon' />
                  <select
                    name='countryCode'
                    value={formData.countryCode}
                    onChange={handleChange}
                    style={{
                      width: 60,
                      minWidth: 60,
                      fontSize: 15,
                      padding: '4px 4px',
                      border: 'none',
                      borderRadius: 4,
                      background: '#f9f9f9',
                      textAlign: 'center'
                    }}
                  >
                    {countryOptions.map(opt => (
                      <option key={opt.code} value={opt.code} label={`${opt.code}    (${opt.name})`}>
                        {opt.code}
                      </option>
                    ))}
                  </select>
                  <div style={{
                    width: 1,
                    height: 24,
                    background: '#ccc',
                    margin: '0 6px'
                  }} />
                  <input
                    type='tel'
                    name='phoneNumber'
                    placeholder='Phone Number'
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className='custom-input'
                    style={{ flex: 1 }}
                  />
                </div>
                {errors.countryCode && <span className='error'>{errors.countryCode}</span>}
                {errors.phoneNumber && (
                  <span className='error'>{errors.phoneNumber}</span>
                )}

                <div className='input-container'>
                  <IoIosLock className='input-icon' />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name='password'
                    placeholder='Password'
                    value={formData.password}
                    onChange={handleChange}
                    className='custom-input'
                  />
                  <span className='eye-icon' onClick={togglePasswordVisibility}>
                    {showPassword ? <IoMdEyeOff /> : <IoMdEye />}
                  </span>
                </div>
                {errors.password && <span className='error'>{errors.password}</span>}

                <div className='input-container'>
                  <IoMdBusiness className='input-icon' />
                  <input
                    type='text'
                    name='organisationName'
                    placeholder='Organisation Name'
                    value={formData.organisationName}
                    onChange={handleChange}
                    className='custom-input'
                  />
                </div>
                {errors.organisationName && (
                  <span className='error'>{errors.organisationName}</span>
                )}

              </div>
              <div className='button-container'>
                <button className='nextButton' onClick={nextStep} disabled={isLoading}>
                  Next
                </button>

                {(isLoading) && (
                  <div className='modal-overlay'>
                    <div className='modal-content'>
                      {isLoading ? (
                        <>
                          <div className='loader'></div>
                          <p>Email is getting checked... Please wait.</p>
                        </>
                      ) : (
                        <>
                          {/* <p>{errorMessage}</p>
                              <button onClick={() => setErrorMessage(null)}>Close</button> */}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}


          {step === 2 && (
            <>
              <div className='step'>
                <p className='stepHeader'>Industry Type</p>
                <div className='selectbox-container'>
                  <select
                    name='industryType'
                    className='custom-input selectbox-input'
                    value={formData.industryType}
                    onChange={handleChange}
                  >
                    <option value=''>Select Industry</option>
                    {industryData.map((item, index) => (
                      <option key={index} value={item.industry}>
                        {item.industry}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.industryType && <span className='error'>{errors.industryType}</span>}

                {formData.industryType && (
                  <>
                    <p className='stepHeader'>Sub Industry Type</p>
                    <div className='selectbox-container'>
                      <select
                        name='subIndustryType'
                        className='custom-input selectbox-input'
                        value={formData.subIndustryType}
                        onChange={handleChange}
                      >
                        <option value=''>Select Sub Industry</option>
                        {industryData
                          .find((item) => item.industry === formData.industryType)
                          ?.subIndustries.map((subIndustry, index) => (
                            <option key={index} value={subIndustry}>
                              {subIndustry}
                            </option>
                          ))}
                      </select>
                    </div>
                    {errors.subIndustryType && <span className='error'>{errors.subIndustryType}</span>}
                  </>
                )}
              </div>
              <div className='button-container'>
                <div className='buttons'>
                  <button onClick={prevStep}>Back</button>
                  <button onClick={nextStep}>Next</button>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div
                style={{
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                {/* Left: Subscription Plan Container */}
                <div
                  style={{
                    flex: 1,
                    marginRight: '20px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '15px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <h2 style={{ marginBottom: '15px', fontSize: '1.3em', color: '#333' }}>
                    Select Your Subscription Plan
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      marginBottom: '20px',
                    }}
                  >
                    {['Starter', 'Professional'].map((plan) => (
                      <div
                        key={plan}
                        onClick={() => setSelectedPlan(plan)}
                        style={{
                          flex: 1,
                          margin: '0 10px',
                          border: `2px solid ${selectedPlan === plan ? '#2196f3' : '#e0e0e0'
                            }`,
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
                          {plan === 'Starter' ? '$18/month' : '$100/month'}
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
                    ))}
                  </div>
                </div>

                {/* Right: Subscription Duration Section */}
                <div
                  style={{
                    flexBasis: '35%',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    textAlign: 'left',
                  }}
                >
                  <h4 style={{ marginBottom: '15px', fontSize: '1.2em', color: '#333' }}>
                    Subscription Duration
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '1em', color: '#555' }}>
                      <input
                        type="radio"
                        name="subscriptionDuration"
                        value="monthly"
                        checked={selectedDuration === 'monthly'}
                        onChange={() => setSelectedDuration('monthly')}
                        style={{ marginRight: '10px' }}
                      />
                      Monthly
                    </label>
                    <label style={{ fontSize: '1em', color: '#555' }}>
                      <input
                        type="radio"
                        name="subscriptionDuration"
                        value="half-yearly"
                        checked={selectedDuration === 'half-yearly'}
                        onChange={() => setSelectedDuration('half-yearly')}
                        style={{ marginRight: '10px' }}
                      />
                      Half-Yearly
                    </label>
                    <label style={{ fontSize: '1em', color: '#555' }}>
                      <input
                        type="radio"
                        name="subscriptionDuration"
                        value="yearly"
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

                  {/* Computed Price Display (moved below the two sections) */}
                  <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#333' }}>
                      Price after 30-day free trial: ${price}
                      {selectedDuration === 'monthly'
                        ? ' per month'
                        : selectedDuration === 'half-yearly'
                          ? ' every 6 months (3% discount)'
                          : ' every year (5% discount)'}
                    </p>
                  </div>
                </div>
              </div>
              <div className='button-container'>
                <div className='buttons'>
                  <button onClick={prevStep}>Back</button>
                  <button onClick={nextStep}>Next</button>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className='step'>
                <p className='stepHeader'>Payment Information</p>
                <p className='stepSubtitleSmall'>We are securely saving your credit card details to simplify future subscription plan purchases. No charges will be made at this time.</p>

                <div className='card-element-container'>
                  <FormGroup label="Credit/Debit Card Details">
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                      }}
                      disabled={isValidatingCard || !stripe || !elements}
                    >
                      {isValidatingCard && <div className='small-loader'></div>}
                      Verify your Card
                    </button>
                  </FormGroup>

                  {/* Success Message */}
                  {cardValidated && (
                    <div className='success-message'>
                      <img
                        src='https://cdn-icons-png.flaticon.com/512/845/845646.png' // Tick icon URL
                        alt='Success'
                        className='success-icon'
                      />
                      <span>Your card has been successfully verified.</span>
                    </div>
                  )}

                  {/* Error Message */}
                  {/* {errorMessage && <span className='error'>{errorMessage}</span>} */}
                </div>
              </div>

              <div className='button-container'>
                <div className='buttons'>
                  <button onClick={prevStep}>Back</button>
                  <button onClick={handleSubmit} disabled={isLoading || !stripe || !elements}>
                    Submit
                  </button>
                </div>
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
                          {(errorMessage && <><p>{errorMessage}</p><button onClick={() => setErrorMessage(null)}>Close</button></>)}
                        </>
                      )}

                      {isValidatingCard ? (
                        <>
                          <div className='loader'></div>
                          <p>You card is being validated... Please wait...</p>
                        </>
                      ) : (
                        <>
                          {(cardErrorMessage && <><p>{cardErrorMessage}</p><button onClick={() => setCardErrorMessage(null)}>Close</button></>)}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}


        </div>
      </div>
    </div>
  )
}

export default CustomerWizard
