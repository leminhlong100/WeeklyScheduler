/**
 * Bộ test chất lượng cho AI tách khoản chi tiêu.
 *
 *   node scripts/test-parse-expense.mjs          # chạy hết
 *   node scripts/test-parse-expense.mjs 14 17    # chỉ chạy case id 14 và 17
 *
 * Case đọc từ khối JSON trong `docs/test-cases-chi-tieu.md` — một nguồn duy nhất
 * cho cả người đọc lẫn script. System prompt import từ chính function đang deploy,
 * không chép lại, để test không bao giờ đo một prompt khác với prompt thật.
 *
 * Cần GROQ_API_KEY trong `.env.local`. Script gọi Groq thật nên có tốn quota.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSystemPrompt } from '../netlify/functions/parse-expense.js'
import { groqRequest } from '../netlify/functions/_llm.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOC = path.join(ROOT, 'docs', 'test-cases-chi-tieu.md')

/** Nạp .env.local thủ công: script chạy bằng node trần, không qua Vite. */
function loadEnvLocal() {
  const file = path.join(ROOT, '.env.local')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function loadCases() {
  const md = fs.readFileSync(DOC, 'utf8')
  const m = md.match(/```json\n([\s\S]*?)\n```/)
  if (!m) throw new Error('Không tìm thấy khối ```json trong ' + DOC)
  return JSON.parse(m[1])
}

function parseJsonLoose(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(raw.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Chờ giữa các case và thử lại khi dính 429.
 *
 * `groqRequest` chỉ retry ĐÚNG 1 lần vì Netlify Function có trần ~26s — đúng cho
 * production, nhưng 35 request liên tiếp vẫn đủ làm free tier trả 429 hàng loạt và
 * bảng kết quả trông như prompt hỏng. Script chạy dưới terminal thì không có trần
 * đó, nên nó tự kiên nhẫn hơn: chậm mà đo đúng chất lượng prompt.
 */
const PACE_MS = 2500
const RATE_LIMIT_RETRIES = 4
const RATE_LIMIT_BACKOFF_MS = 12000

async function askModel(systemPrompt, text, key) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await groqRequest(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0,
          maxTokens: 2000,
          reasoningEffort: 'low',
          json: true,
        },
        key,
      )
    } catch (e) {
      const retryable = e?.code === 'rate_limited' || e?.code === 'network' || e?.code === 'timeout'
      if (!retryable || attempt >= RATE_LIMIT_RETRIES) throw e
      await sleep(RATE_LIMIT_BACKOFF_MS * (attempt + 1))
    }
  }
}

/** So sánh không quan tâm thứ tự — model có quyền trả các khoản theo thứ tự khác. */
function sameMultiset(a, b) {
  if (a.length !== b.length) return false
  const sort = (xs) => [...xs].map(String).sort()
  return JSON.stringify(sort(a)) === JSON.stringify(sort(b))
}

function checkCase(testCase, items) {
  const problems = []
  if (
    !sameMultiset(
      items.map((i) => i.amount),
      testCase.amounts,
    )
  ) {
    problems.push(
      `amount: mong ${JSON.stringify(testCase.amounts)}, nhận ${JSON.stringify(items.map((i) => i.amount))}`,
    )
  }
  if (
    testCase.categories &&
    !sameMultiset(
      items.map((i) => i.category),
      testCase.categories,
    )
  ) {
    problems.push(
      `category: mong ${JSON.stringify(testCase.categories)}, nhận ${JSON.stringify(items.map((i) => i.category))}`,
    )
  }
  if (
    testCase.dates &&
    !sameMultiset(
      items.map((i) => i.spent_at),
      testCase.dates,
    )
  ) {
    problems.push(
      `spent_at: mong ${JSON.stringify(testCase.dates)}, nhận ${JSON.stringify(items.map((i) => i.spent_at))}`,
    )
  }
  if (
    testCase.currencies &&
    !sameMultiset(
      items.map((i) => i.currency),
      testCase.currencies,
    )
  ) {
    problems.push(
      `currency: mong ${JSON.stringify(testCase.currencies)}, nhận ${JSON.stringify(items.map((i) => i.currency))}`,
    )
  }
  if (
    testCase.confidences &&
    !sameMultiset(
      items.map((i) => i.confidence),
      testCase.confidences,
    )
  ) {
    problems.push(
      `confidence: mong ${JSON.stringify(testCase.confidences)}, nhận ${JSON.stringify(items.map((i) => i.confidence))}`,
    )
  }
  return problems
}

async function run() {
  loadEnvLocal()
  const key = process.env.GROQ_API_KEY
  if (!key) {
    console.error('Thiếu GROQ_API_KEY (đặt trong .env.local).')
    process.exit(1)
  }

  const suite = loadCases()
  const only = process.argv.slice(2).map(Number).filter(Number.isFinite)
  const cases = only.length ? suite.cases.filter((c) => only.includes(c.id)) : suite.cases

  const systemPrompt = buildSystemPrompt({
    today: suite.today,
    categories: suite.categories,
    defaultCurrency: suite.defaultCurrency,
  })

  console.log(`Model: ${process.env.GROQ_MODEL || '(mặc định trong _llm.js)'}`)
  console.log(`Ngày mốc: ${suite.today} — ${cases.length} case\n`)

  const failures = []
  for (const [index, testCase] of cases.entries()) {
    if (index > 0) await sleep(PACE_MS)
    let items = []
    let crashed = null
    try {
      const reply = await askModel(systemPrompt, testCase.text, key)
      const parsed = parseJsonLoose(reply)
      if (!parsed || !Array.isArray(parsed.items)) throw new Error('không parse được JSON')
      items = parsed.items
    } catch (e) {
      crashed = e?.message || String(e)
    }

    const problems = crashed ? [crashed] : checkCase(testCase, items)
    const mark = problems.length === 0 ? 'PASS' : 'FAIL'
    console.log(`[${mark}] #${String(testCase.id).padStart(2)} ${testCase.text}`)
    for (const p of problems) console.log(`         ${p}`)
    if (problems.length) failures.push({ id: testCase.id, group: testCase.group, problems })
  }

  const passed = cases.length - failures.length
  console.log(`\n${passed}/${cases.length} đạt`)
  if (failures.length) {
    console.log('\nTrượt theo nhóm:')
    const byGroup = new Map()
    for (const f of failures) byGroup.set(f.group, (byGroup.get(f.group) ?? 0) + 1)
    for (const [group, n] of byGroup) console.log(`  ${group}: ${n}`)
  }
  process.exitCode = failures.length ? 1 : 0
}

run()
