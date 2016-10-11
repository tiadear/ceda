'use strict';

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const mongoose = require('mongoose');
const config = require('../oauth');
const User = require('../models/account.js');


module.exports = new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL
    },
    function(token, refreshToken, profile, done) {
        console.log('google auth point 1');
        User.findOne({ oauthID: profile.id }, function(err, user) {
            if(err) {
                console.log(err);
                return done(err);
            }
            if (user) {
                console.log('user found');
                return done(null, user);
            }
            else {
                console.log('create new user');

                var newUser = new User ();
                newUser.email = profile.emails[0].value;
                newUser.username = profile.displayName;
                newUser.password = String;
                newUser.firstName = profile.displayName;
                newUser.provider = 'google';
                newUser.google =  token;
                newUser.oauthID = profile.id;

                newUser.save(function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("saving user ...");
                        done(null, newUser);
                    }
                });
            }
        });
    }
);
