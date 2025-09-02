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
sds "I want to create a mobile blood sugar monitoring app. Users should be able to input and record blood sugar levels, view trends in graphs, set target ranges, and receive notifications."
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