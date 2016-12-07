var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var passportLocalMongoose = require('passport-local-mongoose');


var userSchema = mongoose.Schema({
	username: String,
	password: String,
	email: String,
	userType: Boolean,
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	firstName: String,
	lastName: String,
	notifyChat : Boolean,
	notifyForum : Boolean,
	disconnectTime : Date,
	defaultMic: {type: Boolean, default: false },
	defaultVideo: {type: Boolean, default: false },
	colourScheme: String,
	lastLogin: {type: Date, default: null},
	provider: String,
	facebook: {},
	twitter: {},
	google: {},
	oauthID: String,
	isBlocked: {type: Boolean, default: false }
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

module.exports = mongoose.model('User', userSchema);
