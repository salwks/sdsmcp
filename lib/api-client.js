import { CONFIG, logger } from './config.js';
import { APIError, NetworkError, ValidationError, ConfigurationError } from './errors.js';

// API configurations
const API_CONFIGS = {
  claude: {
    name: 'claude',
    display: 'Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    priority: 1,
    performance: 9,
    cost: 6,
    reliability: 9,
    specialties: ['code', 'analysis', 'structured-output'],
    requestBuilder: (prompt, key) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    }),
    responseExtractor: (data) => {
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new ValidationError('Invalid response format from Claude API', 'response_content');
      }
      return data.content[0].text;
    }
  },
  
  openai: {
    name: 'openai',
    display: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    priority: 2,
    performance: 8,
    cost: 7,
    reliability: 8,
    specialties: ['general', 'creative', 'code'],
    requestBuilder: (prompt, key) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000
      })
    }),
    responseExtractor: (data) => {
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        throw new ValidationError('Invalid response format from OpenAI API', 'response_content');
      }
      return data.choices[0].message.content;
    }
  },
  
  perplexity: {
    name: 'perplexity',
    display: 'Perplexity',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    keyEnv: 'PERPLEXITY_API_KEY',
    priority: 3,
    performance: 7,
    cost: 4,
    reliability: 7,
    specialties: ['research', 'factual', 'current-events'],
    requestBuilder: (prompt, key) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000
      })
    }),
    responseExtractor: (data) => {
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        throw new ValidationError('Invalid response format from Perplexity API', 'response_content');
      }
      return data.choices[0].message.content;
    }
  }
};

// Enhanced API selection with performance and cost considerations
export function getAvailableAPI(taskType = 'general') {
  const apis = Object.values(API_CONFIGS)
    .filter(api => process.env[api.keyEnv])
    .map(api => ({ ...api, key: process.env[api.keyEnv] }));
  
  if (apis.length === 0) {
    throw new ConfigurationError('No API keys configured. Check your .env file.');
  }
  
  // Try to use preferred API first if available
  const preferred = apis.find(api => api.name === CONFIG.preferredAPI.toLowerCase());
  if (preferred) {
    return preferred;
  }
  
  // Smart selection based on task type and API characteristics
  const taskScoring = {
    'module-generation': { performance: 0.4, cost: 0.3, reliability: 0.3 },
    'specification': { performance: 0.5, cost: 0.2, reliability: 0.3 },
    'general': { performance: 0.4, cost: 0.4, reliability: 0.2 }
  };
  
  const weights = taskScoring[taskType] || taskScoring.general;
  
  // Calculate composite score for each API
  const scoredApis = apis.map(api => ({
    ...api,
    score: (api.performance * weights.performance) + 
           ((10 - api.cost) * weights.cost) + // Invert cost (lower cost = higher score)
           (api.reliability * weights.reliability)
  }));
  
  // Sort by score (descending) and return best match
  return scoredApis.sort((a, b) => b.score - a.score)[0];
}

// Unified API call function
async function callAPI(apiConfig, prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
  
  try {
    const requestOptions = apiConfig.requestBuilder(prompt, apiConfig.key);
    const response = await fetch(apiConfig.endpoint, {
      ...requestOptions,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new NetworkError(
        `${apiConfig.display} API error: ${response.status} ${response.statusText}. ${errorText}`, 
        apiConfig.endpoint, 
        response.status
      );
    }
    
    const data = await response.json();
    return apiConfig.responseExtractor(data);
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new NetworkError(
        `Request timeout after ${CONFIG.timeout/1000} seconds`, 
        apiConfig.endpoint, 
        408
      );
    }
    
    if (error instanceof NetworkError || error instanceof ValidationError) {
      throw error;
    }
    
    throw new NetworkError(
      `${apiConfig.display} API network error: ${error.message}`, 
      apiConfig.endpoint, 
      0
    );
  }
}

// Enhanced AI API call with retry logic and smart API selection
export async function callAI(prompt, retries = 1, taskType = 'general') {
  const api = getAvailableAPI(taskType);
  logger.info(`Using ${api.display} API for ${taskType} task`);
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callAPI(api, prompt);
    } catch (error) {
      if (attempt === retries) {
        logger.error(`${api.display} API error after ${retries + 1} attempts:`, error.message);
        throw new APIError(`${api.display} API failed: ${error.message}`, error, api.name);
      }
      logger.warn(`${api.display} API attempt ${attempt + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Legacy function wrappers for backward compatibility (deprecated)
export const callClaude = (prompt) => callAPI(API_CONFIGS.claude, prompt);
export const callOpenAI = (prompt) => callAPI(API_CONFIGS.openai, prompt);
export const callPerplexity = (prompt) => callAPI(API_CONFIGS.perplexity, prompt);