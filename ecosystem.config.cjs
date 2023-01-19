module.exports = {
  apps: [
    {
      name: 'brainbot',
      script: 'npm run serve',
      watch: false,
      time: true,
      restart_delay: 600000,
      max_memory_restart: '300M',
    },
  ],
}
