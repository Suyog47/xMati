import { lang } from 'botpress/shared'
import { AuthStrategyConfig } from 'common/typings'
import { get } from 'lodash'
import React, { FC, useEffect, useState } from 'react'
import { RouteComponentProps } from 'react-router'
import api from '~/app/api'
import { ExtendedHistory } from '~/app/history'
import BasicAuthentication, { setActiveWorkspace, setChatUserAuth } from '~/auth/basicAuth'
import { fetchBots } from '~/workspace/bots/reducer'
import { GhostService } from '../../../bp/dist/core/bpfs'
import bgImage from '../assets/images/background.jpg'
import logo from '../assets/images/xmati.png'

import { AuthMethodPicker } from './AuthMethodPicker'
import LoginContainer from './LoginContainer'
import { LoginForm } from './LoginForm'
import '../app/Wizard/style.css'


type RouterProps = RouteComponentProps<
  { strategy: string; workspace: string },
  {},
  { registerUrl?: string; from?: string; email?: string; password?: string; loginUrl?: string }
>

type Props = { auth: BasicAuthentication } & RouterProps & ExtendedHistory

interface AuthConfigResponse {
  payload: {
    strategies: AuthStrategyConfig[]
    isFirstUser: boolean
  }
}

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

const Login: FC<Props> = props => {
  const maintenanceStatus = JSON.parse(localStorage.getItem('maintenance') || '{}')
  const [isLoading, setLoading] = useState(true)
  const [isFirstUser, setFirstUser] = useState(false)
  const [strategies, setStrategies] = useState<AuthStrategyConfig[]>()
  const [loginUrl, setLoginUrl] = useState('')
  const [redirectTo, setRedirectTo] = useState<string>()
  const [error, setError] = useState<string | null>()
  useEffect(() => {
    onStrategyChanged()
  }, [props.match.params.strategy, isLoading])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    initialize()
  }, [])

  const initialize = async () => {
    const routeWorkspaceId = props.match.params.workspace
    const { workspaceId, botId, sessionId, signature, error } = props.location.query

    if (routeWorkspaceId || workspaceId) {
      setActiveWorkspace(routeWorkspaceId || workspaceId)
    }

    if (botId && sessionId && signature) {
      setChatUserAuth({ botId, sessionId, signature })
    }

    if (error) {
      setError(error)
    }

    if (props.auth.isAuthenticated()) {
      await props.auth.afterLoginRedirect()
    }

    if (!strategies) {
      await loadAuthConfig()
    }
  }

  const onStrategyChanged = () => {
    selectStrategy(props.match.params.strategy)

    if (strategies && strategies.length === 1) {
      const excludedRouteRegex = /admin123/ // Regex to match the route
      const isAdminRoute = excludedRouteRegex.test(props.location.pathname)

      if (isAdminRoute) {
        updateAdminUrlStrategy(strategies[0].strategyId)
      } else {
        updateUrlStrategy(strategies[0].strategyId)
      }
      selectStrategy(strategies[0].strategyId)
    }

    if (props.location.state) {
      setRedirectTo(props.location.state.from)
    }
  }

  const loadAuthConfig = async () => {
    const { data } = await api.getAnonymous().get<AuthConfigResponse>('/admin/auth/config')

    setStrategies(data.payload.strategies.filter(x => !x.hidden))
    setFirstUser(data.payload.isFirstUser)
    setLoading(false)
  }

  const updateUrlStrategy = (strategyId: string) => props.history.push({ pathname: `/login/${strategyId}` })
  const updateAdminUrlStrategy = (strategyId: string) => props.history.push({ pathname: `/login/admin123/${strategyId}` })

  const selectStrategy = (id: string) => {
    const strategy = strategies && strategies.find(x => x.strategyId === id)
    if (!strategy) {
      return setLoginUrl('')
    }

    setError(undefined)

    const { strategyType, strategyId, registerUrl } = strategy

    if (strategyType === 'saml' || strategyType === 'oauth2') {
      return (window.location.href = `${api.getApiPath()}/admin/auth/redirect/${strategyType}/${strategyId}`)
    }

    // if (isFirstUser) {
    //   props.history.push({ pathname: '/register', state: { registerUrl } })
    //   //props.history.push({ pathname: '/wizard' })
    // } else {

    // }
    setLoginUrl(strategy.loginUrl!)
  }

  const loginUser = async (email: string, password: string) => {
    try {
      if (maintenanceStatus.status && email !== 'xmatiservice@gmail.com') {
        setError('Maintenance mode is active. Only Admins are allowed to Login.')
        return
      }

      // setLoading(true)
      setError(undefined)

      const status = await userLogin(email, password)
      if (!status.success) {
        setError(status.msg)
        return
      }

      const subStatus = await userSubscription(email)
      if (!subStatus.status) {
        setError(subStatus.msg)
        return
      }

      await setLocalData(status.dbData, subStatus.data)
      await props.auth.login({ owner: status.dbData.email, email: 'admin@gmail.com', password: 'Admin@123' }, loginUrl, redirectTo)
    } catch (err) {
      if (err.type === 'PasswordExpiredError') {
        props.history.push({ pathname: '/changePassword', state: { email, password, loginUrl } })
      } else {
        setError(get(err, 'response.data.message', err.message))
      }
    } finally {
      // setLoading(false)
    }
  }

  const userLogin = async (email, password) => {
    try {
      const result = await fetch(`${API_URL}/user-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            email,
            password
          },
          from: 'login'
        }),
      })
      return result.json()
    } catch (error) {
      return { success: false, msg: 'Error uploading credentials to S3' }
    }
  }

  const userSubscription = async (email) => {
    try {
      const result = await fetch(`${API_URL}/get-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: email,
        }),
      })

      return result.json()
    } catch (error) {
      return { success: false, msg: 'Error uploading credentials to S3' }
    }
  }

  if (isLoading || !strategies) {
    return null
  }

  const setLocalData = async (formData, subData) => {
    const updatedFormData = {
      fullName: formData.fullName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      countryCode: formData.countryCode,
      password: formData.password,
      organisationName: formData.organisationName,
      industryType: formData.industryType,
      subIndustryType: formData.subIndustryType,
      stripeCustomerId: formData.stripeCustomerId,
      stripePayementId: formData.stripePayementId,
      nextSubs: formData.nextSubs
    }

    const currentUTC = new Date().toISOString().split('T')[0] // Always UTC
    const createdDateUTC = new Date(subData.createdAt).toISOString().split('T')[0]
    const tillDateUTC = new Date(subData.till).toISOString().split('T')[0]

    const currentDate = new Date(currentUTC)
    const createdDate = new Date(createdDateUTC)
    const tillDate = new Date(tillDateUTC)

    // Check the days remaining
    const timeDifference = tillDate.getTime() - currentDate.getTime()
    const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24))

    let canCancel = true
    if (subData.isCancelled === true) {
      canCancel = false
    }

    const updatedSubData = {
      subscription: subData.subscription,
      createdAt: subData.createdAt,
      till: subData.till,
      expired: currentUTC > tillDateUTC,
      daysRemaining,
      promptRun: false,  // set the prompt run to false
      amount: subData.amount,
      duration: subData.duration,
      canCancel,
      subsChanged: false,
      isCancelled: subData.isCancelled || false,
    }

    localStorage.setItem('formData', JSON.stringify(updatedFormData))
    localStorage.setItem('subData', JSON.stringify(updatedSubData))
    localStorage.setItem('token', JSON.stringify(formData.token))
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
          Login
        </h3>
        <div style={{ width: '45px' }}></div>
      </div>
      <div className='auth-wizard-container' style={{ width: '50%', maxWidth: '500px', minWidth: '400px' }}>
        <div className='auth-wizard-body'>
          <div className='auth-step'>
            <div style={{
              textAlign: 'center',
              fontSize: '28px',
              fontWeight: 'bold',
              marginBottom: '10px',
              fontFamily: 'Lato, sans-serif',
              color: '#333'
            }}>
              Welcome Back
            </div>
            <div className='stepSubtitle' style={{ textAlign: 'center', marginBottom: '30px' }}>Please sign in to your account</div>
            {error && (
              <div className='error' style={{ marginBottom: '20px', textAlign: 'center' }}>
                {error}
              </div>
            )}
            {loginUrl ? (
              <LoginForm onLogin={loginUser} />
            ) : (
              <AuthMethodPicker strategies={strategies} onStrategySelected={updateUrlStrategy} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
