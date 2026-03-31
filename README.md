# BankRecon — Future Care / Bay Manor

Bank reconciliation system. Upload a bank statement (PDF, Excel, CSV, or image) → AI extracts every transaction → reconcile against G/L.

## Local Setup

```bash
npm install
cp .env.local.example .env.local
# Add your Anthropic API key to .env.local
npm run dev
```

Open http://localhost:3000

## Deploy to Railway via GitHub

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub repo
3. Select this repo
4. Go to Variables → add:
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```
5. Railway auto-detects Next.js and deploys. Done.

## File Support

| Format | How it works |
|--------|-------------|
| PDF | Sent directly to Claude as a document |
| Excel (XLS/XLSX) | Parsed server-side with SheetJS, converted to text |
| CSV | Read as text |
| Image (JPG/PNG) | Sent to Claude as an image — works for photos of paper statements |

## Features

- AI parses every transaction and categorizes it
- Full two-sided bank reconciliation (bank side vs. G/L)
- Outstanding check tracker — carries forward month to month, auto-clears when statement is uploaded
- Deposits in transit tracker
- Bank-side and book-side adjustments with GL codes
- Full transaction detail by category
- Print-ready report with signature lines
- CSV export
- Data persists in browser localStorage between sessions
