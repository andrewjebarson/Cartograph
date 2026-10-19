const userService = require('../services/user.service');
const userModel = require('../models/user.model');

function listUsers(req, res) {
  const users = userService.getAllUsers();
  res.json(users);
}

function getUser(req, res) {
  const user = userService.getUserById(req.params.id);
  res.json(user);
}

function createUser(req, res) {
  const newUser = userModel.create(req.body);
  res.status(201).json(newUser);
}

module.exports = {
  listUsers,
  getUser,
  createUser
};
