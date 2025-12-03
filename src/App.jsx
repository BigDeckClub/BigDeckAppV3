import React from 'react';
import { get, post } from './api';

// Removed unused import of API_BASE

const loadImports = async () => {
    // Changed the API_BASE URL
    const response = await get('/imports');
    // Your existing logic here
};

const handleSell = async (saleData) => {
    // Changed the API_BASE URL
    const response = await post('/sales', saleData);
    // Your existing logic here
};

// ... rest of the component
