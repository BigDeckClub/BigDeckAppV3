# BigDeckAppV3

## Overview

BigDeckAppV3 is a full-stack Magic: The Gathering (MTG) inventory management application. It helps users track their card collection, build and manage decks, monitor market prices, and record sales with profit/loss calculations. The application features AI-powered deck building assistance using OpenAI's GPT models integrated with a custom MTG knowledge library.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with functional components and hooks (no class components)
- **Build Tool**: Vite 5 with Terser minification and chunk splitting
- **Styling**: TailwindCSS 3 with custom MTG color system (WUBRG colors) and CSS custom properties for theming
- **Theme System**: Three themes (Dark, Light, Parchment) managed via ThemeContext with CSS variables in community-theme.css
  - Themes apply class `.theme-dark`, `.theme-light`, or `.theme-parchment` to document root
  - Theme toggle in header and full theme selector in Settings > Appearance
  - Persisted to localStorage with backward compatibility
- **Icons**: Lucide React
- **Type Checking**: PropTypes for runtime validation
- **Performance**: react-window for virtualized list rendering of large card collections
- **Testing**: Vitest with React Testing Library and jsdom

### Backend Architecture
- **Framework**: Express 5 running on Node.js
- **API Design**: RESTful API with routes organized by domain (inventory, decks, sales, analytics, etc.)
- **Security**: 
  - Helmet for HTTP headers
  - express-rate-limit with different tiers (general API, auth, AI endpoints)
  - CORS configuration
  - Request ID tracking for debugging
- **Middleware Pattern**: Centralized middleware exports with async error handling wrapper
- **Authentication**: Supabase JWT token validation with optional API key auth for external AI agents

### Data Layer
- **Database**: PostgreSQL via the `pg` package (NeonDB in production)
- **Connection**: Pool-based with idle timeout and connection limits
- **Schema**: Relational tables for users, inventory, decks, folders, sales, containers with foreign key relationships
- **Migrations**: Manual SQL scripts in migrate/scripts/ directory

### AI Integration
- **Library**: bigdeck-ai (custom MTG deck building library from BigDeckClub/BigDeckAI)
- **Provider**: OpenAI API using GPT-4o-mini for conversational AI
- **Features**: Commander deck suggestions, power level assessment, synergy analysis, budget optimization
- **Tool System**: Structured tool schemas for AI function calling

### External Data Services
- **Scryfall API**: Card data, images, and pricing with rate-limited queue (5 req/sec)
- **MTGJSON**: Bulk price data with local caching (24-hour TTL)
- **Archidekt**: Deck import proxy to handle CORS

### Key Design Patterns
1. **Dependency Injection**: Routes accept injectable dependencies for testing (see inventory.js)
2. **Barrel Exports**: Index files aggregate exports for cleaner imports
3. **Async Handler Wrapper**: Centralized error catching for async route handlers
4. **In-Memory Caching**: Price and color identity caches to reduce API calls
5. **Batch Processing**: Chunked database inserts to avoid PostgreSQL parameter limits

## External Dependencies

### Database
- **PostgreSQL** (NeonDB): Primary data store, connected via DATABASE_URL environment variable

### Authentication & User Management
- **Supabase**: JWT-based authentication with service role key for server operations
  - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required

### AI Services
- **OpenAI API**: GPT-4o-mini for deck building assistant
  - OPENAI_API_KEY required for AI features

### MTG Data APIs
- **Scryfall API**: Card metadata, images, and market prices (rate-limited to 5 req/sec)
- **MTGJSON**: Bulk price data from AllPricesToday.json and AllIdentifiers.json
- **Archidekt API**: Deck import via server-side proxy

### Cloud Infrastructure
- **Google Cloud Run**: Production deployment (us-central1 region)
- **AWS S3** (optional): Asset storage with CDN support
  - S3_BUCKET, S3_REGION, S3_CDN_HOST environment variables

### Environment Variables Required
- DATABASE_URL: PostgreSQL connection string
- SUPABASE_URL: Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
- OPENAI_API_KEY: OpenAI API key (for AI features)
- ADMIN_USER_IDS: Comma-separated Supabase user IDs for admin access
- AI_API_KEYS: Comma-separated API keys for external AI agent access (optional)