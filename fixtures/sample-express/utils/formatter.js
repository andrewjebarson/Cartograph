function formatUser(user) {
  return {
    id: user.id,
    name: user.name || 'Anonymous'
  };
}

module.exports = {
  formatUser
};
