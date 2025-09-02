import fs from 'fs/promises';
import path from 'path';
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

// Create .env file from template if it doesn't exist
async function createEnvFromTemplate() {
  try {
    // Try to find .env.example in current directory or package directory
    let templatePath = '.env.example';
    try {
      await fs.access(templatePath);
    } catch {
      // Try to find it in the package installation directory
      const packageDir = path.dirname(new URL(import.meta.url).pathname);
      templatePath = path.join(packageDir, '..', '.env.example');
      try {
        await fs.access(templatePath);
      } catch {
        // Create basic template if no .env.example found
        const basicTemplate = `# SDS Generator Configuration

# API Keys (at least one required)
ANTHROPIC_API_KEY="your_anthropic_api_key_here"       # Claude models (recommended)
OPENAI_API_KEY="your_openai_api_key_here"             # GPT models  
PERPLEXITY_API_KEY="your_perplexity_api_key_here"     # Research-enhanced models

# API Configuration
PREFERRED_API="claude"                                 # Options: claude, openai, perplexity
API_TIMEOUT="30000"                                    # API timeout in milliseconds
BATCH_SIZE="3"                                         # Number of modules to process in parallel
BATCH_DELAY="1000"                                     # Delay between batches in milliseconds
`;
        await fs.writeFile('.env', basicTemplate);
        logger.info('✅ Created .env file from built-in template');
        logger.info('📝 Please edit .env file and add your API keys');
        return;
      }
    }
    
    // Copy from template
    const templateContent = await fs.readFile(templatePath, 'utf8');
    await fs.writeFile('.env', templateContent);
    logger.info('✅ Created .env file from .env.example');
    logger.info('📝 Please edit .env file and add your API keys');
  } catch (error) {
    logger.error('Failed to create .env file:', error.message);
    throw new ConfigurationError('Could not create .env file. Please create it manually.');
  }
}

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
      logger.warn('No .env file found, creating from template...');
      await createEnvFromTemplate();
    } else {
      throw new ConfigurationError(`Failed to load environment configuration: ${error.message}`);
    }
  }
}

// Validate required API keys
export function validateAPIKeys() {
  const requiredKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'PERPLEXITY_API_KEY'];
  const availableKeys = requiredKeys.filter(key => process.env[key] && !process.env[key].includes('your_') && process.env[key] !== '');
  
  if (availableKeys.length === 0) {
    console.error('❌ No valid API keys found!');
    console.error('');
    console.error('📝 To use sds-generator, you need at least one API key:');
    console.error('');
    console.error('1️⃣ Edit the .env file:');
    console.error('   nano .env');
    console.error('');
    console.error('2️⃣ Add at least one API key:');
    console.error('   ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"  # Recommended');
    console.error('   OPENAI_API_KEY="sk-proj-your-key-here"');
    console.error('   PERPLEXITY_API_KEY="pplx-your-key-here"');
    console.error('');
    console.error('3️⃣ Get API keys from:');
    console.error('   • Anthropic: https://console.anthropic.com/');
    console.error('   • OpenAI: https://platform.openai.com/api-keys');
    console.error('   • Perplexity: https://www.perplexity.ai/settings/api');
    console.error('');
    throw new ConfigurationError('Please configure at least one API key in .env file');
  }
  
  logger.info(`Available APIs: ${availableKeys.map(key => key.replace('_API_KEY', '')).join(', ')}`);
  return availableKeys;
}