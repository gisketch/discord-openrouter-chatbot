const channelConfig = {
  // Channel name: configuration
  'general': {
    prompt: 'general.txt',
    model: 'tngtech/deepseek-r1t2-chimera:free',
    historyLimit: 10
  },
  'financial': {
    prompt: 'financial.txt',
    model: 'tngtech/deepseek-r1t2-chimera:free',
    historyLimit: 30
  },
  'therapist': {
    prompt: 'therapist.txt',
    model: 'tngtech/deepseek-r1t2-chimera:free',
    historyLimit: 40
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
