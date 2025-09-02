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
async function generateModuleList(description) {
  console.error('🤖 Step 1: AI basic structure analysis...');
  
  const structurePrompt = `Project: "${description}"

Please provide a list of all modules needed for this project as a JSON array:
["Module1", "Module2", "Module3", ...]

Include at least 10-15 modules.`;

  const structureResponse = await callAI(structurePrompt);
  const modules = parseJSONFromResponse(structureResponse, 'array');
  
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

        const moduleResponse = await callAI(modulePrompt);
        const moduleData = parseJSONFromResponse(moduleResponse);
        console.error(`    ✓ ${moduleName}: ${moduleData.functions?.length || 0} functions generated`);
        return moduleData;
      } catch (error) {
        console.error(`    ❌ ${moduleName} module failed: ${error.message}`);
        return null;
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
    const moduleList = await generateModuleList(description);
    
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

// MCP Server functionality
function startMCPServer() {
  const server = {
    name: "sds-generator",
    version: "1.0.10",
    tools: [
      {
        name: "analyze_project_request",
        description: "자연어 프로젝트 요청을 분석하여 구조화된 명세서 생성",
        inputSchema: {
          type: "object",
          properties: {
            project_description: {
              type: "string",
              description: "사용자의 자연어 프로젝트 설명"
            },
            target_platform: {
              type: "string",
              enum: ["embedded", "web", "mobile", "desktop", "api", "auto"],
              default: "auto",
              description: "대상 플랫폼 (auto: 자동 판단)"
            },
            complexity_level: {
              type: "string",
              enum: ["simple", "medium", "complex", "auto"],
              default: "auto",
              description: "복잡도 수준 (auto: 자동 판단)"
            },
            include_advanced_features: {
              type: "boolean",
              default: true,
              description: "고급 기능 포함 여부 (보안, 로깅, 에러처리 등)"
            }
          },
          required: ["project_description"]
        }
      },
      {
        name: "refine_specification",
        description: "기존 명세서를 사용자 피드백에 따라 수정/확장",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "명세서 세션 ID (analyze_project_request로부터 반환받은 ID)"
            },
            current_spec: {
              type: "string",
              description: "기존 명세서 JSON 문자열 (session_id가 없을 경우에만 사용)"
            },
            modification_request: {
              type: "string",
              description: "사용자의 수정 요청"
            },
            action_type: {
              type: "string",
              enum: ["add_module", "add_function", "modify_function", "remove_item", "auto"],
              default: "auto",
              description: "수행할 작업 유형"
            }
          },
          required: ["modification_request"]
        }
      },
      {
        name: "export_specification",
        description: "명세서를 다양한 형태로 출력",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "명세서 세션 ID (analyze_project_request로부터 반환받은 ID)"
            },
            spec_data: {
              type: "string",
              description: "명세서 JSON 데이터 (session_id가 없을 경우에만 사용)"
            },
            export_format: {
              type: "string",
              enum: ["markdown", "json", "csv", "xlsx"],
              default: "markdown",
              description: "출력 형태"
            },
            include_templates: {
              type: "boolean",
              default: false,
              description: "코드 템플릿 포함 여부"
            }
          }
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
  
  await loadEnv();
  
  // Auto-detect platform if needed
  let detectedPlatform = target_platform;
  if (target_platform === 'auto') {
    if (project_description.includes('모바일') || project_description.includes('mobile') || project_description.includes('앱')) {
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
  const moduleList = await generateModuleList(project_description);
  const specification = await generateSpecification(project_description, selectedTechStack, moduleList.slice(0, 10));
  
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
          text: `## 프로젝트 분석 결과

**프로젝트 타입**: ${detectedPlatform}
**복잡도**: ${complexity_level}
**주요 기능**: ${getMainFeatures(detectedPlatform)}
**세션 ID**: \`${sessionId}\`

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
    throw new Error('명세서 세션을 찾을 수 없습니다. 올바른 session_id를 제공해주세요.');
  }
  
  const sessionData = sessions.get(session_id);
  const currentSpec = sessionData.specification;
  
  await loadEnv();
  
  // Generate modification based on request
  const modificationPrompt = `현재 명세서를 다음 요청에 따라 수정해주세요:

요청: ${modification_request}

현재 명세서 모듈들: ${currentSpec.modules.map(m => m.name).join(', ')}

수정된 명세서를 JSON 형태로 응답해주세요.`;

  try {
    const modificationResponse = await callAI(modificationPrompt);
    const updatedSpec = parseJSONFromResponse(modificationResponse);
    
    // Update session
    sessionData.specification = updatedSpec;
    sessionData.last_modified = new Date().toISOString();
    sessions.set(session_id, sessionData);
    
    // Generate updated markdown
    const markdownWithLang = generateMarkdownWithLanguage(updatedSpec, sessionData.platform);
    
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        content: [
          {
            type: "text",
            text: `## 명세서 수정 완료

**수정 내용**: ${modification_request}
**세션 ID**: \`${session_id}\`

## 업데이트된 명세서

${markdownWithLang}`
          }
        ]
      }
    }) + '\n');
  } catch (error) {
    throw new Error(`명세서 수정 실패: ${error.message}`);
  }
}

async function handleExportSpecification(request) {
  const { session_id, export_format = 'markdown', include_templates = false } = request.params.arguments;
  
  if (!session_id || !sessions.has(session_id)) {
    throw new Error('명세서 세션을 찾을 수 없습니다.');
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
  
  process.stdout.write(JSON.stringify({
    jsonrpc: "2.0",
    id: request.id,
    result: {
      content: [
        {
          type: "text",
          text: `## 명세서 내보내기 완료

**형태**: ${export_format.toUpperCase()}
**템플릿 포함**: ${include_templates ? '예' : '아니오'}
**데이터 소스**: 세션 ID: ${session_id}

${exportContent}`
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

  return `# ${specification.title || 'Mobile App'} 설계 명세서

**프로젝트 타입**: ${platform}
**프로그래밍 언어**: ${languageInfo}
**복잡도**: complex
**생성일**: ${new Date().toLocaleString('ko-KR')}

## 프로젝트 설명

${specification.description || `${platform} 프로젝트 (복잡도: complex)`}

## 시스템 요구사항

- **compatibility**: 시스템 호환성

## 소프트웨어 설계 명세서

${specification.modules.map(module => `### ${module.name} 모듈

${module.description}

| Function | Design Spec | Function Definition | Remarks |
|----------|-------------|---------------------|----------|
${module.functions ? module.functions.map(func => 
  `| ${func.name} | ${func.description}<br/>- 에러 처리 및 예외 상황 대응<br/>- 로깅 및 디버깅 정보 기록<br/>- 성능 최적화 고려<br/>- 배터리 소모 최소화<br/>- UI 응답성 유지 | \`${func.returns || 'void'} ${func.name}(${func.parameters || ''})\` | ${func.remarks || '-'} |`
).join('\n') : '| - | 기본 기능 | \`void init()\` | 모듈 초기화 |'}

#### ${module.name} 모듈 상세 함수 명세

${module.functions ? module.functions.map(func => `##### ${func.name}

**반환값**: ${func.returns || 'void'}

**테스트 케이스**:
- **normal_case**: 정상적인 입력값으로 기능 테스트 → 성공적인 실행 및 예상 결과 반환
- **edge_case**: 경계값 입력으로 테스트 → 경계 상황에서도 안정적 동작
- **error_case**: 잘못된 입력값 처리 테스트 → 적절한 에러 메시지 또는 예외 처리
- **performance_test**: 대용량 데이터 또는 부하 상황 테스트 → 성능 요구사항 만족
`).join('\n') : `##### init

**반환값**: void

**테스트 케이스**:
- **normal_case**: 정상적인 입력값으로 기능 테스트 → 성공적인 실행 및 예상 결과 반환
- **edge_case**: 경계값 입력으로 테스트 → 경계 상황에서도 안정적 동작
- **error_case**: 잘못된 입력값 처리 테스트 → 적절한 에러 메시지 또는 예외 처리
- **performance_test**: 대용량 데이터 또는 부하 상황 테스트 → 성능 요구사항 만족`}
`).join('\n')}

## 명세서 정보

- **총 모듈 수**: ${specification.modules.length}
- **총 함수 수**: ${totalFunctions}
- **복잡도 점수**: ${(specification.modules.length * 1.2 + totalFunctions * 0.3).toFixed(1)}
- **생성 시간**: ${new Date().toLocaleString('ko-KR')}
- **생성기 버전**: 1.0.0`;
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
  startMCPServer();
} else {
  // Run main function
  main().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}