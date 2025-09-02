# SDS (Software Design Specification) Generator

A tool that converts natural language project descriptions into comprehensive software design specifications.

## Features

- **Natural Language Input**: Supports Korean project descriptions
- **Auto Project Type Detection**: Automatically detects Mobile, Web, Backend, Desktop projects
- **Tech Stack Selection**: Multiple technology stack options for each platform
- **Complete Specification**: Generates detailed specifications in table format
- **Development Files**: Auto-generates structured files in .sds directory

## Installation

### Global Installation (Recommended)

```bash
npm install -g sds-generator
```

### Local Installation

```bash
npm install sds-generator
```

### Setup API Keys

```bash
cp .env.example .env
# Edit .env file and add your API keys
```

## Usage

### Global Installation

```bash
sds "project description"
```

### Local Installation

```bash
npx sds-generator "project description"
# or
node sds.js "project description"
```

### Example

```bash
sds "혈당 모니터링 앱을 모바일로 만들려고 해. 사용자가 혈당 수치를 입력하고 기록할 수 있고, 그래프로 추이를 볼 수 있으며, 목표 범위를 설정하고 알림을 받을 수 있는 기능이 필요해."
```

Process:
1. Auto-detect project type (mobile)
2. Select tech stack (React Native, Flutter, Swift, Kotlin)
3. Generate and output specification
4. Create development files in `.sds/` directory

## Generated Files

### Markdown Specification
- `specification.md`: Display-ready specification with tables

### .sds Directory (Development)
- `development.json`: Tech stack and implementation details
- `tasks.json`: TaskMaster AI compatible task list
- `api.json`: OpenAPI specification
- `database.json`: Database schema
- `README.md`: Development guide

## Supported Project Types

### Mobile
- React Native
- Flutter  
- Native iOS (Swift)
- Native Android (Kotlin)

### Web
- React/Next.js
- Vue/Nuxt

### Backend
- Node.js/Express
- Python/FastAPI

### Desktop
- Electron
- Tauri

## Example Output

```
🎯 Detected project type: mobile

🔧 Select tech stack for mobile project:
1. React Native
2. Flutter
3. Native iOS (Swift)
4. Native Android (Kotlin)

Select tech stack (1-4): 2

✅ Selected tech stack: Flutter
```

Generated specification includes:
- Tech stack information
- Dependencies list
- Module function table (Module | Function | Design Spec | Function Definition | Remarks)
- Detailed module descriptions

## Supported APIs

- **Anthropic Claude**: Set `ANTHROPIC_API_KEY`
- **OpenAI GPT**: Set `OPENAI_API_KEY`
- **Perplexity**: Set `PERPLEXITY_API_KEY`

## License

MIT