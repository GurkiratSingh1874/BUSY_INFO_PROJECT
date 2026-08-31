const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDB = require('./config/db');
const seedUsers = require('./utils/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database and Seed Users
connectDB().then(() => {
  seedUsers();
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend server is healthy and running',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Catch-all route to serve the React index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Project & Task Tracker</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { text-align: center; padding: 2rem; border-radius: 8px; background: #1e293b; border: 1px solid #334155; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Project & Task Tracker</h1>
            <p>Backend is running. Frontend has not been built yet.</p>
            <p>Go to <a href="/api/health" style="color: #38bdf8;">/api/health</a> to check API status.</p>
          </div>
        </body>
        </html>
      `);
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
