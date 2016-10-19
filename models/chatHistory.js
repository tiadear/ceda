// message schema

var mongoose = require('mongoose');

var chatSchema = mongoose.Schema({
	user: String,
	room: String,
	message: String,
	timesent: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Chat', chatSchema);