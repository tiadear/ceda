var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var passportLocalMongoose = require('passport-local-mongoose');

var userSchema = mongoose.Schema({
	username: String,
	password: String,
	email: String,
	firstName: String,
	lastName: String,
	provider: String,
	facebook: {},
	twitter: {},
	google: {},
	oathID: String
});

userSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

userSchema.methods.validPassword = function(password) {
	console.log(this.password);
	return bcrypt.compareSync(password, this.password);
}

//userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);
