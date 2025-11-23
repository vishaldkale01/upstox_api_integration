// routes/index.js
const router = express.Router();

// const { handleCallback } = require('../controllers/upstoxController');
// Import route modules
const upstoxRoutes = require('../routes/router'); // Adjust the path as needed

router.use('/', upstoxRoutes);

module.exports = router;
