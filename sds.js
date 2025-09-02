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
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃
  
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
      throw new Error('Request timeout after 30 seconds');
    }
    throw error;
  }
}

async function callOpenAI(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃
  
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
      throw new Error('Request timeout after 30 seconds');
    }
    throw error;
  }
}

async function callPerplexity(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃
  
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
      throw new Error('Request timeout after 30 seconds');
    }
    throw error;
  }
}

// Check available APIs and select one
function getAvailableAPI() {
  const apis = [
    { name: 'Claude', func: callClaude, key: process.env.ANTHROPIC_API_KEY },
    { name: 'OpenAI', func: callOpenAI, key: process.env.OPENAI_API_KEY },
    { name: 'Perplexity', func: callPerplexity, key: process.env.PERPLEXITY_API_KEY }
  ].filter(api => api.key);
  
  if (apis.length === 0) {
    throw new Error('No API keys configured. Check your .env file.');
  }
  
  return apis[0]; // Use first available API
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

// Actual AI API call
async function callAI(prompt) {
  const api = getAvailableAPI();
  console.error(`🤖 Using ${api.name} API...`);
  
  try {
    return await api.func(prompt);
  } catch (error) {
    console.error(`❌ ${api.name} API error:`, error.message);
    throw error;
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
  
  // Process modules in parallel batches of 3 to avoid rate limits
  const batchSize = 3;
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
      await new Promise(resolve => setTimeout(resolve, 1000));
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

// MCP Server functionality
function startMCPServer() {
  const server = {
    name: "sds-generator",
    version: "1.0.10",
    tools: [
      {
        name: "generate_specification",
        description: "Generate software design specification from project description",
        inputSchema: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Project description"
            },
            projectType: {
              type: "string",
              enum: ["mobile", "web", "backend", "desktop"],
              description: "Type of project"
            },
            techStack: {
              type: "string",
              description: "Preferred tech stack"
            }
          },
          required: ["description"]
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
      } else if (request.method === 'tools/call' && request.params.name === 'generate_specification') {
        const { description, projectType = 'web', techStack } = request.params.arguments;
        
        await loadEnv();
        const selectedProjectType = projectType;
        const techStackOptions = techStackOptions[selectedProjectType];
        const selectedTechStack = techStackOptions[0];
        
        const moduleList = await generateModuleList(description);
        const specification = await generateSpecification(description, selectedTechStack, moduleList);
        const markdown = generateMarkdown(specification);
        
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [
              {
                type: "text",
                text: markdown
              }
            ]
          }
        }) + '\n');
      }
    } catch (error) {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: request?.id || null,
        error: {
          code: -1,
          message: error.message
        }
      }) + '\n');
    }
  });
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