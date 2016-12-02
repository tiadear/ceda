'use strict';


if(isBlocked === 'true') {
    $('.blockedAlert').css('display', 'block');
    $('.simpleNav').css('pointer-events', 'none');
    $('.sendMessagesWrap').css('pointer-events', 'none');
    //$('body').css('overflow', 'hidden');
}

$('#acceptArsehole').on('click touch', function() {
    $('.blockedAlert').css('display', 'none');
    $('.simpleNav').css('pointer-events', 'auto');
    $('.sendMessagesWrap').css('pointer-events', 'auto');
    //$('body').css('overflow', 'auto');
    $('#chat-btn-block img').attr('src', '/images/icon-unblock.png');
});

$('#rejectArsehole').on('click touch', function() {
    window.location.href='/chat';
});


var focus = true;
$(window).blur(function() {
    focus = false;
});
$(window).focus(function() {
    focus = true;
    removeBadge();
});

var badge = 0;
var favicon = new Favico({
    animation : 'popFade',
    bgcolor: '#ea5455'
});

function addBadge() {
    console.log('tried to add badge');
    badge = badge + 1;
    favicon.badge(badge);
}
function removeBadge() {
    console.log('tried to remove badge');
    badge = 0;
    favicon.reset();
}


var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

var pcConfig = {
  'iceServers': [{
    'url': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// SOCKET STUFF


var socket = io.connect();

$(function(){

    var msgSubmit = document.getElementById('outgoingSubmit');
    msgSubmit.disabled = true;

    //prevent submitting message by default
    $('#outgoing').keypress(function(e) {
        e.preventDefault();
    });

    //if(roomID) {

        function sendMessage(message) {
            console.log('Client sending message: ', message);
            socket.emit('message', message);
        }

        


        socket.emit('addUser', user1, user1username, function(data){
            if(data) {
                console.log(user1username + ' has been added');

                socket.emit('joinRoom', roomID, user1username, user2username);

                msgSubmit.disabled = false;

                $('#outgoing').unbind('keypress');

                var typing = false;
                var timeout = undefined;

                function timeoutFunction() {
                    typing = false;
                    socket.emit("userTyping", false);
                }

                //when something is entered into the outgoing message box
                $('#outgoing').keypress(function(e) {

                    //if enter has not been hit
                    if(e.which !== 13) {
                        if(typing === false && $('#outgoing').is(':focus')) {
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
                        socket.emit('userTyping', false);
                        typing = false;
                    }
                    
                });
            }

        });

        //If a user is typing
        socket.on('isTyping', function(data){

            var typing = false;
            var timeout = undefined;

            function timeoutFunction() {
                typing = false;
                socket.emit("userTyping", false);
            }

            if(data.isTyping) {
                if($('#'+data.user+'').length === 0) {
                    $('#incoming').append('<li class="istyping" id='+data.user+'>'+data.user+' is typing</li>');
                    timeout = setTimeout(timeoutFunction, 5000);
                }
            } else {
                $('#'+data.user+'').remove();
            }
        });
    

        socket.on('channelReady', function(room) {
            console.log('joined ' + room);
            isChannelReady = true;
        });

        socket.on('roomOpened', function(room) {
            console.log('room opened: ' + room);
            isChannelReady = true;
            isInitiator = true;
        });

        socket.on('alertPeer', function(peerToBeAlerted, chatInitiator){
            //send notification
            console.log(chatInitiator + ' has sent a message to ' + peerToBeAlerted);
        });



        // getting chat history and displaying

        function formatDate(date) {
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0'+minutes : minutes;
            var strTime = hours + ':' + minutes + ' ' + ampm;
            var months = date.getMonth() +1;
            return date.getDate() + "/" + months + "/" + date.getFullYear() + "  " + strTime;
        }

        socket.on('isOnline', function(user) {
            if(user != user1username) {
                $('.chatPartner').prepend('<div class="online"></div>');
            }
        });

        socket.on('isOnline', function(user) {
            if(user != user1username) {
                $('.online').remove();
            }
        });

        socket.on('addHistory', function(past) {
            past.forEach(function(pastItem) {

                var date = new Date(pastItem[4]);
                var dateformat = formatDate(date);
                        
                $('#incoming').append('<li class="msgtime">'+ dateformat +'</li>');

                // check which user said the message
                if(pastItem[0] === user1) {

                    //check if it was an image
                    if(pastItem[5] === true) {
                        $('#incoming').append('<li class="incomingMessage incomingImage" id="user1msg"><div class="sentImage"><img src="' + pastItem[2] + '"></div></li><div class="speechbubble1"><img src="/images/speechtail_white.png"></div>');
                    } else {
                        $('#incoming').append('<li class="incomingMessage" id="user1msg">' + pastItem[2] + '</li><div class="speechbubble1"><img src="/images/speechtail_white.png"></div>');
                    }
                    
                } else {

                    //check if it was an image1
                    if(pastItem[5] === true) {
                        $('#incoming').append('<div class="speechbubble2"><img src="/images/speechtail_blue.png"></div><li class="incomingMessage incomingImage" id="user2msg"><div class="sentImage"><img src="' + pastItem[2] + '"></div></li>');
                    } else {
                        $('#incoming').append('<div class="speechbubble2"><img src="/images/speechtail_blue.png"></div><li class="incomingMessage" id="user2msg">' + pastItem[2] + '</li>');
                    }
                }
                
            });

            $("html, body").animate({ scrollTop: $(document).height() }, 1000);
        });



        // For todays date;
        Date.prototype.today = function () { 
            return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear();
        }
        // For the time now
        Date.prototype.timeNow = function () {
            return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes();
        }
        var date = new Date().today();
        var time = new Date().timeNow();



        
        

        
        //update the incoming chat window
        socket.on('updateChat', function(username, data) {
            $('#incoming').append('<li class="msgtime">'+ date + ' ' + time +'</li>');
            if(username === user1username) {
                $('#incoming').append('<li class="incomingMessage" id="user1msg">' + data + '</li><div class="speechbubble1"><img src="/images/speechtail_white.png"></div>');
            } else {
                $('#incoming').append('<div class="speechbubble2"><img src="/images/speechtail_blue.png"></div><li class="incomingMessage" id="user2msg">' + data + '</li>');

                if(focus === false){
                    addBadge();
                } else {
                    removeBadge();
                }
            }

            socket.emit('message', data);
        });




        // request to swap to video chat
        $('#chat-btn-video').on('click touch', function() {
            socket.emit('sendChat', 'video request');
        });


        function runWebRTC(userAccepted, userInitiated) {
            console.log('1. run web rtc reached');

            $('.displayMessagesWrap').hide();
            $('.sendMessagesWrap').hide();
            $('.chatPartner').hide();
            $('.chatRoom').css('padding-top', '0px');
            $('.videoWrap').show();
        
            var webrtc = new SimpleWebRTC({
                localVideoEl: 'localVideo',
                remoteVideosEl: '',
                autoRequestMedia: false,
                debug: false,
                detectSpeakingEvents: true,
                autoAdjustMic: false
            });

            var room = roomID;

            webrtc.on('readyToCall', function () {
                console.log('3. ready to call');

                if (room) {
                    console.log('4. webrtc join room');
                    webrtc.joinRoom(room);
                }
            });

            console.log('userAccepted: '+userAccepted);
            console.log('userInitiated: '+userInitiated);

            webrtc.startLocalVideo();

                // we got access to the camera
                webrtc.on('localStream', function (stream) {
                    console.log('2. local stream added');
                    
                    $('#localVolume').show();

                    // if you were not the initiator
                    if (userAccepted == user1) {
                        // and you didn't want your video shown
                        if (String(vidSettings1) === String(false)) {
                            console.log('mic settings for '+user1username+' are turned off');
                            webrtc.pauseVideo();
                        }
                    }
                    if (String(micSettings1) === String(false)) {
                        console.log('mic settings for '+user1username+' are turned off');
                        webrtc.mute();
                    }
                });

                // we did not get access to the camera
                webrtc.on('localMediaError', function (err) {
                    console.log('local media error');
                });

                // local screen obtained
                webrtc.on('localScreenAdded', function (video) {
                    console.log('local screen added');
                    video.onclick = function () {
                        //video.style.width = video.videoWidth + 'px';
                        //video.style.height = video.videoHeight + 'px';
                    };
                    document.getElementById('localScreenContainer').appendChild(video);
                    $('#localScreenContainer').show();
                });
                // local screen removed
                webrtc.on('localScreenRemoved', function (video) {
                    document.getElementById('localScreenContainer').removeChild(video);
                    $('#localScreenContainer').hide();
                });

                

                // a peer video has been added
                webrtc.on('videoAdded', function (video, peer) {
                    console.log('5. video added', peer);

                    

                    var remotes = document.getElementById('remotes');
                    if (remotes) {
                        console.log('6. yay remotes')
                        var container = document.createElement('div');
                        container.className = 'videoDisplay';
                        container.id = 'container_' + webrtc.getDomId(peer);
                        container.appendChild(video);

                        // suppress contextmenu
                        video.oncontextmenu = function () { return false; };

                        // resize the video on click
                        video.onclick = function () {
                            //container.style.width = video.videoWidth + 'px';
                            //container.style.height = video.videoHeight + 'px';
                        };

                        // show the ice connection state
                        /*
                        if (peer && peer.pc) {
                            console.log('6. peer and peer.pc')
                            var connstate = document.createElement('div');
                            connstate.className = 'connectionstate';
                            container.appendChild(connstate);
                            peer.pc.on('iceConnectionStateChange', function (event) {
                                switch (peer.pc.iceConnectionState) {
                                case 'checking':
                                    connstate.innerText = 'Connecting to peer...';
                                    break;
                                case 'connected':
                                case 'completed': // on caller side
                                    $(vol).show();
                                    connstate.innerText = 'Connection established.';
                                    break;
                                case 'disconnected':
                                    connstate.innerText = 'Disconnected.';
                                    break;
                                case 'failed':
                                    connstate.innerText = 'Connection failed.';
                                    break;
                                case 'closed':
                                    connstate.innerText = 'Connection closed.';
                                    break;
                                }
                            });
                        }*/
                        remotes.appendChild(container);
                        
                        

                    }
                });
    

                //swap to video chat
                $('#switchToChat').on('click touch', function(){
                    webrtc.stopLocalVideo();
                    $('.videoWrap').hide();
                    $('.chatRoom').css('padding-top', '20px');
                    $('.displayMessagesWrap').show();
                    $('.sendMessagesWrap').show();
                    $('#user2').show();
                });


                $('#micOffButton').on('click touch', function() {
                    console.log('micSettings1: '+micSettings1);
                    if(String(micSettings1) == String(true)) {
                        webrtc.mute();
                        socket.emit('micChangeSetting', room, user1, false);
                        micSettings1 = false;
                    } else {
                        webrtc.unmute();
                        socket.emit('micChangeSetting', room, user1, true);
                        micSettings1 = true;
                    }
                });

                $('#videoOffButton').on('click touch', function() {
                    console.log('vidSettings1: '+vidSettings1);
                    if(String(vidSettings1) == String(true)) {
                        webrtc.pauseVideo();
                        socket.emit('vidChangeSetting', room, user1, false);
                        vidSettings1 = false;
                    } else {
                        webrtc.resumeVideo();
                        socket.emit('vidChangeSetting', room, user1, true);
                        vidSettings1 = true;
                    }
                });

                
                // a peer was removed
                webrtc.on('videoRemoved', function (video, peer) {
                    console.log('video removed ', peer);
                    
                    var remotes = document.getElementById('remotes');
                    var el = document.getElementById(peer ? 'container_' + webrtc.getDomId(peer) : 'localScreenContainer');
                    if (remotes && el) {
                        remotes.removeChild(el);
                    }
                });

                // local p2p/ice failure
                webrtc.on('iceFailed', function (peer) {
                    var connstate = document.querySelector('#container_' + webrtc.getDomId(peer) + ' .connectionstate');
                    console.log('local fail', connstate);
                    if (connstate) {
                        connstate.innerText = 'Connection failed.';
                        fileinput.disabled = 'disabled';
                    }
                });

                // remote p2p/ice failure
                webrtc.on('connectivityError', function (peer) {
                    var connstate = document.querySelector('#container_' + webrtc.getDomId(peer) + ' .connectionstate');
                    console.log('remote fail', connstate);
                    if (connstate) {
                        connstate.innerText = 'Connection failed.';
                        fileinput.disabled = 'disabled';
                    }
                });

        }


        socket.on('videoAccepted', function() {
            socket.emit('readyToCall', roomID);
            var userAccepted = user2;
            var userInitiated = user1;
            runWebRTC(userAccepted, userInitiated);
            socket.emit('vidChangeSetting', roomID, user1, true);
            vidSettings1 = true;
        });

        // acceot video chat request
        $(document).on('click touch', '#acceptVideo', function(){
            socket.emit('videoReady', roomID);
            var userInitiated = user2;
            var userAccepted = user1;
            runWebRTC(userAccepted, userInitiated);
            $('#rejectVideo, #acceptVideo').css('pointer-events', 'none');
            $('#rejectVideo, #acceptVideo').css('color', '#ebebeb');
        });

        // reject video chat
        $(document).on('click touch', '#rejectVideo', function(){
            socket.emit('sendChat', 'video rejected');
            $('#rejectVideo, #acceptVideo').css('pointer-events', 'none');
            $('#rejectVideo, #acceptVideo').css('color', '#ebebeb');
        });


        socket.on('micSettingChanged', function(data) {
            //-change image in mic settings
            if (String(data) === String(true)) {
                $('#micOffButton img').attr('src', '/images/icon-microphone-false.png');
            } else {
                $('#micOffButton img').attr('src', '/images/icon-microphone-true.png');
            }
        });

        socket.on('vidSettingChanged', function(data) {
            //-change image in vid settings
            if (String(data) === String(true)) {
                $('#videoOffButton > img').attr('src', '/images/icon-switchtoVideo-false.png');
            } else {
                $('#videoOffButton > img').attr('src', '/images/icon-switchtoVideo-true.png');
            }
        });

        /*
        $('#chat-btn-image').on('click touch', function() {
            $('#incoming').append('<li class="incomingMessage" id="user1msg"><label class="imageFileLabel"><input type="file" id="imagefile" accept="image/*">Choose an image</label></li><div class="speechbubble1"><img src="/images/speechtail_white.png"></div>');
        });
        */

        $(document).on('change', '#imageFile', function(e) {
            var file = e.originalEvent.target.files[0],
                reader = new FileReader();

            reader.onload = function(evt){
                socket.emit('image', evt.target.result);

            };
            reader.readAsDataURL(file);  
        });

        socket.on('sendImage', image);

        function image (from, base64Image) {
            $('#incoming').append('<li class="msgtime">'+ date + ' ' + time +'</li>');
            if(from === user1username) {
                $('#incoming').append('<li class="incomingMessage incomingImage" id="user1msg"><div class="sentImage"><img src="' + base64Image + '"></div></li><div class="speechbubble1"><img src="/images/speechtail_white.png"></div>');
            } else {
                $('#incoming').append('<div class="speechbubble2"><img src="/images/speechtail_blue.png"></div><li class="incomingMessage incomingImage" id="user2msg"><div class="sentImage"><img src="' + base64Image + '"></div></li>');
            }
        }

});