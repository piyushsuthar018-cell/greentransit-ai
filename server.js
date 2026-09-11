const app = require('./app');
const PORT = process.env.PORT || 3000;

// Start the server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌱 GreenTransit AI Server is running on port ${PORT}`);
  console.log(`📡 Evaluator Endpoint: POST http://localhost:${PORT}/chat`);
  console.log(`🌍 Health Check:        GET  http://localhost:${PORT}/health`);
  console.log(`🌐 Web Interface:      http://localhost:${PORT}/`);
  console.log(`====================================================`);
});

module.exports = { app, server };
