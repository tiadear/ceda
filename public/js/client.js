var socket = io.connect();
var myRoomID = null;

    $(function(){

        //update the incoming chat window
        socket.on('updateChat', function(username, data) {
            $('#incoming').append('<li>' + username + ': ' + data + '</li>');
        });



        //update the user list
        socket.on('updateUsers', function(data){
            $('#users').text("");
            $('#usersList').text("");

            if (!jQuery.isEmptyObject(data.users)) {

                $.each(data.users, function(id, user){

                    var currentuser = '/#'+socket.id;
                    var userlistid = id;
                    
                    //if the current user does not match anyone in the list the list all the usernames
                    if(currentuser != userlistid) {
                        $('#users').append('<li id='+ id +'>' + user.username + '</li>');
                        $('#usersList').append('<li id='+ id +'>' + user.username + '</li>');
                    }

                    $('#usersList li').on('click', function(){
                        var userselected =  $(this).attr('id');
                        console.log('userlistid: '+ $(this).attr('id'));

                        socket.emit('joinRoom', userselected, currentuser);
          
                        $('#chooseuserWrap').hide();
                        $('#contentWrap').show();
                    });

                });
            }
        });


    
        //update the room ID
        socket.on('sendRoomID', function(data) {
            myRoomID = data.id;
            console.log('room id: '+data.id);
            console.log('room owner: '+data.roomowner);
            console.log('room responder: '+data.roomresp);
        });






        var typing = false;
        var timeout = undefined;

        function timeoutFunction() {
            typing = false;
            socket.emit("typing", false);
        }

        //when something is entered into the outgoing message box
        $('#outgoing').keypress(function(e) {

            //if enter has not been hit
            if(e.which != 13) {
                if(typing === false && myRoomID !== null && $('#outgoing').is(':focus')) {
                    typing = true;
                    socket.emit('userTyping', true);
                } else {
                    clearTimeout(timeout);
                    timeout = setTimeout(timeoutFunction, 5000);
                }
            }

            //if enter has been hit
            if(e.which == 13) {
                e.preventDefault();
                
                //emit the message from the outgoing chat
                socket.emit('sendChat', $('#outgoing').val());

                //reset the outgoing chat to null
                $('#outgoing').val('');
            } 
        });




        //If a user is typing
        socket.on('isTyping', function(data){
            if(data.isTyping) {
                if($('#'+data.user+'').length === 0) {
                    $('#incoming').append('<li>'+data.user+' is typing</li>');
                    timeout = setTimeout(timeoutFunction, 5000);
                }
            } else {
                $('#'+data.user+'').remove();
            }
        });



        //on username submit
        $('#userform').submit(function(e){
            e.preventDefault();

            var name = $('#username').val();

            //emit the username and clear the previous value and then display the actual chat window
            socket.emit('addUser', name, function(data){
                $('#usernameWrap').hide();
                $('#chooseuserWrap').show();

                if(data) {
                    $('#usersList').append('<li>You are the only user online right now.<b>Continue?</b></li>');
                } else {

                }
                
            });
            $('#username').val('');

        });

        



    });