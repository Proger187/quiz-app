/**
 * Launches Electron with a clean environment.
 * Explicitly deletes ELECTRON_RUN_AS_NODE so tsx/ts-node usage in the parent
 * shell never causes "Cannot read properties of undefined" crashes.
 */
const { spawn } = require('child_process')
const electron = require('electron')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE  // must be absent, not just empty
env.NODE_ENV = process.env.NODE_ENV || 'development'

const child = spawn(electron, ['.'], { stdio: 'inherit', env })

child.on('close', (code) => process.exit(code ?? 0))
child.on('error', (err) => {
  console.error('Failed to start Electron:', err.message)
  process.exit(1)
})
