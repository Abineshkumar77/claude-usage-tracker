const fs = require('fs')
const path = require('path')
const os = require('os')

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const PLUGIN_ROOT = path.join(os.homedir(), '.claude', 'skills', 'claude-usage-tracker')
const scriptPath = path.join(PLUGIN_ROOT, 'hooks', 'push-usage.js')
const command = `node ${scriptPath}`

// Load existing settings or start fresh
let settings = {}
if (fs.existsSync(SETTINGS_PATH)) {
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
  } catch {
    console.error('Could not parse settings.json — please check it is valid JSON.')
    process.exit(1)
  }
}

// Ensure hooks.Stop exists
if (!settings.hooks) settings.hooks = {}
if (!settings.hooks.Stop) settings.hooks.Stop = []

// Check if already registered
const alreadyRegistered = settings.hooks.Stop.some(group =>
  group.hooks?.some(h => h.command?.includes('push-usage.js'))
)

if (alreadyRegistered) {
  console.log('Hook already registered — nothing to do.')
  process.exit(0)
}

// Register the hook
settings.hooks.Stop.push({
  hooks: [{ type: 'command', command }],
})

fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
console.log('Hook registered in', SETTINGS_PATH)
console.log('Restart Claude Code to activate.')
