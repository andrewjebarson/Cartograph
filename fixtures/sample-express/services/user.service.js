const userModel = require('../models/user.model');
const { formatUser } = require('../utils/formatter');
import { verifyToken } from '../utils/token';

function getAllUsers() {
  const users = userModel.findAll();
  return users.map(formatUser);
}

function getUserById(id) {
  const user = userModel.findById(id);
  return user ? formatUser(user) : null;
}

module.exports = {
  getAllUsers,
  getUserById
};
