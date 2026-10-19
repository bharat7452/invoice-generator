const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');

// Builds the Express app. The Mongo connection string is passed in so tests can use an in-memory DB.
function createApp(mongoUrl) {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  // Render/Railway sit behind a proxy; needed for secure cookies.
  if (isProd) app.set('trust proxy', 1);

  app.use(express.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl, ttl: 60 * 60 * 24 * 7 }),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  // Simple request logger (middleware example)
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'test') console.log(`${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // Serve the built React app in production
  const dist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // Central error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}

module.exports = createApp;
