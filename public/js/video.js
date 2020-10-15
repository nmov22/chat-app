let peerConnection
const peerConnections = {}
const config = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302']
    }
  ]
}

const socket = io()

const $videoLocal = document.querySelector('#local')
const $videoRemote = document.querySelector('#remote')

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix : true })

// Media contraints

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    var constraints = {
        audio: true,
        video: { facingMode: 'user' }
    }
    
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        $videoLocal.srcObject = stream
        ocket.emit('broadcaster')
    })
    .catch(err =>  console.log (err))
} else {
  console.log ('navigator.mediaDevices not supported')
}

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

socket.on('offer', (id, description) => {
    console.log('Offer called')
    peerConnection = new RTCPeerConnection(config)
    peerConnection
      .setRemoteDescription(description)
      .then(() => peerConnection.createAnswer())
      .then(sdp => peerConnection.setLocalDescription(sdp))
      .then(() => {
        socket.emit('answer', id, peerConnection.localDescription)
      })
  
    peerConnection.ontrack = event => {
      $videoRemote.srcObject = event.streams[0]
    }
  
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('candidate', id, event.candidate)
      }
    }
})
  
socket.on('candidate', (id, candidate) => {
    peerConnection
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch(e => console.error(e))
})
  
socket.on('broadcaster', () => {
    socket.emit('watcher')
})
  
socket.on('disconnectPeer', () => {
    peerConnection.close()
})

socket.emit('join', { username, room}, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})

window.onunload = window.onbeforeunload = () => {
  socket.close()
}