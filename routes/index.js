// routes/index.js
const router = express.Router();

const { handleCallback } = require('../controller.js/upstoxController');
// Import route modules
const upstoxRoutes = require('../routes/router'); // Adjust the path as needed

router.use('/upstox', upstoxRoutes);
router.get('/callback', handleCallback);

module.exports = router;
