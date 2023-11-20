// // routes/authRouter.js
// const express = require('express');
// const passport = require('passport');
// const passportgoogle = require('passport-google-oauth20')
// const router = express.Router();
// require('../middleware/googleauth')
// // Initiate Google OAuth
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// // Google OAuth callback
// router.get(
//     '/google/callback',
//     passport.authenticate('google', { failureRedirect: '/' }),
//     (req, res) => {
//         // Redirect or respond as needed upon successful Google authentication
//         res.redirect('/user/home'); // Redirect to your application's dashboard
//     }
// );

// routes/authRouter.js
const express = require('express');
const passport = require('passport');
const passportgoogle = require('passport-google-oauth20');
const router = express.Router();
require('../middleware/googleauth');
const User = require('../model/userSchema');

// Initiate Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/user/home' }),
    (req, res, next) => {
        const googleProfile = req.user;

        // Check if a user with the same email already exists
        User.findOne({ email: googleProfile.email })
            .then(existingUser => {
                if (existingUser) {
                    // An existing user with the same email is found
                    return res.render('./user/usersignup',{msg:"User already exist eith email"})
                    // You can handle this case (e.g., log them in or display an error)
                    req.login(existingUser, loginErr => {
                        if (loginErr) {
                            return next(loginErr);
                        }
                        return res.redirect('/user/home'); // Redirect to the dashboard
                    });
                } else {
                    // No existing user with the same email is found
                    // Proceed to create a new user
                    const newUser = new User({
                        googleId: googleProfile.id,
                        name: googleProfile.displayName,
                        email: googleProfile.emails[0].value,
                        // ... other fields
                    });

                    newUser.save()
                        .then(() => {
                            // User saved successfully, you can log them in or redirect
                            req.login(newUser, loginErr => {
                                if (loginErr) {
                                    return next(loginErr);
                                }
                                return res.redirect('/user/home');
                            });
                        })
                        .catch(saveErr => {
                            return next(saveErr);
                        });
                }
            })
            .catch(err => {
                return next(err);
            });
    }
);

module.exports = router;


