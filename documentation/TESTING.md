# Testing Strategy

## Unit Tests
- Framework: Jest / Mocha
- Target: Worker utility functions (e.g., `tar.ts` buffer generation), Language Config parsers.

## Integration Tests
- Verify `DockerSandbox.ts` successfully creates, executes, and destroys containers.
- Verify BullMQ job processing flow.
- Ensure Timeout (`EXECUTION_TIMEOUT_MS`) accurately kills containers that hang.

## Security Tests
- Submit a Fork Bomb script; verify container exits with OOM / PID limit reached.
- Submit script attempting to access network; verify `ping google.com` fails.
- Submit script writing large files to disk; verify disk limits trigger an error.

## Running Tests
```bash
npm run test
npm run test:integration
```
