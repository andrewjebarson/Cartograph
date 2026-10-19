const tokenUtil = require('../utils/token');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).send();
  const token = authHeader.split(' ')[1];
  req.user = tokenUtil.verifyToken(token);
  next();
}

function authorize(req, res, next) {
  if (!req.user || !req.user.admin) return res.status(403).send();
  next();
}

exports.authenticate = authenticate;
exports.authorize = authorize;
