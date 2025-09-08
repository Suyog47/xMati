import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Callout, Divider, Spinner } from '@blueprintjs/core'
import { BotChannel, BotConfig, BotTemplate } from 'botpress/sdk'
import { lang } from 'botpress/shared'
import _ from 'lodash'
import ms from 'ms'
import React, { Component } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import Select from 'react-select'
import api from '~/app/api'
import { AppState } from '~/app/rootReducer'
import { fetchBotCategories, fetchBotTemplates } from '../reducer'
import BotInfoDialog from './BotInfoDialog'
import ChannelSelectionDialog from './ChannelSelectionDialog'

export const sanitizeBotId = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 50)

type Props = {
  isOpen: boolean
  existingBots: BotConfig[]
  onCreateBotSuccess: () => void
  toggle: () => void
} & ConnectedProps<typeof connector>

interface State {
  botId: string
  botName: string
  botPrompt: string
  isProcessing: boolean
  generateId: boolean
  botToken: string
  slackBotToken: string
  slackSigningSecret: string
  messengerAccessToken: string
  messengerAppSecret: string
  verifyToken: string
  twilioAccountSid: string
  twilioAuthToken: string
  error: any
  templates: any
  isChannelDialogOpen: boolean
  channel: any
  selectedTemplate?: BotTemplate
  selectedChannel?: any
  showFullScreenLoader?: boolean
  showErrorDialog: boolean
  errorMessage: string
}

const defaultState = {
  botId: '',
  botName: '',
  botPrompt: '',
  botToken: '',
  slackBotToken: '',
  slackSigningSecret: '',
  messengerAccessToken: '',
  messengerAppSecret: '',
  verifyToken: '',
  twilioAccountSid: '',
  twilioAuthToken: '',
  selectedCategory: undefined,
  selectedTemplate: undefined,
  error: undefined,
  isProcessing: false,
  generateId: true
}

class CreateBotModal extends Component<Props, State> {
  savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')
  private _form: HTMLFormElement | null = null
  private _form2: HTMLFormElement | null = null

  state: State = {
    templates: [
      { id: 'insurance-bot', name: 'Insurance Bot' },
      { id: 'empty-bot', name: 'Empty Bot' },
    ],
    ...defaultState,
    isChannelDialogOpen: false,
    channel: [
      { id: 'webchat', name: 'Web Chat' },
      { id: 'telegram', name: 'Telegram' },
      { id: 'slack', name: 'Slack' },
      { id: 'messenger', name: 'Facebook Messenger' },
      { id: 'whatsapp', name: 'Whatsapp' },
    ],
    showFullScreenLoader: false,
    showErrorDialog: false,
    errorMessage: '',
  }

  openChannelDialog = (e) => {
    e.preventDefault()
    this.setState({ isChannelDialogOpen: true, verifyToken: this.generateRandomString(16) })
  }

  closeChannelDialog = () => {
    this.toggleDialog()
    this.setState({ isChannelDialogOpen: false })
  }

  handleNameChanged = e => {
    let botName = e.target.value
    let botId = this.generateRandomString(20)
    this.setState({ botName, botId: `${botId}-${botName.toLowerCase().replace(/[^a-z0-9]/g, '')}` })
  }

  handlePromptChanged = e => {
    const botPrompt = e.target.value
    this.setState({
      botPrompt,
      selectedTemplate: botPrompt ? undefined : this.state.selectedTemplate
    })
  }

  handleTemplateChanged = template => {
    const selectedTemplate = template

    if (!selectedTemplate || (selectedTemplate as any).id === '') {
      this.setState({ selectedTemplate: undefined })
    } else {
      this.setState({
        selectedTemplate: selectedTemplate as any,
        botPrompt: ''
      })
    }
  }

  createBot = async e => {
    e.preventDefault()
    this.savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    let frm = this.state.botPrompt ? 'llm' : 'template'

    this.setState({ isProcessing: true, showFullScreenLoader: true })

    const newBot = {
      fullName: this.savedFormData.fullName,
      organisationName: this.savedFormData.organisationName,
      id: this.state.botId,
      name: this.state.botName,
      owner: this.savedFormData.email,
      template: { id: this.state.selectedTemplate?.id, moduleId: 'builtin' },
      from: frm,
      botDesc: this.state.botPrompt,
      telegramToken: this.state.botToken,
      slackBotToken: this.state.slackBotToken,
      slackSigningSecret: this.state.slackSigningSecret,
      messengerAccessToken: this.state.messengerAccessToken,
      messengerAppSecret: this.state.messengerAppSecret,
      messengerVerifyToken: this.state.verifyToken,
      twilioAccountSid: this.state.twilioAccountSid,
      twilioAuthToken: this.state.twilioAuthToken,
    }

    try {
      let res = await api.getSecured({ timeout: 0 }).post('/admin/workspace/bots', newBot)
      if (res.data.status === 'success') {
        this.props.onCreateBotSuccess()
        this.closeChannelDialog()
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        this.setState({
          errorMessage: 'Failed to create bot: ' + res.data.msg,
          showErrorDialog: true,
        })
      }
    } catch (error) {
      this.setState({
        errorMessage: error.message || 'An unexpected error occurred.',
        showErrorDialog: true,
      })
    } finally {
      this.setState({ showFullScreenLoader: false, isProcessing: false })
    }
  }

  closeErrorDialog = () => {
    this.setState({ showErrorDialog: false, errorMessage: '' })
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  generateRandomString = (length: number = 16): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length)
      result += chars[randomIndex]
    }
    return result
  }

  toggleDialog = () => {
    this.setState({
      ...defaultState,
      templates: this.state.templates,
      isChannelDialogOpen: false,
      channel: this.state.channel,
      showFullScreenLoader: false,
      showErrorDialog: false,
      errorMessage: '',
      selectedTemplate: undefined,
      selectedChannel: undefined
    })
    this.props.toggle()
  }

  resetvalues = () => {
    this.setState({ botToken: '', slackBotToken: '', slackSigningSecret: '', messengerAccessToken: '', messengerAppSecret: '', twilioAccountSid: '', twilioAuthToken: '' })
  }

  get isBotLimitExceeded() {
    this.savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    const { subscription } = this.savedSubData
    const numberOfBots = this.savedFormData.numberOfBots || 0
    const botLimit = subscription === 'Starter' ? 3 : 5
    return numberOfBots >= botLimit
  }

  render() {
    if (this.isBotLimitExceeded) {
      return (
        <Dialog
          title="Bot Limit Exceeded"
          icon="error"
          isOpen={this.props.isOpen}
          onClose={this.toggleDialog}
          transitionDuration={0}
          canOutsideClickClose={false}
        >
          <div className={Classes.DIALOG_BODY}>
            <Callout intent="danger">
              <h4>You have reached the maximum number of bots allowed for your subscription plan.</h4>
              <p>
                Your current subscription plan ({this.savedSubData.subscription}) allows a maximum of{' '}
                {this.savedSubData.subscription === 'Starter' ? 3 : 5} bots.
              </p>
              <p>
                {this.savedSubData.subscription === 'Starter'
                  ? 'To create more bots, please upgrade your subscription or delete an existing bot.'
                  : ''}
              </p>
            </Callout>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                text="Close"
                onClick={this.toggleDialog}
                intent={Intent.PRIMARY}
              />
            </div>
          </div>
        </Dialog>
      )
    }

    return (
      <>
        {this.state.showFullScreenLoader && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(255,255,255,0.85)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Spinner size={60} intent={Intent.PRIMARY} />
            <div style={{ marginTop: 24, fontSize: 18, color: '#333', fontWeight: 500 }}>
              Your bot is getting created... This may take few minutes...
            </div>
          </div>
        )}

        <Dialog
          title="Error"
          icon="error"
          isOpen={this.state.showErrorDialog}
          onClose={this.closeErrorDialog}
          transitionDuration={0}
          canOutsideClickClose={false}
        >
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: '#c23030', marginBottom: '10px' }}>Bot Creation Failed</h2>
            <div style={{ marginTop: 10, color: '#c23030', fontWeight: 500, fontSize: 15 }}>
              {this.state.errorMessage || 'An unknown error occurred while creating bot. Please try again later.'}
            </div>
            <Button
              intent="primary"
              onClick={this.closeErrorDialog}
              style={{
                marginTop: '20px',
                padding: '14px 32px',
                fontSize: '1.05em',
                fontWeight: 'bold',
                minWidth: '250px',
                borderRadius: 6,
              }}
            >
              Close
            </Button>
          </div>
        </Dialog>

        <BotInfoDialog
          isOpen={this.props.isOpen}
          toggleDialog={this.toggleDialog}
          handleNameChanged={this.handleNameChanged}
          handlePromptChanged={this.handlePromptChanged}
          handleTemplateChanged={this.handleTemplateChanged}
          openChannelDialog={this.openChannelDialog}
          isProcessing={this.state.isProcessing}
          botName={this.state.botName}
          botPrompt={this.state.botPrompt}
          selectedTemplate={this.state.selectedTemplate}
          templates={this.state.templates}
        />

        <ChannelSelectionDialog
          isOpen={this.state.isChannelDialogOpen}
          closeChannelDialog={this.closeChannelDialog}
          selectedChannel={this.state.selectedChannel}
          setSelectedChannel={(channel) => this.setState({ selectedChannel: channel })}
          resetValues={this.resetvalues}
          savedSubData={this.savedSubData}
          channelList={this.state.channel}
          botId={this.state.botId}
          verifyToken={this.state.verifyToken}
          botToken={this.state.botToken}
          setBotToken={(value) => this.setState({ botToken: value })}
          slackBotToken={this.state.slackBotToken}
          setSlackBotToken={(value) => this.setState({ slackBotToken: value })}
          slackSigningSecret={this.state.slackSigningSecret}
          setSlackSigningSecret={(value) => this.setState({ slackSigningSecret: value })}
          messengerAccessToken={this.state.messengerAccessToken}
          setMessengerAccessToken={(value) => this.setState({ messengerAccessToken: value })}
          messengerAppSecret={this.state.messengerAppSecret}
          setMessengerAppSecret={(value) => this.setState({ messengerAppSecret: value })}
          twilioAccountSid={this.state.twilioAccountSid}
          setTwilioAccountSid={(value) => this.setState({ twilioAccountSid: value })}
          twilioAuthToken={this.state.twilioAuthToken}
          setTwilioAuthToken={(value) => this.setState({ twilioAuthToken: value })}
          isProcessing={this.state.isProcessing}
          createBot={this.createBot}
          error={this.state.error}
        />
      </>
    )
  }
}

const mapStateToProps = (state: AppState) => state.bots
const connector = connect(mapStateToProps, { fetchBotTemplates, fetchBotCategories })

export default connector(CreateBotModal)
