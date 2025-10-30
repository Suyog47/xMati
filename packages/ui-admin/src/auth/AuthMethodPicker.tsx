import { Button } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import { AuthStrategyConfig } from 'common/typings'
import React, { FC } from 'react'
import '../app/Wizard/style.css'

interface Props {
  strategies: AuthStrategyConfig[]
  onStrategySelected: (strategyId: string) => void
}

export const AuthMethodPicker: FC<Props> = props => {
  if (!props.strategies) {
    return null
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      {props.strategies.map((config: AuthStrategyConfig) => {
        const { strategyType, strategyId, label } = config

        const defaultLabel =
          strategyType === 'saml' || strategyType === 'oauth2'
            ? lang.tr('admin.signInWithSSO', { strategyId })
            : lang.tr('admin.signInWithUserPass')

        return (
          <div key={strategyId} className='button-container' style={{ width: '80%' }}>
            <button
              id={`btn-${strategyId}-signin`}
              onClick={() => props.onStrategySelected(strategyId)}
              style={{ width: '100%' }}
            >
              {label ? lang.tr('admin.signInWithLabel', { label }) : defaultLabel}
            </button>
          </div>
        )
      })}
    </div>
  )
}
