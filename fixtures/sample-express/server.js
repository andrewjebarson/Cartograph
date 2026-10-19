const express = require('express');
const routes = require('./routes/user.routes');
const authMiddleware = require('./middleware/auth.middleware');
const dbConfig = require('./config/database');

const app = express();
app.use(express.json());
app.use(authMiddleware.authenticate);
app.use('/api', routes);

module.exports = app;
