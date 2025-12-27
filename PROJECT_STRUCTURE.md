# BigDeckAppV3 - Project Structure

This document provides an overview of the project's directory structure and organization.

## Root Directory Structure

```
BigDeckAppV3/
├── src/                    # Frontend source code (React)
├── server/                 # Backend source code (Express)
├── public/                 # Static assets
├── scripts/                # Utility scripts (organized by category)
├── migrate/                # Database migrations
├── docs/                   # Project documentation
├── debug/                  # Debug output files (gitignored)
├── logs/                   # Application logs (gitignored)
├── cache/                  # Runtime cache files (gitignored)
├── dist/                   # Production build output (gitignored)
├── node_modules/           # Dependencies (gitignored)
└── [config files]          # Root-level configuration files
```

## Frontend (`/src/`)

### Main Structure
```
src/
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   ├── inventory/         # Inventory management components
│   ├── decks/             # Deck building components
│   ├── rapid-entry/       # Quick card entry components
│   ├── settings/          # Settings components
│   └── buy/               # Card purchasing components
├── hooks/                 # Custom React hooks
├── context/               # React Context providers
├── utils/                 # Utility functions
├── constants/             # Application constants
├── config/                # Frontend configuration
├── __tests__/             # Test files (Jest/Vitest)
├── App.jsx                # Main application component
├── main.jsx               # Application entry point
└── index.css              # Global styles (Tailwind)
```

### Component Organization
- **UI Components** (`/ui/`): Reusable buttons, modals, inputs, etc.
- **Feature Components**: Organized by feature (inventory, decks, etc.)
- **Each component**: Typically includes PropTypes validation

### Testing
- Unit tests: `src/__tests__/`
- Test files follow pattern: `*.test.js` or `*.test.jsx`
- Run tests: `npm test`

## Backend (`/server/`)

### Main Structure
```
server/
├── routes/                # API route handlers
│   ├── ai.js             # AI deck generation routes
│   ├── analytics.js      # Analytics endpoints
│   ├── inventory.js      # Inventory CRUD operations
│   ├── decks.js          # Deck management
│   ├── imports.js        # Data import endpoints
│   └── index.js          # Route aggregation
├── middleware/           # Express middleware
│   ├── auth.js          # Authentication middleware
│   ├── validation.js    # Request validation
│   └── index.js         # Middleware exports
├── db/                  # Database utilities
│   ├── pool.js         # PostgreSQL connection pool
│   └── queries.js      # Common database queries
├── utils/              # Server utilities
├── __tests__/          # Server tests
└── server.js           # Express server entry point
```

### API Structure
- RESTful endpoints
- Authentication via Supabase
- Rate limiting enabled
- Request validation middleware

## Scripts (`/scripts/`)

Organized by purpose - see [scripts/README.md](./scripts/README.md) for details:

```
scripts/
├── debug/              # Debugging scripts
├── db/                 # Database scripts
├── test/               # Testing scripts
├── utils/              # Utility scripts
└── api/                # API integration scripts
```

## Migrations (`/migrate/`)

Database migration files:
```
migrate/
├── *.sql               # Migration SQL files
├── scripts/            # Migration helper scripts
├── rollback/           # Rollback scripts
└── mappings/           # Data mappings (gitignored)
```

## Documentation (`/docs/`)

See [docs/README.md](./docs/README.md) for navigation:
```
docs/
├── guides/             # Feature guides
└── deployment/         # Deployment docs
```

## Configuration Files

### Root-Level Config
- `package.json` - NPM dependencies and scripts
- `vite.config.js` - Vite bundler configuration
- `tailwind.config.js` - TailwindCSS configuration
- `vitest.config.js` - Test runner configuration
- `eslint.config.js` - ESLint linting rules
- `postcss.config.js` - PostCSS configuration
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore patterns
- `Dockerfile` - Container configuration

### Important Files
- `CLAUDE.md` - AI development context and guidelines
- `README.md` - Project overview and setup instructions
- `PROJECT_STRUCTURE.md` - This file

## Build Output

### Development
- Source maps enabled
- Hot module replacement (HMR)
- Development server: `http://localhost:5000`

### Production (`/dist/`)
```
dist/
├── assets/             # Bundled JS/CSS with hashes
├── index.html          # Entry HTML file
└── [static files]      # Copied from /public/
```

## Temporary Directories (Gitignored)

### `/debug/`
- Debug output files
- Temporary diagnostic data
- Can be safely deleted

### `/logs/`
- Build logs
- Test output
- Server logs
- API debugging logs

### `/cache/`
- MTGJSON price cache (69MB+)
- Other runtime cache files
- Automatically regenerated as needed

## Key Dependencies

### Frontend
- **React 18** - UI framework
- **Vite 5** - Build tool
- **TailwindCSS 3** - CSS framework
- **Lucide React** - Icons

### Backend
- **Express 5** - Web framework
- **PostgreSQL** - Database (via `pg`)
- **Supabase** - Authentication & hosting
- **bigdeck-ai** - AI deck building library

### Testing
- **Vitest** - Test runner
- **Testing Library** - React testing utilities

## Development Workflow

### Setup
```bash
npm install
cp .env.example .env
# Configure environment variables
```

### Development
```bash
npm run dev          # Build frontend + start server
npm test            # Run tests
npm run lint        # Lint code
```

### Production
```bash
npm run build       # Build for production
npm run prod        # Build + start production server
```

## Best Practices

### File Organization
1. Group related files together
2. Use index.js for clean exports
3. Keep components focused and small
4. Separate business logic into hooks/utils

### Naming Conventions
- **Components**: PascalCase (e.g., `CardGrid.jsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useInventory.js`)
- **Utils**: camelCase (e.g., `cardHelpers.js`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `API_ENDPOINTS`)

### Code Style
- Use functional components with hooks
- Include PropTypes for all components
- Use optional chaining for safety (`?.`)
- Prefer destructuring
- Document complex logic with comments

### Testing
- Test components in `src/__tests__/`
- Test server routes in `server/__tests__/`
- Maintain test coverage
- Test edge cases and error handling

## Migration Guide

If you're refactoring or moving files, update:
1. Import statements in affected files
2. Test file paths
3. This documentation
4. Related README files

## Questions?

- See [CLAUDE.md](./CLAUDE.md) for AI development context
- Check [docs/](./docs/) for feature-specific guides
- Review [scripts/README.md](./scripts/README.md) for script usage
