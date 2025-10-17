const _ = require('lodash')

/**
 * QnA Fallback Hook
 * 
 * This hook provides a fallback response when:
 * 1. No QnA match is found
 * 2. QnA confidence is too low
 * 3. User is not in a specific flow context
 * 
 * Instead of restarting the bot flow, it asks for elaboration
 */

const QNA_CONFIDENCE_THRESHOLD = 0.5 // Adjust based on your needs
const FALLBACK_MESSAGES = {
  en: [
    "Can you elaborate on your question?",
    "Could you provide more details about what you're looking for?",
    "I'd like to help you better. Can you rephrase your question?",
    "Could you be more specific about what you need help with?"
  ],
  // Add other languages as needed
}

const isInSpecificFlow = (event) => {
  const { currentFlow, currentNode } = event.state.context

  // Don't interfere if user is in specific flows
  const excludedFlows = [
    'skills/choice',
    'error',
    'timeout',
    'main' // Add your main conversation flows here
  ]

  return excludedFlows.some(flow => currentFlow?.includes(flow))
}

const hasQnAMatch = (event) => {
  // Check if QnA found any suggestions
  return event.suggestions &&
    event.suggestions.length > 0 &&
    event.suggestions.some(s => s.source === 'qna' && s.confidence >= QNA_CONFIDENCE_THRESHOLD)
}

const getRandomFallbackMessage = (language = 'en') => {
  const messages = FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES.en
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}

const shouldProvideFallback = (event) => {
  // Only handle text messages
  if (event.type !== 'text') {
    return false
  }

  // Don't interfere with specific flows
  if (isInSpecificFlow(event)) {
    return false
  }

  // Check if user intent is "none" or low confidence
  const hasLowConfidenceIntent = event.nlu.intent.name === 'none' ||
    event.nlu.intent.confidence < 0.3

  // Check if QnA didn't find a good match
  const noQnAMatch = !hasQnAMatch(event)

  return hasLowConfidenceIntent && noQnAMatch
}

const provideFallbackResponse = async (event) => {
  const language = event.nlu.language || 'en'
  const fallbackMessage = getRandomFallbackMessage(language)

  // Create a fallback response payload
  const fallbackPayload = {
    type: 'text',
    text: fallbackMessage,
    markdown: true
  }

  // Add the fallback as a suggestion with medium confidence
  event.suggestions = event.suggestions || []
  event.suggestions.push({
    confidence: 0.7, // Medium confidence so it gets selected if no better match
    payloads: [fallbackPayload],
    source: 'qna-fallback',
    sourceDetails: 'QnA Fallback Hook'
  })

  // Optionally set a flag for analytics
  event.setFlag('QNA_FALLBACK_TRIGGERED', true)

  bp.logger.debug(`QnA Fallback triggered for message: "${event.preview}"`, {
    botId: event.botId,
    userId: event.target,
    intent: event.nlu.intent.name,
    confidence: event.nlu.intent.confidence
  })
}

// Main hook execution - runs directly when hook is triggered
try {
  if (shouldProvideFallback(event)) {
    await provideFallbackResponse(event)
  }
} catch (error) {
  bp.logger.error('Error in QnA Fallback Hook:', error)
}