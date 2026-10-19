const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/users', authMiddleware.authorize, userController.listUsers);
router.get('/users/:id', userController.getUser);
router.post('/users', userController.createUser);

module.exports = router;
