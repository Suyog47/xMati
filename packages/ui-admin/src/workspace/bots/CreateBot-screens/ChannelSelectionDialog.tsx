import { Button, Classes, Dialog, FormGroup, InputGroup, Callout, Divider, Intent } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React from 'react'
import Select from 'react-select'

export interface ChannelSelectionDialogProps {
  isOpen: boolean
  closeChannelDialog: () => void
  selectedChannel: any
  setSelectedChannel: (channel: any) => void
  resetValues: () => void
  savedSubData: any
  channelList: any[]
  botId: string
  verifyToken: string
  botToken: string
  setBotToken: (value: string) => void
  slackBotToken: string
  setSlackBotToken: (value: string) => void
  slackSigningSecret: string
  setSlackSigningSecret: (value: string) => void
  messengerAccessToken: string
  setMessengerAccessToken: (value: string) => void
  messengerAppSecret: string
  setMessengerAppSecret: (value: string) => void
  twilioAccountSid: string
  setTwilioAccountSid: (value: string) => void
  twilioAuthToken: string
  setTwilioAuthToken: (value: string) => void
  isProcessing: boolean
  createBot: (e: React.FormEvent) => void
  error: any
}

const ChannelSelectionDialog: React.FC<ChannelSelectionDialogProps> = ({
  isOpen,
  closeChannelDialog,
  selectedChannel,
  setSelectedChannel,
  resetValues,
  savedSubData,
  channelList,
  botId,
  verifyToken,
  botToken,
  setBotToken,
  slackBotToken,
  setSlackBotToken,
  slackSigningSecret,
  setSlackSigningSecret,
  messengerAccessToken,
  setMessengerAccessToken,
  messengerAppSecret,
  setMessengerAppSecret,
  twilioAccountSid,
  setTwilioAccountSid,
  twilioAuthToken,
  setTwilioAuthToken,
  isProcessing,
  createBot,
  error,
}) => {

  const channelInstructions = {
    telegram: `
          <ol>
            <li>Open <strong><a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a></strong> in Telegram.</li>
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


  const getTutorialVideoSrc = () => {
    if (!selectedChannel) {
      return ''
    }
    switch (selectedChannel.id) {
      case 'webchat':
        return 'https://www.youtube.com/embed/PPgn5X7l-So'
      case 'telegram':
        return 'https://www.youtube.com/embed/XHfE8cqgdiE'
      case 'slack':
        return 'https://www.youtube.com/embed/iRU9iPO26jY'
      case 'messenger':
        return 'https://www.youtube.com/embed/CvQ-JIqU-Yk'
      case 'whatsapp':
        return 'https://www.youtube.com/embed/rP3iLSqBUBI'
      default:
        return ''
    }
  }

  const isChannelButtonDisabled = () => {
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
        messengerAccessToken.trim().length >= 50 &&
        messengerAccessToken.trim().length <= 400 &&
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

  return (
    <Dialog
      isOpen={isOpen}
      onClose={closeChannelDialog}
      title="Select a Channel"
      icon="select"
      canOutsideClickClose={false}
      style={{
        width: selectedChannel ? '1100px' : '600px',
        borderRadius: '8px',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)'
      }}
    >
      <form>
        <div className={Classes.DIALOG_BODY}>
          <FormGroup label={lang.tr('admin.workspace.bots.create.channel')} labelFor="channel">
            <Select
              id="select-bot-channel"
              tabIndex="5"
              options={
                savedSubData.subscription === 'Starter'
                  ? channelList.filter(c => c.id !== 'whatsapp')
                  : channelList
              }
              value={selectedChannel}
              onChange={selectedChannel => {
                resetValues()
                setSelectedChannel(selectedChannel)
              }}
              getOptionLabel={o => o.name}
              getOptionValue={o => o.id}
            />
          </FormGroup>

          {selectedChannel && (
            <Callout intent="primary">
              <div style={{ display: 'flex', gap: '12px' }}>
                {/* Left: Inputs + Instructions */}
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '65vh', paddingRight: '8px' }}>
                  <div
                    style={{
                      maxHeight: '300px',
                      overflowY: 'auto',
                      paddingRight: '6px',
                      border: '1px solid #eee',
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: channelInstructions[selectedChannel.id]
                    }}
                  />

                  <Divider style={{ margin: '12px 0' }} />

                  <div style={{ flexShrink: 0 }}>
                    {selectedChannel.id === 'telegram' && (
                      <FormGroup
                        label="Bot Token"
                        labelFor="bot-token"
                        labelInfo="(Must be between 20 and 90 characters.)"
                      >
                        <InputGroup
                          id="bot-token"
                          placeholder="Enter Telegram Bot Token"
                          onChange={e => setBotToken(e.target.value)}
                          value={botToken}
                        />
                      </FormGroup>
                    )}

                    {selectedChannel.id === 'slack' && (
                      <>
                        <FormGroup
                          label="Slack Bot Token"
                          labelFor="slack-bot-token"
                          labelInfo="(Must be between 20 and 90 characters.)"
                        >
                          <InputGroup
                            id="slack-bot-token"
                            placeholder="Enter Slack Bot Token"
                            onChange={e => setSlackBotToken(e.target.value)}
                            value={slackBotToken}
                          />
                        </FormGroup>
                        <FormGroup
                          label="Slack Signing Secret"
                          labelFor="slack-signing-secret"
                          labelInfo="(Must be between 20 and 90 characters.)"
                        >
                          <InputGroup
                            id="slack-signing-secret"
                            placeholder="Enter Slack Signing Secret"
                            onChange={e => setSlackSigningSecret(e.target.value)}
                            value={slackSigningSecret}
                          />
                        </FormGroup>
                      </>
                    )}

                    {selectedChannel.id === 'messenger' && (
                      <>
                        <FormGroup
                          label="Messenger Access Token"
                          labelFor="messenger-access-token"
                          labelInfo="(Must be between 50 and 400 characters.)"
                        >
                          <InputGroup
                            id="messenger-access-token"
                            placeholder="Enter Messenger Access Token"
                            onChange={e => setMessengerAccessToken(e.target.value)}
                            value={messengerAccessToken}
                          />
                        </FormGroup>
                        <FormGroup
                          label="Messenger App Secret"
                          labelFor="messenger-app-secret"
                          labelInfo="(Must be between 20 and 90 characters.)"
                        >
                          <InputGroup
                            id="messenger-app-secret"
                            placeholder="Enter Messenger App Secret"
                            onChange={e => setMessengerAppSecret(e.target.value)}
                            value={messengerAppSecret}
                          />
                        </FormGroup>
                      </>
                    )}

                    {selectedChannel.id === 'whatsapp' && (
                      <>
                        <FormGroup
                          label="Twilio account SID"
                          labelFor="twilio-account-sid"
                          labelInfo="(Must be between 20 and 90 characters.)"
                        >
                          <InputGroup
                            id="twilio-account-sid"
                            placeholder="Enter Twilio account SID"
                            onChange={e => setTwilioAccountSid(e.target.value)}
                            value={twilioAccountSid}
                          />
                        </FormGroup>
                        <FormGroup
                          label="Twilio auth token"
                          labelFor="twilio-auth-token"
                          labelInfo="(Must be between 20 and 90 characters.)"
                        >
                          <InputGroup
                            id="twilio-auth-token"
                            placeholder="Enter Twilio Auth Token"
                            onChange={e => setTwilioAuthToken(e.target.value)}
                            value={twilioAuthToken}
                          />
                        </FormGroup>
                      </>
                    )}
                  </div>
                </div>

                {/* RIGHT SIDE: Tutorial Video */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '10px 0' }}>Tutorial Video</p>
                  <iframe
                    width="100%"
                    height="350"
                    src={getTutorialVideoSrc()}
                    title="Tutorial Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </Callout>
          )}
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          {!!error && <Callout intent={Intent.DANGER}>{error}</Callout>}
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              id="btn-modal-create-bot"
              type="submit"
              text={isProcessing ? lang.tr('pleaseWait') : lang.tr('admin.workspace.bots.create.create')}
              onClick={createBot}
              disabled={isChannelButtonDisabled()}
              intent="primary"
            />
          </div>
        </div>
      </form>
    </Dialog>
  )
}

export default ChannelSelectionDialog
