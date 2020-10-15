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

socket.on('watcher', id => {
    console.log('Watcher Listener')
  const peerConnection = new RTCPeerConnection(config)
  peerConnections[id] = peerConnection

  let stream = $videoLocal.srcObject
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
    
    peerConnection
      .createOffer()
      .then(sdp => peerConnection.setLocalDescription(sdp))
      .then(() => {
        console.log('Call Offer')
        socket.emit('offer', id, peerConnection.localDescription)
    })

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        console.log('Call Candidate Local')
        socket.emit('candidateLocal', id, event.candidate)
      }
    }
})

socket.on('answer', (id, description) => {
    console.log('Answer Listener')
  peerConnections[id].setRemoteDescription(description)
})

socket.on('candidateRemote', (id, candidate) => {
console.log('Candidate Remote Listener')
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate))
})

socket.on('offer', (id, description) => {
    console.log('Offer Listener')
    peerConnection = new RTCPeerConnection(config)
    peerConnection
      .setRemoteDescription(description)
      .then(() => peerConnection.createAnswer())
      .then(sdp => peerConnection.setLocalDescription(sdp))
      .then(() => {
        console.log('Call Anwser')
        socket.emit('answer', id, peerConnection.localDescription)
      })
  
    peerConnection.ontrack = event => {
      $videoRemote.srcObject = event.streams[0]
    }
  
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        console.log('Call Candidate')
        socket.emit('candidateRemote', id, event.candidate)
      }
    }
})
  
socket.on('candidateLocal', (id, candidate) => {
    console.log('Candidate Local Listener')
    peerConnection
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch(e => console.error(e))
})
  
socket.on('broadcaster', () => {
    console.log('Broadcaster Listener')
    console.log('Call Watcher')
    socket.emit('watcher')
})

socket.on('disconnectPeer', id => {
  console.log('Disconnet Peer Listener')
  peerConnection.close()

  peerConnections[id].close()
  delete peerConnections[id]
})

socket.emit('join', { username, room}, (error) => {
  console.log('Call Join')
  if (error) {
      alert(error)
      return location.href = '/'
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    var constraints = {
        // audio: true
        video: { facingMode: 'user' }
    }
    
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        $videoLocal.srcObject = stream
        console.log('Call Broadcaster')
        socket.emit('broadcaster')
        
    })
    .catch(err =>  console.log (err))
  } else {
    console.log ('navigator.mediaDevices not supported')
  }
})

window.onunload = window.onbeforeunload = () => {
  socket.close()
}