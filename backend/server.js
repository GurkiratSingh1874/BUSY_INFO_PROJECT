const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const seedUsers = require('./utils/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database and Seed Users
connectDB().then(async () => {
  await seedUsers();
  try {
    const Task = require('./models/Task');
    await Task.updateMany({ priority: 'high', priorityWeight: { $ne: 3 } }, { $set: { priorityWeight: 3 } });
    await Task.updateMany({ priority: 'medium', priorityWeight: { $ne: 2 } }, { $set: { priorityWeight: 2 } });
    await Task.updateMany({ priority: 'low', priorityWeight: { $ne: 1 } }, { $set: { priorityWeight: 1 } });
  } catch (err) {
    console.error('Priority sync error:', err.message);
  }
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server proxies)
    if (!origin) return callback(null, true);
    // Allow localhost, render, and any vercel deployment
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/alerts', require('./routes/alerts'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isDbConnected ? 'ok' : 'db_disconnected',
    message: isDbConnected
      ? 'Backend server is healthy and connected to MongoDB'
      : 'Backend server is running but waiting for MongoDB connection',
    dbState: mongoose.connection.readyState,
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

// Start Server explicitly listening on 0.0.0.0 for container hosting (Render)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
});

