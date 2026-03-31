'use client'

import { useState, useEffect } from 'react'
import { loadData, saveData } from '../lib/storage'

// ─── THEME ───────────────────────────────────────────────────────────────────
const C = {
  navy: '#0f1f3d', navyL: '#162847',
  gold: '#c8a84b',
  cream: '#f5f0e8', white: '#ffffff',
  green: '#1e6b44', greenL: '#d4edda',
  red: '#8b1f1f', redL: '#fde8e8',
  amber: '#b8860b', amberL: '#fff8e1',
  gray: '#6b7280', grayL: '#e8eaef', grayLL: '#f7f8fa',
}
const mono = "'Courier New', monospace"
const serif = "'Georgia', 'Times New Roman', serif"

// ─── UTILS ───────────────────────────────────────────────────────────────────
const fmt = (n) => {
  const v = parseFloat(String(n ?? 0).replace(/,/g, '')) || 0
  const a = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return v < 0 ? `($${a})` : `$${a}`
}
const num = (v) => parseFloat(String(v ?? 0).replace(/,/g, '')) || 0
const uid = () => Math.random().toString(36).slice(2, 9)
const todayStr = () => new Date().toISOString().slice(0, 10)

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function SHead({ title, amount, children }) {
  return (
    <div style={{ background: C.navy, padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.gold, fontWeight: 'bold', fontFamily: serif }}>{title}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {children}
        {amount !== undefined && <span style={{ fontFamily: mono, fontSize: 14, color: C.white, fontWeight: 'bold' }}>{fmt(amount)}</span>}
      </div>
    </div>
  )
}

function Row({ label, amount, indent, bold, sub, bg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 18px', borderBottom: `1px solid ${C.grayL}`, background: bg || C.white, paddingLeft: indent ? 36 : 18 }}>
      <span style={{ fontSize: 13, fontFamily: serif, fontWeight: bold ? 'bold' : 'normal' }}>
        {label}{sub && <span style={{ fontSize: 11, color: C.gray, marginLeft: 8 }}>{sub}</span>}
      </span>
      <span style={{ fontFamily: mono, fontSize: 13, fontWeight: bold ? 'bold' : 'normal', color: num(amount) < 0 ? C.red : C.navy }}>{fmt(amount)}</span>
    </div>
  )
}

function TRow({ label, amount, green, red }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', background: green ? C.green : red ? C.red : C.navyL, color: C.white, fontWeight: 'bold' }}>
      <span style={{ fontFamily: serif, fontSize: 13 }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 14, color: green || red ? C.white : C.gold }}>{fmt(amount)}</span>
    </div>
  )
}

function Inp({ value, onChange, type = 'text', placeholder, small }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ border: `1px solid ${C.grayL}`, borderRadius: 3, padding: small ? '5px 8px' : '8px 10px', fontSize: small ? 12 : 13, fontFamily: type === 'number' ? mono : serif, color: C.navy, background: C.white, width: '100%', boxSizing: 'border-box' }}
    />
  )
}

function Btn({ onClick, children, variant = 'primary', small, disabled, type = 'button' }) {
  const styles = {
    primary: { background: C.gold, color: C.navy, border: 'none' },
    secondary: { background: 'transparent', color: C.navy, border: `1.5px solid ${C.navy}` },
    danger: { background: C.red, color: C.white, border: 'none' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ borderRadius: 3, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: serif, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', padding: small ? '8px 18px' : '11px 24px', fontSize: small ? 11 : 13, opacity: disabled ? 0.5 : 1, ...styles[variant] }}
    >
      {children}
    </button>
  )
}

function Pill({ green, red, amber, children }) {
  const bg = green ? C.greenL : red ? C.redL : amber ? C.amberL : C.grayL
  const color = green ? C.green : red ? C.red : amber ? C.amber : C.gray
  return <span style={{ background: bg, color, fontSize: 10, padding: '2px 8px', borderRadius: 2, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 'bold', fontFamily: serif }}>{children}</span>
}

const TABS = ['Upload', 'Reconciliation', 'Checks', 'Deposits in Transit', 'Adjustments', 'Transactions', 'Print']

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function BankRecon() {
  const [tab, setTab] = useState(0)
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parseLog, setParseLog] = useState('')
  const [parseError, setParseError] = useState(null)

  const [stmt, setStmt] = useState(null)
  const [glBegin, setGlBegin] = useState('')
  const [glEnd, setGlEnd] = useState('')
  const [currentPeriod, setCurrentPeriod] = useState('')

  const [outChecks, setOutChecks] = useState([])
  const [newCk, setNewCk] = useState({ check_number: '', date: todayStr(), payee: '', amount: '', notes: '' })
  const [transitDeps, setTransitDeps] = useState([])
  const [newDep, setNewDep] = useState({ date: todayStr(), description: '', amount: '' })
  const [bankAdj, setBankAdj] = useState([])
  const [bookAdj, setBookAdj] = useState([])
  const [newBA, setNewBA] = useState({ type: 'less', description: '', amount: '', gl_code: '' })
  const [newBkA, setNewBkA] = useState({ type: 'less', description: '', amount: '', gl_code: '' })

  // Load from localStorage
  useEffect(() => {
    const s = loadData()
    if (!s) return
    if (s.outChecks) setOutChecks(s.outChecks)
    if (s.transitDeps) setTransitDeps(s.transitDeps)
    if (s.bankAdj) setBankAdj(s.bankAdj)
    if (s.bookAdj) setBookAdj(s.bookAdj)
    if (s.glBegin) setGlBegin(s.glBegin)
    if (s.glEnd) setGlEnd(s.glEnd)
    if (s.currentPeriod) setCurrentPeriod(s.currentPeriod)
  }, [])

  // Save to localStorage
  useEffect(() => {
    saveData({ outChecks, transitDeps, bankAdj, bookAdj, glBegin, glEnd, currentPeriod })
  }, [outChecks, transitDeps, bankAdj, bookAdj, glBegin, glEnd, currentPeriod])

  // ── FILE HANDLING ──
  const fileLabel = (f) => {
    if (!f) return ''
    if (f.type === 'application/pdf') return 'PDF'
    if (f.name.match(/\.xlsx?$/i) || f.type.includes('sheet') || f.type.includes('excel')) return 'Excel'
    if (f.name.endsWith('.csv') || f.type === 'text/csv') return 'CSV'
    if (f.type.startsWith('image/')) return 'Image'
    return 'File'
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setParseError(null); setParseLog('') }
  }

  // ── PARSE ──
  const parse = async () => {
    if (!file) return
    setParsing(true)
    setParseError(null)
    setParseLog('Uploading file...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      setParseLog('AI is reading your statement...')
      const resp = await fetch('/api/parse', { method: 'POST', body: formData })
      const json = await resp.json()
      if (json.error) throw new Error(json.error)
      const parsed = json.data
      setStmt(parsed)
      if (parsed.period) setCurrentPeriod(parsed.period)
      // Auto-clear outstanding checks found in this statement
      const cleared = new Set((parsed.checks || []).map(c => String(c.check_number)))
      setOutChecks(prev => prev.map(c =>
        cleared.has(String(c.check_number)) && c.status === 'outstanding'
          ? { ...c, status: 'cleared', cleared_date: parsed.period_end }
          : c
      ))
      setParseLog('')
      setTab(1)
    } catch (e) {
      setParseError('Error: ' + e.message)
      setParseLog('')
    }
    setParsing(false)
  }

  // ── RECON MATH ──
  const outTotal = outChecks.filter(c => c.status === 'outstanding').reduce((s, c) => s + num(c.amount), 0)
  const transitTotal = transitDeps.filter(d => d.status === 'transit').reduce((s, d) => s + num(d.amount), 0)
  const bAAdd = bankAdj.filter(a => a.type === 'add').reduce((s, a) => s + num(a.amount), 0)
  const bALess = bankAdj.filter(a => a.type === 'less').reduce((s, a) => s + num(a.amount), 0)
  const bkAAdd = bookAdj.filter(a => a.type === 'add').reduce((s, a) => s + num(a.amount), 0)
  const bkALess = bookAdj.filter(a => a.type === 'less').reduce((s, a) => s + num(a.amount), 0)
  const adjBank = num(stmt?.ending_balance_bank) + transitTotal - outTotal + bAAdd - bALess
  const adjBook = num(glEnd) + bkAAdd - bkALess
  const variance = adjBank - adjBook
  const reconciled = Math.abs(variance) < 0.05

  // ── ACTIONS ──
  const addCk = () => {
    if (!newCk.check_number || !newCk.amount) return
    setOutChecks(p => [...p, { ...newCk, id: uid(), period: currentPeriod, status: 'outstanding', cleared_date: '' }])
    setNewCk({ check_number: '', date: todayStr(), payee: '', amount: '', notes: '' })
  }
  const updCk = (id, f, v) => setOutChecks(p => p.map(c => c.id === id ? { ...c, [f]: v } : c))

  const addDep = () => {
    if (!newDep.description || !newDep.amount) return
    setTransitDeps(p => [...p, { ...newDep, id: uid(), period: currentPeriod, status: 'transit' }])
    setNewDep({ date: todayStr(), description: '', amount: '' })
  }
  const updDep = (id, f, v) => setTransitDeps(p => p.map(d => d.id === id ? { ...d, [f]: v } : d))

  const addBA = () => {
    if (!newBA.description || !newBA.amount) return
    setBankAdj(p => [...p, { ...newBA, id: uid() }])
    setNewBA({ type: 'less', description: '', amount: '', gl_code: '' })
  }
  const addBkA = () => {
    if (!newBkA.description || !newBkA.amount) return
    setBookAdj(p => [...p, { ...newBkA, id: uid() }])
    setNewBkA({ type: 'less', description: '', amount: '', gl_code: '' })
  }

  // ── EXPORT ──
  const exportCSV = () => {
    if (!stmt) return
    const rows = [
      ['BANK RECONCILIATION', stmt.entity, stmt.period], ['Prepared', todayStr()], [],
      ['BANK SIDE'], ['Balance per Bank', stmt.ending_balance_bank],
      ['Add Deposits in Transit', transitTotal], ['Less Outstanding Checks', -outTotal],
      ['Adjusted Bank Balance', adjBank], [],
      ['BOOK SIDE'], ['Balance per GL', num(glEnd)], ['Adjusted Book Balance', adjBook], [],
      ['VARIANCE', variance], [],
      ['OUTSTANDING CHECKS'], ['Check #', 'Date', 'Payee', 'Amount', 'Status'],
      ...outChecks.map(c => [c.check_number, c.date, c.payee, c.amount, c.status]),
      [], ['DEPOSITS IN TRANSIT'], ['Date', 'Description', 'Amount'],
      ...transitDeps.map(d => [d.date, d.description, d.amount]),
      [], ['CHECKS CLEARED THIS PERIOD'], ['Date', 'Check #', 'Amount'],
      ...(stmt.checks || []).map(c => [c.date, c.check_number, c.amount]),
      [], ['DEPOSITS'], ['Date', 'Description', 'Amount'],
      ...(stmt.deposits || []).map(d => [d.date, d.description, d.amount]),
      [], ['PAYROLL'], ['Date', 'Description', 'Amount'],
      ...(stmt.payroll_direct_deposits || []).map(d => [d.date, d.description, d.amount]),
      [], ['ACH DEDUCTIONS'], ['Date', 'Description', 'Amount'],
      ...(stmt.ach_deductions || []).map(d => [d.date, d.description, d.amount]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v ?? '')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `BankRecon_${(stmt.period || '').replace(/\s/g, '_')}.csv`
    a.click()
  }

  const txSecs = [
    { t: 'Deposits', k: 'deposits', tot: 'total_deposits' },
    { t: 'ACH Additions', k: 'ach_additions', tot: 'total_ach_additions' },
    { t: 'Loan / LOC Proceeds', k: 'loan_proceeds', tot: 'total_loan_proceeds' },
    { t: 'Internal Transfers In', k: 'internal_transfers_in' },
    { t: 'Settlement Payments', k: 'settlement_payments' },
    { t: 'Payroll Direct Deposits', k: 'payroll_direct_deposits' },
    { t: 'Tax Payments', k: 'tax_payments' },
    { t: 'ACH Deductions', k: 'ach_deductions', tot: 'total_ach_deductions' },
    { t: 'Wire Transfers', k: 'wire_transfers' },
    { t: 'Internal Transfers Out', k: 'internal_transfers_out' },
    { t: 'Other Deductions', k: 'other_deductions', tot: 'total_other_deductions' },
    { t: 'NSF Items', k: 'nsf_items' },
  ]

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: serif, background: C.cream, minHeight: '100vh', color: C.navy }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: 2px solid ${C.gold}; outline-offset: 1px; }
        @media print { .np { display: none !important; } }
      `}</style>

      {/* ── HEADER ── */}
      <div className="np" style={{ background: C.navy, borderBottom: `4px solid ${C.gold}`, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: C.gold, fontWeight: 'bold', marginBottom: 2 }}>
              Future Care / Bay Manor · Operating Account
            </div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: C.cream }}>Bank Reconciliation</div>
            {stmt && <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>{stmt.entity} · Acct {stmt.account_number} · {stmt.period}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {stmt && reconciled && <span style={{ background: C.green, color: C.white, padding: '4px 10px', borderRadius: 3, fontSize: 11, fontWeight: 'bold' }}>✓ RECONCILED</span>}
            {stmt && !reconciled && glEnd && <span style={{ background: C.red, color: C.white, padding: '4px 10px', borderRadius: 3, fontSize: 11, fontWeight: 'bold' }}>⚠ VARIANCE {fmt(variance)}</span>}
            {stmt && <Btn onClick={exportCSV} small>Export CSV</Btn>}
            {stmt && <Btn onClick={() => window.print()} small variant="secondary">Print</Btn>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 2 }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ background: tab === i ? C.gold : 'transparent', color: tab === i ? C.navy : C.gray, border: 'none', cursor: 'pointer', padding: '7px 12px', borderRadius: '3px 3px 0 0', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', fontFamily: serif, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t}
              {i === 2 && outChecks.filter(c => c.status === 'outstanding').length > 0 && (
                <span style={{ background: C.red, color: C.white, borderRadius: '50%', padding: '0 5px', fontSize: 9, marginLeft: 4 }}>
                  {outChecks.filter(c => c.status === 'outstanding').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── TAB 0: UPLOAD ── */}
        {tab === 0 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[['📄', 'PDF'], ['📊', 'Excel'], ['📋', 'CSV'], ['🖼️', 'Image']].map(([icon, label]) => (
                <div key={label} style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>{icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.white, border: `2px solid ${C.gold}`, borderRadius: 6, padding: '32px 24px', textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⬆️</div>
              <label htmlFor="stmtfile" style={{ display: 'inline-block', background: C.gold, color: C.navy, fontFamily: serif, fontWeight: 'bold', fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', padding: '13px 32px', borderRadius: 4, cursor: 'pointer', marginBottom: 14, userSelect: 'none' }}>
                {file ? 'Change File' : 'Choose File'}
              </label>
              <input
                id="stmtfile"
                type="file"
                accept=".pdf,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
              />
              {file ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: C.navy }}>✓ {file.name}</div>
                  <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{fileLabel(file)} · {(file.size / 1024).toFixed(0)} KB</div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.gray }}>PDF, Excel, CSV, or image of a bank statement</div>
              )}
            </div>

            {file && !parsing && (
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <Btn onClick={parse}>Parse with AI →</Btn>
              </div>
            )}

            {parsing && (
              <div style={{ background: C.navy, borderRadius: 4, padding: 32, textAlign: 'center', marginBottom: 14 }}>
                <div style={{ display: 'inline-block', width: 30, height: 30, border: `3px solid ${C.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: C.cream, fontSize: 13, marginTop: 12 }}>{parseLog || 'Processing...'}</div>
              </div>
            )}

            {parseError && (
              <div style={{ background: C.redL, border: `1px solid ${C.red}`, borderRadius: 4, padding: '12px 16px', color: C.red, fontSize: 13, marginBottom: 14 }}>
                ⚠ {parseError}
              </div>
            )}

            {stmt && !parsing && (
              <div style={{ background: C.greenL, border: `1px solid ${C.green}`, borderRadius: 4, padding: '12px 16px', fontSize: 13, color: C.green, marginBottom: 14 }}>
                ✓ Parsed <strong>{stmt.period}</strong> —{' '}
                <button onClick={() => setTab(1)} style={{ background: 'none', border: 'none', color: C.green, cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', fontSize: 13 }}>
                  Go to Reconciliation →
                </button>
              </div>
            )}

            <div style={{ background: C.amberL, border: `1px solid ${C.amber}`, borderRadius: 4, padding: '12px 16px', fontSize: 12, color: C.amber }}>
              <strong>How it works:</strong> Choose your file → Parse with AI → enter G/L ending balance on the Reconciliation tab → add outstanding checks → done. All data persists between sessions.
            </div>
          </div>
        )}

        {/* ── TAB 1: RECONCILIATION ── */}
        {tab === 1 && (
          <div>
            <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
              <SHead title="G/L Balances — Enter Manually" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 14 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Period</div>
                  <Inp value={currentPeriod} onChange={setCurrentPeriod} placeholder="e.g. February 2026" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>G/L Beginning Balance</div>
                  <Inp type="number" value={glBegin} onChange={setGlBegin} placeholder="0.00" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>G/L Ending Balance</div>
                  <Inp type="number" value={glEnd} onChange={setGlEnd} placeholder="0.00" />
                </div>
              </div>
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <SHead title="Bank Side" amount={adjBank} />
              <Row label="Balance per Bank Statement" amount={stmt?.ending_balance_bank ?? 0} bold />
              <div style={{ padding: '4px 18px 2px', fontSize: 10, color: C.gray, letterSpacing: 1, textTransform: 'uppercase', background: C.grayLL }}>Add</div>
              <Row label="Deposits in Transit" amount={transitTotal} indent sub={`(${transitDeps.filter(d => d.status === 'transit').length} items)`} />
              {bankAdj.filter(a => a.type === 'add').map(a => <Row key={a.id} label={a.description} amount={a.amount} indent sub={a.gl_code} />)}
              <div style={{ padding: '4px 18px 2px', fontSize: 10, color: C.gray, letterSpacing: 1, textTransform: 'uppercase', background: C.grayLL }}>Less</div>
              <Row label="Outstanding Checks" amount={-outTotal} indent sub={`(${outChecks.filter(c => c.status === 'outstanding').length} checks)`} />
              {bankAdj.filter(a => a.type === 'less').map(a => <Row key={a.id} label={a.description} amount={-num(a.amount)} indent sub={a.gl_code} />)}
              <TRow label="Adjusted Bank Balance" amount={adjBank} />
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <SHead title="Book Side (G/L)" amount={adjBook} />
              <Row label="Balance per General Ledger" amount={num(glEnd)} bold />
              {bookAdj.filter(a => a.type === 'add').map(a => <Row key={a.id} label={a.description} amount={a.amount} indent sub={a.gl_code} />)}
              {bookAdj.filter(a => a.type === 'less').map(a => <Row key={a.id} label={a.description} amount={-num(a.amount)} indent sub={a.gl_code} />)}
              {bookAdj.length === 0 && <div style={{ padding: '16px 18px', fontSize: 13, color: C.gray, textAlign: 'center' }}>No book adjustments</div>}
              <TRow label="Adjusted Book Balance" amount={adjBook} />
            </div>

            <div style={{ borderRadius: 4, overflow: 'hidden', border: `2px solid ${reconciled ? C.green : C.red}`, marginBottom: 16 }}>
              <div style={{ background: reconciled ? C.green : C.red, color: C.white, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{reconciled ? '✓ Fully Reconciled' : '⚠ Variance — Investigate'}</div>
                <div style={{ fontFamily: mono, fontSize: 15 }}>{fmt(adjBank)} vs {fmt(adjBook)}</div>
              </div>
            </div>

            {stmt ? (
              <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, overflow: 'hidden' }}>
                <SHead title="Statement Summary" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {[
                    { l: 'Beginning Bal', v: stmt.beginning_balance_bank },
                    { l: 'Total Additions', v: stmt.total_additions },
                    { l: 'Total Deductions', v: stmt.total_deductions },
                    { l: 'Ending Bal (Bank)', v: stmt.ending_balance_bank },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderRight: i % 2 === 0 ? `1px solid ${C.grayL}` : 'none', borderBottom: i < 2 ? `1px solid ${C.grayL}` : 'none' }}>
                      <div style={{ fontSize: 10, color: C.gray, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>{item.l}</div>
                      <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 'bold' }}>{fmt(item.v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, padding: 28, textAlign: 'center', color: C.gray }}>
                <button onClick={() => setTab(0)} style={{ background: 'none', border: 'none', color: C.gold, cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', fontSize: 14 }}>Upload a statement</button> to populate bank-side data.
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CHECKS ── */}
        {tab === 2 && (
          <div>
            <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
              <SHead title="Add Outstanding Check" />
              <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Check #</div>
                  <Inp value={newCk.check_number} onChange={v => setNewCk(p => ({ ...p, check_number: v }))} placeholder="1057xxx" small />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Date</div>
                  <Inp type="date" value={newCk.date} onChange={v => setNewCk(p => ({ ...p, date: v }))} small />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Payee</div>
                  <Inp value={newCk.payee} onChange={v => setNewCk(p => ({ ...p, payee: v }))} placeholder="Payee name" small />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Amount</div>
                  <Inp type="number" value={newCk.amount} onChange={v => setNewCk(p => ({ ...p, amount: v }))} placeholder="0.00" small />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Notes</div>
                  <Inp value={newCk.notes} onChange={v => setNewCk(p => ({ ...p, notes: v }))} placeholder="Optional" small />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <Btn onClick={addCk} small>Add Check</Btn>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { l: 'Outstanding', v: outChecks.filter(c => c.status === 'outstanding').length, c: C.red },
                { l: '$ Outstanding', v: fmt(outTotal), c: C.red },
                { l: 'Cleared', v: outChecks.filter(c => c.status === 'cleared').length, c: C.green },
                { l: 'Voided', v: outChecks.filter(c => c.status === 'voided').length, c: C.amber },
              ].map((s, i) => (
                <div key={i} style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: C.gray, textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
                  <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 'bold', color: s.c, marginTop: 3 }}>{s.v}</div>
                </div>
              ))}
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, overflow: 'hidden' }}>
              <SHead title={`All Checks (${outChecks.length})`} amount={outTotal} />
              {outChecks.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: C.gray, fontSize: 14 }}>No checks recorded. Add above or upload a statement — cleared checks are auto-detected.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 560 }}>
                    <thead>
                      <tr style={{ background: C.navyL }}>
                        {['Check #', 'Date', 'Payee', 'Amount', 'Status', 'Notes', ''].map((h, i) => (
                          <th key={i} style={{ padding: '7px 10px', textAlign: i >= 3 ? 'right' : 'left', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.gold, fontFamily: serif, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {outChecks.sort((a, b) => a.status === 'outstanding' ? -1 : 1).map((c, i) => (
                        <tr key={c.id} style={{ background: i % 2 === 0 ? C.white : C.grayLL }}>
                          <td style={{ padding: '7px 10px', fontFamily: mono, whiteSpace: 'nowrap' }}>{c.check_number}</td>
                          <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{c.date}</td>
                          <td style={{ padding: '7px 10px' }}>{c.payee}</td>
                          <td style={{ padding: '7px 10px', fontFamily: mono, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(c.amount)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                            <select value={c.status} onChange={e => updCk(c.id, 'status', e.target.value)} style={{ border: `1px solid ${C.grayL}`, borderRadius: 2, padding: '3px 5px', fontSize: 11, background: c.status === 'outstanding' ? C.redL : c.status === 'cleared' ? C.greenL : C.amberL, color: c.status === 'outstanding' ? C.red : c.status === 'cleared' ? C.green : C.amber }}>
                              <option value="outstanding">Outstanding</option>
                              <option value="cleared">Cleared</option>
                              <option value="voided">Voided</option>
                            </select>
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            <input value={c.notes || ''} onChange={e => updCk(c.id, 'notes', e.target.value)} placeholder="—" style={{ border: `1px solid ${C.grayL}`, borderRadius: 2, padding: '3px 5px', fontSize: 11, width: 90 }} />
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            <button onClick={() => setOutChecks(p => p.filter(x => x.id !== c.id))} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14 }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: DEPOSITS IN TRANSIT ── */}
        {tab === 3 && (
          <div>
            <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
              <SHead title="Add Deposit in Transit" />
              <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Date</div>
                  <Inp type="date" value={newDep.date} onChange={v => setNewDep(p => ({ ...p, date: v }))} small />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Amount</div>
                  <Inp type="number" value={newDep.amount} onChange={v => setNewDep(p => ({ ...p, amount: v }))} placeholder="0.00" small />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, color: C.gray, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Description</div>
                  <Inp value={newDep.description} onChange={v => setNewDep(p => ({ ...p, description: v }))} placeholder="Description" small />
                </div>
                <div style={{ gridColumn: '1/-1' }}><Btn onClick={addDep} small>Add Deposit</Btn></div>
              </div>
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, overflow: 'hidden' }}>
              <SHead title={`Deposits in Transit (${transitDeps.filter(d => d.status === 'transit').length} active)`} amount={transitTotal} />
              {transitDeps.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: C.gray, fontSize: 14 }}>No deposits in transit.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.navyL }}>
                      {['Date', 'Description', 'Amount', 'Status', ''].map((h, i) => (
                        <th key={i} style={{ padding: '7px 12px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.gold, fontFamily: serif }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transitDeps.map((d, i) => (
                      <tr key={d.id} style={{ background: i % 2 === 0 ? C.white : C.grayLL }}>
                        <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{d.date}</td>
                        <td style={{ padding: '7px 12px' }}>{d.description}</td>
                        <td style={{ padding: '7px 12px', fontFamily: mono, textAlign: 'right' }}>{fmt(d.amount)}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right' }}>
                          <select value={d.status} onChange={e => updDep(d.id, 'status', e.target.value)} style={{ border: `1px solid ${C.grayL}`, borderRadius: 2, padding: '3px 5px', fontSize: 11, background: d.status === 'transit' ? C.amberL : C.greenL, color: d.status === 'transit' ? C.amber : C.green }}>
                            <option value="transit">In Transit</option>
                            <option value="cleared">Cleared</option>
                          </select>
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <button onClick={() => setTransitDeps(p => p.filter(x => x.id !== d.id))} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: ADJUSTMENTS ── */}
        {tab === 4 && (
          <div>
            {[
              { title: 'Bank-Side Adjustments', hint: 'Items on bank statement not yet in G/L (bank charges, NSF, interest)', adj: bankAdj, setAdj: setBankAdj, newAdj: newBA, setNew: setNewBA, add: addBA, net: bAAdd - bALess },
              { title: 'Book-Side Adjustments', hint: 'Items in G/L not yet on bank statement (timing differences, errors)', adj: bookAdj, setAdj: setBookAdj, newAdj: newBkA, setNew: setNewBkA, add: addBkA, net: bkAAdd - bkALess },
            ].map((sec, si) => (
              <div key={si} style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
                <SHead title={sec.title} />
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.gray, marginBottom: 10 }}>{sec.hint}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginBottom: 8 }}>
                    <select value={sec.newAdj.type} onChange={e => sec.setNew(p => ({ ...p, type: e.target.value }))} style={{ border: `1px solid ${C.grayL}`, borderRadius: 3, padding: '8px 6px', fontSize: 12, fontFamily: serif }}>
                      <option value="add">Add</option>
                      <option value="less">Less</option>
                    </select>
                    <Inp value={sec.newAdj.description} onChange={v => sec.setNew(p => ({ ...p, description: v }))} placeholder="Description" small />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <Inp type="number" value={sec.newAdj.amount} onChange={v => sec.setNew(p => ({ ...p, amount: v }))} placeholder="Amount" small />
                    <Inp value={sec.newAdj.gl_code} onChange={v => sec.setNew(p => ({ ...p, gl_code: v }))} placeholder="GL Code" small />
                  </div>
                  <Btn onClick={sec.add} small>Add Adjustment</Btn>
                </div>
                {sec.adj.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderTop: `1px solid ${C.grayL}`, background: i % 2 === 0 ? C.white : C.grayLL }}>
                    <div>
                      <span style={{ background: a.type === 'add' ? C.greenL : C.redL, color: a.type === 'add' ? C.green : C.red, fontSize: 10, padding: '2px 6px', borderRadius: 2, fontWeight: 'bold', textTransform: 'uppercase' }}>{a.type}</span>
                      <span style={{ fontSize: 13, marginLeft: 8 }}>{a.description}</span>
                      {a.gl_code && <span style={{ fontSize: 11, color: C.gray, marginLeft: 6 }}>{a.gl_code}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: mono, fontSize: 13, color: a.type === 'add' ? C.green : C.red }}>{fmt(a.amount)}</span>
                      <button onClick={() => sec.setAdj(p => p.filter(x => x.id !== a.id))} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                  </div>
                ))}
                {sec.adj.length > 0 && <TRow label="Net Adjustment" amount={sec.net} />}
              </div>
            ))}

            <div style={{ background: C.amberL, border: `1px solid ${C.amber}`, borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', color: C.amber, marginBottom: 10 }}>Quick Add</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { l: 'Bank Service Charge', t: 'less', s: 0 }, { l: 'Interest Earned', t: 'add', s: 0 },
                  { l: 'NSF Check', t: 'less', s: 0 }, { l: 'Wire Fee', t: 'less', s: 0 },
                  { l: 'Returned Item', t: 'less', s: 0 }, { l: 'Unrecorded Deposit', t: 'add', s: 1 },
                  { l: 'Unrecorded Payment', t: 'less', s: 1 }, { l: 'Error (Add)', t: 'add', s: 1 },
                  { l: 'Error (Less)', t: 'less', s: 1 },
                ].map((item, i) => (
                  <button key={i}
                    onClick={() => item.s === 0 ? setNewBA(p => ({ ...p, type: item.t, description: item.l })) : setNewBkA(p => ({ ...p, type: item.t, description: item.l }))}
                    style={{ background: C.white, border: `1px solid ${C.amber}`, borderRadius: 3, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontFamily: serif, color: C.amber, fontWeight: 'bold' }}>
                    {item.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: TRANSACTIONS ── */}
        {tab === 5 && (
          <div>
            {!stmt ? (
              <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, padding: 36, textAlign: 'center', color: C.gray }}>Upload a statement first.</div>
            ) : (
              <>
                {txSecs.filter(s => (stmt[s.k] || []).length > 0).map(sec => (
                  <div key={sec.k} style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                    <SHead title={sec.t} amount={sec.tot ? stmt[sec.tot] : (stmt[sec.k] || []).reduce((s, x) => s + num(x.amount), 0)} />
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 360 }}>
                        <thead>
                          <tr style={{ background: C.navyL }}>
                            <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.gold, width: 65 }}>Date</th>
                            {sec.k === 'checks' && <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.gold }}>Check #</th>}
                            <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.gold }}>Description</th>
                            <th style={{ padding: '6px 12px', textAlign: 'right', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.gold }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(stmt[sec.k] || []).map((item, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.grayLL }}>
                              <td style={{ padding: '5px 12px', fontFamily: mono, fontSize: 11, whiteSpace: 'nowrap' }}>{item.date}</td>
                              {sec.k === 'checks' && <td style={{ padding: '5px 12px', fontFamily: mono, whiteSpace: 'nowrap' }}>{item.check_number}</td>}
                              <td style={{ padding: '5px 12px' }}>{item.description || '—'}</td>
                              <td style={{ padding: '5px 12px', fontFamily: mono, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                {stmt.notes && <div style={{ background: C.amberL, border: `1px solid ${C.amber}`, borderRadius: 4, padding: '10px 14px', fontSize: 13, marginTop: 8 }}><strong>AI Notes:</strong> {stmt.notes}</div>}
                {stmt.check_gaps && <div style={{ background: C.redL, border: `1px solid ${C.red}`, borderRadius: 4, padding: '10px 14px', fontSize: 13, marginTop: 8, color: C.red }}><strong>Check Gaps:</strong> {stmt.check_gaps}</div>}
              </>
            )}
          </div>
        )}

        {/* ── TAB 6: PRINT ── */}
        {tab === 6 && (
          <div>
            <div className="np" style={{ marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Btn onClick={() => window.print()}>Print / Save PDF</Btn>
              {stmt && <Btn onClick={exportCSV} variant="secondary">Export CSV</Btn>}
            </div>

            <div style={{ background: C.white, border: `1px solid ${C.grayL}`, borderRadius: 4, padding: '32px 40px', fontSize: 13 }}>
              <div style={{ textAlign: 'center', borderBottom: `2px solid ${C.navy}`, paddingBottom: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>{stmt?.entity || 'Bay Manor Nursing Home, Inc.'}</div>
                <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>dba Future Care Chesapeake — Operating Account</div>
                <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Bank Reconciliation</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Period: {currentPeriod || '_______________'} · Account: {stmt?.account_number ? `xxxx-${stmt.account_number}` : '_____'}</div>
                <div style={{ fontSize: 11, color: C.gray, marginTop: 3 }}>Prepared: {todayStr()}</div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', borderBottom: `1px solid ${C.navy}`, paddingBottom: 4, marginBottom: 10 }}>Bank Side</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span>Balance per Bank Statement</span><span style={{ fontFamily: mono }}>{fmt(stmt?.ending_balance_bank ?? 0)}</span></div>
                {transitDeps.filter(d => d.status === 'transit').length > 0 && <>
                  <div style={{ fontSize: 11, fontStyle: 'italic', color: C.gray, marginBottom: 3 }}>Add: Deposits in Transit</div>
                  {transitDeps.filter(d => d.status === 'transit').map(d => <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16, fontSize: 12, marginBottom: 2 }}><span>{d.date} — {d.description}</span><span style={{ fontFamily: mono }}>{fmt(d.amount)}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16, fontSize: 12, borderTop: `1px dashed ${C.grayL}`, marginTop: 3, paddingTop: 3 }}><span><em>Subtotal</em></span><span style={{ fontFamily: mono }}>{fmt(transitTotal)}</span></div>
                </>}
                {outChecks.filter(c => c.status === 'outstanding').length > 0 && <>
                  <div style={{ fontSize: 11, fontStyle: 'italic', color: C.gray, marginTop: 6, marginBottom: 3 }}>Less: Outstanding Checks</div>
                  {outChecks.filter(c => c.status === 'outstanding').map(c => <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16, fontSize: 12, marginBottom: 2 }}><span>#{c.check_number} — {c.payee} ({c.date})</span><span style={{ fontFamily: mono }}>({fmt(c.amount)})</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16, fontSize: 12, borderTop: `1px dashed ${C.grayL}`, marginTop: 3, paddingTop: 3 }}><span><em>Subtotal</em></span><span style={{ fontFamily: mono }}>({fmt(outTotal)})</span></div>
                </>}
                {bankAdj.map(a => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16, fontSize: 12, marginBottom: 2 }}><span>{a.type === 'add' ? 'Add' : 'Less'}: {a.description}</span><span style={{ fontFamily: mono }}>{fmt(a.amount)}</span></div>)}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: `1px solid ${C.navy}`, marginTop: 10, paddingTop: 7, fontSize: 14 }}><span>Adjusted Bank Balance</span><span style={{ fontFamily: mono }}>{fmt(adjBank)}</span></div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', borderBottom: `1px solid ${C.navy}`, paddingBottom: 4, marginBottom: 10 }}>Book Side (G/L)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span>Balance per General Ledger</span><span style={{ fontFamily: mono }}>{fmt(num(glEnd))}</span></div>
                {bookAdj.map(a => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16, fontSize: 12, marginBottom: 2 }}><span>{a.type === 'add' ? 'Add' : 'Less'}: {a.description}{a.gl_code ? ` (${a.gl_code})` : ''}</span><span style={{ fontFamily: mono }}>{fmt(a.amount)}</span></div>)}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: `1px solid ${C.navy}`, marginTop: 10, paddingTop: 7, fontSize: 14 }}><span>Adjusted Book Balance</span><span style={{ fontFamily: mono }}>{fmt(adjBook)}</span></div>
              </div>

              <div style={{ background: reconciled ? C.greenL : C.redL, border: `1px solid ${reconciled ? C.green : C.red}`, borderRadius: 3, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
                <span style={{ fontWeight: 'bold', color: reconciled ? C.green : C.red, fontSize: 14 }}>{reconciled ? '✓ RECONCILED' : '⚠ VARIANCE — INVESTIGATE'}</span>
                <span style={{ fontFamily: mono, fontWeight: 'bold', color: reconciled ? C.green : C.red, fontSize: 14 }}>{fmt(Math.abs(variance))}</span>
              </div>

              {outChecks.filter(c => c.status === 'outstanding').length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', borderBottom: `1px solid ${C.navy}`, paddingBottom: 4, marginBottom: 10 }}>Schedule of Outstanding Checks</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>{['Check #', 'Date', 'Payee', 'Amount', 'Notes'].map((h, i) => <th key={i} style={{ borderBottom: `1px solid ${C.navy}`, padding: '4px 8px', textAlign: i >= 3 ? 'right' : 'left', fontSize: 11 }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {outChecks.filter(c => c.status === 'outstanding').map((c, i) => (
                        <tr key={c.id} style={{ background: i % 2 === 0 ? C.white : '#fafafa' }}>
                          <td style={{ padding: '4px 8px', fontFamily: mono }}>{c.check_number}</td>
                          <td style={{ padding: '4px 8px' }}>{c.date}</td>
                          <td style={{ padding: '4px 8px' }}>{c.payee}</td>
                          <td style={{ padding: '4px 8px', fontFamily: mono, textAlign: 'right' }}>{fmt(c.amount)}</td>
                          <td style={{ padding: '4px 8px', fontSize: 11, color: C.gray }}>{c.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ padding: '5px 8px', fontWeight: 'bold', borderTop: `1px solid ${C.navy}`, fontSize: 12 }}>Total Outstanding</td>
                        <td colSpan={2} style={{ padding: '5px 8px', fontFamily: mono, fontWeight: 'bold', textAlign: 'right', borderTop: `1px solid ${C.navy}`, fontSize: 12 }}>{fmt(outTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 40 }}>
                <div><div style={{ borderTop: `1px solid ${C.navy}`, paddingTop: 6, fontSize: 12 }}>Prepared by</div><div style={{ marginTop: 4, fontSize: 11, color: C.gray }}>Date: _______________</div></div>
                <div><div style={{ borderTop: `1px solid ${C.navy}`, paddingTop: 6, fontSize: 12 }}>Reviewed / Approved by</div><div style={{ marginTop: 4, fontSize: 11, color: C.gray }}>Date: _______________</div></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
