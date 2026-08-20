# AI Module Integration

## Overview
The platform supports automated code review and hint generation via an AI Provider abstraction.

## Provider Abstraction
Implement the `AIProvider` interface to support multiple LLM backends (Gemini, OpenAI, Anthropic).

```typescript
interface AIProvider {
  analyzeCode(code: string, language: string): Promise<CodeAnalysis>;
  generateHint(problemContext: string, currentCode: string): Promise<string>;
}
```

## Gemini Integration
We use the official `@google/generative-ai` SDK.
- Model: `gemini-1.5-pro` (or latest)
- Temperature: 0.2 (for deterministic code analysis)

## Prompt Engineering
Always provide the LLM with:
1. The exact user code.
2. The language runtime error (if applicable).
3. The expected output vs actual output.

## Rate Limiting
To prevent cost overruns, apply token limits and rate limits per user on all AI endpoints.
