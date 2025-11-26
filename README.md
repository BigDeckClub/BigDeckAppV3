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
- PostgreSQL database

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This starts both the Express backend server and Vite dev server concurrently.

### Production

```bash
npm run prod
```

This builds the React app and starts the production server.

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
