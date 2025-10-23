const channelConfig = {
  // Channel name: configuration
  'general': {
    prompt: 'general.txt',
    model: 'tngtech/deepseek-r1t2-chimera:free',
    historyLimit: 10,
    reasoning: true // Whether to allow model reasoning before replying
  },
  'financial': {
    prompt: 'financial.txt',
    model: 'tngtech/deepseek-r1t2-chimera:free',
    historyLimit: 30,
    reasoning: false // Financial channel should reply immediately
  },
  'therapist': {
    prompt: 'therapist.txt',
    model: 'tngtech/deepseek-r1t2-chimera:free',
    historyLimit: 40,
    reasoning: true // Therapist might benefit from reasoning
  }
};

// Default settings/config
const defaultConfig = {
  defaultModel: 'tngtech/deepseek-r1t2-chimera:free',
  maxHistoryLimit: 30
};

module.exports = {
  channelConfig,
  defaultConfig
};
