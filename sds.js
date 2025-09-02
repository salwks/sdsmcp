#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { CONFIG, logger, loadEnv, validateAPIKeys } from './lib/config.js';
import { callAI } from './lib/api-client.js';
import { APIError, ParsingError, ConfigurationError, ValidationError, FileIOError, NetworkError, handleError } from './lib/errors.js';
import { startMCPServer } from './mcp-server.js';

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

// Load piped input for batch processing
function loadPipedInput() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve();
      return;
    }
    
    let input = '';
    process.stdin.on('data', chunk => input += chunk);
    process.stdin.on('end', () => {
      if (input.trim()) {
        inputQueue = input.trim().split('\n');
      }
      resolve();
    });
  });
}

// Language detection helper
function detectLanguage(text) {
  const koreanRegex = /[가-힣]/;
  return koreanRegex.test(text) ? 'ko' : 'en';
}

// Get file extension based on tech stack language
function getFileExtension(techStack) {
  if (!techStack || !techStack.stack || !techStack.stack.language) {
    return '.js'; // fallback
  }
  
  const language = techStack.stack.language.toLowerCase();
  
  if (language.includes('swift')) return '.swift';
  if (language.includes('dart')) return '.dart';
  if (language.includes('java')) return '.java';
  if (language.includes('python')) return '.py';
  if (language.includes('kotlin')) return '.kt';
  if (language.includes('c++') || language.includes('cpp')) return '.cpp';
  if (language.includes('c#')) return '.cs';
  
  return '.js'; // default fallback
}

// Generate language-specific code template
function generateCodeTemplate(module, techStack) {
  const language = techStack?.stack?.language?.toLowerCase() || '';
  
  if (language.includes('swift')) {
    return generateSwiftTemplate(module);
  } else if (language.includes('dart')) {
    return generateDartTemplate(module);
  } else if (language.includes('java')) {
    return generateJavaTemplate(module);
  } else if (language.includes('python')) {
    return generatePythonTemplate(module);
  } else {
    return generateJavaScriptTemplate(module);
  }
}

// Swift template
function generateSwiftTemplate(module) {
  return `// ${module.name} Module
// ${module.description}

import Foundation

${module.functions && module.functions.length > 0 ? 
  module.functions.map(func => `
/**
 * ${func.purpose}
 */
${func.functionDefinition || `func ${func.name}() {
    // TODO: Implement ${func.name}
    fatalError("Not implemented")
}`}
`).join('\n') : 
`
// TODO: Implement ${module.name} module functions
func initialize() {
    // TODO: Initialize ${module.name} module
}
`}`;
}

// Dart template  
function generateDartTemplate(module) {
  return `// ${module.name} Module
// ${module.description}

${module.functions && module.functions.length > 0 ? 
  module.functions.map(func => `
/**
 * ${func.purpose}
 */
${func.functionDefinition || `void ${func.name}() {
  // TODO: Implement ${func.name}
  throw UnimplementedError('${func.name} not implemented');
}`}
`).join('\n') : 
`
// TODO: Implement ${module.name} module functions
void initialize() {
  // TODO: Initialize ${module.name} module
}
`}`;
}

// JavaScript template (existing)
function generateJavaScriptTemplate(module) {
  return `// ${module.name} Module
// ${module.description}

${module.functions && module.functions.length > 0 ? 
  module.functions.map(func => `
/**
 * ${func.purpose}
 * @param {*} ${Array.isArray(func.parameters) ? func.parameters.join(' @param {*} ') : func.parameters || ''}
 * @returns {*} ${func.returnValue}
 */
function ${func.name}(${Array.isArray(func.parameters) ? func.parameters.join(', ') : func.parameters || ''}) {
  // TODO: Implement ${func.name}
  throw new Error('Not implemented');
}
`).join('\n') : 
`
// TODO: Implement ${module.name} module functions
function init() {
  // TODO: Initialize ${module.name} module
}
`}

module.exports = {
${module.functions && module.functions.length > 0 ? 
  module.functions.map(func => `  ${func.name}`).join(',\n') : 
  '  init'
}
};`;
}

// Java template
function generateJavaTemplate(module) {
  const className = module.name.replace(/\s+/g, '');
  return `// ${module.name} Module
// ${module.description}

public class ${className} {
${module.functions && module.functions.length > 0 ? 
  module.functions.map(func => `
    /**
     * ${func.purpose}
     */
    ${func.functionDefinition || `public void ${func.name}() {
        // TODO: Implement ${func.name}
        throw new UnsupportedOperationException("Not implemented");
    }`}
`).join('\n') : 
`
    // TODO: Implement ${module.name} module functions
    public void initialize() {
        // TODO: Initialize ${module.name} module
    }
`}
}`;
}

// Python template
function generatePythonTemplate(module) {
  return `# ${module.name} Module
# ${module.description}

${module.functions && module.functions.length > 0 ? 
  module.functions.map(func => `
def ${func.name}():
    """${func.purpose}"""
    # TODO: Implement ${func.name}
    raise NotImplementedError("${func.name} not implemented")
`).join('\n') : 
`
# TODO: Implement ${module.name} module functions
def initialize():
    """Initialize ${module.name} module"""
    # TODO: Initialize ${module.name} module
    pass
`}`;
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
        frontend: 'React Native',
        backend: 'Node.js/Express',
        database: 'AsyncStorage/SQLite',
        tools: 'Metro, React Native CLI'
      }
    },
    {
      id: 2,
      name: 'Flutter',
      stack: {
        language: 'Dart',
        framework: 'Flutter',
        frontend: 'Flutter',
        backend: 'Firebase/Node.js',
        database: 'Hive/SQLite',
        tools: 'Flutter CLI, Dart DevTools'
      }
    },
    {
      id: 3,
      name: 'Native iOS (Swift)',
      stack: {
        language: 'Swift',
        framework: 'UIKit/SwiftUI',
        frontend: 'SwiftUI',
        backend: 'CloudKit/Firebase',
        database: 'Core Data/SQLite',
        tools: 'Xcode, TestFlight'
      }
    },
    {
      id: 4,
      name: 'Native Android (Kotlin)',
      stack: {
        language: 'Kotlin',
        framework: 'Android Jetpack',
        frontend: 'Jetpack Compose',
        backend: 'Firebase/Retrofit',
        database: 'Room/SQLite',
        tools: 'Android Studio, Gradle'
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
        frontend: 'React',
        backend: 'Node.js/Express',
        database: 'PostgreSQL/MongoDB',
        tools: 'Webpack, Babel, ESLint'
      }
    },
    {
      id: 2,
      name: 'Vue/Nuxt',
      stack: {
        language: 'JavaScript/TypeScript',
        framework: 'Nuxt.js',
        frontend: 'Vue.js',
        backend: 'Node.js/Express',
        database: 'PostgreSQL/MongoDB',
        tools: 'Vite, Vue CLI'
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
        frontend: 'N/A',
        backend: 'Express.js',
        database: 'PostgreSQL/MongoDB',
        tools: 'npm, Jest, Postman'
      }
    },
    {
      id: 2,
      name: 'Python/FastAPI',
      stack: {
        language: 'Python',
        framework: 'FastAPI',
        frontend: 'N/A',
        backend: 'FastAPI',
        database: 'PostgreSQL/MongoDB',
        tools: 'pip, pytest, uvicorn'
      }
    }
  ]
};

// JSON parsing with multiple fallback strategies
function parseJSONFromResponse(response, type = 'object') {
  if (typeof response !== 'string') {
    throw new ParsingError('Response is not a string', response);
  }

  // Strategy 1: Direct parsing
  try {
    return JSON.parse(response);
  } catch (error) {
    // Continue to next strategy
  }

  // Strategy 2: Extract JSON from markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
  const codeBlockMatch = response.match(codeBlockRegex);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (error) {
      // Continue to next strategy
    }
  }

  // Strategy 3: Find JSON-like content
  const jsonStartIndex = response.indexOf('{');
  const jsonEndIndex = response.lastIndexOf('}');
  if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
    try {
      const jsonString = response.substring(jsonStartIndex, jsonEndIndex + 1);
      return JSON.parse(jsonString);
    } catch (error) {
      // Continue to next strategy
    }
  }

  // Strategy 4: More aggressive extraction with bracket counting
  let bracketCount = 0;
  let startIndex = -1;
  let endIndex = -1;
  
  for (let i = 0; i < response.length; i++) {
    if (response[i] === '{') {
      if (bracketCount === 0) startIndex = i;
      bracketCount++;
    } else if (response[i] === '}') {
      bracketCount--;
      if (bracketCount === 0 && startIndex !== -1) {
        endIndex = i;
        break;
      }
    }
  }
  
  if (startIndex !== -1 && endIndex !== -1) {
    try {
      const extractedJson = response.substring(startIndex, endIndex + 1);
      return JSON.parse(extractedJson);
    } catch (error) {
      // All strategies failed
    }
  }

  throw new ParsingError('Failed to parse JSON from response after trying all strategies', response);
}

// CLI-specific functions
async function selectProjectType() {
  console.log('\n🎯 Select project type:');
  console.log('1. Mobile App');
  console.log('2. Web Application');
  console.log('3. Backend API');
  
  const choice = await askQuestion('\nEnter your choice (1-3): ');
  const types = { '1': 'mobile', '2': 'web', '3': 'backend' };
  return types[choice] || 'web';
}

async function selectTechStack(projectType) {
  const stacks = techStackOptions[projectType];
  if (!stacks) {
    throw new ConfigurationError(`No tech stacks available for project type: ${projectType}`);
  }
  
  console.log(`\n🛠️ Select tech stack for ${projectType}:`);
  stacks.forEach((stack, index) => {
    console.log(`${index + 1}. ${stack.name} (${stack.stack.language})`);
  });
  
  const choice = await askQuestion('\nEnter your choice: ');
  const index = parseInt(choice) - 1;
  return stacks[index] || stacks[0];
}

async function generateModuleList(description, complexity) {
  const language = detectLanguage(description);
  
  const prompts = {
    ko: `다음 프로젝트 설명을 바탕으로 모듈 목록을 생성해주세요.

프로젝트 설명: ${description}
복잡도: ${complexity}

다음 JSON 형식으로만 응답해주세요:
{
  "modules": [
    {"name": "모듈명", "description": "모듈 설명"},
    ...
  ]
}`,
    en: `Generate a module list based on the following project description.

Project Description: ${description}
Complexity: ${complexity}

Please respond only in the following JSON format:
{
  "modules": [
    {"name": "module_name", "description": "module description"},
    ...
  ]
}`
  };

  const moduleResponse = await callAI(prompts[language], 1, 'module-generation');
  return parseJSONFromResponse(moduleResponse);
}

async function selectModules(moduleList) {
  if (!moduleList || !moduleList.modules) {
    throw new ValidationError('Invalid module list format', 'modules');
  }
  
  console.log('\n📋 Generated modules:');
  moduleList.modules.forEach((module, index) => {
    console.log(`${index + 1}. ${module.name} - ${module.description}`);
  });
  
  const choice = await askQuestion('\nSelect modules (comma-separated numbers, or "all"): ');
  
  if (choice.toLowerCase() === 'all') {
    return moduleList.modules;
  }
  
  const indices = choice.split(',').map(n => parseInt(n.trim()) - 1);
  return indices.filter(i => i >= 0 && i < moduleList.modules.length)
                .map(i => moduleList.modules[i]);
}

async function generateSpecification(description, techStack, modules) {
  const language = detectLanguage(description);
  
  const prompts = {
    ko: `다음 정보를 바탕으로 상세한 소프트웨어 설계 명세서를 JSON 형식으로 생성해주세요.

프로젝트 설명: ${description}
기술 스택: ${JSON.stringify(techStack, null, 2)}
모듈 목록: ${JSON.stringify(modules, null, 2)}

다음 JSON 구조로 응답해주세요:
{
  "title": "프로젝트 제목",
  "description": "상세 설명",
  "techStack": ${JSON.stringify(techStack)},
  "requirements": {
    "functional": ["기능적 요구사항 목록"],
    "nonFunctional": ["비기능적 요구사항 목록"],
    "system": "시스템 요구사항"
  },
  "modules": [
    {
      "name": "모듈명",
      "description": "모듈 설명",
      "functions": [
        {
          "name": "함수명",
          "purpose": "함수 목적",
          "parameters": ["매개변수 목록"],
          "returnValue": "반환값 설명",
          "designSpec": "설계 명세",
          "functionDefinition": "함수 정의",
          "remarks": "비고",
          "testCases": ["테스트 케이스 목록"]
        }
      ]
    }
  ]
}

IMPORTANT: 
1. 반드시 유효한 JSON 형식으로만 응답하세요. 설명이나 추가 텍스트는 포함하지 마세요.
2. 모든 함수 정의와 매개변수는 반드시 ${techStack.stack.language} 문법을 사용하세요.
   - Swift: func functionName(parameter: Type) -> ReturnType
   - JavaScript: function functionName(parameter) {}
   - Java: public ReturnType functionName(Type parameter) {}
   - Python: def function_name(parameter: type) -> return_type:`,
    en: `Generate a detailed software design specification in JSON format based on the following information.

Project Description: ${description}
Tech Stack: ${JSON.stringify(techStack, null, 2)}
Module List: ${JSON.stringify(modules, null, 2)}

Please respond in the following JSON structure:
{
  "title": "Project Title",
  "description": "Detailed description",
  "techStack": ${JSON.stringify(techStack)},
  "requirements": {
    "functional": ["List of functional requirements"],
    "nonFunctional": ["List of non-functional requirements"],
    "system": "System requirements"
  },
  "modules": [
    {
      "name": "Module Name",
      "description": "Module description",
      "functions": [
        {
          "name": "Function Name",
          "purpose": "Function purpose",
          "parameters": ["Parameter list"],
          "returnValue": "Return value description",
          "designSpec": "Design specification",
          "functionDefinition": "Function definition",
          "remarks": "Remarks",
          "testCases": ["Test case list"]
        }
      ]
    }
  ]
}

IMPORTANT: 
1. Respond only in valid JSON format. Do not include explanations or additional text.
2. All function definitions and parameters must use ${techStack.stack.language} syntax:
   - Swift: func functionName(parameter: Type) -> ReturnType
   - JavaScript: function functionName(parameter) {}
   - Java: public ReturnType functionName(Type parameter) {}
   - Python: def function_name(parameter: type) -> return_type:`
  };

  const specResponse = await callAI(prompts[language], 1, 'specification');
  return parseJSONFromResponse(specResponse);
}

function generateMarkdown(specification) {
  const selectedTechStack = specification.techStack;
  const totalFunctions = specification.modules.reduce((sum, module) => sum + (module.functions?.length || 0), 0);
  const languageInfo = selectedTechStack ? selectedTechStack.stack.language : 'JavaScript/TypeScript';
  
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
      softwareDesign: '소프트웨어 설계 명세서',
      module: '모듈',
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
      softwareDesign: 'Software Design Specification',
      module: 'Module',
      returnValue: 'Return Value',
      testCases: 'Test Cases',
      specInfo: 'Specification Information'
    }
  };
  
  const t = templates[lang];
  const today = new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US');
  
  return `# ${specification.title || t.title}

## ${t.description}
${specification.description || ''}

## ${t.requirements}
${specification.requirements ? `
### Functional Requirements
${specification.requirements.functional ? specification.requirements.functional.map(req => `- ${req}`).join('\n') : ''}

### Non-Functional Requirements  
${specification.requirements.nonFunctional ? specification.requirements.nonFunctional.map(req => `- ${req}`).join('\n') : ''}

### System Requirements
${specification.requirements.system || ''}
` : ''}

## ${t.softwareDesign}

### ${t.specInfo}
- **${t.language}**: ${languageInfo}
- **${t.generated}**: ${today}
- **${lang === 'ko' ? '총 모듈 수' : 'Total Modules'}**: ${specification.modules.length}
- **${lang === 'ko' ? '총 함수 수' : 'Total Functions'}**: ${totalFunctions}

### ${lang === 'ko' ? '기술 스택' : 'Technology Stack'}
${selectedTechStack ? `
- **${lang === 'ko' ? '언어' : 'Language'}**: ${selectedTechStack.stack.language}
- **${lang === 'ko' ? '프론트엔드' : 'Frontend'}**: ${selectedTechStack.stack.frontend}
- **${lang === 'ko' ? '백엔드' : 'Backend'}**: ${selectedTechStack.stack.backend}
- **${lang === 'ko' ? '데이터베이스' : 'Database'}**: ${selectedTechStack.stack.database}
- **${lang === 'ko' ? '도구' : 'Tools'}**: ${selectedTechStack.stack.tools}
` : ''}

## ${lang === 'ko' ? '모듈 구조' : 'Module Structure'}

${specification.modules.map((module, index) => `### ${index + 1}. ${module.name}
${module.description}

#### ${lang === 'ko' ? '함수 목록' : 'Function List'}

${lang === 'ko' ? '| Function | Design Spec | Function Definition | Remarks |' : '| Function | Design Spec | Function Definition | Remarks |'}
${lang === 'ko' ? '|----------|-------------|---------------------|---------|' : '|----------|-------------|---------------------|---------|'}
${module.functions && module.functions.length > 0 ? 
  module.functions.map((func, funcIndex) => `| ${func.name}() | ${func.designSpec || '설계 명세'} | ${func.functionDefinition || '함수 정의'} | ${func.remarks || '비고'} |`).join('\n') : 
  `${lang === 'ko' ? '함수가 정의되지 않았습니다.' : 'No functions defined.'}`}

${module.functions && module.functions.length > 0 ? 
  module.functions.map((func, funcIndex) => `##### ${funcIndex + 1}. ${func.name}()
- **${lang === 'ko' ? '목적' : 'Purpose'}**: ${func.purpose}
- **${lang === 'ko' ? '매개변수' : 'Parameters'}**: ${Array.isArray(func.parameters) ? func.parameters.join(', ') : func.parameters || 'None'}
- **${t.returnValue}**: ${func.returnValue}
- **${t.testCases}**: ${Array.isArray(func.testCases) ? func.testCases.map(test => `  - ${test}`).join('\n') : func.testCases || 'None'}
`).join('\n') : ''}
`).join('\n')}
`;
}

async function createSDSDirectory(specification, dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    
    // Create specification.json
    const specPath = path.join(dirPath, 'specification.json');
    await fs.writeFile(specPath, JSON.stringify(specification, null, 2));
    
    // Create module template files
    for (const module of specification.modules) {
      const fileExtension = getFileExtension(specification.techStack);
      const modulePath = path.join(dirPath, `${module.name.toLowerCase().replace(/\s+/g, '_')}${fileExtension}`);
      const moduleTemplate = generateCodeTemplate(module, specification.techStack);
      await fs.writeFile(modulePath, moduleTemplate);
    }
    
    // Create package.json template
    const packagePath = path.join(dirPath, 'package.json');
    const packageTemplate = {
      name: specification.title?.toLowerCase().replace(/\s+/g, '-') || 'project',
      version: '1.0.0',
      description: specification.description || '',
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        test: 'echo "No tests specified"'
      },
      dependencies: {},
      devDependencies: {}
    };
    await fs.writeFile(packagePath, JSON.stringify(packageTemplate, null, 2));
    
    // Create README.md
    const readmeContent = `# ${specification.title || 'Project'}

${specification.description || 'Project description'}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Modules

${specification.modules.map(module => `- **${module.name}**: ${module.description}`).join('\n')}
`;
    
    await fs.writeFile(
      path.join(dirPath, 'README.md'),
      readmeContent
    );
  } catch (error) {
    throw new FileIOError(`Failed to create SDS directory: ${error.message}`, dirPath, 'create');
  }
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
    validateAPIKeys();
    
    const description = process.argv[2];
    
    // Select project type
    const projectType = await selectProjectType();
    
    // Select tech stack
    const selectedTechStack = await selectTechStack(projectType);
    console.log(`\n✅ Selected tech stack: ${selectedTechStack.name}`);
    
    // Generate module list
    console.log('\n🔄 Generating module list...');
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
    handleError(error, false);
  }
}

// Check for MCP mode
if (process.argv.includes('--mcp')) {
  startMCPServer().catch(error => {
    handleError(error, false);
  });
} else {
  // Run main function
  main().catch(error => {
    handleError(error, false);
  });
}