'use strict';

const FacebookStrategy = require('passport-facebook').Strategy;
const mongoose = require('mongoose');
const config = require('../oauth');
const User = require('../models/account.js');


module.exports = new FacebookStrategy({
    clientID: '1095165423893839',
    clientSecret: 'abf555499533da026c2b21a160a131e6',
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    profileFields: ['id', 'name', 'displayName', 'email']
    },
    function(accessToken, refreshToken, profile, done) {
        User.findOne({ oauthID: profile.id }, function(err, user) {
            if(err) {
                console.log(err);  // handle errors!
                return done(err);
            }
            if(user) {
                console.log('user found');
                return done(null, user);
            } else {
                console.log('create new user');

                var newUser = new User ();
                newUser.email = profile.emails[0].value;
                newUser.username = profile.displayName;
                newUser.password = String;
                newUser.firstName = profile.displayName;
                newUser.provider = 'facebook';
                newUser.facebook =  profile._json;
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

