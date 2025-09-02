#!/usr/bin/env node
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

// .env 파일 로드
async function loadEnv() {
  try {
    const envContent = await fs.readFile('.env', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  } catch (error) {
    console.error('⚠️ .env 파일을 찾을 수 없습니다.');
  }
}

await loadEnv();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// API 호출 함수들
async function callAnthropic(prompt) {
  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  }, {
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.content[0].text;
}

async function callOpenAI(prompt) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  }, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.choices[0].message.content;
}

async function callPerplexity(prompt) {
  const response = await axios.post('https://api.perplexity.ai/chat/completions', {
    model: 'llama-3.1-sonar-large-128k-online',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  }, {
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.choices[0].message.content;
}

// 사용 가능한 API 확인 및 선택
function getAvailableAPI() {
  if (ANTHROPIC_API_KEY) return { name: 'Anthropic', call: callAnthropic };
  if (OPENAI_API_KEY) return { name: 'OpenAI', call: callOpenAI };
  if (PERPLEXITY_API_KEY) return { name: 'Perplexity', call: callPerplexity };
  throw new Error('API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

// 프로젝트 유형별 기술 스택 옵션
const techStackOptions = {
  mobile: [
    {
      name: "React Native",
      stack: {
        language: "JavaScript/TypeScript",
        framework: "React Native",
        stateManagement: "Redux Toolkit",
        database: { local: "SQLite", cloud: "Firebase Firestore" },
        ui: "React Native Elements",
        navigation: "React Navigation"
      },
      deps: ["react-native", "@react-navigation/native", "react-native-sqlite-storage"]
    },
    {
      name: "Flutter",
      stack: {
        language: "Dart",
        framework: "Flutter",
        stateManagement: "Provider/Riverpod",
        database: { local: "SQLite", cloud: "Firebase Firestore" },
        ui: "Material Design",
        navigation: "Flutter Navigator"
      },
      deps: ["flutter", "provider", "sqflite", "firebase_core"]
    },
    {
      name: "Native iOS (Swift)",
      stack: {
        language: "Swift",
        framework: "UIKit/SwiftUI",
        stateManagement: "Combine",
        database: { local: "Core Data", cloud: "CloudKit" },
        ui: "SwiftUI",
        navigation: "NavigationStack"
      },
      deps: ["UIKit", "SwiftUI", "Combine", "CoreData"]
    },
    {
      name: "Native Android (Kotlin)",
      stack: {
        language: "Kotlin",
        framework: "Android SDK",
        stateManagement: "ViewModel",
        database: { local: "Room", cloud: "Firebase" },
        ui: "Jetpack Compose",
        navigation: "Navigation Component"
      },
      deps: ["androidx.compose", "androidx.room", "androidx.navigation"]
    }
  ],
  web: [
    {
      name: "React/Next.js",
      stack: {
        language: "JavaScript/TypeScript",
        framework: "Next.js",
        stateManagement: "Zustand/Redux",
        database: "PostgreSQL",
        ui: "Tailwind CSS",
        backend: "API Routes"
      },
      deps: ["next", "react", "tailwindcss", "prisma"]
    },
    {
      name: "Vue/Nuxt",
      stack: {
        language: "JavaScript/TypeScript", 
        framework: "Nuxt.js",
        stateManagement: "Pinia",
        database: "MongoDB",
        ui: "Vuetify",
        backend: "Express"
      },
      deps: ["nuxt", "vue", "pinia", "vuetify"]
    }
  ],
  backend: [
    {
      name: "Node.js/Express",
      stack: {
        language: "JavaScript/TypeScript",
        framework: "Express.js",
        database: "PostgreSQL/MongoDB",
        orm: "Prisma/Mongoose",
        auth: "JWT",
        testing: "Jest"
      },
      deps: ["express", "prisma", "jsonwebtoken", "bcrypt"]
    },
    {
      name: "Python/FastAPI",
      stack: {
        language: "Python",
        framework: "FastAPI",
        database: "PostgreSQL",
        orm: "SQLAlchemy",
        auth: "OAuth2",
        testing: "pytest"
      },
      deps: ["fastapi", "sqlalchemy", "uvicorn", "pytest"]
    }
  ],
  desktop: [
    {
      name: "Electron",
      stack: {
        language: "JavaScript/TypeScript",
        framework: "Electron",
        ui: "React/Vue",
        database: "SQLite",
        packaging: "electron-builder"
      },
      deps: ["electron", "react", "sqlite3", "electron-builder"]
    },
    {
      name: "Tauri",
      stack: {
        language: "Rust + JavaScript",
        framework: "Tauri",
        ui: "React/Vue/Svelte",
        database: "SQLite",
        packaging: "Native"
      },
      deps: ["tauri", "react", "rusqlite"]
    }
  ]
};

function detectProjectType(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('모바일') || desc.includes('앱') || desc.includes('안드로이드') || desc.includes('ios')) {
    return 'mobile';
  } else if (desc.includes('웹사이트') || desc.includes('브라우저') || desc.includes('웹')) {
    return 'web';
  } else if (desc.includes('api') || desc.includes('서버') || desc.includes('백엔드')) {
    return 'backend';  
  } else if (desc.includes('데스크톱') || desc.includes('윈도우') || desc.includes('맥')) {
    return 'desktop';
  } else {
    return 'web'; // 기본값
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function selectTechStack(projectType) {
  const options = techStackOptions[projectType];
  
  console.log(`\n🔧 ${projectType} 프로젝트 기술 스택 선택:`);
  options.forEach((option, idx) => {
    console.log(`${idx + 1}. ${option.name}`);
    console.log(`   언어: ${option.stack.language}`);
    console.log(`   프레임워크: ${option.stack.framework}\n`);
  });
  
  const answer = await askQuestion(`기술 스택을 선택하세요 (1-${options.length}): `);
  const choice = parseInt(answer) - 1;
  
  if (choice >= 0 && choice < options.length) {
    return options[choice];
  } else {
    console.log('잘못된 선택입니다. 기본값을 사용합니다.');
    return options[0];
  }
}

// 실제 AI API 호출
async function callAI(prompt) {
  const api = getAvailableAPI();
  console.error(`🤖 ${api.name} API 사용 중...`);
  
  try {
    const response = await api.call(prompt);
    return response;
  } catch (error) {
    console.error(`❌ ${api.name} API 오류:`, error.message);
    throw error;
  }
}

// AI 응답에서 JSON 파싱 (강화된 파싱)
function parseJSONFromResponse(response, type = 'object') {
  try {
    // 1. 코드 블록 제거
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // 2. 주석 제거
    cleanResponse = cleanResponse.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    // 3. JSON 패턴 추출
    let jsonMatch;
    if (type === 'array') {
      jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
    } else {
      jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      throw new Error('JSON 패턴을 찾을 수 없습니다');
    }
    
    let jsonString = jsonMatch[0];
    
    // 4. 잘못된 쉼표 제거 (trailing commas)
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // 5. 제어 문자 제거
    jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, '');
    
    // 6. 파싱 시도
    return JSON.parse(jsonString);
    
  } catch (error) {
    console.error('JSON 파싱 실패, 원본 응답:', response.substring(0, 200));
    throw new Error(`JSON 파싱 오류: ${error.message}`);
  }
}

async function generateSpecification(description, selectedTechStack) {
  console.error('🤖 1단계: AI 기본 구조 분석...');
  
  // 1단계: 기본 모듈 구조 파악
  const structurePrompt = `프로젝트: "${description}"

이 프로젝트에 필요한 모든 모듈 목록을 JSON 배열로 제공해주세요:
["모듈명1", "모듈명2", "모듈명3", ...]

최소 10-15개 모듈을 포함해주세요.`;

  const structureResponse = await callAI(structurePrompt);
  const modules = parseJSONFromResponse(structureResponse, 'array');
  
  console.error(`✅ ${modules.length}개 모듈 식별됨`);
  
  const specification = {
    title: "혈당 모니터링 모바일 앱",
    description,
    techStack: selectedTechStack,
    modules: []
  };

  console.error('🔧 2단계: 각 모듈 상세화...');
  
  for (const moduleName of modules) {
    console.error(`  - ${moduleName} 모듈 상세화 중...`);
    
    try {
      const modulePrompt = `"${moduleName}" 모듈을 상세히 설계해주세요.

JSON 형식으로 응답해주세요:
{
  "name": "${moduleName}",
  "description": "상세한 모듈 설명",
  "functions": [
    {
      "name": "함수명",
      "description": "함수 설명", 
      "parameters": "매개변수 목록",
      "returns": "반환값 설명"
    }
  ]
}

각 모듈당 3-5개 함수를 포함해주세요.`;

      const moduleResponse = await callAI(modulePrompt);
      const moduleData = parseJSONFromResponse(moduleResponse, 'object');
      specification.modules.push(moduleData);
      console.error(`    ✓ ${moduleData.functions?.length || 0}개 함수 생성됨`);
    } catch (error) {
      console.error(`    ❌ ${moduleName} 모듈 실패: ${error.message}`);
    }
  }

  console.error('\n📋 3단계: 명세서 정리...');
  
  const totalFunctions = specification.modules.reduce((sum, mod) => sum + (mod.functions?.length || 0), 0);
  
  // 선택된 기술 스택으로 마크다운 생성
  const markdown = `# ${specification.title}

## 개요
${specification.description}

## 선택된 기술 스택: ${selectedTechStack.name}
- **언어**: ${selectedTechStack.stack.language}
- **프레임워크**: ${selectedTechStack.stack.framework}
- **상태관리**: ${selectedTechStack.stack.stateManagement}
- **데이터베이스**: ${JSON.stringify(selectedTechStack.stack.database)}
- **UI**: ${selectedTechStack.stack.ui || selectedTechStack.stack.navigation}

## 주요 의존성
\`\`\`
${selectedTechStack.deps.join('\n')}
\`\`\`

## 소프트웨어 설계 명세서 (총 ${specification.modules.length}개 모듈, ${totalFunctions}개 함수)

| Module | Function | Design Spec | Function Definition | Remarks |
|--------|----------|-------------|---------------------|---------|
${specification.modules.map(module => 
  module.functions?.map(func => 
    `| ${module.name} | ${func.name} | ${func.description} | \`${func.parameters}\` | ${func.returns} |`
  ).join('\n') || `| ${module.name} | - | ${module.description} | - | 함수 없음 |`
).join('\n')}

## 모듈 상세 정보

${specification.modules.map(module => `
### ${module.name}
${module.description}

**포함 함수**: ${module.functions?.length || 0}개
${module.functions?.map(func => `- **${func.name}**: ${func.description}`).join('\n') || ''}
`).join('')}
`;

  return { specification, markdown };
}

async function generateDevelopmentFiles(specification) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sdsDir = `.sds/${timestamp}`;
  
  await fs.mkdir(sdsDir, { recursive: true });
  
  const devSpec = {
    metadata: {
      id: `sds_${Date.now()}`,
      title: specification.title,
      version: "1.0.0", 
      created: new Date().toISOString(),
      selectedTechStack: specification.techStack.name
    },
    techStack: specification.techStack.stack,
    dependencies: specification.techStack.deps,
    modules: specification.modules.map(module => ({
      name: module.name,
      description: module.description,
      functions: module.functions || []
    }))
  };
  
  await fs.writeFile(path.join(sdsDir, 'development.json'), JSON.stringify(devSpec, null, 2));
  await fs.writeFile(path.join(sdsDir, 'tasks.json'), JSON.stringify({
    project: specification.title,
    techStack: specification.techStack.name,
    tasks: specification.modules.map((module, idx) => ({
      id: idx + 1,
      title: `Implement ${module.name} module`,
      description: module.description,
      status: "pending"
    }))
  }, null, 2));
  
  return sdsDir;
}

// 실행
if (process.argv[2]) {
  const description = process.argv[2];
  
  (async () => {
    try {
      const projectType = detectProjectType(description);
      console.log(`\n🎯 감지된 프로젝트 유형: ${projectType}`);
      
      const selectedTechStack = await selectTechStack(projectType);
      console.log(`\n✅ 선택된 기술 스택: ${selectedTechStack.name}`);
      console.log('명세서 생성을 시작합니다...\n');
      
      const { specification, markdown } = await generateSpecification(description, selectedTechStack);
      
      console.error('\n🏆 성공!');
      console.error(`✅ ${specification.modules.length}개 모듈`);
      const totalFunctions = specification.modules.reduce((sum, mod) => sum + (mod.functions?.length || 0), 0);
      console.error(`✅ ${totalFunctions}개 함수`);
      
      const sdsDir = await generateDevelopmentFiles(specification);
      console.error(`✅ 개발 파일 생성 완료: ${sdsDir}`);
      
      await fs.writeFile('specification.md', markdown);
      console.error('✅ 명세서 저장: specification.md');
      
      console.log(markdown);
      
    } catch (error) {
      console.error('❌ 실패:', error.message);
    } finally {
      rl.close();
    }
  })();
} else {
  console.log('사용법: node sds_interactive.js "프로젝트 설명"');
  rl.close();
}