import { Alignment, Button, Colors, Icon, Navbar, Tooltip } from '@blueprintjs/core'
import { lang, ShortcutLabel } from 'botpress/shared'
import cx from 'classnames'
import React, { FC } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import WorkspaceSelect from '~/app/WorkspaceSelect'

import AccessControl from '~/auth/AccessControl'
import UserDropdownMenu from '~/user/UserDropdownMenu'
import { AppState } from '../rootReducer'
import { toggleBottomPanel } from '../uiReducer'
import { HelpMenu } from './Help'
import style from './style.scss'

type Props = ConnectedProps<typeof connector>
const Header: FC<Props> = props => {
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  // const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')
  return (
    <header className={cx('bp-header', style.header)}>
      <Navbar>
        <Navbar.Group>
          <Navbar.Heading>
            <div className={cx('bp-sa-title', style.title)}>
              <span>{props.pageTitle || ''}</span>
              {props.pageHelpText && (
                <Tooltip content={props.pageHelpText}>
                  <Icon icon="info-sign" color={Colors.LIGHT_GRAY1} />
                </Tooltip>
              )}
            </div>
          </Navbar.Heading>
        </Navbar.Group>
        <p style={{ textAlign: 'center', paddingTop: '10px', width: '90%', fontSize: '18px', color: 'white' }}>
          Welcome <strong>{savedFormData.fullName}</strong>
        </p>
        <Navbar.Group align={Alignment.RIGHT}>
          {/* <WorkspaceSelect /> */}
          <div className={cx(style['menu-container'])}>
            <div>
              <HelpMenu />
            </div>

            {/* <div>
              <AccessControl resource='admin.logs' operation='read'>
                <Tooltip content={<div className={style.tooltip}>{lang.tr('bottomPanel.label')}</div>}>
                  <Button onClick={props.toggleBottomPanel} minimal>
                    <Icon color='white' icon='console' iconSize={16} />
                  </Button>
                </Tooltip>
              </AccessControl>
            </div> */}

            <div>
              <UserDropdownMenu />
            </div>
          </div>
        </Navbar.Group>
      </Navbar>
    </header>
  )
}

const mapStateToProps = (state: AppState) => ({
  pageTitle: state.ui.pageTitle,
  pageHelpText: state.ui.pageHelpText
})

const mapDispatchToProps = { toggleBottomPanel }
const connector = connect(mapStateToProps, mapDispatchToProps)

export default connector(Header)
