import { lang } from 'botpress/shared'
import React, { FC, useState } from 'react'
import { RouteComponentProps } from 'react-router'
import { Redirect } from 'react-router-dom'

import BasicAuthentication from '~/auth/basicAuth'
import bgImage from '../assets/images/background.jpg'
import logo from '../assets/images/xmati.png'
import { ChangePasswordForm } from './ChangePasswordForm'
import LoginContainer from './LoginContainer'
import '../app/Wizard/style.css'

type RouterProps = RouteComponentProps<undefined, {}, { email: string; password: string; loginUrl: string }>
type Props = { auth: BasicAuthentication } & RouterProps

export const ChangePassword: React.FC = () => {
  const [error, setError] = useState<string>()
  //const { email, password, loginUrl } = props.location.state

  // const updatePassword = async (newPassword: string, confirmPassword: string) => {
  //   if (newPassword !== confirmPassword) {
  //     return setError(lang.tr('admin.passwordsDontMatch'))
  //   }
  // }

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
          Reset Password
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
              Reset Your Password
            </div>
            <div className='stepSubtitle' style={{ textAlign: 'center', marginBottom: '30px' }}>Please follow the steps to reset your password</div>
            {error && (
              <div className='error' style={{ marginBottom: '20px', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword
