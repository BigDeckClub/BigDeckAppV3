---
description: Run the local development server
---

# Run Local Development Server

Start the BigDeck app locally for development.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database available (or Supabase connection)
- `.env` file configured with required variables

---

## Steps

// turbo
### 1. Install dependencies (first time or after package.json changes)
```powershell
npm install
```

// turbo
### 2. Start the development server
```powershell
npm run dev
```

This will:
1. Build the Vite frontend (`npm run build`)
2. Start the Express server on port 5000 (or `$PORT`)

---

## Environment Variables

Create a `.env` file in the project root with:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
PORT=5000
```

---

## Alternative Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build frontend only |
| `npm run start` | Start server without rebuilding |
| `npm run prod` | Build + start (same as dev) |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |
