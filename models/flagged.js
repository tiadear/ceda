var mongoose = require('mongoose');

var flagSchema = mongoose.Schema({
	user: String,
	flagged: Boolean,
	userWhoFlagged: String,
	timeFlagged: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Flag', flagSchema);
