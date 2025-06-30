import React, { useState, useEffect } from 'react'
import { IoIosCall, IoMdPerson, IoMdMail, IoMdBusiness, IoIosLock, IoMdEye, IoMdEyeOff } from 'react-icons/io'
import axios from 'axios'
import Check from '../../assets/images/check.png'
import './style.css'
import BotSetupInstructions from '~/channels/getChannelInstructions'
import { useHistory } from 'react-router-dom'
import bgImage from '../../assets/images/background.jpg'
import logo from '../../assets/images/xmati.png'
import api from '~/app/api'
import { auth } from 'botpress/shared'
// import ms from 'ms'
// import { AnyRecord } from 'dns'


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
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null) // Fix applied
  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState)
  }

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
    } else if (step === 3) {
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = 'Card Number is required'
      } else if (!/^\d{16}$/.test(formData.cardNumber.trim())) {
        newErrors.cardNumber = 'Card Number must be 16 digits'
      }

      if (!formData.cardCVC.trim()) {
        newErrors.cardCVC = 'CVC/CVV is required'
      } else if (!/^\d{3,4}$/.test(formData.cardCVC.trim())) {
        newErrors.cardCVC = 'CVC/CVV must be 3 or 4 digits'
      }

      if (!formData.cardExpiry.trim()) {
        newErrors.cardExpiry = 'Expiry Date is required'
      } else {
        const [month, year] = formData.cardExpiry.split('/').map(Number)
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth() + 1
        const currentYear = parseInt(currentDate.getFullYear().toString().slice(-2))

        if (
          !month ||
          !year ||
          month < 1 ||
          month > 12 ||
          year < currentYear ||
          (year === currentYear && month < currentMonth)
        ) {
          newErrors.cardExpiry = 'Expiry Date must be valid and not in the past'
        }
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
    if (await validateStep()) {
      if (formData && typeof formData === 'object') {
        // setIsLoading(true)
        let status = await register()
        setIsLoading(false)
        if (status) {
          await setLocalData()
          history.push({
            pathname: '/login'
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

      // make an api call to login the admin
      const { data } = await api.getAnonymous({ toastErrors: false }).post('/admin/auth/login/basic/default', {
        email: 'admin@gmail.com',
        password: 'Admin@123'
      })

      //set auth token after login
      auth.setToken(data.payload)

      // create subscription for the user
      await setSubscriber()
      await setStripeCustomer()
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
    const custId = await setStripeCustomer()

    try {
      const updatedFormData = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber, // Save full number
        countryCode: formData.countryCode, // Save separately as well if needed
        password: formData.password,
        organisationName: formData.organisationName,
        industryType: formData.industryType,
        subIndustryType: formData.subIndustryType,
        card: formData.cardNumber,
        cardCVC: formData.cardCVC,
        cardExpiry: formData.cardExpiry,
        stripeCustomerId: custId.data
      }

      const result = await fetch('http://localhost:8000/user-auth', {
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

  const setSubscriber = async () => {
    try {
      const result = await fetch('http://localhost:8000/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: formData.email, name: formData.fullName, subscription: 'Trial', duration: '15d', amount: '0' }),
      })

      return result.json()
    } catch (err: any) {
      setIsLoading(false)
      return { success: false, msg: 'Error uploading subscription to S3' }
    }
  }

  const setStripeCustomer = async () => {
    try {
      const result = await fetch('http://localhost:8000/create-stripe-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      })

      let data = await result.json()
      setCustomerId(data.data)
      return data
    } catch (err: any) {
      setIsLoading(false)
      return { success: false, msg: 'Error uploading subscription to S3' }
    }
  }

  const checkUser = async () => {
    setIsLoading(true)
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

      if (result.status === 400) {    // 400 means email already registered
        return true
      } else if (result.status === 200) {     // 200 means email is available to register
        return false
      } else {       // 500 means something went wrong
        return false
      }
    } catch (error) {
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const setLocalData = async () => {
    const custId = await setStripeCustomer()

    const updatedFormData = {
      fullName: formData.fullName,
      email: formData.email,
      phoneNumber: formData.countryCode + formData.phoneNumber, // Save full number
      countryCode: formData.countryCode, // Save separately as well if needed
      password: formData.password,
      organisationName: formData.organisationName,
      industryType: formData.industryType,
      subIndustryType: formData.subIndustryType,
      card: formData.cardNumber,
      cardCVC: formData.cardCVC,
      cardExpiry: formData.cardExpiry,
      stripeCustomerId: custId.data
    }

    const currentUTC = new Date().toISOString().split('T')[0] // Always UTC
    const tillDateUTC = new Date()
    tillDateUTC.setDate(tillDateUTC.getDate() + 15) // Add 15 days

    const currentDate = new Date(currentUTC)
    const tillDate = new Date(tillDateUTC.toISOString().split('T')[0]) // Ensure it's in the same format

    const updatedSubData = {
      subscription: 'Trial',
      createdAt: currentDate,
      till: tillDate,
      expired: false,
      daysRemaining: 15,
      promptRun: false  // set the prompt run to false
    }

    localStorage.setItem('formData', JSON.stringify(updatedFormData))
    localStorage.setItem('subData', JSON.stringify(updatedSubData))
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
              <div className='step'>
                <p className='stepHeader'>Payment Information</p>
                <p className='stepSubtitleSmall'>We are securely saving your credit card details to simplify future subscription plan purchases. No charges will be made at this time.</p>
                <div className='input-container'>
                  <label htmlFor='cardNumber'>Card Number</label>
                  <input
                    type='text'
                    id='cardNumber'
                    name='cardNumber'
                    placeholder='Card Number'
                    value={formData.cardNumber}
                    onChange={handleChange}
                    className='custom-input'
                  />
                </div>
                {errors.cardNumber && <span className='error'>{errors.cardNumber}</span>}

                <div className='horizontal-container'>
                  <div className='input-container'>
                    <label htmlFor='cardCVC'>CVC/CVV</label>
                    <input
                      type='text'
                      id='cardCVC'
                      name='cardCVC'
                      placeholder='CVC/CVV'
                      value={formData.cardCVC}
                      onChange={handleChange}
                      className='custom-input'
                    />
                  </div>
                  {/* {errors.cardCVC && <span className='error'>{errors.cardCVC}</span>} */}
                  <div className='input-container'>
                    <label htmlFor='cardExpiry'>Expiry Date (MM/YY)</label>
                    <input
                      type='text'
                      id='cardExpiry'
                      name='cardExpiry'
                      placeholder='MM/YY'
                      value={formData.cardExpiry}
                      onChange={handleChange}
                      className='custom-input'
                    />
                  </div>
                  {/* {errors.cardExpiry && <span className='error'>{errors.cardExpiry}</span>} */}
                </div>
                <div className='horizontal-container'>
                  {errors.cardCVC && <span className='error'>{errors.cardCVC}</span>}
                  {errors.cardExpiry && <span className='error'>{errors.cardExpiry}</span>}
                </div>

              </div>

              <div className='button-container'>
                <div className='buttons'>
                  <button onClick={prevStep}>Back</button>
                  <button onClick={handleSubmit} disabled={isLoading}>Submit</button>
                  {(isLoading || errorMessage) && (
                    <div className='modal-overlay'>
                      <div className='modal-content'>
                        {isLoading ? (
                          <>
                            <div className='loader'></div>
                            <p>Your xMati account is getting created... Please wait...</p>
                          </>
                        ) : (
                          <>
                            <p>{errorMessage}</p>
                            <button onClick={() => setErrorMessage(null)}>Close</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div >
  )
}

export default CustomerWizard
