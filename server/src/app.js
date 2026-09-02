const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/healthRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
