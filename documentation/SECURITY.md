# Security Architecture & Threat Model

## Threat Model
1. **Malicious Code Execution**: Users submitting code that attempts to exploit the host server.
2. **Resource Exhaustion**: Users submitting code with infinite loops, memory leaks, fork bombs, or large file outputs.
3. **Network Abuse**: Users submitting code that attempts to port scan internal networks or execute DDoS attacks.

## Sandbox Security Controls

### Network Isolation
Enforced via `NetworkMode: 'none'`. The container has only a loopback interface.

### Filesystem Isolation
- `ReadonlyRootfs: true` prevents modification of installed binaries.
- `/workspace` and `/tmp` are mounted as `tmpfs` with hard limits (64MB and 32MB).

### Resource Limits
- **CPU**: 1 Core max (`NanoCpus: 1000000000`).
- **Memory**: Limited per language (e.g., 256MB) via cgroups (`Memory` and `MemorySwap`).
- **PIDs Limit**: 64 PIDs max (`PidsLimit: 64`) to prevent fork bombs.
- **Output Limit**: Output stream buffers are truncated at 1MB to prevent memory exhaustion in the Worker.
- **Time Limits**: Worker forcefully kills the container if execution exceeds `EXECUTION_TIMEOUT_MS`.

### Privilege Restrictions
- `User: '1000:1000'` (Non-root user).
- `SecurityOpt: ['no-new-privileges:true']` prevents privilege escalation via setuid.
- `CapDrop: ['ALL']` drops all Linux capabilities (chown, dac_override, setuid, net_raw, etc.).

## Authentication & Authorization
All user-facing endpoints must require JWT-based authentication. Rate limiting applies per user ID or IP.
