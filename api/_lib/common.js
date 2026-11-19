import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)

// Vercel cron mengirim header "Authorization: Bearer <CRON_SECRET>".
// ?secret=... disediakan hanya untuk tes manual lewat browser.
export function isAuthorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers['authorization'] === `Bearer ${secret}` || req.query?.secret === secret
}

export async function sendTelegram(text) {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_GROUP_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    }
  )
  const json = await res.json()
  if (!json.ok) throw new Error(`Telegram: ${json.description}`)
}

export const esc = s =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── Helper waktu WIB (UTC+7) ──
export const DAY = 86_400_000
const WIB = 7 * 3_600_000

// 'yyyy-MM-dd' menurut WIB
export function wibDateStr(ms = Date.now()) {
  return new Date(ms + WIB).toISOString().slice(0, 10)
}

// awal hari WIB (00:00 WIB) dalam ms UTC
export function wibStartOfDay(ms = Date.now()) {
  const t = ms + WIB
  return t - (t % DAY) - WIB
}

// awal minggu WIB (Senin 00:00), sama seperti weekStartsOn: 1 di app
export function wibStartOfWeek(ms = Date.now()) {
  const start = wibStartOfDay(ms)
  const dow = new Date(start + WIB).getUTCDay() // 0 = Minggu
  return start - ((dow + 6) % 7) * DAY
}
