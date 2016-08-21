function Room(id, userinit, useresp) {  
	this.id = id;
	this.userinit = userinit;
	this.useresp = useresp;
	this.users = [];
	this.status = "available";
};

Room.prototype.addPerson = function(personID) {  
	if (this.status === "available") {
		this.users.push(personID);
	}
};

module.exports = Room;