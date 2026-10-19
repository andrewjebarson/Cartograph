function signToken(payload) {
  return 'token_' + JSON.stringify(payload);
}

function verifyToken(token) {
  return { id: '1', admin: true };
}

exports.signToken = signToken;
exports.verifyToken = verifyToken;
