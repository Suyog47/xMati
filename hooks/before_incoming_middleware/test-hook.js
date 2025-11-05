/**
 * Simple Test Hook - Just to verify hooks are loading
 */

async function testHook() {
  // This should log for EVERY incoming event
  console.log('🚨 TEST HOOK TRIGGERED 🚨 - Event:', event.type, 'Bot:', event.botId)
  bp.logger.info('🚨 TEST HOOK TRIGGERED 🚨 - Event: ' + event.type + ' Bot: ' + event.botId)
  
  // Let the event continue normally
  return
}

return testHook()