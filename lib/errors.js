// Custom error classes for better error handling

export class APIError extends Error {
  constructor(message, originalError, apiName) {
    super(message);
    this.name = 'APIError';
    this.originalError = originalError;
    this.apiName = apiName;
  }
}

export class ParsingError extends Error {
  constructor(message, originalResponse) {
    super(message);
    this.name = 'ParsingError';
    this.originalResponse = originalResponse;
  }
}

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class FileIOError extends Error {
  constructor(message, filePath, operation) {
    super(message);
    this.name = 'FileIOError';
    this.filePath = filePath;
    this.operation = operation;
  }
}

export class NetworkError extends Error {
  constructor(message, endpoint, statusCode) {
    super(message);
    this.name = 'NetworkError';
    this.endpoint = endpoint;
    this.statusCode = statusCode;
  }
}

// Centralized error handling
export function handleError(error, isMCP = false, requestId = null) {
  let userMessage = 'An unexpected error occurred.';
  let code = -32603; // Internal error
  
  if (error instanceof APIError) {
    userMessage = `Failed to connect to ${error.apiName} API. Please check your API keys in the .env file.`;
    code = -32602; // Invalid params
  } else if (error instanceof ParsingError) {
    userMessage = `The AI response could not be parsed. This may be a temporary issue - please try again.`;
    code = -32603; // Internal error
  } else if (error instanceof ConfigurationError) {
    userMessage = `Configuration error: ${error.message}`;
    code = -32602; // Invalid params
  } else if (error instanceof ValidationError) {
    userMessage = `Validation error in ${error.field}: ${error.message}`;
    code = -32602; // Invalid params
  } else if (error instanceof FileIOError) {
    userMessage = `File operation failed (${error.operation}): ${error.message}`;
    code = -32603; // Internal error
  } else if (error instanceof NetworkError) {
    userMessage = `Network error accessing ${error.endpoint}: ${error.message}`;
    code = -32603; // Internal error
  }
  
  if (isMCP) {
    // Return structured error for MCP clients
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      error: { 
        code: code, 
        message: userMessage,
        data: process.env.NODE_ENV === 'development' ? { 
          stack: error.stack,
          originalError: error.originalError?.message 
        } : undefined
      }
    }) + '\n');
  } else {
    // Display user-friendly message for CLI
    console.error(`❌ Operation failed: ${userMessage}`);
    if (process.env.NODE_ENV === 'development') {
      console.error('--- Technical Details ---');
      console.error(error.stack);
      if (error.originalError) {
        console.error('--- Original Error ---');
        console.error(error.originalError.stack);
      }
    }
  }
}