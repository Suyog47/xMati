const axios = require('axios')

const callAmazonLex = async (memory, variable) => {
  const value = event.payload.text || event.preview
  try {
    const url = 'http://localhost:8000/lexbot/talk';
    const payload = {
      input: value,
      botId: args.botId
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await axios.post(url, payload, config);

    event.state[memory][variable] = response['data']['message'];
    event.state.temp.success = true
  } catch (error) {
    const errorCode = (error.response && error.response.status) || error.code || ''
    bp.logger.error(`Error: ${errorCode} while calling`)
    console.log(error);

    event.state[memory][variable] = { status: errorCode }
    event.state.temp.success = false
  }
}

return callAmazonLex('temp', 'response')