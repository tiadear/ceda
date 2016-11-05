'use strict';
/*
$(window).on('load', function() {
  window.scrollTo(0,document.body.scrollHeight);
});
*/
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

        function formatDate(d) {
            var day = d.getDate();
            var month = d.getMonth();
            var year = d.getFullYear();
            var hour = d.getHours();
            var minutes = d.getMinutes();
            return day + '/' + month + '/' + year + ' ' + hour + ':' + minutes;
        }

        socket.on('addHistory', function(past) {
            past.forEach(function(pastItem) {
                if(pastItem.user == user1username) {
                    $('#incoming').prepend('<li class="incomingMessage" id="user1msg">' + pastItem.message + '</li><div class="speechbubble1"><img src="/images/speechtail_white.png"></div>');
                } else {
                    $('#incoming').prepend('<div class="speechbubble2"><img src="/images/speechtail_blue.png"></div><li class="incomingMessage" id="user2msg">' + pastItem.message + '</li>');
                }

                var date = new Date(pastItem.timesent);
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








        //swap to video chat
        $('#chat-btn-video').on('click touch', function(){
            socket.emit('videoReady', roomID);
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
                console.log('2. ready to call');
                if (room) {
                    console.log('3. webrtc join room');
                    webrtc.joinRoom(room);
                }
            });

            $('#callButton').on('click touch', function() {
                console.log('call button clicked');
                webrtc.startLocalVideo();

                // we got access to the camera
                webrtc.on('localStream', function (stream) {
                    console.log('1. local stream');
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
                    console.log('4. video added', peer);
                    var remotes = document.getElementById('remotes');
                    if (remotes) {
                        console.log('5. yay remotes')
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

            $('#muteButton').on('cilck touch', function() {
                webrtc.mute();
                numClicks++;
                if(numClicks == 2) {
                    webrtc.unmute();
                    numClicks = 0;
                }
            });

            $('#killVideoButton').om('click touch', function() {
                webrtc.stopLocalVideo();
                numClicks++;
                if(numClicks == 2) {
                    webrtc.startLocalVideo();
                    numClicks = 0;
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
            /*
            // Since we use this twice we put it here
            function setRoom(name) {
                //document.getElementById('title').innerText = 'Room: ' + name;
                //document.getElementById('subTitle').innerText =  'Link to join: ' + location.href;
                $('body').addClass('active');
            }

            if (room) {
                setRoom(room);
            } else {
                $('form').submit(function () {
                    var val = $('#sessionInput').val().toLowerCase().replace(/\s/g, '-').replace(/[^A-Za-z0-9_\-]/g, '');
                    webrtc.createRoom(val, function (err, name) {
                        console.log(' create room cb', arguments);

                        var newUrl = location.pathname + '?' + name;
                        if (!err) {
                            history.replaceState({foo: 'bar'}, null, newUrl);
                            setRoom(name);
                        } else {
                            console.log(err);
                        }
                    });
                    return false;
                });
            }

        */

        });

        















/*



        // This client receives a message
        socket.on('message', function(message) {
            console.log('Client received message:', message);
            
            if (message === 'got user media') {
                maybeStart();
            }
            
            else if (message.type === 'offer') {
                if (!isInitiator && !isStarted) {
                    maybeStart();
                }
                
                pc.setRemoteDescription(new RTCSessionDescription(message));
                doAnswer();
            } 

            else if (message.type === 'answer' && isStarted) {
                pc.setRemoteDescription(new RTCSessionDescription(message));
            } 
            
            else if (message.type === 'candidate' && isStarted) {
                var candidate = new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate
                });
                
                pc.addIceCandidate(candidate);
            }

            else if (message === 'bye' && isStarted) {
                handleRemoteHangup();
                socket.emit('disconnect');
            }
        });

        

    ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////
    // WebRTC STUFF

        var localVideo = document.querySelector('#localVideo');
        var remoteVideo = document.querySelector('#remoteVideo');

        var callButton = document.getElementById('callButton');
        var hangupButton = document.getElementById('hangupButton');
        var muteButton = document.getElementById('muteButton');

        callButton.disabled = true;
        muteButton.disabled = true;
        hangupButton.disabled = true;
        callButton.onclick = call;
        hangupButton.onclick = hangup;

        function gotStream(stream) {
            console.log('Adding local stream.');
            localVideo.src = window.URL.createObjectURL(stream);
            localStream = stream;
            sendMessage('got user media');
            if (isInitiator) {
                //maybeStart();
                callButton.disabled = false;
            }
        }

        function start() {
            muteButton.disabled = false;
            navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true
            })
            .then(gotStream)
            .catch(function(e) {
                alert('getUserMedia() error: ' + e.name);
            });
        }

        function call() {
            callButton.disabled = true;
            maybeStart();
        }
        
        var constraints = {
            video: true
        };

        console.log('Getting user media with constraints', constraints);

        if (location.hostname !== 'localhost') {
            requestTurn(
                'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
            );
        }

        function maybeStart() {
            console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
            if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
                console.log('>>>>>> creating peer connection');
                createPeerConnection();
                pc.addStream(localStream);
                isStarted = true;
                hangupButton.disabled = false;
                console.log('isInitiator', isInitiator);
                
                if (isInitiator) {
                    doCall();
                }
            }
        }

        window.onbeforeunload = function() {
            sendMessage('bye');
        };

        /////////////////////////////////////////////////////////

        function createPeerConnection() {
            try {
                pc = new RTCPeerConnection(null);
                pc.onicecandidate = handleIceCandidate;
                pc.onaddstream = handleRemoteStreamAdded;
                pc.onremovestream = handleRemoteStreamRemoved;
                console.log('Created RTCPeerConnnection');
            } catch (e) {
                console.log('Failed to create PeerConnection, exception: ' + e.message);
                alert('Cannot create RTCPeerConnection object.');
                return;
            }
        }

        function handleIceCandidate(event) {
            console.log('icecandidate event: ', event);
            if (event.candidate) {
                sendMessage({
                    type: 'candidate',
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate
                });
            } else {
                console.log('End of candidates.');
            }
        }

        function handleRemoteStreamAdded(event) {
            console.log('Remote stream added.');
            remoteVideo.src = window.URL.createObjectURL(event.stream);
            remoteStream = event.stream;
        }

        function handleCreateOfferError(event) {
            console.log('createOffer() error: ', event);
        }

        function doCall() {
            console.log('Sending offer to peer');
            pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
        }

        function doAnswer() {
            console.log('Sending answer to peer.');
            pc.createAnswer().then(
                setLocalAndSendMessage,
                onCreateSessionDescriptionError
            );
        }

        function setLocalAndSendMessage(sessionDescription) {
            // Set Opus as the preferred codec in SDP if Opus is present.
            //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
            pc.setLocalDescription(sessionDescription);
            console.log('setLocalAndSendMessage sending message', sessionDescription);
            sendMessage(sessionDescription);
        }

        function onCreateSessionDescriptionError(error) {
            trace('Failed to create session description: ' + error.toString());
        }

        function requestTurn(turnURL) {
            var turnExists = false;
            for (var i in pcConfig.iceServers) {
                if (pcConfig.iceServers[i].url.substr(0, 5) === 'turn:') {
                    turnExists = true;
                    turnReady = true;
                    break;
                }
            }
            
            if (!turnExists) {
                console.log('Getting TURN server from ', turnURL);
                // No TURN server. Get one from computeengineondemand.appspot.com:
                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        var turnServer = JSON.parse(xhr.responseText);
                        console.log('Got TURN server: ', turnServer);
                        pcConfig.iceServers.push({
                            'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
                            'credential': turnServer.password
                        });
                        turnReady = true;
                    }
                };
                xhr.open('GET', turnURL, true);
                xhr.send();
            }
        }

        function handleRemoteStreamRemoved(event) {
            console.log('Remote stream removed. Event: ', event);
        }

        function hangup() {
            console.log('Hanging up.');
            stop();
            sendMessage('bye');
            hangupButton.disabled = true;
            callButton.disabled = false;
        }

        function mute() {
            console.log('mute');
            stream.getAudioTracks()[0].enabled = false;
        }

        function handleRemoteHangup() {
            console.log('Session terminated.');
            stop();
            isInitiator = false;
        }

        function stop() {
            isStarted = false;
            // isAudioMuted = false;
            // isVideoMuted = false;
            pc.close();
            pc = null;
        }

        ///////////////////////////////////////////

        // Set Opus as the default audio codec if it's present.
        function preferOpus(sdp) {
            var sdpLines = sdp.split('\r\n');
            var mLineIndex;
            // Search for m line.
            for (var i = 0; i < sdpLines.length; i++) {
                if (sdpLines[i].search('m=audio') !== -1) {
                    mLineIndex = i;
                    break;
                }
            }
            if (mLineIndex === null) {
                return sdp;
            }

            // If Opus is available, set it as the default in m line.
            for (i = 0; i < sdpLines.length; i++) {
                if (sdpLines[i].search('opus/48000') !== -1) {
                    var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
                    if (opusPayload) {
                        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex],
                        opusPayload);
                    }
                    break;
                }
            }

            // Remove CN in m line and sdp.
            sdpLines = removeCN(sdpLines, mLineIndex);

            sdp = sdpLines.join('\r\n');
            return sdp;
        }

        function extractSdp(sdpLine, pattern) {
            var result = sdpLine.match(pattern);
            return result && result.length === 2 ? result[1] : null;
        }

        // Set the selected codec to the first in m line.
        function setDefaultCodec(mLine, payload) {
            var elements = mLine.split(' ');
            var newLine = [];
            var index = 0;
            for (var i = 0; i < elements.length; i++) {
                if (index === 3) { // Format of media starts from the fourth.
                    newLine[index++] = payload; // Put target payload to the first.
                }
                if (elements[i] !== payload) {
                    newLine[index++] = elements[i];
                }
            }
            return newLine.join(' ');
        }

        // Strip CN from sdp before CN constraints is ready.
        function removeCN(sdpLines, mLineIndex) {
            var mLineElements = sdpLines[mLineIndex].split(' ');
            // Scan from end for the convenience of removing an item.
            for (var i = sdpLines.length - 1; i >= 0; i--) {
                var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
                if (payload) {
                    var cnPos = mLineElements.indexOf(payload);
                    if (cnPos !== -1) {
                        // Remove CN payload from m line.
                        mLineElements.splice(cnPos, 1);
                    }
                    // Remove CN line in sdp
                    sdpLines.splice(i, 1);
                }
            }

            sdpLines[mLineIndex] = mLineElements.join(' ');
            return sdpLines;
        }

    */

    //}

});