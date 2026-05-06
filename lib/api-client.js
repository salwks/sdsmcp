import { CONFIG, logger } from './config.js';
import { APIError, NetworkError, ValidationError, ConfigurationError } from './errors.js';

// API configurations.
//
// Model strings can be overridden via env vars (CLAUDE_MODEL / OPENAI_MODEL /
// PERPLEXITY_MODEL) so the codebase doesn't need a release every time a vendor
// deprecates a model. The defaults below are conservative — pick something
// known to be available rather than the bleeding edge.
const API_CONFIGS = {
  claude: {
    name: 'claude',
    display: 'Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'CLAUDE_MODEL',
    defaultModel: 'claude-3-5-sonnet-20241022',
    priority: 1,
    performance: 9,
    cost: 6,
    reliability: 9,
    specialties: ['code', 'analysis', 'structured-output'],
    requestBuilder: (prompt, key, model) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
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
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4',
    priority: 2,
    performance: 8,
    cost: 7,
    reliability: 8,
    specialties: ['general', 'creative', 'code'],
    requestBuilder: (prompt, key, model) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
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
    modelEnv: 'PERPLEXITY_MODEL',
    defaultModel: 'llama-3.1-sonar-large-128k-online',
    priority: 3,
    performance: 7,
    cost: 4,
    reliability: 7,
    specialties: ['research', 'factual', 'current-events'],
    requestBuilder: (prompt, key, model) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
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


// --- API selection ----------------------------------------------------------

// Returns ALL configured APIs in fallback order. Used by callAI() so that
// when the primary API fails, we automatically try the next one.
export function getRankedAPIs(taskType = 'general') {
  const apis = Object.values(API_CONFIGS)
    .filter(api => process.env[api.keyEnv])
    .map(api => ({
      ...api,
      key: process.env[api.keyEnv],
      model: process.env[api.modelEnv] || api.defaultModel,
    }));

  if (apis.length === 0) {
    throw new ConfigurationError('No API keys configured. Check your .env file.');
  }

  // Score-based ranking weighted by task type.
  const taskScoring = {
    'module-generation': { performance: 0.4, cost: 0.3, reliability: 0.3 },
    'specification':     { performance: 0.5, cost: 0.2, reliability: 0.3 },
    'general':           { performance: 0.4, cost: 0.4, reliability: 0.2 }
  };
  const weights = taskScoring[taskType] || taskScoring.general;

  const scored = apis.map(api => ({
    ...api,
    score: (api.performance * weights.performance) +
           ((10 - api.cost) * weights.cost) +
           (api.reliability * weights.reliability)
  })).sort((a, b) => b.score - a.score);

  // Move user's preferred API to the front (if available) so it's tried first,
  // but the rest of the list still acts as fallback.
  const preferredName = (CONFIG.preferredAPI || '').toLowerCase();
  const preferredIdx = scored.findIndex(api => api.name === preferredName);
  if (preferredIdx > 0) {
    const [preferred] = scored.splice(preferredIdx, 1);
    scored.unshift(preferred);
  }
  return scored;
}

// Backward-compat: callers that only need the single best API.
export function getAvailableAPI(taskType = 'general') {
  return getRankedAPIs(taskType)[0];
}


// --- HTTP call --------------------------------------------------------------

async function callAPI(apiConfig, prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

  try {
    const requestOptions = apiConfig.requestBuilder(prompt, apiConfig.key, apiConfig.model);
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
        `Request timeout after ${CONFIG.timeout / 1000} seconds`,
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


// --- Public entry point with retry + cross-API fallback ---------------------

/**
 * Calls the AI provider, with retry-then-fallback policy:
 *   1. Pick the highest-scoring available API for the given taskType
 *      (preferred API first if user set PREFERRED_API).
 *   2. Try it up to (retries + 1) times with a 1s backoff between attempts.
 *   3. If still failing, fall back to the next API in the ranked list and
 *      repeat. This makes the multi-vendor support actually meaningful —
 *      a Claude outage no longer takes the whole tool down.
 *   4. Only when ALL configured APIs are exhausted do we throw.
 */
export async function callAI(prompt, retries = 1, taskType = 'general') {
  const apis = getRankedAPIs(taskType);
  let lastError = null;

  for (let i = 0; i < apis.length; i++) {
    const api = apis[i];
    const isLastApi = i === apis.length - 1;
    logger.info(`Trying ${api.display} API for ${taskType} task (model=${api.model})`);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await callAPI(api, prompt);
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === retries;
        if (!isLastAttempt) {
          logger.warn(`${api.display} attempt ${attempt + 1} failed (${error.message}); retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        // Out of retries on this API.
        if (isLastApi) {
          // No more APIs to try.
          logger.error(`All APIs exhausted. Last error from ${api.display}: ${error.message}`);
          throw new APIError(
            `All APIs failed. Last error from ${api.display}: ${error.message}`,
            error,
            api.name
          );
        }
        logger.warn(`${api.display} exhausted retries; falling back to ${apis[i + 1].display}...`);
      }
    }
  }
  // Defensive: shouldn't reach here.
  throw new APIError('All APIs failed', lastError, 'unknown');
}


// --- Legacy single-API wrappers (kept for backward compatibility) -----------

export const callClaude = (prompt) => callAPI(
  { ...API_CONFIGS.claude, key: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || API_CONFIGS.claude.defaultModel }, prompt);
export const callOpenAI = (prompt) => callAPI(
  { ...API_CONFIGS.openai, key: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || API_CONFIGS.openai.defaultModel }, prompt);
export const callPerplexity = (prompt) => callAPI(
  { ...API_CONFIGS.perplexity, key: process.env.PERPLEXITY_API_KEY,
    model: process.env.PERPLEXITY_MODEL || API_CONFIGS.perplexity.defaultModel }, prompt);
