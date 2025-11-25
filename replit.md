# MTG Card Manager

### Overview
The MTG Card Manager is a comprehensive inventory management application for Magic: The Gathering cards. It enables users to track card inventory, create decklists, manage physical card containers, record sales, and monitor market pricing. The project aims to provide a robust solution for MTG enthusiasts and vendors to manage their collections and sales efficiently, leveraging real-time pricing data from external APIs.

### User Preferences
I prefer iterative development with a focus on core functionality first. Please ask before making major architectural changes or introducing new external dependencies. I value clear, concise explanations and well-structured code. Do not make changes to the folder `Z` or the file `Y`.

### System Architecture
The application follows a client-server architecture:
-   **Frontend**: Built with React 18, Vite, and styled using Tailwind CSS, featuring a modern teal/slate color palette. It includes a responsive design with a mobile-optimized bottom navigation and touch-friendly components. UI components utilize Lucide React icons.
-   **Backend**: An Express.js server handles API requests, CORS, and integrates with the PostgreSQL database. It includes unified error handling and performs data processing for pricing.
-   **Database**: PostgreSQL, managed via Drizzle ORM, storing inventory, decklists, containers, and sales data. The schema is auto-initialized on server startup.
-   **UI/UX Decisions**:
    -   **Color Palette**: Modern teal/slate theme for a professional and accessible dark mode.
    -   **Responsive Design**: Utilizes CSS media queries at 768px for desktop/mobile layouts, with touch-friendly inputs (min 44px height) and full-width buttons on mobile.
    -   **Component Organization**: Main app logic resides in `App.jsx`, with key features like `InventoryTab` extracted into separate components. Further extraction of other tabs is planned.
    -   **CSS Architecture**: Utility-first Tailwind CSS with reusable component classes defined in `index.css`.
-   **Technical Implementations**:
    -   **Search Debouncing**: Implemented a `useDebounce` hook (300ms) to optimize Scryfall API calls.
    -   **Unified Pricing System**: All pricing across Inventory, Decklists, and Containers uses a shared `PriceCacheContext` with a 12-hour cache duration and request deduplication.
    -   **Error Handling**: Centralized server-side error handling middleware and specific frontend logging for database and inventory operations.
-   **Feature Specifications**:
    -   **Inventory Management**: Add/edit/delete cards with Scryfall integration, track quantity, purchase details, and display market prices (TCG, Card Kingdom).
    -   **Decklist Creation**: Paste decklists, validate cards via Scryfall, allow set selection, calculate market value, and manage multiple decklists.
    -   **Container Management**: Build containers from decklists, allocate inventory, and track container market pricing.
    -   **Sales Tracking**: Record sales, track COGS, calculate profit margins, and maintain sales history.
    -   **Analytics Dashboard**: Provide insights into inventory value, sales performance, and category breakdowns.

### External Dependencies
-   **External APIs**:
    -   **Scryfall**: For Magic: The Gathering card data and TCG Player pricing.
    -   **MTG Goldfish**: For Card Kingdom pricing data.
-   **Database**: Replit PostgreSQL (Neon)
-   **UI Components**: Lucide React (icons)