package com.example.demo.service;

import org.springframework.stereotype.Service;
import com.example.demo.repository.UserRepository;
import com.example.demo.model.User;
import java.util.Optional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserValidator userValidator;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.userValidator = new UserValidator();
    }

    public Optional<User> findUser(String username) {
        return userRepository.findByUsername(username);
    }
}
