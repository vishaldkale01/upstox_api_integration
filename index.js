// Compatibility entry point. All startup paths use the same authenticated server.
require('./app').start().catch((error) => {
  console.error('Startup failed. Check environment, MongoDB and Redis configuration.');
  if (error instanceof Error && error.message) console.error(error.message);
  else console.error(error);
  process.exitCode = 1;
});
