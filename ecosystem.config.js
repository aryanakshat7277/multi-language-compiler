module.exports = {
  apps: [
    {
      name: 'codeforge-api',
      script: 'backend/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '1024M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      restart_delay: 2000
    }
  ]
};
