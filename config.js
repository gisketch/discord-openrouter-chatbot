const channelConfig = {
  // Channel name: configuration
  'general': { 
    prompt: 'general.txt',
    model: 'gpt-3.5-turbo',
    historyLimit: 10
  },
  'financial': {
    prompt: 'financial.txt',
    model: 'gpt-4',
    historyLimit: 15
  },
  'therapist': {
    prompt: 'therapist.txt',
    model: 'claude-2',
    historyLimit: 20
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
