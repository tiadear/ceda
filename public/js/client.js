

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
var myRoomID = null;

    $(function(){
        var msgSubmit = document.getElementById('outgoingSubmit');
        msgSubmit.disabled = true;

        $('#outgoing').keypress(function(e) {
            e.preventDefault();
        });


        if(roomID) {
            socket.emit('joinRoom', roomID, user1username, user2username);
            socket.emit('addUser', user1, user1username, function(data){
                if(data) {
                    console.log(user1username + ' has been added');
                    msgSubmit.disabled = false;

                    $('#outgoing').unbind('keypress');

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
                }

          });
        }

        socket.on('alertPeer', function(peerToBeAlerted, chatInitiator){
            //send notification

            console.log(chatInitiator + ' has sent a message to ' + peerToBeAlerted);
        });

        socket.on('addHistory', function(past) {
            past.forEach(function(pastItem) {
                if(pastItem.user == user1username) {
                  $('#incoming').prepend('<li class="incomingMessage" id="user1msg">' + pastItem.user + ': ' + pastItem.message + '</li><div class="speechbubble1"><img src="/images/speechtail_white.png"></div>');
                } else {
                  $('#incoming').prepend('<div class="speechbubble2"><img src="/images/speechtail_blue.png"></div><li class="incomingMessage" id="user2msg">' + pastItem.user + ': ' + pastItem.message + '</li>');
                }
                $('#incoming').prepend('<li class="msgtime">'+ pastItem.timesent +'</li>');
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

        var datetime = "time sent: " + new Date().today() + " @ " + new Date().timeNow();





        //update the incoming chat window
        socket.on('updateChat', function(username, data) {
          $('#incoming').append('<li class="msgtime">'+ datetime +'</li>');
          if(username == user1username) {
            $('#incoming').append('<li class="incomingMessage" id="user1msg">' + username + ': ' + data + '</li><div class="speechbubble1>"<img src="/images/speechtail_white.png"></div>');
          } else {
            $('#incoming').append('<div class="speechbubble2>"<img src="/images/speechtail_blue.png"></div><li class="incomingMessage" id="user2msg">' + username + ': ' + data + '</li>');
          }
            socket.emit('message', data);
        });







        var typing = false;
        var timeout = undefined;

        function timeoutFunction() {
            typing = false;
            socket.emit("isTyping", false);
        }

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





        //swap to video chat
        $('#swaptovideo').on('click', function(){
            console.log('is anything happening?');
            $('#videoDisplay').show();
        });






        /*
        socket.on('createdRoom', function() {
            console.log('room ready');
            isChannelReady = true;
            isInitiator = true;
        });
        */

        function sendMessage(message) {
            console.log('Client sending message: ', message);
            socket.emit('message', message);
        }

        socket.on('channelReady', function() {
            console.log('channelReady ready');
            isChannelReady = true;
            isInitiator = true;
        });

        socket.on('message', function(message) {
            if (message === 'got user media') {
                maybeStart();
            } else if (message.type === 'offer') {
                if (!isInitiator && !isStarted) {
                    maybeStart();
                }
                pc.setRemoteDescription(new RTCSessionDescription(message));
                doAnswer();
            } else if (message.type === 'answer' && isStarted) {
                pc.setRemoteDescription(new RTCSessionDescription(message));
            } else if (message.type === 'candidate' && isStarted) {
                var candidate = new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate
                });
                pc.addIceCandidate(candidate);
            } else if (message === 'bye' && isStarted) {
                handleRemoteHangup();
            }
        });

        /////////////////////////////////////////////////////////////////////////
        /////////////////////////////////////////////////////////////////////////
        // WebRTC STUFF

        var localVideo = document.querySelector('#localVideo');
        var remoteVideo = document.querySelector('#remoteVideo');

        var startButton = document.getElementById('startButton');
        var callButton = document.getElementById('callButton');
        var hangupButton = document.getElementById('hangupButton');
        var muteButton = document.getElementById('muteButton');

        callButton.disabled = true;
        muteButton.disabled = true;
        hangupButton.disabled = true;
        startButton.onclick = start;
        callButton.onclick = call;
        hangupButton.onclick = hangup;

        function gotStream(stream) {
            console.log('Adding local stream.');
            localVideo.src = window.URL.createObjectURL(stream);
            localStream = stream;
            sendMessage('got user media');
            if (isInitiator) {
                callButton.disabled = false;
            }
        }

        function start() {
            startButton.disabled = true;
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

        function handleRemoteStreamAdded(event) {
            console.log('Remote stream added.');
            remoteVideo.src = window.URL.createObjectURL(event.stream);
            remoteStream = event.stream;
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



    });