// Compatibility entry point. All startup paths use the same authenticated server.
require('./app').start().catch(() => {
  console.error('Startup failed. Check environment, MongoDB and Redis configuration.');
  process.exitCode = 1;
});
