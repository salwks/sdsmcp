#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

// Load .env file
async function loadEnv() {
  try {
    const envContent = await fs.readFile('.env', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    }
  } catch (error) {
    console.error('⚠️ .env file not found.');
  }
}

// Simple question helper
let inputQueue = [];
let inputIndex = 0;

function askQuestion(query) {
  return new Promise(resolve => {
    // If we have pre-loaded answers, use them
    if (inputIndex < inputQueue.length) {
      const answer = inputQueue[inputIndex++];
      console.log(query + answer);
      resolve(answer.trim());
      return;
    }
    
    // Otherwise use interactive input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Load piped input if available
function loadPipedInput() {
  return new Promise(resolve => {
    if (!process.stdin.isTTY) {
      let input = '';
      process.stdin.on('data', chunk => input += chunk);
      process.stdin.on('end', () => {
        inputQueue = input.trim().split('\n');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// API call functions with timeout
async function callClaude(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${CONFIG.timeout/1000} seconds`);
    }
    throw error;
  }
}

async function callOpenAI(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${CONFIG.timeout/1000} seconds`);
    }
    throw error;
  }
}

async function callPerplexity(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${CONFIG.timeout/1000} seconds`);
    }
    throw error;
  }
}

// Configuration with defaults
const CONFIG = {
  timeout: parseInt(process.env.API_TIMEOUT) || 30000,
  batchSize: parseInt(process.env.BATCH_SIZE) || 3,
  batchDelay: parseInt(process.env.BATCH_DELAY) || 1000,
  preferredAPI: process.env.PREFERRED_API || 'claude'
};

// Check available APIs and select best one
function getAvailableAPI() {
  const apis = [
    { name: 'claude', display: 'Claude', func: callClaude, key: process.env.ANTHROPIC_API_KEY, priority: 1 },
    { name: 'openai', display: 'OpenAI', func: callOpenAI, key: process.env.OPENAI_API_KEY, priority: 2 },
    { name: 'perplexity', display: 'Perplexity', func: callPerplexity, key: process.env.PERPLEXITY_API_KEY, priority: 3 }
  ].filter(api => api.key);
  
  if (apis.length === 0) {
    throw new Error('No API keys configured. Check your .env file.');
  }
  
  // Try to use preferred API first
  const preferred = apis.find(api => api.name === CONFIG.preferredAPI.toLowerCase());
  if (preferred) {
    return preferred;
  }
  
  // Fall back to priority order
  return apis.sort((a, b) => a.priority - b.priority)[0];
}

// Tech stack options by project type
const techStackOptions = {
  mobile: [
    {
      id: 1,
      name: 'React Native',
      stack: {
        language: 'JavaScript/TypeScript',
        framework: 'React Native',
        stateManagement: 'Redux Toolkit / Zustand',
        database: ['AsyncStorage', 'SQLite', 'Firebase'],
        testing: 'Jest + React Native Testing Library',
        deployment: 'App Store / Google Play'
      }
    },
    {
      id: 2,
      name: 'Flutter',
      stack: {
        language: 'Dart',
        framework: 'Flutter',
        stateManagement: 'Provider / Riverpod / Bloc',
        database: ['Hive', 'SQLite', 'Firebase'],
        testing: 'Flutter Test Framework',
        deployment: 'App Store / Google Play'
      }
    },
    {
      id: 3,
      name: 'Native iOS (Swift)',
      stack: {
        language: 'Swift',
        framework: 'UIKit / SwiftUI',
        stateManagement: 'Core Data / Combine',
        database: ['Core Data', 'SQLite', 'CloudKit'],
        testing: 'XCTest',
        deployment: 'App Store'
      }
    },
    {
      id: 4,
      name: 'Native Android (Kotlin)',
      stack: {
        language: 'Kotlin',
        framework: 'Android Jetpack',
        stateManagement: 'ViewModel / LiveData',
        database: ['Room', 'SQLite', 'Firebase'],
        testing: 'JUnit + Espresso',
        deployment: 'Google Play'
      }
    }
  ],
  web: [
    {
      id: 1,
      name: 'React/Next.js',
      stack: {
        language: 'JavaScript/TypeScript',
        framework: 'Next.js',
        stateManagement: 'Redux Toolkit / Zustand',
        database: ['PostgreSQL', 'MongoDB', 'Prisma'],
        testing: 'Jest + React Testing Library',
        deployment: 'Vercel / Netlify'
      }
    },
    {
      id: 2,
      name: 'Vue/Nuxt',
      stack: {
        language: 'JavaScript/TypeScript',
        framework: 'Nuxt.js',
        stateManagement: 'Pinia / Vuex',
        database: ['PostgreSQL', 'MongoDB', 'Prisma'],
        testing: 'Vitest + Vue Testing Utils',
        deployment: 'Vercel / Netlify'
      }
    }
  ],
  backend: [
    {
      id: 1,
      name: 'Node.js/Express',
      stack: {
        language: 'JavaScript/TypeScript',
        framework: 'Express.js',
        stateManagement: 'N/A',
        database: ['PostgreSQL', 'MongoDB', 'Redis'],
        testing: 'Jest + Supertest',
        deployment: 'Docker / AWS / Heroku'
      }
    },
    {
      id: 2,
      name: 'Python/FastAPI',
      stack: {
        language: 'Python',
        framework: 'FastAPI',
        stateManagement: 'N/A',
        database: ['PostgreSQL', 'MongoDB', 'Redis'],
        testing: 'pytest + httpx',
        deployment: 'Docker / AWS / Heroku'
      }
    }
  ],
  desktop: [
    {
      id: 1,
      name: 'Electron',
      stack: {
        language: 'JavaScript/TypeScript',
        framework: 'Electron + React',
        stateManagement: 'Redux / Context API',
        database: ['SQLite', 'NeDB', 'IndexedDB'],
        testing: 'Jest + Spectron',
        deployment: 'GitHub Releases / Windows Store'
      }
    },
    {
      id: 2,
      name: 'Tauri',
      stack: {
        language: 'Rust + JavaScript',
        framework: 'Tauri',
        stateManagement: 'Rust State / Frontend State',
        database: ['SQLite', 'sled', 'PostgreSQL'],
        testing: 'cargo test + Jest',
        deployment: 'GitHub Releases / Native Installers'
      }
    }
  ]
};

// Interactive project type selection
async function selectProjectType() {
  console.log('\n🎯 What type of project do you want to create?');
  console.log('1. Mobile App (iOS/Android)');
  console.log('2. Web Application (Browser-based)');
  console.log('3. Backend/API (Server-side)');
  console.log('4. Desktop Application');
  
  const answer = await askQuestion('Select project type (1-4): ');
  const choice = parseInt(answer);
  
  const types = ['mobile', 'web', 'backend', 'desktop'];
  
  if (choice >= 1 && choice <= 4) {
    return types[choice - 1];
  } else {
    console.log('Invalid selection. Using web as default.');
    return 'web';
  }
}

// Interactive tech stack selection
async function selectTechStack(projectType) {
  const options = techStackOptions[projectType];
  if (!options) {
    throw new Error(`Unsupported project type: ${projectType}`);
  }

  console.log(`\n🔧 Select tech stack for ${projectType} project:`);
  options.forEach((option, index) => {
    console.log(`${index + 1}. ${option.name}`);
    console.log(`   Language: ${option.stack.language}`);
    console.log(`   Framework: ${option.stack.framework}\n`);
  });

  const answer = await askQuestion(`Select tech stack (1-${options.length}): `);
  const choice = parseInt(answer);
  
  let selectedStack;
  if (choice >= 1 && choice <= options.length) {
    selectedStack = options[choice - 1];
  } else {
    console.log('Invalid selection. Using default.');
    selectedStack = options[0];
  }
  
  // Ask for language preference
  const langChoice = await askQuestion(`\n💬 Do you have a preferred language? (press enter for ${selectedStack.stack.language}): `);
  if (langChoice.trim()) {
    console.log(`✅ Custom language noted: ${langChoice}`);
    selectedStack.stack.customLanguage = langChoice;
  }
  
  return selectedStack;
}

// Enhanced AI API call with retry logic
async function callAI(prompt, retries = 1) {
  const api = getAvailableAPI();
  console.error(`🤖 Using ${api.display} API...`);
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await api.func(prompt);
    } catch (error) {
      if (attempt === retries) {
        console.error(`❌ ${api.display} API error after ${retries + 1} attempts:`, error.message);
        throw new Error(`${api.display} API failed: ${error.message}`);
      }
      console.error(`⚠️ ${api.display} API attempt ${attempt + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Enhanced JSON parsing from AI response
function parseJSONFromResponse(response, type = 'object') {
  try {
    // 1. Remove code blocks
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // 2. Remove comments
    cleanResponse = cleanResponse.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    // 3. Extract JSON pattern
    let jsonMatch;
    if (type === 'array') {
      jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
    } else {
      jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      throw new Error('No JSON pattern found');
    }
    
    let jsonString = jsonMatch[0];
    
    // 4. Remove trailing commas
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // 5. Remove control characters
    jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, '');
    
    // 6. Parse
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parsing failed, original response:', response.substring(0, 200));
    throw new Error(`JSON parsing error: ${error.message}`);
  }
}

// Step 1: Generate module list
async function generateModuleList(description, complexity_level = 'medium') {
  console.error('🤖 Step 1: AI basic structure analysis...');
  
  const structurePrompt = `Project: "${description}"

Please provide a list of all modules needed for this project as a JSON array:
["Module1", "Module2", "Module3", ...]

Include ${getModuleCount(complexity_level || 'medium')} modules appropriate for ${complexity_level || 'medium'} complexity.`;

  let modules;
  try {
    const structureResponse = await callAI(structurePrompt);
    modules = parseJSONFromResponse(structureResponse, 'array');
    
    if (!Array.isArray(modules) || modules.length === 0) {
      throw new Error('Invalid module structure received from AI');
    }
  } catch (apiError) {
    throw new Error(`Module structure generation failed: ${apiError.message}. Please check your API configuration and try again.`);
  }
  
  console.error(`✅ ${modules.length} modules identified`);
  return modules;
}

// Interactive module selection
async function selectModules(modules) {
  console.log('\n📋 Suggested modules:');
  modules.forEach((module, index) => {
    console.log(`${index + 1}. ${module}`);
  });
  
  console.log('\nOptions:');
  console.log('1. Use all modules (recommended)');
  console.log('2. Select specific modules');
  console.log('3. Add custom modules');
  
  const choice = await askQuestion('Choose option (1-3): ');
  
  if (choice === '1') {
    return modules;
  } else if (choice === '2') {
    const indices = await askQuestion('Enter module numbers (comma-separated, e.g., 1,3,5): ');
    const selectedIndices = indices.split(',').map(i => parseInt(i.trim()) - 1);
    return selectedIndices.map(i => modules[i]).filter(Boolean);
  } else if (choice === '3') {
    const customModules = await askQuestion('Enter additional modules (comma-separated): ');
    return [...modules, ...customModules.split(',').map(m => m.trim())];
  }
  
  return modules; // default
}

// Step 2: Generate detailed specification
async function generateSpecification(description, selectedTechStack, selectedModules) {
  const specification = {
    title: "Project Specification",
    description,
    techStack: selectedTechStack,
    modules: []
  };

  console.error('🔧 Step 2: Detailing each module...');
  
  // Process modules in parallel batches to avoid rate limits
  const batchSize = CONFIG.batchSize;
  for (let i = 0; i < selectedModules.length; i += batchSize) {
    const batch = selectedModules.slice(i, i + batchSize);
    console.error(`  📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(selectedModules.length/batchSize)} (${batch.length} modules)...`);
    
    const batchPromises = batch.map(async (moduleName) => {
      console.error(`  - Detailing ${moduleName} module...`);
      
      try {
        const modulePrompt = `Please design the "${moduleName}" module in detail.

Respond in JSON format:
{
  "name": "Module name",
  "description": "Detailed module description",
  "functions": [
    {
      "name": "Function name",
      "description": "Function description", 
      "parameters": "Parameter list",
      "returns": "Return value description"
    }
  ]
}

Include 3-5 functions per module.`;

        try {
          const moduleResponse = await callAI(modulePrompt);
          const moduleData = parseJSONFromResponse(moduleResponse);
          
          if (!moduleData || typeof moduleData !== 'object') {
            throw new Error(`Invalid module data received for ${moduleName}`);
          }
          
          console.error(`    ✓ ${moduleName}: ${moduleData.functions?.length || 0} functions generated`);
          return moduleData;
        } catch (apiError) {
          console.error(`    ❌ Failed to generate ${moduleName}: ${apiError.message}`);
          // Return minimal module structure on failure
          return {
            name: moduleName,
            description: `${moduleName} module functionality`,
            functions: []
          };
        }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Add successful results to specification
    batchResults.forEach(result => {
      if (result) {
        specification.modules.push(result);
      }
    });
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < selectedModules.length) {
      console.error(`  ⏱️ Brief pause before next batch...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.batchDelay));
    }
  }

  console.error('\n📋 Step 3: Organizing specification...');
  
  return specification;
}

// Generate markdown with selected tech stack
function generateMarkdown(specification) {
  const selectedTechStack = specification.techStack;
  const totalFunctions = specification.modules.reduce((sum, module) => sum + (module.functions?.length || 0), 0);

  return `# ${specification.title}

## Overview
${specification.description}

## Selected Tech Stack: ${selectedTechStack.name}
- **Language**: ${selectedTechStack.stack.language}
- **Framework**: ${selectedTechStack.stack.framework}
- **State Management**: ${selectedTechStack.stack.stateManagement}
- **Database**: ${JSON.stringify(selectedTechStack.stack.database)}
- **Testing**: ${selectedTechStack.stack.testing}
- **Deployment**: ${selectedTechStack.stack.deployment}

## Key Dependencies
${selectedTechStack.stack.dependencies ? selectedTechStack.stack.dependencies.map(dep => `- ${dep}`).join('\n') : '- To be determined based on specific requirements'}

## Software Design Specification (Total ${specification.modules.length} modules, ${totalFunctions} functions)

| Module | Function | Design Spec | Function Definition | Remarks |
|--------|----------|-------------|-------------------|---------|
${specification.modules.map(module => 
  module.functions?.map(func => 
    `| ${module.name} | ${func.name}() | ${func.description} | ${func.parameters} → ${func.returns} | ${func.remarks || '-'} |`
  ).join('\n') || `| ${module.name} | - | ${module.description} | - | No functions |`
).join('\n')}

## Module Details

${specification.modules.map(module => `### ${module.name}
**Description**: ${module.description}

**Functions**: ${module.functions?.length || 0}

${module.functions?.map(func => `#### ${func.name}()
- **Description**: ${func.description}
- **Parameters**: ${func.parameters}
- **Returns**: ${func.returns}
`).join('\n') || 'No functions defined'}
`).join('\n')}`;
}

// Create .sds directory with development files
async function createSDSDirectory(specification, sdsDir) {
  await fs.mkdir(sdsDir, { recursive: true });
  
  // development.json
  const developmentData = {
    projectType: specification.techStack.name,
    techStack: specification.techStack.stack,
    modules: specification.modules.map(m => ({
      name: m.name,
      description: m.description,
      functionCount: m.functions?.length || 0
    }))
  };
  
  await fs.writeFile(
    path.join(sdsDir, 'development.json'),
    JSON.stringify(developmentData, null, 2)
  );
  
  // tasks.json (TaskMaster compatible)
  const tasksData = {
    tasks: specification.modules.map((module, index) => ({
      id: (index + 1).toString(),
      title: `Implement ${module.name}`,
      description: module.description,
      status: 'pending',
      priority: 'medium',
      functions: module.functions || []
    }))
  };
  
  await fs.writeFile(
    path.join(sdsDir, 'tasks.json'),
    JSON.stringify(tasksData, null, 2)
  );
  
  // README.md
  const readmeContent = `# ${specification.title} Development Guide

## Tech Stack
${specification.techStack.name}

## Quick Start
1. Install dependencies
2. Configure environment variables
3. Run development server

## Modules Overview
${specification.modules.map(m => `- **${m.name}**: ${m.description}`).join('\n')}

## Development Tasks
See tasks.json for detailed implementation tasks.
`;
  
  await fs.writeFile(
    path.join(sdsDir, 'README.md'),
    readmeContent
  );
}

// Main execution function
async function main() {
  if (!process.argv[2]) {
    console.log('Usage: sds "project description"');
    console.log('\nExample:');
    console.log('  sds "I want to create a mobile e-commerce app"');
    return;
  }

  await loadEnv();
  await loadPipedInput();
  
  try {
    const description = process.argv[2];
    
    // Select project type
    const projectType = await selectProjectType();
    
    // Select tech stack
    const selectedTechStack = await selectTechStack(projectType);
    console.log(`\n✅ Selected tech stack: ${selectedTechStack.name}`);
    
    // Generate module list
    const moduleList = await generateModuleList(description, 'complex');
    
    // Let user select modules
    const selectedModules = await selectModules(moduleList);
    console.log(`\n✅ Selected ${selectedModules.length} modules for detailed specification`);
    console.log('Starting specification generation...\n');
    
    // Generate detailed specification
    const specification = await generateSpecification(description, selectedTechStack, selectedModules);
    
    const totalFunctions = specification.modules.reduce((sum, module) => sum + (module.functions?.length || 0), 0);
    console.error('\n🏆 Success!');
    console.error(`✅ ${specification.modules.length} modules`);
    console.error(`✅ ${totalFunctions} functions`);
    
    // Create .sds directory
    const sdsDir = '.sds';
    await createSDSDirectory(specification, sdsDir);
    console.error(`✅ Development files created: ${sdsDir}`);
    
    // Generate and save markdown
    const markdown = generateMarkdown(specification);
    await fs.writeFile('specification.md', markdown);
    console.error('✅ Specification saved: specification.md');
    
    console.log('\n' + markdown);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

// Session storage for specifications
const sessions = new Map();

// Language detection helper
function detectLanguage(text) {
  const koreanRegex = /[가-힣]/;
  return koreanRegex.test(text) ? 'ko' : 'en';
}

// Get module count based on complexity
function getModuleCount(complexity_level) {
  const moduleCounts = {
    simple: 5,
    medium: 8,
    complex: 12
  };
  return moduleCounts[complexity_level] || 8;
}

// Localized messages
const messages = {
  en: {
    projectAnalysisResult: 'Project Analysis Result',
    projectType: 'Project Type',
    complexity: 'Complexity',
    mainFeatures: 'Main Features',
    sessionId: 'Session ID',
    specificationModified: 'Specification Modified',
    modificationContent: 'Modification Content',
    updatedSpecification: 'Updated Specification',
    specificationExported: 'Specification Exported',
    format: 'Format',
    templatesIncluded: 'Templates Included',
    dataSource: 'Data Source',
    yes: 'Yes',
    no: 'No'
  },
  ko: {
    projectAnalysisResult: '프로젝트 분석 결과',
    projectType: '프로젝트 타입',
    complexity: '복잡도',
    mainFeatures: '주요 기능',
    sessionId: '세션 ID',
    specificationModified: '명세서 수정 완료',
    modificationContent: '수정 내용',
    updatedSpecification: '업데이트된 명세서',
    specificationExported: '명세서 내보내기 완료',
    format: '형태',
    templatesIncluded: '템플릿 포함',
    dataSource: '데이터 소스',
    yes: '예',
    no: '아니오'
  }
};

// MCP Server functionality
async function startMCPServer() {
  // Load environment variables once at server start
  await loadEnv();
  
  const server = {
    name: "sds-generator",
    version: "1.0.10",
    tools: [
      {
        name: "analyze_project_request",
        description: "Analyze natural language project requests and generate structured specifications",
        inputSchema: {
          type: "object",
          properties: {
            project_description: {
              type: "string",
              description: "User's natural language project description"
            },
            target_platform: {
              type: "string",
              enum: ["embedded", "web", "mobile", "desktop", "api", "auto"],
              default: "auto",
              description: "Target platform (auto: automatic detection)"
            },
            complexity_level: {
              type: "string",
              enum: ["simple", "medium", "complex", "auto"],
              default: "auto",
              description: "Complexity level (auto: automatic detection)"
            },
            include_advanced_features: {
              type: "boolean",
              default: true,
              description: "Include advanced features (security, logging, error handling, etc.)"
            }
          },
          required: ["project_description"]
        }
      },
      {
        name: "refine_specification",
        description: "Refine and extend existing specifications based on user feedback",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Specification session ID (returned from analyze_project_request)"
            },
            current_spec: {
              type: "string",
              description: "Existing specification JSON string (use only when session_id is not available)"
            },
            modification_request: {
              type: "string",
              description: "User's modification request"
            },
            action_type: {
              type: "string",
              enum: ["add_module", "add_function", "modify_function", "remove_item", "auto"],
              default: "auto",
              description: "Type of action to perform"
            }
          },
          required: ["modification_request"]
        }
      },
      {
        name: "export_specification",
        description: "Export specifications in various formats",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Specification session ID (returned from analyze_project_request)"
            },
            spec_data: {
              type: "string",
              description: "Specification JSON data (use only when session_id is not available)"
            },
            export_format: {
              type: "string",
              enum: ["markdown", "json", "csv", "xlsx"],
              default: "markdown",
              description: "Export format"
            },
            include_templates: {
              type: "boolean",
              default: false,
              description: "Include code templates"
            }
          }
        }
      },
      {
        name: "select_tech_stack",
        description: "Select technology stack for a project platform",
        inputSchema: {
          type: "object",
          properties: {
            platform: {
              type: "string",
              enum: ["embedded", "web", "mobile", "desktop", "api"],
              description: "Target platform"
            },
            preferences: {
              type: "array",
              items: { type: "string" },
              description: "Technology preferences (optional)"
            }
          },
          required: ["platform"]
        }
      },
      {
        name: "select_modules",
        description: "Select modules from a generated list for detailed specification",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Specification session ID"
            },
            selected_modules: {
              type: "array",
              items: { type: "string" },
              description: "List of selected module names"
            }
          },
          required: ["session_id", "selected_modules"]
        }
      }
    ]
  };

  process.stdin.on('data', async (data) => {
    try {
      const request = JSON.parse(data.toString());
      
      if (request.method === 'initialize') {
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {}
            },
            serverInfo: server
          }
        }) + '\n');
      } else if (request.method === 'tools/list') {
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: { tools: server.tools }
        }) + '\n');
      } else if (request.method === 'tools/call') {
        if (request.params.name === 'analyze_project_request') {
          await handleAnalyzeProjectRequest(request);
        } else if (request.params.name === 'refine_specification') {
          await handleRefineSpecification(request);
        } else if (request.params.name === 'export_specification') {
          await handleExportSpecification(request);
        } else if (request.params.name === 'select_tech_stack') {
          await handleSelectTechStack(request);
        } else if (request.params.name === 'select_modules') {
          await handleSelectModules(request);
        }
      }
    } catch (error) {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: request?.id || null,
        error: {
          code: -32603,
          message: error.message
        }
      }) + '\n');
    }
  });
}

// MCP Handler functions
async function handleAnalyzeProjectRequest(request) {
  const { project_description, target_platform = 'auto', complexity_level = 'auto', include_advanced_features = true } = request.params.arguments;
  
  // Detect user language
  const userLanguage = detectLanguage(project_description);
  const msg = messages[userLanguage];
  
  // Auto-detect platform if needed
  let detectedPlatform = target_platform;
  if (target_platform === 'auto') {
    if (project_description.includes('모바일') || project_description.includes('mobile') || project_description.includes('앱') || project_description.includes('app')) {
      detectedPlatform = 'mobile';
    } else if (project_description.includes('웹') || project_description.includes('web')) {
      detectedPlatform = 'web';
    } else {
      detectedPlatform = 'web'; // default
    }
  }
  
  // Select appropriate tech stack
  const availableStacks = techStackOptions[detectedPlatform];
  const selectedTechStack = availableStacks ? availableStacks[0] : techStackOptions.web[0];
  
  // Generate modules
  const moduleList = await generateModuleList(project_description, complexity_level);
  const moduleCount = getModuleCount(complexity_level);
  const specification = await generateSpecification(project_description, selectedTechStack, moduleList.slice(0, moduleCount));
  
  // Generate session ID
  const sessionId = `spec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store in session
  const sessionData = {
    specification,
    platform: detectedPlatform,
    complexity: complexity_level,
    advanced_features: include_advanced_features,
    created_at: new Date().toISOString()
  };
  sessions.set(sessionId, sessionData);
  
  // Generate markdown with language info
  const markdownWithLang = generateMarkdownWithLanguage(specification, detectedPlatform);
  
  process.stdout.write(JSON.stringify({
    jsonrpc: "2.0",
    id: request.id,
    result: {
      content: [
        {
          type: "text",
          text: `## ${msg.projectAnalysisResult}

**${msg.projectType}**: ${detectedPlatform}
**${msg.complexity}**: ${complexity_level}
**${msg.mainFeatures}**: ${getMainFeatures(detectedPlatform)}
**${msg.sessionId}**: \`${sessionId}\`

## 소프트웨어 설계 명세서

${markdownWithLang}`
        }
      ]
    }
  }) + '\n');
}

async function handleRefineSpecification(request) {
  const { session_id, modification_request, action_type = 'auto' } = request.params.arguments;
  
  if (!session_id || !sessions.has(session_id)) {
    throw new Error('Specification session not found. Please provide a valid session_id.');
  }
  
  const sessionData = sessions.get(session_id);
  const currentSpec = sessionData.specification;
  
  // Generate modification based on request
  const modificationPrompt = `Please modify the current specification according to this request:

Request: ${modification_request}

Current specification modules: ${currentSpec.modules.map(m => m.name).join(', ')}

IMPORTANT: Respond with ONLY valid JSON format. No explanations or additional text.

Modified specification JSON:`;

  try {
    const modificationResponse = await callAI(modificationPrompt);
    const updatedSpec = parseJSONFromResponse(modificationResponse);
    
    // Validate updated specification
    if (!updatedSpec || !updatedSpec.modules || !Array.isArray(updatedSpec.modules)) {
      throw new Error('Invalid specification format received from AI modification');
    }
    
    // Update session
    sessionData.specification = updatedSpec;
    sessionData.last_modified = new Date().toISOString();
    sessions.set(session_id, sessionData);
    
    // Generate updated markdown
    const markdownWithLang = generateMarkdownWithLanguage(updatedSpec, sessionData.platform);
    
    const lang = detectLanguage(modification_request);
    const messages = {
      ko: {
        title: '## 명세서 수정 완료',
        modification: '**수정 내용**',
        sessionId: '**세션 ID**',
        updated: '## 업데이트된 명세서'
      },
      en: {
        title: '## Specification Update Complete',
        modification: '**Modification**',
        sessionId: '**Session ID**',
        updated: '## Updated Specification'
      }
    };
    
    const msg = messages[lang];
    
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        content: [
          {
            type: "text",
            text: `${msg.title}

${msg.modification}: ${modification_request}
${msg.sessionId}: \`${session_id}\`

${msg.updated}

${markdownWithLang}`
          }
        ]
      }
    }) + '\n');
  } catch (error) {
    throw new Error(`Specification refinement failed: ${error.message}`);
  }
}

async function handleExportSpecification(request) {
  const { session_id, export_format = 'markdown', include_templates = false } = request.params.arguments;
  
  if (!session_id || !sessions.has(session_id)) {
    throw new Error('Specification session not found.');
  }
  
  const sessionData = sessions.get(session_id);
  const specification = sessionData.specification;
  
  let exportContent;
  if (export_format === 'markdown') {
    exportContent = generateMarkdownWithLanguage(specification, sessionData.platform);
  } else if (export_format === 'json') {
    exportContent = JSON.stringify(specification, null, 2);
  } else {
    exportContent = generateMarkdownWithLanguage(specification, sessionData.platform);
  }
  
  const lang = detectLanguage(exportContent);
  const messages = {
    ko: {
      title: '## 명세서 내보내기 완료',
      format: '**형태**',
      templates: '**템플릿 포함**',
      source: '**데이터 소스**',
      yes: '예',
      no: '아니오'
    },
    en: {
      title: '## Specification Export Complete',
      format: '**Format**',
      templates: '**Templates Included**', 
      source: '**Data Source**',
      yes: 'Yes',
      no: 'No'
    }
  };
  
  const msg = messages[lang];
  
  process.stdout.write(JSON.stringify({
    jsonrpc: "2.0",
    id: request.id,
    result: {
      content: [
        {
          type: "text",
          text: `${msg.title}

${msg.format}: ${export_format.toUpperCase()}
${msg.templates}: ${include_templates ? msg.yes : msg.no}
${msg.source}: Session ID: ${session_id}

${exportContent}`
        }
      ]
    }
  }) + '\n');
}

async function handleSelectTechStack(request) {
  const { platform, preferences = [] } = request.params.arguments;
  
  const availableStacks = techStackOptions[platform];
  if (!availableStacks) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  // Filter by preferences if provided
  let filteredStacks = availableStacks;
  if (preferences.length > 0) {
    filteredStacks = availableStacks.filter(stack => 
      preferences.some(pref => 
        stack.name.toLowerCase().includes(pref.toLowerCase()) ||
        stack.stack.language.toLowerCase().includes(pref.toLowerCase())
      )
    );
  }
  
  const stacks = filteredStacks.length > 0 ? filteredStacks : availableStacks;
  
  process.stdout.write(JSON.stringify({
    jsonrpc: "2.0",
    id: request.id,
    result: {
      content: [
        {
          type: "text",
          text: `## Available Tech Stacks for ${platform}

${stacks.map((stack, index) => `### ${index + 1}. ${stack.name}
- **Language**: ${stack.stack.language}
- **Frontend**: ${stack.stack.frontend}
- **Backend**: ${stack.stack.backend}
- **Database**: ${stack.stack.database}
- **Tools**: ${stack.stack.tools}
`).join('\n')}`
        }
      ]
    }
  }) + '\n');
}

async function handleSelectModules(request) {
  const { session_id, selected_modules } = request.params.arguments;
  
  if (!session_id || !sessions.has(session_id)) {
    throw new Error('Specification session not found. Please provide a valid session_id.');
  }
  
  if (!Array.isArray(selected_modules) || selected_modules.length === 0) {
    throw new Error('Please provide a valid array of selected module names.');
  }
  
  const sessionData = sessions.get(session_id);
  
  // Filter specification to only include selected modules
  const filteredSpec = {
    ...sessionData.specification,
    modules: sessionData.specification.modules.filter(module => 
      selected_modules.includes(module.name)
    )
  };
  
  // Update session with filtered specification
  sessionData.specification = filteredSpec;
  sessionData.last_modified = new Date().toISOString();
  sessions.set(session_id, sessionData);
  
  const markdownWithLang = generateMarkdownWithLanguage(filteredSpec, sessionData.platform);
  
  process.stdout.write(JSON.stringify({
    jsonrpc: "2.0",
    id: request.id,
    result: {
      content: [
        {
          type: "text",
          text: `## Module Selection Complete

**Selected Modules**: ${selected_modules.join(', ')}
**Session ID**: \`${session_id}\`

## Updated Specification

${markdownWithLang}`
        }
      ]
    }
  }) + '\n');
}

// Helper functions
function getMainFeatures(platform) {
  const features = {
    mobile: 'Mobile UI, Touch Interface',
    web: 'Web Interface, Browser Compatibility',
    desktop: 'Desktop UI, System Integration',
    api: 'REST API, Data Processing'
  };
  return features[platform] || 'General Purpose';
}

function generateMarkdownWithLanguage(specification, platform) {
  const selectedTechStack = specification.techStack;
  const totalFunctions = specification.modules.reduce((sum, module) => sum + (module.functions?.length || 0), 0);
  const languageInfo = selectedTechStack ? selectedTechStack.stack.language : getDefaultLanguage(platform);
  
  // Detect language from specification content
  const lang = detectLanguage(specification.description || specification.title || '');
  
  const templates = {
    ko: {
      title: '설계 명세서',
      projectType: '프로젝트 타입',
      language: '프로그래밍 언어',
      complexity: '복잡도',
      generated: '생성일',
      description: '프로젝트 설명',
      requirements: '시스템 요구사항',
      compatibility: '시스템 호환성',
      softwareDesign: '소프트웨어 설계 명세서',
      module: '모듈',
      moduleDetails: '모듈 상세 함수 명세',
      returnValue: '반환값',
      testCases: '테스트 케이스',
      specInfo: '명세서 정보'
    },
    en: {
      title: 'Design Specification',
      projectType: 'Project Type',
      language: 'Programming Language',
      complexity: 'Complexity',
      generated: 'Generated',
      description: 'Project Description',
      requirements: 'System Requirements',
      compatibility: 'System Compatibility',
      softwareDesign: 'Software Design Specification',
      module: 'Module',
      moduleDetails: 'Module Function Details',
      returnValue: 'Return Value',
      testCases: 'Test Cases',
      specInfo: 'Specification Information'
    }
  };
  
  const t = templates[lang];
  const dateStr = lang === 'ko' ? new Date().toLocaleString('ko-KR') : new Date().toLocaleString('en-US');

  return `# ${specification.title || 'Mobile App'} ${t.title}

**${t.projectType}**: ${platform}
**${t.language}**: ${languageInfo}
**${t.complexity}**: complex
**${t.generated}**: ${dateStr}

## ${t.description}

${specification.description || `${platform} project (complexity: complex)`}

## ${t.requirements}

- **compatibility**: ${t.compatibility}

## ${t.softwareDesign}

${specification.modules.map(module => `### ${module.name} ${t.module}

${module.description}

| Function | Design Spec | Function Definition | Remarks |
|----------|-------------|---------------------|----------|
${module.functions ? module.functions.map(func => 
  `| ${func.name} | ${func.description}<br/>- Error handling and exception management<br/>- Logging and debugging information<br/>- Performance optimization<br/>- Battery consumption minimization<br/>- UI responsiveness maintenance | \`${func.returns || 'void'} ${func.name}(${func.parameters || ''})\` | ${func.remarks || '-'} |`
).join('\n') : '| - | Basic functionality | \`void init()\` | Module initialization |'}

#### ${module.name} ${t.moduleDetails}

${module.functions ? module.functions.map(func => `##### ${func.name}

**${t.returnValue}**: ${func.returns || 'void'}

**${t.testCases}**:
- **normal_case**: ${lang === 'ko' ? '정상적인 입력값으로 기능 테스트 → 성공적인 실행 및 예상 결과 반환' : 'Normal input functional test → Successful execution and expected result return'}
- **edge_case**: ${lang === 'ko' ? '경계값 입력으로 테스트 → 경계 상황에서도 안정적 동작' : 'Boundary value input test → Stable operation in boundary situations'}
- **error_case**: ${lang === 'ko' ? '잘못된 입력값 처리 테스트 → 적절한 에러 메시지 또는 예외 처리' : 'Invalid input handling test → Proper error message or exception handling'}
- **performance_test**: ${lang === 'ko' ? '대용량 데이터 또는 부하 상황 테스트 → 성능 요구사항 만족' : 'Large data or load situation test → Performance requirements satisfaction'}
`).join('\n') : `##### init

**${t.returnValue}**: void

**${t.testCases}**:
- **normal_case**: ${lang === 'ko' ? '정상적인 입력값으로 기능 테스트 → 성공적인 실행 및 예상 결과 반환' : 'Normal input functional test → Successful execution and expected result return'}
- **edge_case**: ${lang === 'ko' ? '경계값 입력으로 테스트 → 경계 상황에서도 안정적 동작' : 'Boundary value input test → Stable operation in boundary situations'}
- **error_case**: ${lang === 'ko' ? '잘못된 입력값 처리 테스트 → 적절한 에러 메시지 또는 예외 처리' : 'Invalid input handling test → Proper error message or exception handling'}
- **performance_test**: ${lang === 'ko' ? '대용량 데이터 또는 부하 상황 테스트 → 성능 요구사항 만족' : 'Large data or load situation test → Performance requirements satisfaction'}`}
`).join('\n')}

## ${t.specInfo || (lang === 'ko' ? '명세서 정보' : 'Specification Information')}

- **${lang === 'ko' ? '총 모듈 수' : 'Total Modules'}**: ${specification.modules.length}
- **${lang === 'ko' ? '총 함수 수' : 'Total Functions'}**: ${totalFunctions}
- **${lang === 'ko' ? '복잡도 점수' : 'Complexity Score'}**: ${(specification.modules.length * 1.2 + totalFunctions * 0.3).toFixed(1)}
- **${lang === 'ko' ? '생성 시간' : 'Generated Time'}**: ${dateStr}
- **${lang === 'ko' ? '생성기 버전' : 'Generator Version'}**: 1.0.0`;
}

function getDefaultLanguage(platform) {
  const defaultLanguages = {
    mobile: 'JavaScript/TypeScript (React Native)',
    web: 'JavaScript/TypeScript',
    desktop: 'JavaScript/TypeScript (Electron)',
    api: 'JavaScript/TypeScript (Node.js)'
  };
  return defaultLanguages[platform] || 'JavaScript/TypeScript';
}

// Check for MCP mode
if (process.argv.includes('--mcp')) {
  startMCPServer().catch(error => {
    console.error('❌ MCP Server error:', error.message);
    process.exit(1);
  });
} else {
  // Run main function
  main().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}