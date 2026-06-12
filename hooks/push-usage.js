const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')

const SUPABASE_EDGE_URL = 'https://uskyccnonglqfvjsqkad.supabase.co/functions/v1/push-usage'
const CREDS_FILE = path.join(os.homedir(), '.claude', '.credentials.json')

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        else resolve(data)
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function main() {
  const memberName = process.env.CLAUDE_MEMBER_NAME || os.userInfo().username

  if (!fs.existsSync(CREDS_FILE)) {
    console.error('credentials file not found:', CREDS_FILE)
    return
  }

  const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf-8'))
  const token = creds?.claudeAiOauth?.accessToken
  if (!token) {
    console.error('no accessToken in credentials file')
    return
  }

  let usage
  try {
    const body = await request('https://api.anthropic.com/api/oauth/usage', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'claude-code/2.1.170',
      },
    })
    usage = JSON.parse(body)
  } catch (e) {
    console.error('failed to fetch usage:', e.message)
    return
  }

  const fh = usage.five_hour || {}
  const sd = usage.seven_day || {}

  const payload = JSON.stringify({
    member_name: memberName,
    five_hour_utilization: fh.utilization ?? null,
    five_hour_resets_at: fh.resets_at ?? null,
    seven_day_utilization: sd.utilization ?? null,
    seven_day_resets_at: sd.resets_at ?? null,
  })

  try {
    await request(SUPABASE_EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload)
    console.log(`usage pushed for ${memberName}`)
  } catch (e) {
    console.error('failed to push:', e.message)
  }
}

main()
