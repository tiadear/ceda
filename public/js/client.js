'use strict';

$(window).on('load', function() {
  window.scrollTo(0,document.body.scrollHeight);
});

$(document).ready(function() {
    $('#nav-dash').on('click touch', function(){
        socket.emit('leaveRoom');
    });
});

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

        socket.on('addHistory', function(past) {
            past.forEach(function(pastItem) {
                //console.log('pastItem: '+pastItem);
                if(pastItem[0] === user1) {
                    $('#incoming').prepend('<li class="incomingMessage" id="user1msg">' + pastItem[2] + '</li><div class="speechbubble1"><img src="/images/speechtail_white.png"></div>');
                } else {
                    $('#incoming').prepend('<div class="speechbubble2"><img src="/images/speechtail_blue.png"></div><li class="incomingMessage" id="user2msg">' + pastItem[2] + '</li>');
                }

                var date = new Date(pastItem[4]);
                var dateformat = formatDate(date);
                        
                $('#incoming').prepend('<li class="msgtime">'+ dateformat +'</li>');
            });
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

            $('#incoming').append('<li class="msgtime">'+ time +'</li>');
            if(username == user1username) {
                $('#incoming').append('<li class="incomingMessage" id="user1msg">' + data + '</li><div class="speechbubble1"><img src="/images/speechtail_white.png"></div>');
            } else {
                $('#incoming').append('<div class="speechbubble2"><img src="/images/speechtail_blue.png"></div><li class="incomingMessage" id="user2msg">' + data + '</li>');
            }
            socket.emit('message', data);
        });




        // request to swap to video chat
        $('#chat-btn-video').on('click touch', function() {
            socket.emit('sendChat', 'video request');
        });

        $('#rejectVideo').on('click touch', function() {
            socket.emit('sendChat', 'video rejected');
        });


        function runWebRTC() {
            console.log('1. run web rtc reached');

            $('.displayMessagesWrap').hide();
            $('.sendMessagesWrap').hide();
            $('#user2').hide();
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

            webrtc.startLocalVideo();

                // we got access to the camera
                webrtc.on('localStream', function (stream) {
                    console.log('2. local stream added');
                    $('#localVolume').show();
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


                var micnumClicks = 1;
                var vidnumClicks = 1;

                $('#micOffButton').on('cilck touch', function() {
                    webrtc.mute();
                    micnumClicks++;
                    if(micnumClicks == 2) {
                        webrtc.unmute();
                        micnumClicks = 1;
                    }
                });

                $('#videoOffButton').on('click touch', function() {
                    webrtc.pauseVideo();
                    vidnumClicks++;
                    if(vidnumClicks == 2) {
                        webrtc.resumeVideo();
                        vidnumClicks = 1;
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
            runWebRTC();
        });

        //swap to video chat
        $(document).on('click touch', '#acceptVideo', function(){
            socket.emit('videoReady', roomID);
            runWebRTC();
        });


        

});