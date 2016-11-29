// message schema

var mongoose = require('mongoose');

var chatSchema = mongoose.Schema({
	user: String,
	room: String,
	message: String,
	isImage: Boolean,
	timesent: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Chat', chatSchema);