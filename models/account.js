var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
var passportLocalMongoose = require('passport-local-mongoose');

var Account = new Schema({
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

Account.methods.generateHash = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

Account.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.local.password);
}

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('accounts', Account);
