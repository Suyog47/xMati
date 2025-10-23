const _ = require('lodash')

/**
 * QnA Fallback Hook - Before Suggestions Election
 * 
 * This hook provides a fallback response when:
 * 1. No flow suggestions are found
 * 2. QnA confidence is too low
 * 3. All other processing has completed
 * 
 * Runs in before_suggestions_election phase to ensure flows have been processed first
 */

const QNA_CONFIDENCE_THRESHOLD = 0.5
const FALLBACK_MESSAGES = {
  en: [
    "Can you elaborate on your question?",
    "Could you provide more details about what you're looking for?",
    "I'd like to help you better. Can you rephrase your question?",
    "Could you be more specific about what you need help with?"
  ]
}

const hasQnAMatch = (event) => {
  return event.suggestions &&
    event.suggestions.length > 0 &&
    event.suggestions.some(s => s.source === 'qna')
}

const hasFlowSuggestions = (event) => {
  return event.suggestions &&
    event.suggestions.length > 0 &&
    event.suggestions.some(s => s.source !== 'qna' && s.confidence >= 0.3)
}

const getRandomFallbackMessage = (language = 'en') => {
  const messages = FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES.en
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}

const shouldProvideFallback = (event) => {
  // Only handle actual user text messages - ignore system events
  if (event.type !== 'text') {
    return false
  }

  // Ignore system/bot generated events
  const systemEvents = ['visit', 'session_reset', 'typing', 'session_reference']
  if (systemEvents.includes(event.type)) {
    return false
  }

  // Don't process if there's no actual user input
  if (!event.preview || event.preview.trim().length === 0) {
    return false
  }

  // Check if there are high confidence suggestions
  if (event.suggestions && event.suggestions.length > 0) {
    // If there are any QnA suggestions, let QnA handle it
    const hasGoodQnA = event.suggestions.some(s => s.source === 'qna' && s.confidence >= 0.3)
    if (hasGoodQnA) {
      return false
    }

    // If there are high confidence flow suggestions, let flows handle it
    const hasGoodFlow = event.suggestions.some(s => s.source !== 'qna' && s.confidence >= 0.5)
    if (hasGoodFlow) {
      return false
    }

    // If all suggestions have very low confidence, provide fallback instead
    const allLowConfidence = event.suggestions.every(s => s.confidence < 0.3)
    if (allLowConfidence) {
      return true
    }
  }

  // Provide fallback if no suggestions exist at all
  return !event.suggestions || event.suggestions.length === 0
}

const provideFallbackResponse = async (event) => {
  const language = event.nlu.language || 'en'
  const fallbackMessage = getRandomFallbackMessage(language)

  const fallbackPayload = {
    type: 'text',
    text: fallbackMessage,
    markdown: true
  }

  // Replace all existing low-confidence suggestions with our fallback
  event.suggestions = [{
    confidence: 0.9, // High confidence to ensure it gets selected
    payloads: [fallbackPayload],
    source: 'qna-fallback',
    sourceDetails: 'QnA Fallback Hook - Before Election'
  }]

  event.setFlag('QNA_FALLBACK_TRIGGERED', true)

  bp.logger.debug(`QnA Fallback replaced suggestions for message: "${event.preview}"`, {
    botId: event.botId,
    userId: event.target,
    totalSuggestions: event.suggestions.length,
    suggestionSources: event.suggestions.map(s => s.source)
  })
}

// Main execution
(async () => {
  try {
    // Skip processing for system events entirely
    const systemEvents = ['visit', 'session_reset', 'typing', 'session_reference']
    if (systemEvents.includes(event.type)) {
      return // Exit early for system events
    }

    bp.logger.debug('QnA Fallback Hook - Before Election - Analyzing event', {
      botId: event.botId,
      messageType: event.type,
      preview: event.preview,
      currentFlow: event.state.context.currentFlow,
      currentNode: event.state.context.currentNode,
      intent: event.nlu.intent.name,
      intentConfidence: event.nlu.intent.confidence,
      suggestionsCount: event.suggestions ? event.suggestions.length : 0,
      suggestionSources: event.suggestions ? event.suggestions.map(s => s.source) : [],
      suggestionDetails: event.suggestions ? event.suggestions.map(s => ({
        source: s.source,
        confidence: s.confidence,
        sourceDetails: s.sourceDetails
      })) : [],
      hasFlowSuggestions: hasFlowSuggestions(event),
      hasQnAMatch: hasQnAMatch(event)
    })

    // Log detailed analysis
    if (event.suggestions && event.suggestions.length > 0) {
      const hasGoodQnA = event.suggestions.some(s => s.source === 'qna' && s.confidence >= 0.3)
      const hasGoodFlow = event.suggestions.some(s => s.source !== 'qna' && s.confidence >= 0.5)
      const allLowConfidence = event.suggestions.every(s => s.confidence < 0.3)
      
      bp.logger.debug('QnA Fallback - Suggestion Analysis', {
        hasGoodQnA,
        hasGoodFlow,
        allLowConfidence,
        shouldFallback: shouldProvideFallback(event)
      })
    }

    if (shouldProvideFallback(event)) {
      await provideFallbackResponse(event)
    }
  } catch (error) {
    bp.logger.error('Error in QnA Fallback Hook (Before Election):', error)
  }
})()