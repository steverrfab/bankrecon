import * as XLSX from 'xlsx'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const PROMPT = `You are parsing a bank statement. Return ONLY valid JSON, no markdown, no explanation:
{
  "entity": "full entity name",
  "account_number": "last 4 digits only",
  "period": "Month YYYY",
  "period_start": "MM/DD/YYYY",
  "period_end": "MM/DD/YYYY",
  "beginning_balance_bank": 0,
  "ending_balance_bank": 0,
  "total_deposits": 0,
  "total_ach_additions": 0,
  "total_loan_proceeds": 0,
  "total_additions": 0,
  "total_checks": 0,
  "total_ach_deductions": 0,
  "total_other_deductions": 0,
  "total_deductions": 0,
  "interest_earned": 0,
  "bank_charges": 0,
  "average_balance": 0,
  "deposits": [{"date": "MM/DD", "description": "", "amount": 0}],
  "ach_additions": [{"date": "", "description": "", "amount": 0}],
  "loan_proceeds": [{"date": "", "description": "", "amount": 0}],
  "internal_transfers_in": [{"date": "", "description": "", "amount": 0}],
  "checks": [{"date": "", "check_number": "", "amount": 0}],
  "settlement_payments": [{"date": "", "description": "", "amount": 0}],
  "payroll_direct_deposits": [{"date": "", "description": "", "amount": 0}],
  "tax_payments": [{"date": "", "description": "", "amount": 0}],
  "ach_deductions": [{"date": "", "description": "", "amount": 0}],
  "wire_transfers": [{"date": "", "description": "", "amount": 0}],
  "other_deductions": [{"date": "", "description": "", "amount": 0}],
  "internal_transfers_out": [{"date": "", "description": "", "amount": 0}],
  "nsf_items": [{"date": "", "description": "", "amount": 0}],
  "daily_balances": [{"date": "", "balance": 0}],
  "check_gaps": "",
  "notes": ""
}
All amounts must be positive numbers. Extract every single transaction. Separate payroll ACH from settlement ACH from other ACH. Note any gaps in check sequence.`

async function callGemini(contents) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const resp = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0, maxOutputTokens: 8192 }
    })
  })

  const json = await resp.json()
  if (json.error) throw new Error(json.error.message)

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text.replace(/```json\n?|```/g, '').trim()
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = file.name.toLowerCase()
    const mimeType = file.type

    let raw

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const b64 = buffer.toString('base64')
      raw = await callGemini([{
        parts: [
          { inline_data: { mime_type: 'application/pdf', data: b64 } },
          { text: PROMPT }
        ]
      }])

    } else if (mimeType.startsWith('image/')) {
      const b64 = buffer.toString('base64')
      raw = await callGemini([{
        parts: [
          { inline_data: { mime_type: mimeType, data: b64 } },
          { text: PROMPT }
        ]
      }])

    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || mimeType.includes('sheet') || mimeType.includes('excel')) {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      let text = ''
      wb.SheetNames.forEach(name => {
        text += `\n=== Sheet: ${name} ===\n`
        text += XLSX.utils.sheet_to_csv(wb.Sheets[name])
      })
      raw = await callGemini([{
        parts: [{ text: `Bank statement data from Excel:\n\n${text}\n\n${PROMPT}` }]
      }])

    } else if (fileName.endsWith('.csv') || mimeType === 'text/csv') {
      const text = buffer.toString('utf-8')
      raw = await callGemini([{
        parts: [{ text: `Bank statement data from CSV:\n\n${text}\n\n${PROMPT}` }]
      }])

    } else {
      return Response.json({ error: `Unsupported file type: ${mimeType || fileName}` }, { status: 400 })
    }

    const parsed = JSON.parse(raw)
    return Response.json({ data: parsed })

  } catch (error) {
    console.error('Parse error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
