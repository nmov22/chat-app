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

socket.on('roomData', ({ room, users}) => {
  console.log('Room Data Listener')
  if (users.length > 1) {
    console.log('Call Broadcaster')
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      var constraints = {
          // audio: true
          video: { facingMode: 'user' }
      }
      
      navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
          $videoLocal.srcObject = stream
          socket.emit('broadcaster')        
      })
      .catch(err =>  console.log (err))
    } else {
      console.log ('navigator.mediaDevices not supported')
    }
  }
})

socket.on('watcher', id => {
  console.log('Watcher Listener')
  const peerConnection = new RTCPeerConnection(config)
  peerConnections[id] = peerConnection

  let stream = $videoLocal.srcObject
    stream.getTracks().forEach(track => peerConnections[id].addTrack(track, stream))

    peerConnections[id]
      .createOffer()
      .then(sdp => peerConnections[id].setLocalDescription(sdp))
      .then(() => {
        console.log('Call Offer')
        socket.emit('offer', id, peerConnections[id].localDescription)
    })

    peerConnections[id].onicecandidate = event => {
      if (event.candidate) {
        console.log('Call Candidate Local')
        socket.emit('candidate', id, event.candidate)
      }
    }
})

socket.on('answer', (id, description) => {
  console.log('Answer Listener')
  peerConnections[id].setRemoteDescription(description)
})

socket.on('candidate', (id, candidate) => {
  console.log('Candidate Remote Listener')
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e))
})

socket.on('offer', (id, description) => {
    console.log('Offer Listener with' + id)
    peerConnections[id] = new RTCPeerConnection(config)
    peerConnections[id]
      .setRemoteDescription(description)
      .then(() => peerConnections[id].createAnswer())
      .then(sdp => peerConnections[id].setLocalDescription(sdp))
      .then(() => {
        console.log('Call Anwser with' + id)
        socket.emit('answer', id, peerConnections[id].localDescription)
      })
  
    peerConnections[id].ontrack = event => {
      $videoRemote.srcObject = event.streams[0]
    }
  
    peerConnections[id].onicecandidate = event => {
      if (event.candidate) {
        console.log('Call Candidate')
        socket.emit('candidate', id, event.candidate)
      }
    }
})
  

  
socket.on('broadcaster', () => {
    console.log('Broadcaster Listener')
    console.log('Call Watcher')
    socket.emit('watcher')
})

socket.on('disconnectPeer', id => {
  console.log('Disconnet Peer Listener')

  peerConnections[id].close()
  delete peerConnections[id]
})

socket.emit('join', { username, room}, (error) => {
  console.log('Call Join')
  if (error) {
      alert(error)
      return location.href = '/'
  }
})

window.onunload = window.onbeforeunload = () => {
  socket.close()
}