var validateUsername = function(_username) {
	var re = /^[A-Za-z0-9_.]+$/;
	if (re.test(document.getElementById(_username).value)){
		return true;
	} else {
		$('#usernameError').empty();
		$('#usernameError').append('<p>Please stick to letters, hyphens and apostrophes</p>');
		return false; 
	}
};

var validateEmail = function(_email) {
	var re = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
	if (re.test(document.getElementById(_email).value)){
		return true;
	}
	else {
		$('#emailError').empty();
		$('#emailError').append("<p>Are you sure that's your email address? It looks like it's missing something.</p>");
		return false; 
	}
};

var validatePassword1 = function(str) {
	var pw1 = document.getElementById(str).value;
	if (pw1.length < 6) {
		$('#password1Error').empty();
		$('#password1Error').append('<p>Sorry, that password is a bit too short</p>');
		return false; 
	} else if (pw1.length > 50) {
		$('#password1Error').empty();
		$('#password1Error').append('<p>Sorry, that password is too long</p>');
		return false; 
	} else if (pw1.search(/\d/) == -1) {
		$('#password1Error').empty();
		$('#password1Error').append('<p>Please include a number in your password</p>');
		return false; 
	} else if (pw1.search(/[a-zA-Z]/) == -1) {
		$('#password1Error').empty();
		$('#password1Error').append("<p>Please include some letters in your password</p>");
		return false; 
	} else if (pw1.search(/[^a-zA-Z0-9\!\@\#\$\%\^\&\*\(\)\_\+]/) != -1) {
		$('#password1Error').empty();
		$('#password1Error').append("<p>Woops, we don't allow that character</p>");
		return false; 
	}
	return true;
};
			
var validatePassword2 = function(str) {
	var pw1 = document.getElementById("password1").value;
	var pw2 = document.getElementById(str).value;
	if(pw2 !== pw1) {
		$('#password2Error').empty();
		$('#password2Error').append("<p>Those passwords don't match!</p>");
		return false; 
	} else {
		return true;
	}
};


var validateForm = function() {
	var error = 0;
	if(!validateUsername('username')) {
		error++;
	}
	if(!validateEmail('email')) {
    	error++;
	}
	if(!validatePassword1("password1")) {
		error++;
	}
	if(!validatePassword2("password2")) {
		error++;
	}
	if(error > 0) {
		return false;
	}
}