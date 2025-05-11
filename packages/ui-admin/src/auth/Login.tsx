import { lang } from 'botpress/shared'
import { AuthStrategyConfig } from 'common/typings'
import { get } from 'lodash'
import React, { FC, useEffect, useState } from 'react'
import { RouteComponentProps } from 'react-router'
import { GhostService } from '../../../bp/dist/core/bpfs'
import api from '~/app/api'
import { ExtendedHistory } from '~/app/history'
import BasicAuthentication, { setActiveWorkspace, setChatUserAuth } from '~/auth/basicAuth'

import { AuthMethodPicker } from './AuthMethodPicker'
import LoginContainer from './LoginContainer'
import { LoginForm } from './LoginForm'
import ms from 'ms'

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

const Login: FC<Props> = props => {
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
      updateUrlStrategy(strategies[0].strategyId)
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
    //   props.history.push({ pathname: '/login', state: { registerUrl } })
    //   //props.history.push({ pathname: '/wizard' })
    // } else {

    // }
    setLoginUrl(strategy.loginUrl!)
  }

  const loginUser = async (email: string, password: string) => {
    try {
      setError(undefined)

      let status = await userLogin(email, password)
      if (!status.success) {
        setError(status.msg)
        return
      }

      await setLocalData(status.s3Data)
      await props.auth.login({ email: 'admin@gmail.com', password: 'Admin@123' }, loginUrl, redirectTo)
      await saveBot(status.s3Data.email)
    } catch (err) {
      if (err.type === 'PasswordExpiredError') {
        props.history.push({ pathname: '/changePassword', state: { email, password, loginUrl } })
      } else {
        setError(get(err, 'response.data.message', err.message))
      }
    }
  }

  const userLogin = async (email, password) => {
    try {
      const result = await fetch('http://138.197.2.118:8000/user-auth', {
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

  const saveBot = async (email) => {
    let res = await api.getSecured({ timeout: ms('8m') }).post('/admin/workspace/bots/getBots', { email })
  }

  // const getBots = async (email) => {
  //   try {
  //     let result = await fetch('http://138.197.2.118:8000/get-bots', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         email
  //       }),
  //     })

  //     result = await result.json()
  //   } catch (error) {
  //     console.log('Error uploading credentials to S3')
  //   }
  // }

  if (isLoading || !strategies) {
    return null
  }

  const setLocalData = async (formData) => {
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


  return (
    <LoginContainer title={lang.tr('admin.login')} error={error} poweredBy={true}>
      {loginUrl ? (
        <LoginForm onLogin={loginUser} />
      ) : (
        <AuthMethodPicker strategies={strategies} onStrategySelected={updateUrlStrategy} />
      )}
    </LoginContainer>
  )
}

export default Login
