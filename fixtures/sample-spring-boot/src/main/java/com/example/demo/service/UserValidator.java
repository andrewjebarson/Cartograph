package com.example.demo.service;

import com.example.demo.model.User;

public class UserValidator {
    public boolean isValid(User user) {
        return user != null && user.getUsername() != null;
    }
}
