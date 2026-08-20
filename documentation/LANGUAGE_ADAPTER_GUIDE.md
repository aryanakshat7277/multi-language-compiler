# Language Adapter Guide

## How to Add a New Language

1. **Update the Dockerfile**
   Ensure the language runtime or compiler is installed in `infrastructure/docker/sandbox/Dockerfile`.
   Example for Ruby: `apt-get install -y ruby`

2. **Update Language Config**
   Add the language configuration to `worker/src/config/languages.ts`.

   ```typescript
   ruby: {
     id: 'ruby',
     displayName: 'Ruby',
     extension: '.rb',
     runCmd: 'ruby {file}',
     compileRequired: false,
     memoryLimitMb: 256,
     timeLimitMs: 5000,
     mainFile: 'main.rb'
   }
   ```

3. **Rebuild the Sandbox Image**
   `docker build -t code-sandbox:latest ./infrastructure/docker/sandbox`

4. **Testing**
   Submit a test payload via the API/worker queue to ensure output is captured correctly.
