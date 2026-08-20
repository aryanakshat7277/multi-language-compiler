# Deployment Guide

## Local Development Setup
1. Use `docker-compose up -d` to start Redis and PostgreSQL.
2. Build the sandbox image: `docker build -t code-sandbox:latest ./infrastructure/docker/sandbox`.
3. Start the worker: `npm run dev` in the `worker` directory.

## Docker Compose Deployment
A production `docker-compose.prod.yml` should build the worker process alongside Redis and Postgres.
Ensure the host machine maps the Docker socket so the worker container can spawn sandbox containers:
`- /var/run/docker.sock:/var/run/docker.sock`

## Production Deployment Considerations
- **Security**: Never expose the Docker daemon over TCP. Use the local Unix socket.
- **Cleanup**: Docker leaves behind dangling images/volumes over time. Schedule a cron job: `docker system prune -f`.
- **Scaling Workers**: Run multiple instances of the worker process across different physical hosts pointing to the same Redis URL.

## Environment Configuration
Ensure `.env` contains secure, complex passwords for DB and Redis.
