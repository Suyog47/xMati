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
import ms from 'ms'
import { AnyRecord } from 'dns'


interface FormData {
  fullName: string
  email: string
  phoneNumber: string
  password: string
  organisationName: string
  industryType: string
  subIndustryType: string
  botAIPrompt: string
  template: string
  channel: string
  botToken: string
  slackBotToken: string
  slackSigningSecret: string
  messengerAccessToken: string
  messengerAppSecret: string
  botId: string
  botName: string
}

interface Errors {
  fullName?: string
  email?: string
  phoneNumber?: string
  password?: string
  organisationName?: string
  industryType?: string
  subIndustryType?: string
  botAIPrompt?: string
  template?: string
  channel?: string
  botToken?: string
  slackBotToken?: string
  slackSigningSecret?: string
  messengerAccessToken?: string
  messengerAppSecret?: string
  botName?: string
}

interface Industry {
  industry: string
  subIndustry: string
}
interface BotTemplate {
  id: string
  name: string
}


const CustomerWizard: React.FC = () => {
  const steps = [
    'Personal Info',
    'Industry Type',
    'Bot Creation',
    'Channel Setup',
  ]

  const industryData = {
    industries: [
      { industry: 'Agriculture', subIndustry: 'Precision Farming' },
      { industry: 'Technology', subIndustry: 'Artificial Intelligence' },
      { industry: 'Finance', subIndustry: 'Investment Banking' },
      { industry: 'Healthcare', subIndustry: 'Telemedicine' },
      { industry: 'Entertainment', subIndustry: 'Virtual Reality Gaming' }
    ]
  }

  const botTemplates = [
    { id: 'insurance-bot', name: 'Insurance Bot' },
    // { id: 'welcome-bot', name: 'Welcome Bot' },
    // { id: 'small-talk', name: 'Small Talk' },
    { id: 'empty-bot', name: 'Empty Bot' },
    //{ id: 'learn-botpress', name: 'Learn Botpress' },
  ]
  let botId: any
  let verifyToken: any

  const history = useHistory()
  const [step, setStep] = useState<number>(1)
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    organisationName: '',
    industryType: '',
    subIndustryType: '',
    botAIPrompt: '',
    template: '',
    channel: '',
    botToken: '',
    slackBotToken: '',
    slackSigningSecret: '',
    messengerAccessToken: '',
    messengerAppSecret: '',
    botId: '',
    botName: ''
  })
  const [errors, setErrors] = useState<Errors>({})
  // const [formDataOptions, setFormDataOptions] = useState({
  //   industries: [],
  //   botTemplates: [],
  // })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null) // Fix applied
  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState)
  }

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
    setFormData({
      ...formData,
      [name]: value,
    })

    if (errors[name as keyof Errors]) {
      setErrors({
        ...errors,
        [name]: '',
      })
    }
  }

  const validateStep = async (): Promise<boolean> => {
    const newErrors: Errors = {}

    if (step === 1) {

      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full Name is required'
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
          newErrors.phoneNumber = newErrors.phoneNumber = 'Please enter valid phone number'
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
      }


    } else if (step === 2) {
      if (!formData.industryType.trim()) {
        newErrors.industryType = 'Industry Type is required'
      }
      if (!formData.subIndustryType.trim()) {
      }
    } else if (step === 3) {
      if (!formData.botName.trim()) {
        newErrors.botName = 'Bot Name is required'
      } else if (!/^[A-Za-z0-9]+$/.test(formData.botName)) {
        newErrors.botName = 'Only letters and numbers are allowed (no spaces or special characters)'
      }
      if (!formData.botAIPrompt.trim() && !formData.template.trim()) {
        newErrors.botAIPrompt = 'Bot Prompt or Template is required'
      }
      if (!formData.channel.trim()) {
        newErrors.channel = 'Channel is required'
      }
    } else if (step === 4) {
      if (formData.channel === 'Telegram') {
        if (!formData.botToken.trim()) {
          newErrors.botToken = 'Bot Token is required'
        }
      }
      if (formData.channel === 'Slack') {
        if (!formData.slackBotToken.trim()) {
          newErrors.slackBotToken = 'Bot Token is required'
        }

        if (!formData.slackSigningSecret.trim()) {
          newErrors.slackSigningSecret = 'Signing Secret is required'
        }
      }
      if (formData.channel === 'Facebook Messenger') {
        if (!formData.messengerAccessToken.trim()) {
          newErrors.messengerAccessToken = 'Access Token is required'
        }

        if (!formData.messengerAppSecret.trim()) {
          newErrors.messengerAppSecret = 'App Secret is required'
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

      // create the bot
      let status = await createBot()

      // create subscription for the user
      await setSubscriber()

      return status
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
        password: formData.password,
        organisationName: formData.organisationName,
        industryType: formData.industryType,
        subIndustryType: formData.subIndustryType,
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

  const setSubscriber = async () => {
    try {
      const result = await fetch('https://www.app.xmati.ai/apis/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: formData.email, name: formData.fullName, subscription: 'trial' }),
      })

      return result.json()
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

  const generateRandomString = (length: number = 16): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length)
      result += chars[randomIndex]
    }
    return result
  }

  const createBot = async () => {
    try {
      // const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
      let frm = (!formData.botAIPrompt) ? 'template' : 'llm'

      const newBot = {
        id: botId,
        name: formData.botName,
        owner: formData.email,
        template: { id: formData.template.toLowerCase().replace(/ /g, '-'), moduleId: 'builtin' },
        from: frm,
        botDesc: formData.botAIPrompt,
        telegramToken: formData.botToken,
        slackBotToken: formData.slackBotToken,
        slackSigningSecret: formData.slackSigningSecret,
        messengerAccessToken: formData.messengerAccessToken,
        messengerAppSecret: formData.messengerAppSecret,
        messengerVerifyToken: verifyToken,
      }
      let res = await api.getSecured({ timeout: ms('12m') }).post('/admin/workspace/bots', newBot)
      return true
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || 'Oops something went wrong while generating a bot... Please try again later'
      setIsLoading(false)
      setErrorMessage(`Bot Creation Failed : ${errorMsg}`)
      return false
    }
  }

  const setLocalData = async () => {
    const updatedFormData = {
      fullName: formData.fullName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      password: formData.password,
      organisationName: formData.organisationName,
      industryType: formData.industryType,
      subIndustryType: formData.subIndustryType,
    }

    localStorage.setItem('formData', JSON.stringify(updatedFormData))
  }

  const renderBotSetupInstructions = () => {
    botId = `${formData.email.replace(/[^A-Za-z0-9]/g, '')}-${formData.botName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    if (!verifyToken) {
      verifyToken = formData.email + 'tok' + formData.botName.toLocaleLowerCase()
    }


    switch (formData.channel) {
      case 'Web Chat':
        return (
          <ol>
            <li>Below are the scripts that you have to implement inside your website code.</li>
            <li><code>
              {'<script src="https://www.app.xmati.ai/assets/modules/channel-web/inject.js"></script>'}
            </code></li>
            <li> <code>
              {`<script>\n
                window.botpressWebChat.init({\n
                host: "https://www.app.xmati.ai",\n
                botId: "${botId}"\n
              })\n
              </script>`}
            </code></li>
            <li>Please add these scripts after creating the bot here.</li>
          </ol>
        )

      // case 'Whatsapp':
      //   return (
      //     <ol>
      //       <li>Register for WhatsApp Business API.</li>
      //       <li>Generate an access token from your provider.</li>
      //       <li>Enter the access token below.</li>
      //       <input
      //         style={{ borderRadius: '12px' }}
      //         type='text'
      //         name='botToken'
      //         placeholder='Paste your WhatsApp API token here'
      //         value={formData.botToken}
      //         onChange={handleChange}
      //       />
      //       {errors.botToken && <span className='error' style={{ marginLeft: '17px' }}>{errors.botToken}</span>}
      //     </ol>
      //   )

      case 'Telegram':
        return (
          <ol>
            <li>Open <strong>BotFather</strong> in Telegram.</li>
            <li>Type <code>/newbot</code> and follow the steps.</li>
            <li>Copy the <strong>botToken</strong> and provide it below.</li>
            <input
              style={{ borderRadius: '12px' }}
              type='text'
              name='botToken'
              placeholder='Paste your botToken here'
              value={formData.botToken}
              onChange={handleChange}
            />
            {errors.botToken && <span className='error' style={{ marginLeft: '17px' }}>{errors.botToken}</span>}
          </ol>
        )

      case 'Slack':
        return (
          <ol>
            <li><b>Please read the instructions carefully</b></li>
            <li>Navigate to your <b>Slack Apps</b> page.</li>
            <li>Click <b>Create New App</b>, choose <b>From scratch</b>, and give your app a name. Make sure to remember this name—you'll need it later.</li>
            <li>Go to the <b>Features</b> section, select <b>Interactivity & Shortcuts</b>, and toggle <b>Interactivity</b> to On.</li>
            <li>Set the Request URL to:- <b>'https://www.app.xmati.ai/api/v1/messaging/webhooks/{botId}/slack/interactive'</b></li>
            <li>Click <b>Save Changes.</b></li>
            <li>In <b>Features</b>, open <b>OAuth & Permissions</b> and add the following under <b>Bot Token Scopes</b>:- 'chat:write'</li>
            <li>Still under <b>Features</b>, go to <b>App Home</b>. Under <b>Show Tabs</b>, enable the option <b>Allow users to send Slash commands and messages from the messages tab.</b></li>
            <li>Head over to <b>Settings {'>'} Install App</b>, then click <b>Install to Workspace</b>. On the next screen, <b>click Allow</b>.</li>
            <li>Copy the <b>Bot Token</b>, come here to xMati wizard and paste it in the required field.</li>
            <li>Locate the <b>Signing Secret</b> in the <b>Basic Information</b> section, and paste it as well.</li>
            <li>Click <b>Submit</b> button here and wait for the bot to be created.</li>
            <li>Go back to the <b>Slack App</b> page, navigate to <b>Features {'>'} Event Subscriptions</b>, and enable <b>Event Subscriptions</b>.</li>
            <li>Set the <b>Request URL</b> to:- <b>'https://www.app.xmati.ai/api/v1/messaging/webhooks/{botId}/slack/events'</b></li>
            <li>Under <b>Subscribe to Bot Events</b>, add the following events: - <b>'message.im'</b> and <b>'message.channels'</b></li>
            <li>Wait for the <b>Verified</b> confirmation next to the URL and save your changes.</li>
            <li>A yellow banner may appear at the top—click <b>Reinstall your app</b>, then click Allow.</li>
            <li>Restart your Slack application.</li>
            <li>In Slack, go to the <b>Apps</b> section, click <b>+ Add apps</b>, search for your app by name, and select it.</li>
            <li>You can now start chatting with your <b>Chat bot</b> in Slack.</li>

            <input
              style={{ borderRadius: '12px' }}
              type='text'
              name='slackBotToken'
              placeholder='Paste your Slack bot token here'
              value={formData.slackBotToken}
              onChange={handleChange}
            />
            {errors.slackBotToken && <span className='error' style={{ marginLeft: '17px' }}>{errors.slackBotToken}</span>}

            <input
              style={{ borderRadius: '12px' }}
              type='text'
              name='slackSigningSecret'
              placeholder='Paste your Slack signing secret here'
              value={formData.slackSigningSecret}
              onChange={handleChange}
            />
            {errors.slackSigningSecret && <span className='error' style={{ marginLeft: '17px' }}>{errors.slackSigningSecret}</span>}
          </ol>
        )

      case 'Facebook Messenger':
        return (
          <ol>
            <li><b>Please read the instructions carefully</b></li>
            <li>Messenger requires you to have a <b>Facebook App</b> and a <b>Facebook Page</b> to connect your chatbot to the platform.</li>
            <li>Log in to your Facebook account and ensure you have admin rights for the Facebook page you want to connect your chatbot to.</li>
            <li>Visit the <b>Facebook for Developers</b> website.</li>
            <li>Click <b>My Apps</b> from the top menu and create a new app.</li>
            <li>After creating one, In the left sidebar, expand <b>Settings</b> → <b>Basic</b>.</li>
            <li>Click <b>Show</b> next to <b>App Secret</b> and copy the value. You will need it later</li>
            <li>Copy this verify token <b>'{verifyToken}'</b> as well</li>
            <li>In <b>Facebook App</b>, go to <b>Products</b> → <b>Messenger</b> → <b>Messanger Api Settings</b>. You need to add it first.</li>
            <li>Go to <b>Generate Access Tokens</b> and link your Facebook page.</li>
            <li>After successful linking, click on <b>Generate</b> button on the right side and copy the <b>Access token</b></li>
            <li>Come back here and paste the <b>App Secret</b> and <b>Access Token</b> you copied earlier</li>
            <li>Click <b>Submit</b> button and wait for the bot to be created.</li>
            <li>Go back to the <b>Facebook App</b> page and under <b>Configure Webhooks</b>, Enter the Callback URL:- <b>https://www.app.xmati.ai/api/v1/messaging/webhooks/{botId}/messenger</b></li>
            <li>Paste the verify token that you have copied earlier from point 8.</li>
            <li>Click on <b>'Verify and save'</b>.</li>
            <li>Make sure you enable <b>`messages`</b> and <b>`messaging_postbacks`</b> inside <b>Subscription Fields</b></li>
            <li>Open your facebook page and select the <b>Messenger</b> button</li>
            <li>You can now start chatting with your Chat bot in <b>Messenger</b>.</li>

            <input
              style={{ borderRadius: '12px' }}
              type='text'
              name='messengerAccessToken'
              placeholder='Paste your access token here'
              value={formData.messengerAccessToken}
              onChange={handleChange}
            />
            {errors.messengerAccessToken && <span className='error' style={{ marginLeft: '17px' }}>{errors.messengerAccessToken}</span>}

            <input
              style={{ borderRadius: '12px' }}
              type='text'
              name='messengerAppSecret'
              placeholder='Paste your app secret here'
              value={formData.messengerAppSecret}
              onChange={handleChange}
            />
            {errors.messengerAppSecret && <span className='error' style={{ marginLeft: '17px' }}>{errors.messengerAppSecret}</span>}

          </ol>
        )
      // case 'Teams':
      //   return (
      //     <ol>
      //       <li>Go to <a href='https://dev.teams.microsoft.com' target='_blank' rel='noopener noreferrer'>Microsoft Teams Developer Portal</a>.</li>
      //       <li>Create a new bot application.</li>
      //       <li>Generate a bot token and paste it below.</li>
      //       <input
      //         style={{ borderRadius: '12px' }}
      //         type='text'
      //         name='botToken'
      //         placeholder='Paste your Teams bot token here'
      //         value={formData.botToken}
      //         onChange={handleChange}
      //       />
      //       {errors.botToken && <span className='error' style={{ marginLeft: '17px' }}>{errors.botToken}</span>}
      //     </ol>
      //   )

      default:
        return <p>Please select a valid channel in Step 3.</p>
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
        {/* <h3 style={{ color: 'white' }}>XMati</h3> */}
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
                      {/* {index < steps.length - 1 && (
                      <div
                        className={`line ${
                          isCompleted ? 'completed-line' : ''
                        }`}
                      ></div>
                    )} */}
                      {index < steps.length - 1 && (
                        <div
                          className={`line ${isCompleted ? 'completed-line' : 'in-completed-line'
                            }`}
                        ></div>
                      )}
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

                <div className='input-container'>
                  <IoIosCall className='input-icon' />
                  <input
                    type='tel'
                    name='phoneNumber'
                    placeholder='Phone Number'
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className='custom-input'
                  />
                </div>
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
                    {[...new Set(industryData.industries.map(item => item.industry))].map(
                      (industry, index) => (
                        <option key={index} value={industry}>
                          {industry}
                        </option>
                      )
                    )}
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
                        {[...new Set(industryData.industries.map(item => item.subIndustry))].map(
                          (industry, index) => (
                            <option key={index} value={industry}>
                              {industry}
                            </option>
                          )
                        )}
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
                <p className='stepHeader'>
                  Select from the ready-made templates or provide a prompt according to your need
                </p>

                <p className='stepSubtitle'>Bot Name</p>
                <div className='input-container'>
                  <input
                    type='text'
                    name='botName'
                    placeholder='Bot Name'
                    value={formData.botName}
                    onChange={handleChange}
                    className='custom-input'
                  />
                </div>
                {errors.botName && (
                  <span className='error'>{errors.botName}</span>
                )}

                <p className='stepSubtitle'>Bot Template</p>
                <div className='selectbox-container'>
                  <select
                    name='template'
                    value={formData.template}
                    onChange={handleChange}
                    className='custom-input selectbox-input'
                  >
                    <option value=''>Select Template</option>
                    {botTemplates.map((template) => (
                      <option key={template.id} value={template.name}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <p className='stepSubtitleOr'>Or</p>
                <p className='stepSubtitle'>Bot AI Prompt   (Kindly describe the bot clearly and concisely)</p>
                <p className='stepSubtitleSmall'>Our AI may make some mistakes while generating the bot for now , so please review the flow manually and make any necessary adjustments.</p>

                <div className='selectbox-container'>
                  <textarea
                    name='botAIPrompt'
                    placeholder='Enter your Bot AI prompt here...'
                    value={formData.botAIPrompt}
                    onChange={handleChange}
                    className='custom-input selectbox-input'
                  />
                </div>
                {errors.botAIPrompt && <span className='error'>{errors.botAIPrompt}</span>}

                <br />
                <p className='stepSubtitle'>Channel</p>
                <div className='selectbox-container'>
                  <select
                    name='channel'
                    value={formData.channel}
                    onChange={handleChange}
                    className='custom-input selectbox-input'
                  >
                    <option value=''>Select Channel</option>
                    <option value='Web Chat'>Web Chat</option>
                    <option value='Telegram'>Telegram</option>
                    <option value='Slack'>Slack</option>
                    <option value='Facebook Messenger'>Facebook Messenger</option>
                    {/* <option value='Teams'>Teams</option> */}
                    {/* <option value='Whatsapp'>Whatsapp</option> */}
                  </select>
                </div>
                {errors.channel && <span className='error'>{errors.channel}</span>}
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
                <p className='stepHeader'>{formData.channel} Bot Setup Instructions</p>
                <div className='instructions-container'>{renderBotSetupInstructions()}</div>
              </div>
              <div className='button-container'>
                <div className='buttons'>
                  <button onClick={prevStep} disabled={isLoading}>Back</button>
                  <button onClick={handleSubmit} disabled={isLoading}>Submit</button>

                  {(isLoading || errorMessage) && (
                    <div className='modal-overlay'>
                      <div className='modal-content'>
                        {isLoading ? (
                          <>
                            <div className='loader'></div>
                            <p>Bot is getting created... Please wait... It may take some time</p>
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
    </div>
  )
}

export default CustomerWizard
