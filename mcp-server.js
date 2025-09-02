#!/usr/bin/env node

import { loadEnv } from './lib/config.js';
import { callAI } from './lib/api-client.js';
import { ValidationError, APIError, ParsingError, handleError } from './lib/errors.js';

// In-memory session storage for MCP
const sessions = new Map();

// Language detection helper
function detectLanguage(text) {
  const koreanRegex = /[가-힣]/;
  return koreanRegex.test(text) ? 'ko' : 'en';
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
  ]
};

// Dynamic module count based on complexity with description analysis
function getModuleCount(complexity_level, description = '') {
  if (complexity_level === 'auto') {
    return inferModuleCountFromDescription(description);
  }
  
  const moduleCounts = {
    simple: 4,
    medium: 8,
    complex: 12
  };
  return moduleCounts[complexity_level] || 8;
}

// Intelligent module count inference from project description
function inferModuleCountFromDescription(description) {
  const text = description.toLowerCase();
  let score = 5; // Base score
  
  // Complexity indicators
  const complexityKeywords = {
    high: ['authentication', 'security', 'payment', 'analytics', 'real-time', 'notification', 'api integration', 'machine learning', 'ai', 'blockchain'],
    medium: ['user management', 'database', 'search', 'admin panel', 'dashboard', 'reporting', 'file upload', 'email'],
    low: ['crud', 'basic', 'simple', 'minimal']
  };
  
  // Count complexity indicators
  complexityKeywords.high.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });
  
  complexityKeywords.medium.forEach(keyword => {
    if (text.includes(keyword)) score += 1;
  });
  
  complexityKeywords.low.forEach(keyword => {
    if (text.includes(keyword)) score -= 1;
  });
  
  // Description length factor
  const wordCount = description.split(/\s+/).length;
  if (wordCount > 100) score += 2;
  else if (wordCount > 50) score += 1;
  else if (wordCount < 20) score -= 1;
  
  // Platform complexity
  if (text.includes('mobile') || text.includes('ios') || text.includes('android')) score += 1;
  if (text.includes('web') && text.includes('backend')) score += 2;
  if (text.includes('microservices') || text.includes('distributed')) score += 3;
  
  // Ensure reasonable bounds
  return Math.max(4, Math.min(15, Math.round(score)));
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

// JSON parsing with multiple fallback strategies
function parseJSONFromResponse(response) {
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

// Generate module list using AI
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

// Generate complete specification using AI
async function generateSpecification(description, techStack, moduleList) {
  const language = detectLanguage(description);
  
  const prompts = {
    ko: `다음 정보를 바탕으로 상세한 소프트웨어 설계 명세서를 JSON 형식으로 생성해주세요.

프로젝트 설명: ${description}
기술 스택: ${JSON.stringify(techStack, null, 2)}
모듈 목록: ${JSON.stringify(moduleList, null, 2)}

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

IMPORTANT: 반드시 유효한 JSON 형식으로만 응답하세요. 설명이나 추가 텍스트는 포함하지 마세요.`,
    en: `Generate a detailed software design specification in JSON format based on the following information.

Project Description: ${description}
Tech Stack: ${JSON.stringify(techStack, null, 2)}
Module List: ${JSON.stringify(moduleList, null, 2)}

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

IMPORTANT: Respond only in valid JSON format. Do not include explanations or additional text.`
  };

  const specResponse = await callAI(prompts[language], 1, 'specification');
  return parseJSONFromResponse(specResponse);
}

// Get default language for platform
function getDefaultLanguage(platform) {
  const defaults = {
    mobile: 'JavaScript/TypeScript',
    web: 'JavaScript/TypeScript',
    desktop: 'Python/JavaScript',
    api: 'JavaScript/Python'
  };
  return defaults[platform] || 'JavaScript';
}

// MCP Server functionality
async function startMCPServer() {
  // Load environment variables once at server start
  await loadEnv();
  
  const server = {
    name: "sds-generator",
    version: "1.0.24",
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
      handleError(error, true, request?.id || null);
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
  const moduleCount = getModuleCount(complexity_level, project_description);
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
    throw new ValidationError('Specification session not found. Please provide a valid session_id.', 'session_id');
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
    const modificationResponse = await callAI(modificationPrompt, 1, 'specification');
    const updatedSpec = parseJSONFromResponse(modificationResponse);
    
    // Validate updated specification
    if (!updatedSpec || !updatedSpec.modules || !Array.isArray(updatedSpec.modules)) {
      throw new ValidationError('Invalid specification format received from AI modification', 'specification');
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
    if (error instanceof APIError || error instanceof ValidationError || error instanceof ParsingError) {
      throw error; // Re-throw custom errors as-is
    }
    throw new APIError(`Specification refinement failed: ${error.message}`, error, 'AI');
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
      templates: '**Templates Included', 
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
    throw new ValidationError(`Unsupported platform: ${platform}`, 'platform');
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
    throw new ValidationError('Specification session not found. Please provide a valid session_id.', 'session_id');
  }
  
  if (!Array.isArray(selected_modules) || selected_modules.length === 0) {
    throw new ValidationError('Please provide a valid array of selected module names.', 'selected_modules');
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
      moduleDetails: 'Detailed Module Function Specification',
      returnValue: 'Return Value',
      testCases: 'Test Cases',
      specInfo: 'Specification Information'
    }
  };
  
  const t = templates[lang];
  const today = new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US');
  
  let markdown = `# ${specification.title || t.title}

## ${t.description}
${specification.description || ''}

## ${t.requirements}
${specification.requirements ? `
### Functional Requirements
${specification.requirements.functional ? specification.requirements.functional.map(req => `- ${req}`).join('\n') : ''}

### Non-Functional Requirements  
${specification.requirements.nonFunctional ? specification.requirements.nonFunctional.map(req => `- ${req}`).join('\n') : ''}

### ${t.compatibility}
${specification.requirements.system || ''}
` : ''}

## ${t.softwareDesign}

### ${t.specInfo}
- **${t.projectType}**: ${platform}
- **${t.language}**: ${languageInfo}
- **${t.generated}**: ${today}
- **${lang === 'ko' ? '총 모듈 수' : 'Total Modules'}**: ${specification.modules.length}
- **${lang === 'ko' ? '총 함수 수' : 'Total Functions'}**: ${totalFunctions}

### ${lang === 'ko' ? '기술 스택' : 'Technology Stack'}
${selectedTechStack ? `
- **${lang === 'ko' ? '언어' : 'Language'}**: ${selectedTechStack.stack.language}
- **${lang === 'ko' ? '프레임워크' : 'Framework'}**: ${selectedTechStack.stack.framework}
- **${lang === 'ko' ? '상태 관리' : 'State Management'}**: ${selectedTechStack.stack.stateManagement}
- **${lang === 'ko' ? '데이터베이스' : 'Database'}**: ${Array.isArray(selectedTechStack.stack.database) ? selectedTechStack.stack.database.join(', ') : selectedTechStack.stack.database}
- **${lang === 'ko' ? '테스트' : 'Testing'}**: ${selectedTechStack.stack.testing}
- **${lang === 'ko' ? '배포' : 'Deployment'}**: ${selectedTechStack.stack.deployment}
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

  return markdown;
}

// Export the startMCPServer function
export { startMCPServer };

// Start the MCP server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer();
}