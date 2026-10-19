const users = [];

class User {
  static findAll() {
    return users;
  }
  static findById(id) {
    return users.find((u) => u.id === id);
  }
  static create(data) {
    const user = { id: String(Date.now()), ...data };
    users.push(user);
    return user;
  }
}

module.exports = User;
