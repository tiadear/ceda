'use strict';

const mongoose = require('mongoose');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const config = require('../oauth.js');
const User = mongoose.model('User');


module.exports = new GoogleStrategy({
  clientID: config.google.clientID,
  clientSecret: config.google.clientSecret,
  callbackURL: config.google.callbackURL
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOne({ oauthID: profile.id }, function(err, user) {
      if(err) {
        console.log(err);  // handle errors!
      }
      if (!err && user !== null) {
        done(null, user);
      } else {
        user = new User({
          username: profile.username,
          password: String,
          email: profile.emails[0].value,
          firstname: profile.displayName,
          lastName: String,
          provider: 'google',
          facebook: profile._json,
          oathID: profile.id
        });
        user.save(function(err) {
          if(err) {
            console.log(err);  // handle errors!
          } else {
            console.log("saving user ...");
            done(null, user);
          }
        });
      }
    });
  }
);
