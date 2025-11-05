/**
 * Global Logic Layer Hook - Before Incoming Middleware
 * 
 * This hook intercepts all incoming user messages for every bot in the workspace and provides:
 * 1. Greeting detection and routing to greeting flow
 * 2. Manual Knowledge Base querying for non-greetings
 * 3. Fallback response when no KB match is found
 * 
 * IMPORTANT: Ensure Knowledge Agent is set to Manual mode to prevent auto-answers
 */

const axios = require('axios')
const _ = require('lodash')

// Greeting patterns (case-insensitive)
const GREETING_PATTERNS = [
  /^(hi|hello|hey|hiya|howdy)$/i,
  /^(good\s+(morning|afternoon|evening|night))$/i,
  /^(greetings?|salutations?)$/i,
  /^(what'?s\s+up|sup)$/i,
  /^(how\s+(are\s+you|ya\s+doing))$/i
]

// Greeting flow configuration
const GREETING_FLOW = 'main.flow.json'  // Adjust to your greeting flow name
const GREETING_NODE = 'greeting'         // Adjust to your greeting node name

// Fallback message when no KB match found
const FALLBACK_MESSAGE = "Sorry, I don't have information about that yet. Could you please rephrase your question or try asking something else?"

/**
 * Check if the message is a greeting
 */
const isGreeting = (text) => {
  if (!text || typeof text !== 'string') {
    return false
  }
  
  const normalizedText = text.trim()
  return GREETING_PATTERNS.some(pattern => pattern.test(normalizedText))
}

/**
 * Query Knowledge Base using the QnA service
 */
const queryKnowledgeBase = async (event, text) => {
  try {
    const axiosConfig = await bp.http.getAxiosConfigForBot(event.botId, { localUrl: true })
    
    // Query QnA service for matches
    const response = await axios.get(`/mod/qna/questions`, {
      ...axiosConfig,
      params: {
        question: text,
        limit: 1,
        offset: 0
      }
    })
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      const qnaItem = response.data.items[0]
      
      // Get user language or default to bot's default language
      const userLanguage = event.state?.user?.language || 'en'
      const answers = qnaItem.data.answers[userLanguage] || qnaItem.data.answers['en']
      
      if (answers && answers.length > 0) {
        // Return a random answer from the available answers
        const randomAnswer = answers[Math.floor(Math.random() * answers.length)]
        return {
          found: true,
          answer: randomAnswer,
          qnaId: qnaItem.id
        }
      }
    }
    
    return { found: false }
  } catch (error) {
    bp.logger.warn(`Error querying knowledge base: ${error.message}`)
    return { found: false }
  }
}

/**
 * Send a response message to the user
 */
const sendResponse = async (event, message) => {
  try {
    const payloads = await bp.cms.renderElement('#!builtin_text', {
      text: message,
      typing: true
    }, event)
    
    await bp.events.replyToEvent(event, payloads, event.id)
  } catch (error) {
    bp.logger.warn(`Error sending response: ${error.message}`)
  }
}

/**
 * Jump to a specific flow and node
 */
const jumpToFlow = async (event, flowName, nodeName) => {
  try {
    const sessionId = bp.dialog.createId(event)
    await bp.dialog.jumpTo(sessionId, event, flowName, nodeName)
    return true
  } catch (error) {
    bp.logger.warn(`Error jumping to flow: ${error.message}`)
    return false
  }
}

/**
 * Main processing function
 */
const processMessage = async () => {
  // Only process text messages from users
  if (event.type !== 'text' || !event.payload?.text) {
    return
  }

  // Skip processing for system events or bot messages
  if (event.direction !== 'incoming' || event.botId === event.target) {
    return
  }

  // Skip if already processed by this hook to prevent loops
  if (event.flags && event.flags.processedByGlobalHandler) {
    return
  }

  const userMessage = event.payload.text.trim()
  
  // Skip empty messages
  if (!userMessage) {
    return
  }

  try {
    // Mark as processed to prevent loops
    event.flags = event.flags || {}
    event.flags.processedByGlobalHandler = true

    // Check if it's a greeting
    if (isGreeting(userMessage)) {
      bp.logger.info(`Detected greeting: "${userMessage}" for bot ${event.botId}`)
      
      // Jump to greeting flow
      const jumped = await jumpToFlow(event, GREETING_FLOW, GREETING_NODE)
      
      if (jumped) {
        // Stop further processing since we handled the greeting
        event.flags.skipDialog = true
        return
      } else {
        bp.logger.warn(`Failed to jump to greeting flow for bot ${event.botId}`)
      }
    } else {
      // Not a greeting - query Knowledge Base
      bp.logger.info(`Querying knowledge base for: "${userMessage}" for bot ${event.botId}`)
      
      const kbResult = await queryKnowledgeBase(event, userMessage)
      
      if (kbResult.found) {
        bp.logger.info(`Found KB answer for bot ${event.botId}, QnA ID: ${kbResult.qnaId}`)
        
        // Send the KB answer
        await sendResponse(event, kbResult.answer)
        
        // Stop dialog propagation since we provided an answer
        event.flags.skipDialog = true
        return
      } else {
        bp.logger.info(`No KB match found for: "${userMessage}" for bot ${event.botId}`)
        
        // Send fallback message
        await sendResponse(event, FALLBACK_MESSAGE)
        
        // Stop dialog propagation since we provided a fallback
        event.flags.skipDialog = true
        return
      }
    }
  } catch (error) {
    bp.logger.error(`Error in global handler for bot ${event.botId}: ${error.message}`)
    
    // On error, let the normal dialog flow continue
    // Remove the processed flag so other handlers can work
    if (event.flags) {
      delete event.flags.processedByGlobalHandler
    }
  }
}

// Execute the main processing
return processMessage()