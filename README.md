# BigDeck.app - MTG Inventory Tracker

A modern Magic: The Gathering inventory management application built with React and Vite.

## Features

- **Inventory Management**: Track your card collection with purchase prices and quantities
- **Decklist Creation**: Build and save deck templates with card pricing
- **Container Management**: Organize cards into physical boxes with automatic inventory allocation
- **Sales Tracking**: Record sales with COGS/profit calculation
- **Analytics Dashboard**: View performance metrics and reorder alerts
- **Real-time Pricing**: Integration with Scryfall and Card Kingdom for market prices

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React icons
- **Backend**: Express.js 5, PostgreSQL
- **Testing**: Vitest, React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+
- NeonDB account (or any PostgreSQL database)

### Setup

1. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your NeonDB connection string
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

The app will be available at http://localhost:5000

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration (required)
DATABASE_URL=postgresql://username:password@host:port/database

# Supabase Authentication (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS Configuration (optional, defaults to localhost)
# Comma-separated list of allowed origins
# Use '*' to allow all origins (not recommended for production)
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000

# AI API Keys (optional, for external AI agent access)
# Comma-separated list of valid API keys
AI_API_KEYS=key1,key2,key3

# Server Configuration
PORT=5000
NODE_ENV=development
```

See `.env.example` for a template.

### Development

```bash
npm run dev
```

This builds the React app and starts the Express backend server.

### Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## Scryfall Backfill & Rate Limiting

This project uses a rate-limited queue for Scryfall requests (`server/utils/scryfallQueue.js`) to avoid exceeding API limits. To reduce synchronous per-request lookups, we've added:

- A server-side backfill job: `server/jobs/backfillScryfall.js` — enriches inventory rows with `scryfall_id`, `image_uri_small`, `image_uri_normal`, `mana_value`, and `color_identity`.
- An admin trigger endpoint: `POST /api/admin/backfill-scryfall` (requires authenticated admin user listed in `ADMIN_USER_IDS` env var).

Testing & rollout recommendations:
- Use `dryRun: true` to preview changes.
- Start with small `limit` (e.g., 50) and monitor logs and Scryfall API usage.
- Prefer background execution (`background: true`) for long-running backfills.


## Project Structure

```
├── src/
│   ├── components/      # React components
│   ├── context/         # React context providers
│   ├── lib/             # Utility libraries
│   ├── utils/           # Custom hooks and utilities
│   ├── App.jsx          # Main application component
│   └── main.jsx         # Application entry point
├── routes/              # Express API routes
├── middleware/          # Express middleware
├── tests/               # Test files
├── server.js            # Express server
└── vite.config.js       # Vite configuration
```

## API Endpoints

- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Add new inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/decklists` - Get all decklists
- `POST /api/decklists` - Create new decklist
- `GET /api/containers` - Get all containers
- `POST /api/containers` - Create new container
- `POST /api/containers/:id/sell` - Record container sale
- `GET /api/sales` - Get sales history
- `GET /api/prices/:cardName/:setCode` - Get card prices

## Security

This application implements several security best practices:

- **CORS Protection**: Allowlist-based CORS configuration (configure via `ALLOWED_ORIGINS`)
- **Content Security Policy**: Helmet CSP enabled with appropriate directives
- **Rate Limiting**: Comprehensive rate limiting across all endpoints (5 requests/15min for auth, 300 req/min for general API/database routes, 30 req/min for AI endpoints)
- **Timing-Safe Comparison**: API key validation uses constant-time comparison
- **Input Validation**: Zod schemas validate all user inputs
- **Request Tracking**: Unique request IDs for debugging and log correlation
- **Error Handling**: Production errors don't leak sensitive information

### Security Configuration

For production deployments:

1. Set `ALLOWED_ORIGINS` to your production domain(s)
2. Set `NODE_ENV=production` for optimized logging and error handling
3. Keep `DATABASE_URL` and API keys secure (never commit to version control)
4. Configure strong API keys for AI agent access

## License

ISC
