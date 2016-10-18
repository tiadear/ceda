var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var passportLocalMongoose = require('passport-local-mongoose');


var userSchema = mongoose.Schema({
	username: String,
	password: String,
	email: String,
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	firstName: String,
	lastName: String,
	provider: String,
	facebook: {},
	twitter: {},
	google: {},
	oauthID: String
});

userSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

userSchema.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.password);
}

userSchema.statics.random = function(cb) {
	this.count(function(err, count) {
		if(err){
			return cb(err);
		}
		var rand = Math.floor(Math.random() * count);
		this.findOne().skip(rand).exec(cb);
	}.bind(this));
}

//userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);
