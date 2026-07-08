const { execSync } = require('node:child_process')

const port = process.env.PORT || 3000
execSync(`serve apps/dawnlight/dist-app -s -l tcp://0.0.0.0:${port}`, {
  stdio: 'inherit',
  shell: true,
})
