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
# NeonDB connection string (required)
DATABASE_URL=postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/bigdeck?sslmode=require

# Server port (optional, defaults to 5000)
PORT=5000

# Node environment
NODE_ENV=development
```

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

## License

ISC
