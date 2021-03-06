const peerConnections = {}

const $videoLocal = document.querySelector('#local')

// Media contraints

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  var constraints = {
      audio: true,
      video: { facingMode: 'user' }
  };

  navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        $videoLocal.srcObject = stream;
        $videoLocal.onloadedmetadata = function(e) {
          $videoLocal.play();
        };
        socket.emit('broadcaster')
      })
      .catch(err =>  console.log (err))
}
else {
  console.log ('navigator.mediaDevices not supported')
}

// var constraints = {
//     video: true,
//     audio: true
// }

// navigator.mediaDevices
//   .getUserMedia(constraints)
//   .then(stream => {
//     $videoLocal.srcObject = stream
//     socket.emit('broadcaster')
//   })  
//   .catch(error => console.error(error))

socket.on('watcher', id => {
  const peerConnection = new RTCPeerConnection(config)
  peerConnections[id] = peerConnection

  let stream = $videoLocal.srcObject
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
    
    peerConnection
      .createOffer()
      .then(sdp => peerConnection.setLocalDescription(sdp))
      .then(() => {
        socket.emit('offer', id, peerConnection.localDescription)
    })

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('candidate', id, event.candidate)
      }
    }
})

socket.on('answer', (id, description) => {
  peerConnections[id].setRemoteDescription(description)
})

socket.on('candidate', (id, candidate) => {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate))
})

socket.on('disconnectPeer', id => {
  peerConnections[id].close()
  delete peerConnections[id]
})

window.onunload = window.onbeforeunload = () => {
  socket.close()
}