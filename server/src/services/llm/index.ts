// Main LLM service exports
// This file serves as the public API for all LLM functionality

// Export types
export type { LLMResponse, AccuracyResponse } from './base';

// Export base functionality
export { callLLM } from './base';

// Export conversation functions
export { generateResponse, generateScenarioGreeting, generateConversationStarter } from './conversation';

// Export accuracy functions
export { calculateAccuracy } from './accuracy';

// Re-export commonly used functions for backwards compatibility
export { generateResponse as generateConversationResponse } from './conversation';
export { calculateAccuracy as evaluateSpeechAccuracy } from './accuracy';
