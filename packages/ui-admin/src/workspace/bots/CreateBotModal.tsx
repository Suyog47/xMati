import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Callout, Divider } from '@blueprintjs/core'
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
  error: any

  templates: any
  isChannelDialogOpen: boolean
  channel: any
  selectedTemplate?: BotTemplate
  selectedChannel?: BotChannel
  selectedCategory?: SelectOption<string>
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
  selectedCategory: undefined,
  selectedTemplate: undefined,
  error: undefined,
  isProcessing: false,
  generateId: true
}

class CreateBotModal extends Component<Props, State> {
  private _form: HTMLFormElement | null = null
  private _form2: HTMLFormElement | null = null

  state: State = {
    templates: [
      { id: 'insurance-bot', name: 'Insurance Bot' },
      // { id: 'welcome-bot', name: 'Welcome Bot' },
      // { id: 'small-talk', name: 'Small Talk' },
      { id: 'empty-bot', name: 'Empty Bot' },
      //{ id: 'learn-botpress', name: 'Learn Botpress' },
    ],
    ...defaultState,
    isChannelDialogOpen: false,
    channel: [
      { id: 'webchat', name: 'Web Chat' },
      { id: 'telegram', name: 'Telegram' },
      { id: 'slack', name: 'Slack' },
      { id: 'messenger', name: 'Facebook Messenger' },
    ]
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
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    let botName = e.target.value
    this.setState({ botName, botId: `${savedFormData.email.replace(/[^A-Za-z0-9]/g, '')}-${botName.toLowerCase().replace(/[^a-z0-9]/g, '')}` })
  }

  handlePromptChanged = e => {
    const botPrompt = e.target.value
    this.setState({ botPrompt })
  }

  createBot = async e => {
    e.preventDefault()
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    let frm = (this.state.botPrompt) ? 'llm' : 'template'

    if (this.isChannelButtonDisabled || this.isButtonDisabled) {
      return
    }
    this.setState({ isProcessing: true })

    const newBot = {
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
    }

    try {
      let res = await api.getSecured({ timeout: ms('12m') }).post('/admin/workspace/bots', newBot)
      console.log('create called')
      this.props.onCreateBotSuccess()
      this.closeChannelDialog()
    } catch (error) {
      this.setState({ error: error.message, isProcessing: false })
    }
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
    this.setState({ botToken: '', slackBotToken: '', slackSigningSecret: '', messengerAccessToken: '', messengerAppSecret: '' })
  }

  get isButtonDisabled() {
    const { isProcessing, botName, botPrompt, selectedTemplate } = this.state

    const isPromptAndTemplateMissing = !botPrompt && !selectedTemplate

    return !(botName && !isProcessing && !isPromptAndTemplateMissing)
  }

  get isChannelButtonDisabled() {
    const { isProcessing, selectedChannel, botToken, slackBotToken, slackSigningSecret, messengerAccessToken, messengerAppSecret } = this.state

    if (!selectedChannel) {
      return true
    }

    if (selectedChannel.id === 'telegram') {
      return !(botToken && !isProcessing)
    }
    if (selectedChannel.id === 'slack') {
      return !(slackBotToken && slackSigningSecret && !isProcessing)
    }
    if (selectedChannel.id === 'messenger') {
      return !(messengerAccessToken && messengerAppSecret && !isProcessing)
    }

    return false
  }

  render() {
    const { botId, verifyToken } = this.state // Get the current botId from state

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
          <li><code>&lt;script src="https://www.app.xmati.ai/assets/modules/channel-web/inject.js"&gt;&lt;/script&gt;</code></li>
          <li>
            <code>
              &lt;script&gt;<br/>
              &nbsp;&nbsp;window.botpressWebChat.init({<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;host: "https://www.app.xmati.ai",<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;botId: "${botId}"<br/>
              &nbsp;&nbsp;})<br/>
              &lt;/script&gt;
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
    }

    return (
      <>
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
                  autoFocus />
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
                    height: '100px', // Fixed height
                    width: '100%', // Full width
                    overflow: 'auto' // Adds scrollbars if content exceeds the box
                  }} />
              </FormGroup>

              <p style={{ textAlign: 'center' }}><b>Or</b></p>

              {this.state.templates.length > 0 && (
                <FormGroup label={lang.tr('admin.workspace.bots.create.template')} labelFor="template">
                  <Select
                    id="select-bot-templates"
                    tabIndex="4"
                    options={this.state.templates}
                    value={this.state.selectedTemplate}
                    onChange={selectedTemplate => {
                      this.setState({ selectedTemplate: selectedTemplate as any })
                    }}
                    getOptionLabel={o => o.name}
                    getOptionValue={o => o.id} />
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
                  intent={Intent.PRIMARY} />
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
                  getOptionValue={o => o.id} />
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
                      <FormGroup label="Bot Token" labelFor="bot-token">
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
                      <FormGroup label="Slack Bot Token" labelFor="slack-bot-token">
                        <InputGroup
                          id="slack-bot-token"
                          placeholder="Enter Slack Bot Token"
                          onChange={(e) => {
                            this.setState({ slackBotToken: e.target.value })
                          }}
                        />
                      </FormGroup>
                      <FormGroup label="Slack Signing Secret" labelFor="slack-signing-secret">
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
                      <FormGroup label="Messenger Access Token" labelFor="messenger-access-token">
                        <InputGroup
                          id="messenger-access-token"
                          placeholder="Enter Messenger Access Token"
                          onChange={(e) => {
                            this.setState({ messengerAccessToken: e.target.value })
                          }}
                        />
                      </FormGroup>
                      <FormGroup label="Messenger App Secret" labelFor="messenger-app-secret">
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
                  intent={Intent.PRIMARY} />
                {/* <Button onClick={this.closeChannelDialog}>Close</Button> */}
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
