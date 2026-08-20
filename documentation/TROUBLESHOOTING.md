# Troubleshooting Guide

## Docker Issues

**Error: Failed to connect to Docker daemon**
- **Cause**: Docker is not running or the socket path is incorrect.
- **Solution**: Ensure Docker Desktop / Daemon is running. On Windows, the socket is `//./pipe/docker_engine`. On Linux, `/var/run/docker.sock`.

**Error: OOMKilled**
- **Cause**: The submitted code consumed more memory than `MAX_MEMORY_MB`.
- **Solution**: Check the user's code for memory leaks or massive arrays.

## Database Issues

**Redis Connection Timeout**
- **Cause**: Worker cannot reach Redis.
- **Solution**: Check `REDIS_URL` in `.env`. Ensure the `docker-compose` Redis container is healthy.

## Worker Issues

**Jobs stuck in QUEUED state**
- **Cause**: Worker process is not running or crashed.
- **Solution**: Check worker logs. Run `npm run start` in the worker directory.
