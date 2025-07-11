import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Callout, Divider, Spinner, Icon } from '@blueprintjs/core'
import { BotChannel, BotConfig, BotTemplate } from 'botpress/sdk'
import { lang } from 'botpress/shared'
import _ from 'lodash'
import ms from 'ms'
import React, { Component } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import Select from 'react-select'
import api from '~/app/api'
import { AppState } from '~/app/rootReducer'
import { fetchBotCategories, fetchBotTemplates } from './reducer'
import { is } from 'bluebird'

export const sanitizeBotId = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 50)

interface SelectOption<T> {
  label: string
  value: T
  __isNew__?: boolean
}

type Props = {
  isOpen: boolean
  // isChannelOpen: boolean
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
  selectedChannel?: BotChannel
  selectedCategory?: SelectOption<string>
  showFullScreenLoader?: boolean

  showErrorDialog: boolean // New state property to control error dialog visibility
  errorMessage: string // New state property to store error message
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
    showErrorDialog: false, // New state property to control error dialog visibility
    errorMessage: '', // New state property to store error message
  }

  openChannelDialog = (e) => {
    e.preventDefault() // Prevents form submission if needed
    this.state.selectedChannel = undefined
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
      selectedTemplate: botPrompt ? undefined : this.state.selectedTemplate // Clear dropdown if prompt is not empty
    })
  }

  createBot = async e => {
    e.preventDefault()
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    let frm = (this.state.botPrompt) ? 'llm' : 'template'

    if (this.isChannelButtonDisabled || this.isButtonDisabled) {
      return
    }
    this.setState({ isProcessing: true, showFullScreenLoader: true })

    const newBot = {
      fullName: savedFormData.fullName,
      organisationName: savedFormData.organisationName,
      id: this.state.botId,
      name: this.state.botName,
      owner: savedFormData.email,
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
      console.log(res.data.status)
      if (res.data.status === 'success') {
        this.props.onCreateBotSuccess()
        this.closeChannelDialog()
        setTimeout(() => {
          window.location.reload()    // reloading for the bot creation limit check
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
      window.location.reload()    // reloading for the bot creation limit check
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
    this.setState({ ...defaultState })
    this.props.toggle()
  }

  resetvalues = () => {
    this.setState({ botToken: '', slackBotToken: '', slackSigningSecret: '', messengerAccessToken: '', messengerAppSecret: '', twilioAccountSid: '', twilioAuthToken: '' })
  }

  get isPromptTooShort() {
    return this.state.botPrompt.trim() && this.state.botPrompt.trim().length < 10
  }

  get isButtonDisabled() {
    const { isProcessing, botName, botPrompt, selectedTemplate } = this.state

    // Must have a name, not processing, and either a valid prompt or a template
    if (!botName.trim() || isProcessing) {
      return true
    }

    // If both prompt and template are empty, disable
    if (!botPrompt.trim() && !selectedTemplate) {
      return true
    }

    // If prompt is present, it must be at least 10 characters
    if (botPrompt.trim() && botPrompt.trim().length < 10) {
      return true
    }

    // Otherwise, enable
    return false
  }

  get isChannelButtonDisabled() {
    const { isProcessing, selectedChannel, botToken, slackBotToken, slackSigningSecret, messengerAccessToken, messengerAppSecret, twilioAccountSid, twilioAuthToken } = this.state

    if (!selectedChannel) {
      return true
    }

    if (selectedChannel.id === 'telegram') {
      return !(botToken.trim().length >= 20 && botToken.trim().length <= 90 && !isProcessing)
    }
    if (selectedChannel.id === 'slack') {
      return !(
        slackBotToken.trim().length >= 20 &&
        slackBotToken.trim().length <= 90 &&
        slackSigningSecret.trim().length >= 20 &&
        slackSigningSecret.trim().length <= 90 &&
        !isProcessing
      )
    }
    if (selectedChannel.id === 'messenger') {
      return !(
        messengerAccessToken.trim().length >= 20 &&
        messengerAccessToken.trim().length <= 90 &&
        messengerAppSecret.trim().length >= 20 &&
        messengerAppSecret.trim().length <= 90 &&
        !isProcessing
      )
    }
    if (selectedChannel.id === 'whatsapp') {
      return !(
        twilioAccountSid.trim().length >= 20 &&
        twilioAccountSid.trim().length <= 90 &&
        twilioAuthToken.trim().length >= 20 &&
        twilioAuthToken.trim().length <= 90 &&
        !isProcessing
      )
    }

    return false
  }

  get isBotLimitExceeded() {
    const { subscription } = this.savedSubData
    const numberOfBots = this.savedFormData.numberOfBots || 0

    // Determine the bot limit based on the subscription type
    const botLimit = subscription === 'Professional' ? 5 : 3

    // Check if the number of bots exceeds the limit
    return numberOfBots >= botLimit
  }

  render() {
    const { botId, verifyToken, selectedChannel } = this.state

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
                Your current subscription plan ({this.savedFormData.subscription}) allows a maximum of{' '}
                {this.savedFormData.subscription === 'Professional' ? 5 : 3} bots.
              </p>
              <p>
                To create more bots, please upgrade your subscription or delete an existing bot.
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

    const channelInstructions = {
      telegram: `
        <ol>
          <li>Open <strong>BotFather</strong> in Telegram.</li>
          <li>Type <code>/newbot</code> and follow the steps.</li>
          <li>Copy the <strong>botToken</strong> and provide it below.</li><br />
        </ol>
      `,
      slack: `
        <ol>
          <li><b>Please read the instructions carefully</b></li>
          <li>Navigate to your <b>Slack Apps</b> page.</li>
          <li>Click <b>Create New App</b>, choose <b>From scratch</b>, and give your app a name. Make sure to remember this name—you'll need it later.</li>
          <li>Go to the <b>Features</b> section, select <b>Interactivity & Shortcuts</b>, and toggle <b>Interactivity</b> to On.</li>
          <li>Set the Request URL to:- <b>'https://www.app.xmati.ai/api/v1/messaging/webhooks/${botId}/slack/interactive'</b></li>
          <li>Click <b>Save Changes.</b></li>
          <li>In <b>Features</b>, open <b>OAuth & Permissions</b> and add the following under <b>Bot Token Scopes</b>:- 'chat:write'</li>
          <li>Still under <b>Features</b>, go to <b>App Home</b>. Under <b>Show Tabs</b>, enable the option <b>Allow users to send Slash commands and messages from the messages tab.</b></li>
          <li>Head over to <b>Settings > Install App</b>, then click <b>Install to Workspace</b>. On the next screen, click Allow.</li>
          <li>Copy the <b>Bot Token</b>, come here to xMati wizard and paste it in the required field.</li>
          <li>Locate the <b>Signing Secret</b> in the <b>Basic Information</b> section, and paste it as well.</li>
          <li>Click <b>Submit</b> button here and wait for the bot to be created.</li>
          <li>Go back to the <b>Slack App</b> page, navigate to <b>Features > Event Subscriptions</b>, and enable <b>Event Subscriptions</b>.</li>
          <li>Set the Request URL to:- <b>'https://www.app.xmati.ai/api/v1/messaging/webhooks/${botId}/slack/events'</b></li>
          <li>Under <b>Subscribe to Bot Events</b>, add the following events: - <b>'message.im'</b> and <b>'message.channels'</b></li>
          <li>Wait for the <b>Verified</b> confirmation next to the URL and save your changes.</li>
          <li>A yellow banner may appear at the top—click <b>Reinstall your app</b>, then click Allow.</li>
          <li>Restart your Slack application.</li>
          <li>In Slack, go to the <b>Apps</b> section, click <b>+ Add apps</b>, search for your app by name, and select it.</li>
          <li>You can now start chatting with your <b>Chat bot</b> in Slack.</li>
        </ol>
      `,
      webchat: `
        <ol>
          <li>Below are the scripts that you have to implement inside your website code.</li>
          <li><code>&ltscript src="https://www.app.xmati.ai/assets/modules/channel-web/inject.js"&gt&lt/script&gt</code></li>
          <li>
            <code>
              &ltscript&gt<br/>
              &nbsp&nbspwindow.botpressWebChat.init({<br/>
              &nbsp&nbsp&nbsp&nbsphost: "https://www.app.xmati.ai",<br/>
              &nbsp&nbsp&nbsp&nbspbotId: "${botId}"<br/>
              &nbsp&nbsp})<br/>
              &lt/script&gt
            </code>
          </li>
          <li>Please add these scripts after creating the bot here.</li>
        </ol>
      `,
      messenger: `
        <ol>
          <li><b>Please read the instructions carefully</b></li>
          <li>Messenger requires you to have a <b>Facebook App</b> and a <b>Facebook Page</b> to connect your chatbot to the platform.</li>
          <li>Log in to your Facebook account and ensure you have admin rights for the Facebook page you want to connect your chatbot to.</li>
          <li>Visit the <b>Facebook for Developers</b> website.</li>
          <li>Click <b>My Apps</b> from the top menu and create a new app.</li>
          <li>After creating one, In the left sidebar, expand <b>Settings</b> → <b>Basic</b>.</li>
          <li>Click <b>Show</b> next to <b>App Secret</b> and copy the value and paste it here</li>
          <li>Copy this verify token <b>'${verifyToken}'</b> as well</li>
          <li>Enable the <b>Messenger</b> app inside <b>Dashboard</b></li>
          <li>Then go to <b>Messenger</b> → <b>Messanger Api Settings</b>.</li>
          <li>Go to <b>Generate Access Tokens</b> section and link your Facebook page.</li>
          <li>After successful linking, click on <b>Generate</b> button on the right side and copy the <b>Access token</b></li>
          <li>Paste the <b>Access Token</b> here</li>
          <li>Click <b>Create Bot</b> button and wait for the bot to be created.</li>
          <li>Go back to the <b>Facebook App</b> and under <b>Configure Webhooks</b>, Enter the Callback URL:- <b>https://www.app.xmati.ai/api/v1/messaging/webhooks/${botId}/messenger</b></li>
          <li>Paste the verify token that you have copied earlier from point 8.</li>
          <li>Click on <b>'Verify and save'</b>.</li>
          <li>Make sure you enable <b>messages</b> and <b>messaging_postbacks</b> inside <b>Webhook Subscription</b> field inside <b>Generate access tokens</b> itself</li>
          <li>Open your facebook and click on the <b>Messenger</b> button</li>
          <li>Search for your Facebook page name and now you can start chatting with your Chat bot.</li>
        </ol>
      `,
      whatsapp: `
           <ol>
            <li>To enable the <b>Whatsapp</b> integration with xMati, you need to create an account in <b>Twilio</b> and purchase a phone number.</li>
             <li>For that, first go to your <b>Twilio account dashboard</b> and click on <b>'Phone Numbers'</b> section and inside <b>'Manage'</b>, click on <b>'Active Numbers'</b>.</li>
             <li>Buy a number of your choice and go to <b>'Configure'</b> tab, scroll down and go to <b>'Messaging Configuration'.</b></li>
             <li>Set <b>'A Message Comes In'</b> url textfiels to <b>https://www.app.xmati.ai/api/v1/messaging/webhooks/${botId}/twilio</b></li>
             <li>Save the Configuration and come back to the Account Dashboard</li>
             <li>Once inside, Scroll down and copy your <b>Account SID</b> and <b>Auth Token</b>.</li>
             <li>Enter both of them here in their respective textfields.</li>
             <li>Again vist your twilio dashboard and go to <b>'Messaging'</b> section on the left.</li>
             <li>Click on <b>'Try it out'</b> and select <b>'Send a Whatsapp message'</b>.</li>
             <li>Once inside, Click on <b>'Sandbox settings'</b> tab and enter <b>'https://www.app.xmati.ai/api/v1/messaging/webhooks/${botId}/twilio'</b> inside <b>'A Message Comes In'</b> field.</li>
             <li>Click on Save.</li>
             <li>Now test the whatsapp flow according to the instructions given on it.</li>
             <li>Once test is done, Try to send a dummy message in whatsapp to the number you purchased from Twilio and check for the bot response.</li>
             <li>Your bot should work fine by now.</li>
             <li><u>It is advisable to activate a paid plan for the twilio account for uninterrupted access.</u></li>
           </ol>
         `
    }

    return (
      <>
        {/* Fullscreen Loader */}
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

        {/* Error Dialog */}
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

        <Dialog
          title={lang.tr('admin.workspace.bots.create.newBot')}
          icon="add"
          isOpen={this.props.isOpen}
          onClose={this.toggleDialog}
          transitionDuration={0}
          canOutsideClickClose={false}
        >
          <form ref={form => (this._form = form)}>
            <div className={Classes.DIALOG_BODY}>
              <p>Select from the ready-made templates or provide a prompt according to your need</p>
              <FormGroup
                label={lang.tr('admin.workspace.bots.create.name')}
                labelFor="bot-name"
                labelInfo="*"
                helperText={lang.tr('admin.workspace.bots.create.nameHelper')}
              >
                <InputGroup
                  id="input-bot-name"
                  tabIndex={1}
                  placeholder={lang.tr('admin.workspace.bots.create.namePlaceholder')}
                  minLength={0}
                  maxLength={50}
                  required
                  value={this.state.botName}
                  onChange={this.handleNameChanged}
                  autoFocus
                />
              </FormGroup>

              <FormGroup
                label={lang.tr('admin.workspace.bots.create.prompt')}
                labelFor="bot-prompt"
                labelInfo="*"
                helperText={lang.tr('admin.workspace.bots.create.promptHelper')}
              >
                <textarea
                  id="bot-prompt"
                  tabIndex={2}
                  placeholder={lang.tr('admin.workspace.bots.create.promptPlaceholder')}
                  minLength={0}
                  maxLength={500}
                  required
                  value={this.state.botPrompt}
                  onChange={this.handlePromptChanged}
                  rows={3}
                  style={{
                    resize: 'none', // Disables resizing
                    height: '120px', // Fixed height
                    width: '100%', // Full width
                    overflow: 'auto', // Adds scrollbars if content exceeds the box
                  }}
                  disabled={!!this.state.selectedTemplate}
                />
              </FormGroup>
              {this.isPromptTooShort && (
                <p style={{ color: 'red' }}>
                  Bot prompt must be at least 10 characters.
                </p>
              )}

              <p style={{ textAlign: 'center' }}>
                <b>Or</b>
              </p>

              {this.state.templates.length > 0 && (
                <FormGroup
                  label={lang.tr('admin.workspace.bots.create.template')}
                  labelFor="template"
                >
                  <Select
                    id="select-bot-templates"
                    tabIndex="4"
                    options={[
                      { id: '', name: 'Select template' }, // Add this option at the top
                      ...this.state.templates
                    ]}
                    value={
                      this.state.selectedTemplate && this.state.selectedTemplate.id
                        ? this.state.selectedTemplate
                        : { id: '', name: 'Select template' }
                    }
                    onChange={selectedTemplate => {
                      // If "Select template" is chosen, reset selectedTemplate
                      if (!selectedTemplate || (selectedTemplate as any).id === '') {
                        this.setState({ selectedTemplate: undefined })
                      } else {
                        this.setState({
                          selectedTemplate: selectedTemplate as any,
                          botPrompt: ''
                        })
                      }
                    }}
                    isDisabled={!!this.state.botPrompt}
                    getOptionLabel={o => o.name}
                    getOptionValue={o => o.id}
                  />
                </FormGroup>
              )}
            </div>
            <div className={Classes.DIALOG_FOOTER}>
              <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <Button
                  id="btn-modal-next"
                  type="submit"
                  text={this.state.isProcessing ? lang.tr('pleaseWait') : 'Next'}
                  onClick={this.openChannelDialog}
                  disabled={this.isButtonDisabled}
                  intent={Intent.PRIMARY}
                />
              </div>
            </div>
          </form>
        </Dialog>

        <Dialog
          isOpen={this.state.isChannelDialogOpen}
          onClose={this.closeChannelDialog}
          title="Select a Channel"
          icon="select"
          canOutsideClickClose={false}
          style={{ width: '600px', borderRadius: '8px', boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)' }}
        >
          <form ref={form => (this._form2 = form)}>
            <div className={Classes.DIALOG_BODY}>
              <FormGroup label={lang.tr('admin.workspace.bots.create.channel')} labelFor="channel">
                <Select
                  id="select-bot-channel"
                  tabIndex="5"
                  options={this.state.channel}
                  value={this.state.selectedChannel}
                  onChange={selectedChannel => {
                    this.resetvalues()
                    this.setState({ selectedChannel: selectedChannel as any })
                  }}
                  getOptionLabel={o => o.name}
                  getOptionValue={o => o.id}
                />
              </FormGroup>

              {this.state.selectedChannel && (
                <Callout intent="primary">
                  <div
                    style={{
                      fontSize: '14px',
                      maxHeight: '40vh',
                      overflowY: 'auto',
                      paddingRight: '2px'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: channelInstructions[this.state.selectedChannel.id] // Use the dynamically created object
                    }}
                  /><br />
                  <Divider></Divider>
                  {this.state.selectedChannel && this.state.selectedChannel.id === 'telegram' && (
                    <div>
                      <FormGroup label="Bot Token" labelFor="bot-token" labelInfo="(Must be between 20 and 90 characters.)">
                        <InputGroup
                          id="bot-token"
                          placeholder="Enter Telegram Bot Token"
                          onChange={(e) => {
                            this.setState({ botToken: e.target.value })
                          }}
                        />
                      </FormGroup>
                    </div>
                  )}

                  {this.state.selectedChannel && this.state.selectedChannel.id === 'slack' && (
                    <div>
                      <FormGroup label="Slack Bot Token" labelFor="slack-bot-token" labelInfo="(Must be between 20 and 90 characters.)">
                        <InputGroup
                          id="slack-bot-token"
                          placeholder="Enter Slack Bot Token"
                          onChange={(e) => {
                            this.setState({ slackBotToken: e.target.value })
                          }}
                        />
                      </FormGroup>
                      <FormGroup label="Slack Signing Secret" labelFor="slack-signing-secret" labelInfo="(Must be between 20 and 90 characters.)">
                        <InputGroup
                          id="slack-signing-secret"
                          placeholder="Enter Slack Signing Secret"
                          onChange={(e) => {
                            this.setState({ slackSigningSecret: e.target.value })
                          }}
                        />
                      </FormGroup>
                    </div>
                  )}

                  {this.state.selectedChannel && this.state.selectedChannel.id === 'messenger' && (
                    <div>
                      <FormGroup label="Messenger Access Token" labelFor="messenger-access-token" labelInfo="(Must be between 20 and 90 characters.)">
                        <InputGroup
                          id="messenger-access-token"
                          placeholder="Enter Messenger Access Token"
                          onChange={(e) => {
                            this.setState({ messengerAccessToken: e.target.value })
                          }}
                        />
                      </FormGroup>
                      <FormGroup label="Messenger App Secret" labelFor="messenger-app-secret" labelInfo="(Must be between 20 and 90 characters.)">
                        <InputGroup
                          id="messenger-app-secret"
                          placeholder="Enter Messenger App Secret"
                          onChange={(e) => {
                            this.setState({ messengerAppSecret: e.target.value })
                          }}
                        />
                      </FormGroup>
                    </div>
                  )}

                  {this.state.selectedChannel && this.state.selectedChannel.id === 'whatsapp' && (
                    <div>
                      <FormGroup label="Twilio account SID" labelFor="twilio-account-sid" labelInfo="(Must be between 20 and 90 characters.)">
                        <InputGroup
                          id="twilio-account-sid"
                          placeholder="Enter twilio account SID"
                          onChange={(e) => {
                            this.setState({ twilioAccountSid: e.target.value })
                          }}
                        />
                      </FormGroup>
                      <FormGroup label="Twilio auth token" labelFor="twilio-auth-token" labelInfo="(Must be between 20 and 90 characters.)">
                        <InputGroup
                          id="twilio-auth-token"
                          placeholder="Enter Twlio auth token"
                          onChange={(e) => {
                            this.setState({ twilioAuthToken: e.target.value })
                          }}
                        />
                      </FormGroup>
                    </div>
                  )}
                </Callout>
              )}
            </div>

            <div className={Classes.DIALOG_FOOTER}>
              {!!this.state.error && <Callout intent={Intent.DANGER}>{this.state.error}</Callout>}
              <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <Button
                  id="btn-modal-create-bot"
                  type="submit"
                  text={this.state.isProcessing ? lang.tr('pleaseWait') : lang.tr('admin.workspace.bots.create.create')}
                  onClick={this.createBot}
                  disabled={this.isChannelButtonDisabled}
                  intent={Intent.PRIMARY}
                />
              </div>
            </div>
          </form>
        </Dialog>
      </>
    )
  }
}

const mapStateToProps = (state: AppState) => state.bots
const connector = connect(mapStateToProps, { fetchBotTemplates, fetchBotCategories })

export default connector(CreateBotModal)
