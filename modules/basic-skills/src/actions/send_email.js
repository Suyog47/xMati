const _ = require('lodash')
const nodemailer = require('nodemailer')
const Promise = require('bluebird')
const axios = require('axios')

/**
 * @hidden true
 */

// const getTransport = async botId => {
//   const config = await bp.config.getModuleConfigForBot('basic-skills', botId)

//   if (!config || !config.transportConnectionString || config.transportConnectionString === '<<change me>>') {
//     throw new Error(
//       `You must configure the "basic-skills" module with valid SMTP credentials to send emails. Please see 'global/config/basic-skills.json'.`
//     )
//   }

//   return config.transportConnectionString
// }

const extractTextFromPayloads = payloads => {
  const text = _.get(
    payloads.find(p => p.type === 'text'),
    'text',
    ''
  )
  return text.replace('(missing translation) ', '').replace(/([A-Z0-9_ -]+: )/gi, '')
}

const sendEmail = async () => {
  try {
    const params = {
      event,
      user: _.get(event, 'state.user', {}),
      session: _.get(event, 'state.session', {}),
      temp: _.get(event, 'state.temp', {}),
      bot: _.get(event, 'state.bot', {})
    }

    const renderedSubject = await bp.cms.renderElement('!' + args.subjectElement, params, event)
    const renderedContent = await bp.cms.renderElement('!' + args.contentElement, params, event)

    const subject = extractTextFromPayloads(renderedSubject)
    const content = extractTextFromPayloads(renderedContent)

    const url = 'https://www.app.xmati.ai/apis/send-email';
    const payload = {
      to: args.toAddress,
      cc: args.ccAddress,
      bcc: args.bccAddress,
      subject: subject,
      content: content,
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await axios.post(url, payload, config);

    // const transport = await getTransport(event.botId)
    // console.log(`transpoter`, transport);
    // const transporter = nodemailer.createTransport(transport)

    // const params = {
    //   event,
    //   user: _.get(event, 'state.user', {}),
    //   session: _.get(event, 'state.session', {}),
    //   temp: _.get(event, 'state.temp', {}),
    //   bot: _.get(event, 'state.bot', {})
    // }

    // const renderedSubject = await bp.cms.renderElement('!' + args.subjectElement, params, event)
    // const renderedContent = await bp.cms.renderElement('!' + args.contentElement, params, event)

    // const subject = extractTextFromPayloads(renderedSubject)
    // const content = extractTextFromPayloads(renderedContent)

    // const mailOptions = {
    //   from: args.fromAddress,
    //   to: args.toAddress,
    //   cc: args.ccAddress,
    //   bcc: args.bccAddress,
    //   subject: subject,
    //   text: content,
    //   html: content
    // }

    // await Promise.fromCallback(cb => transporter.sendMail(mailOptions, cb))
    if (!response.status) {
      event.state.temp.success = false
      event.state.temp.onErrorFlowTo = '#'
    }


    event.state.temp.success = true
  } catch (error) {
    event.state.temp.success = false
    event.state.temp.onErrorFlowTo = '#'

    throw error
  }
}

return sendEmail()
