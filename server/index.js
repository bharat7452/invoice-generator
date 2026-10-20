require('dotenv').config();
const mongoose = require('mongoose');
const createApp = require('./app');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

console.log('Connecting to:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log('MongoDB connected');
    createApp(MONGODB_URI).listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    console.error('Reason:', err.reason && err.reason.servers
      ? [...err.reason.servers.values()].map((s) => s.error && s.error.message)
      : err.reason);
    process.exit(1);
  });
