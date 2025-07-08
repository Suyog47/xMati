import { lang } from 'botpress/shared'
import React, { FC, useState } from 'react'
import { RouteComponentProps } from 'react-router'
import { Redirect } from 'react-router-dom'

import BasicAuthentication from '~/auth/basicAuth'
import { ChangePasswordForm } from './ChangePasswordForm'
import LoginContainer from './LoginContainer'

type RouterProps = RouteComponentProps<undefined, {}, { email: string; password: string; loginUrl: string }>
type Props = { auth: BasicAuthentication } & RouterProps

export const ChangePassword: React.FC = () => {
  const [error, setError] = useState<string>()
  //const { email, password, loginUrl } = props.location.state

  const updatePassword = async (newPassword: string, confirmPassword: string) => {
    if (newPassword !== confirmPassword) {
      return setError(lang.tr('admin.passwordsDontMatch'))
    }
  }

  return (
    <LoginContainer title={'Forgot Password'} subtitle={''} error={error}>
      <ChangePasswordForm />
    </LoginContainer>
  )
}

export default ChangePassword
