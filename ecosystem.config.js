export default {
  apps: [{
    name: 'draxmh-discord-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    wait_ready: true,
    ignore_watch: [
      'node_modules',
      'logs',
      'data',
      '*.log'
    ],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    exec_mode: 'fork'
  }]
};