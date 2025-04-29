import React from 'react'
import _ from 'lodash'
import style from './style.scss'
import { Callout, Classes } from '@blueprintjs/core'
import { TipLabel } from './TipLabel'
import classnames from 'classnames'

const memoryOptions = [
  { label: 'Temp', value: 'temp' },
  { label: 'Session', value: 'session' },
  { label: 'Bot', value: 'bot' },
  { label: 'User', value: 'user' }
]

export class AmazonLex extends React.Component {
  state = {
    botId: undefined,
    selectedMemory: memoryOptions[0],
    variable: 'response',
  }

  componentDidMount() {
    this.setStateFromProps()
  }

  setStateFromProps = () => {
    const data = this.props.initialData

    if (data) {
      this.setState({
        botId: data.botId,
      })
    }
  }

  componentDidUpdate() {
    if (this.isFormValid()) {
      this.props.onDataChanged && this.props.onDataChanged(this.state)
      this.props.onValidChanged && this.props.onValidChanged(true)
    }
  }

  isFormValid() {
    return (
      !_.isEmpty(this.state.botId)
    )
  }

  render() {
    return (
      <div className={style.skillSection}>
        <div style={{ width: '90%' }}>
          <Callout className={{ margin: '10px 0 10px 0' }}>
            {
              'The response body of this bot is stored in {{temp.response}} variable by default. You should use this variable in the next node to get the data'
            }
          </Callout>
          <br />
          <TipLabel
            labelText="BotId"
            tooltipText="Enter the generated Lex BotId"
          />
          <input
            className={classnames(Classes.INPUT, Classes.FILL)}
            id="botId"
            name="botId"
            type="text"
            value={this.state.botId}
            placeholder="Enter botId"
            onChange={event => this.setState({ botId: event.target.value })}
          />
        </div>
      </div>
    )
  }
}
