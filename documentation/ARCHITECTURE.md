# Architecture Document

## System Overview

The Multi-Language Code Compiler uses an asynchronous, worker-based architecture to process code execution requests securely and at scale. 

## Component Descriptions

### Backend API
The API receives requests from the frontend, validates payloads, saves execution records to the PostgreSQL database, and queues an `ExecutionJob` in BullMQ.

### Worker & Queue
BullMQ (backed by Redis) serves as the task queue. Worker processes consume jobs from the `execution` queue. Workers can be scaled horizontally.

### Docker Sandbox
The most critical component. It creates an isolated, zero-network Docker container for each execution. Strict limits (`Memory`, `NanoCpus`, `PidsLimit`) prevent malicious resource consumption (e.g., fork bombs, memory exhaustion).

## Data Flow Diagrams

### Code Execution Flow
1. User submits code via API.
2. API inserts record -> `PENDING`, pushes to BullMQ.
3. Worker picks up job, publishes `STARTING` status.
4. Worker creates Docker container with read-only rootfs and writable `tmpfs` at `/workspace`.
5. Worker copies code into `/workspace` via TAR archive.
6. Worker compiles code (if compiled language) -> publishes `COMPILING`.
7. Worker executes code, capturing `stdout`/`stderr` up to limit (1MB).
8. Worker destroys container.
9. Worker publishes `COMPLETED` or `FAILED`.

## Security Architecture
- **NetworkMode: 'none'**: Containers have no internet access.
- **ReadonlyRootfs**: System files cannot be tampered with.
- **Tmpfs Limits**: `/workspace` is limited to 64MB to prevent disk exhaustion.
- **Capabilities Dropped**: `CapDrop: ['ALL']` removes root capabilities.
- **Unprivileged User**: Code runs as UID 1000.

## Scalability Design
- Workers are stateless.
- Scale horizontally by adding more Node.js worker instances connected to the same Redis cluster.
