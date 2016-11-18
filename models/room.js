// message schema

var mongoose = require('mongoose');

var roomSchema = mongoose.Schema({
	roomID: String,
	user_init: String,
	user_resp: String,
	user_init_mic: Boolean,
	user_init_video: Boolean,
	user_resp_mic: Boolean,
	user_resp_video: Boolean,
	created: {type: Date, default: Date.now},
	room_type: String
});

module.exports = mongoose.model('Room', roomSchema);