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

// Question helper function
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// API call functions
async function callClaude(prompt) {
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
    })
  });
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(prompt) {
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
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callPerplexity(prompt) {
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
    })
  });
  
  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
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

// Auto-detect project type
function detectProjectType(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('mobile') || desc.includes('app') || desc.includes('android') || desc.includes('ios')) {
    return 'mobile';
  } else if (desc.includes('website') || desc.includes('browser') || desc.includes('web')) {
    return 'web';
  } else if (desc.includes('api') || desc.includes('server') || desc.includes('backend')) {
    return 'backend';
  } else if (desc.includes('desktop') || desc.includes('windows') || desc.includes('mac')) {
    return 'desktop';
  }
  
  return 'web'; // default
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
  
  if (choice >= 1 && choice <= options.length) {
    return options[choice - 1];
  } else {
    console.log('Invalid selection. Using default.');
    return options[0];
  }
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

async function generateSpecification(description, selectedTechStack) {
  console.error('🤖 Step 1: AI basic structure analysis...');
  
  // Step 1: Identify basic module structure
  const structurePrompt = `Project: "${description}"

Please provide a list of all modules needed for this project as a JSON array:
["Module1", "Module2", "Module3", ...]

Include at least 10-15 modules.`;

  const structureResponse = await callAI(structurePrompt);
  const modules = parseJSONFromResponse(structureResponse, 'array');
  
  console.error(`✅ ${modules.length} modules identified`);
  
  const specification = {
    title: "Project Specification",
    description,
    techStack: selectedTechStack,
    modules: []
  };

  console.error('🔧 Step 2: Detailing each module...');
  
  for (const moduleName of modules) {
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
      specification.modules.push(moduleData);
      console.error(`    ✓ ${moduleData.functions?.length || 0} functions generated`);
    } catch (error) {
      console.error(`    ❌ ${moduleName} module failed: ${error.message}`);
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
  
  try {
    const description = process.argv[2];
    
    // Auto-detect project type
    const projectType = detectProjectType(description);
    console.log(`\n🎯 Detected project type: ${projectType}`);
    
    // Select tech stack
    const selectedTechStack = await selectTechStack(projectType);
    console.log(`\n✅ Selected tech stack: ${selectedTechStack.name}`);
    console.log('Starting specification generation...\n');
    
    // Generate specification
    const specification = await generateSpecification(description, selectedTechStack);
    
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

// Run main function
main().catch(error => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});