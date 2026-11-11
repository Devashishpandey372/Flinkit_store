require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startOrderExpiryWorker, stopOrderExpiryWorker } = require('./services/orderExpiryService');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Start background order expiry worker for abandoned online checkouts
  if (process.env.NODE_ENV !== 'test') {
    startOrderExpiryWorker();
  }

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Flinkit Store API running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 Health check: http://localhost:${PORT}/api/health\n`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down gracefully...');
    stopOrderExpiryWorker();
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
