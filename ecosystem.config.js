module.exports = {
  apps: [{
    name: 'fishcake-backend',
    script: './backend/dist/serverSupabase.js',
    cwd: './backend',
    instances: 1,
    exec_mode: 'fork',
    env_file: './backend/.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '512M',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'data'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    kill_timeout: 5000,
    listen_timeout: 5000
  }]
};
