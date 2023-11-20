// googleauth.js

const passport = require('passport');
const User = require('../model/userSchema');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config()

passport.use(
    "google",
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        (accessToken, refreshToken, profile, done) => {
            // Check if the user already exists in your database or create a new user
            console.log(JSON.stringify(profile));

            // Now you can use the profile object to save user data to the database
            User.findOne({ googleId: profile.id }).then((existingUser) => {
                if (existingUser) {
                    // User already exists, so pass an error message to the callback
                    return done("User already exists", null);
                } else {
                    new User({
                        googleId: profile.id,
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        // ... other fields
                    }).save().then((user) => {
                        done(null, user);
                    });
                }
            }).catch((err) => {
                return done(err, null); // Handle any errors that occur during the query
            });
        }
    )
);


passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then((user) => {
        done(null, user);
    });
});
