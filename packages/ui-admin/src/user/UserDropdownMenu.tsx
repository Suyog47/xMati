import {
  Button,
  Colors,
  Icon,
  Menu,
  MenuDivider,
  MenuItem,
  Popover,
  PopoverInteractionKind,
  Position
} from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import cx from 'classnames'
import React, { FC, useEffect, useState } from 'react'
import { connect, ConnectedProps } from 'react-redux'

import { AppState } from '~/app/rootReducer'
import BasicAuthentication from '~/auth/basicAuth'
import ChangeLanguage from '~/user/ChangeLanguage'
import AdminControl from './AdminControl'
import Enquiry from './Enquiry'
import PrivacyAgreement from './PrivacyAgreement'
import { fetchProfile } from './reducer'
import style from './style.scss'
import Subscription from './Subscription-screens/Subscription'
import UpdateCardDetails from './UpdateCardDetails'
import UpdatePassword from './UpdatePassword'
import UserProfile from './UpdateUserProfile'
import VoiceRecorder from './VoicetoText'


type Props = ConnectedProps<typeof connector>

const UserDropdownMenu: FC<Props> = props => {
  const [isSubscriptionOpen, setSubscriptionOpen] = useState(false)
  const [isGemini, setGemini] = useState(false)
  const [isAdminControl, setAdminControl] = useState(false)
  const [isProfileOpen, setProfileOpen] = useState(false)
  const [isCardOpen, setCardOpen] = useState(false)
  const [isPasswordOpen, setPasswordOpen] = useState(false)
  const [isLanguageOpen, setLanguageOpen] = useState(false)
  const [isPrivacyOpen, setPrivacyOpen] = useState(false)
  const [isEnquiryOpen, setEnquiryOpen] = useState(false)
  const [isExpired, setExpiry] = useState(false)


  useEffect(() => {
    !props.profile && props.fetchProfile()
    let expiry
    const subData = JSON.parse(localStorage.getItem('subData') || '{}')
    const subscription = subData?.subscription || 'Trial'
    const daysRemaining = subData.daysRemaining || 0
    const expired = subData.expired || 0

    if (subscription === 'Trial') {
      expiry = expired || false
    } else {
      expiry = expired && daysRemaining <= -4
    }
    setExpiry(expiry)

  }, [])

  const logout = async () => {
    const auth: BasicAuthentication = new BasicAuthentication()
    await auth.logout()
  }

  if (!props.profile) {
    return null
  }

  const toggleProfile = () => setProfileOpen(!isProfileOpen)
  const toggleCard = () => setCardOpen(!isCardOpen)
  const toggleSubscription = () => {
    const subData = localStorage.getItem('subData') || '{}'
    const formData = localStorage.getItem('formData') || '{}'
    const token = sessionStorage.getItem('token') || ''
    const aesKey = sessionStorage.getItem('aes-key') || ''

    const dataObject = {
      formData,
      subData,
      token,
      aesKey
    }

    const params = new URLSearchParams({
      data: JSON.stringify(dataObject)
    })

    window.open(`https://www.app.xmati.ai/utils/subscription?${params.toString()}`, '_blank')
  }

  // const toggleGemini = () => setGemini(!isGemini)
  // const toggleSubscription = () => setSubscriptionOpen(!isSubscriptionOpen)
  const toggleAdminControl = () => {
    const subData = localStorage.getItem('subData') || '{}'
    const formData = localStorage.getItem('formData') || '{}'
    const token = sessionStorage.getItem('token') || ''
    const aesKey = sessionStorage.getItem('aes-key') || ''

    const dataObject = {
      formData,
      subData,
      token,
      aesKey
    }

    const params = new URLSearchParams({
      data: JSON.stringify(dataObject)
    })

    window.open(`https://www.app.xmati.ai/utils/admin?${params.toString()}`, '_blank')
  }
  const togglePassword = () => setPasswordOpen(!isPasswordOpen)
  const toggleLanguage = () => setLanguageOpen(!isLanguageOpen)
  const togglePrivacy = () => setPrivacyOpen(!isPrivacyOpen)
  const toggleEnquiry = () => setEnquiryOpen(!isEnquiryOpen)

  const { email, fullName, strategyType, picture_url } = props.profile
  const canChangePassword = strategyType === 'basic'
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')

  const icon = picture_url ? (
    <img src={picture_url} className={cx('dropdown-picture', style.dropdown_picture)} />
  ) : (
    <Icon icon="user" color={Colors.WHITE} />
  )

  return (
    <div>
      <Popover minimal position={Position.BOTTOM} interactionKind={PopoverInteractionKind.CLICK}>
        <Button id="btn-menu-user-dropdown" icon={icon} minimal rightIcon={<Icon color={Colors.WHITE} icon="caret-down" />} />
        <Menu>
          <MenuDivider title={lang.tr('admin.signedInAs', { name: savedFormData.email })} />

          {savedFormData.email !== 'xmatiservice@gmail.com' && (<MenuItem id="btn-subscription" icon="dollar" text={'Subscription'} onClick={toggleSubscription} />)}

          {/* <MenuItem id="btn-gemini" icon="user" text={'Gemini Speech'} onClick={toggleGemini} /> */}

          {savedFormData.email === 'xmatiservice@gmail.com' && (<MenuItem id="btn-admin-control" icon="user" text={'Admin Control'} onClick={toggleAdminControl} />)}

          {!isExpired && (<MenuItem id="btn-profile" icon="user" text={lang.tr('admin.updateProfile')} onClick={toggleProfile} />)}

          {!isExpired && savedFormData.email !== 'xmatiservice@gmail.com' && (<MenuItem id="btn-card" icon="credit-card" text={'Update Payment Card'} onClick={toggleCard} />)}

          {canChangePassword && !isExpired && (
            <MenuItem id="btn-changepass" icon="key" text={lang.tr('admin.changePassword')} onClick={togglePassword} />
          )}

          <MenuItem id="btn-privacy" icon="document" text={'Privacy Policy'} onClick={togglePrivacy} />

          {savedFormData.email !== 'xmatiservice@gmail.com' && (<MenuItem id="btn-enquiry" icon="help" text={'Submit Enquiry'} onClick={toggleEnquiry} />)}

          {/* {!isExpired && (<MenuItem
            id="btn-changeLanguage"
            icon="translate"
            text={lang.tr('admin.changeLanguage')}
            onClick={toggleLanguage}
          />)} */}

          <MenuDivider />
          <MenuItem id="btn-logout" icon="log-out" text={lang.tr('admin.logout')} onClick={logout} />
        </Menu>
      </Popover>

      <UpdatePassword profile={props.profile} isOpen={isPasswordOpen} toggle={togglePassword} />

      <UserProfile
        isOpen={isProfileOpen}
        toggle={toggleProfile}
        profile={props.profile}
        fetchProfile={props.fetchProfile}
      />

      <UpdateCardDetails
        isOpen={isCardOpen}
        toggle={toggleCard}
      />

      <Subscription
        isOpen={isSubscriptionOpen}
        toggle={toggleSubscription}>
      </Subscription>

      <AdminControl
        isOpen={isAdminControl}
        toggle={toggleAdminControl}>
      </AdminControl>

      <PrivacyAgreement
        isOpen={isPrivacyOpen}
        toggle={togglePrivacy}
      />

      <Enquiry
        isOpen={isEnquiryOpen}
        toggle={toggleEnquiry}
      />

      {/* <VoiceRecorder
        isOpen={isGemini}
        toggle={toggleGemini}>
      </VoiceRecorder> */}

      <ChangeLanguage isOpen={isLanguageOpen} toggle={toggleLanguage} />
    </div>
  )
}

const mapStateToProps = (state: AppState) => ({ profile: state.user.profile })
const connector = connect(mapStateToProps, { fetchProfile })

export default connector(UserDropdownMenu)
