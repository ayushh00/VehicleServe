const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import our custom files
require('./db'); // This automatically runs the MySQL connection!
const routes = require('./routes');

// Initialize the Express app
const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Mount all our API routes under the '/api' prefix
app.use('/api', routes);

// It will use the cloud provider's port, or 3000 if running locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});