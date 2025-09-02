import fs from 'fs/promises';
import { ConfigurationError } from './errors.js';

// Configuration object with defaults
export const CONFIG = {
  timeout: 30000,
  batchSize: 3,
  batchDelay: 1000,
  preferredAPI: 'claude',
  logLevel: 'info'
};

// Simple logging system
export const logger = {
  levels: { error: 0, warn: 1, info: 2, debug: 3 },
  currentLevel: 2,
  
  error: (message, ...args) => logger.currentLevel >= 0 && console.error(`❌ [ERROR] ${message}`, ...args),
  warn: (message, ...args) => logger.currentLevel >= 1 && console.warn(`⚠️ [WARN] ${message}`, ...args),
  info: (message, ...args) => logger.currentLevel >= 2 && console.log(`ℹ️ [INFO] ${message}`, ...args),
  debug: (message, ...args) => logger.currentLevel >= 3 && console.log(`🐛 [DEBUG] ${message}`, ...args)
};

// Load .env file and configure settings
export async function loadEnv() {
  try {
    const envContent = await fs.readFile('.env', 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    }
    
    // Update CONFIG with loaded environment variables
    CONFIG.timeout = parseInt(process.env.API_TIMEOUT) || CONFIG.timeout;
    CONFIG.batchSize = parseInt(process.env.BATCH_SIZE) || CONFIG.batchSize;
    CONFIG.batchDelay = parseInt(process.env.BATCH_DELAY) || CONFIG.batchDelay;
    CONFIG.preferredAPI = process.env.PREFERRED_API || CONFIG.preferredAPI;
    
    // Update logger level
    if (process.env.LOG_LEVEL && logger.levels[process.env.LOG_LEVEL] !== undefined) {
      logger.currentLevel = logger.levels[process.env.LOG_LEVEL];
    }
    
    logger.debug('Configuration loaded successfully');
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn('No .env file found, using default configuration');
    } else {
      throw new ConfigurationError(`Failed to load environment configuration: ${error.message}`);
    }
  }
}

// Validate required API keys
export function validateAPIKeys() {
  const requiredKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'PERPLEXITY_API_KEY'];
  const availableKeys = requiredKeys.filter(key => process.env[key]);
  
  if (availableKeys.length === 0) {
    throw new ConfigurationError('No API keys configured. Please set at least one API key in your .env file.');
  }
  
  logger.info(`Available APIs: ${availableKeys.map(key => key.replace('_API_KEY', '')).join(', ')}`);
  return availableKeys;
}