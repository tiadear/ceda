// message schema

var mongoose = require('mongoose');

var roomSchema = mongoose.Schema({
	roomID: String,
	user_init: String,
	user_resp: String,
	created: {type: Date, default: Date.now},
	room_type: String
});

module.exports = mongoose.model('Room', roomSchema);