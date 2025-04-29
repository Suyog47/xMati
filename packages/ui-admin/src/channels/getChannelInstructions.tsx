import React from 'react'

interface BotSetupProps {
  channel: string
  formData: Record<string, string>
  errors: Record<string, string>
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const BotSetupInstructions: React.FC<BotSetupProps> = ({ channel, formData, errors, handleChange }) => {
  switch (channel) {
    case 'Web Channel':
      return (
        <ol>
          <li>Go to the bot settings in your platform.</li>
          <li>Find the WebChat embed code.</li>
          <li>Copy the embed script and paste it into your website.</li>
          <li>Provide the WebChat secret key below.</li>
          <input
            style={{ borderRadius: '12px' }}
            type='text'
            name='webChatSecret'
            placeholder='Paste your WebChat secret here'
            value={formData.botToken}
            onChange={handleChange}
          />
          {errors.botToken && (
            <span className='error' style={{ marginLeft: '17px' }}>{errors.botToken}</span>
          )}

        </ol>
      )

    case 'Whatsapp':
      return (
        <ol>
          <li>Register for WhatsApp Business API.</li>
          <li>Generate an access token from your provider.</li>
          <li>Enter the access token below.</li>
          <input
            style={{ borderRadius: '12px' }}
            type='text'
            name='whatsappToken'
            placeholder='Paste your WhatsApp API token here'
            value={formData.botToken}
            onChange={handleChange}
          />
          {errors.botToken && (
            <span className='error' style={{ marginLeft: '17px' }}>{errors.botToken}</span>
          )}
        </ol>
      )

    case 'Telegram':
      return (
        <ol>
          <li>Open <strong>BotFather</strong> in Telegram.</li>
          <li>Type <code>/newbot</code> and follow the steps.</li>
          <li>Copy the <strong>botToken</strong> and provide it below.</li>
          <input
            style={{ borderRadius: '12px' }}
            type='text'
            name='telegramBotToken'
            placeholder='Paste your botToken here'
            value={formData.botToken}
            onChange={handleChange}
          />
          {errors.botToken && (
            <span className='error' style={{ marginLeft: '17px' }}>{errors.botToken}</span>
          )}
        </ol>
      )

    case 'Slack':
      return (
        <ol>
          <li>Go to <a href='https://api.slack.com/apps' target='_blank' rel='noopener noreferrer'>Slack API</a>.</li>
          <li>Create a new bot and generate a bot token.</li>
          <li>Paste the bot token below.</li>
          <input
            style={{ borderRadius: '12px' }}
            type='text'
            name='slackBotToken'
            placeholder='Paste your Slack bot token here'
            value={formData.botToken}
            onChange={handleChange}
          />
          {errors.botToken && (
            <span className='error' style={{ marginLeft: '17px' }}>{errors.botToken}</span>
          )}
        </ol>
      )

    case 'Teams':
      return (
        <ol>
          <li>Go to <a href='https://dev.teams.microsoft.com' target='_blank' rel='noopener noreferrer'>Microsoft Teams Developer Portal</a>.</li>
          <li>Create a new bot application.</li>
          <li>Generate a bot token and paste it below.</li>
          <input
            style={{ borderRadius: '12px' }}
            type='text'
            name='teamsBotToken'
            placeholder='Paste your Teams bot token here'
            value={formData.botToken}
            onChange={handleChange}
          />
          {errors.botToken && (
            <span className='error' style={{ marginLeft: '17px' }}>{errors.botToken}</span>
          )}
        </ol>
      )

    default:
      return <p>Please select a valid channel in Step 3.</p>
  }
}

export default BotSetupInstructions
