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

socket.on('roomData', ({ room, users}) => {
  console.log('Room Data Listener')
  if (users.length > 1) {
    console.log('Call Broadcaster')
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      var constraints = {
          audio: true
          // video: { facingMode: 'user' }
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
  const connection = new RTCPeerConnection(config)
  peerConnections[id] = connection

  let stream = $videoLocal.srcObject
    stream.getTracks().forEach(track => connection.addTrack(track, stream))

    connection
      .createOffer()
      .then(sdp => connection.setLocalDescription(sdp))
      .then(() => {
        console.log('Call Offer')
        socket.emit('offer', id, connection.localDescription)
    })

    connection.onicecandidate = event => {
      if (event.candidate) {
        console.log('Call Candidate Local')
        socket.emit('candidateWatch', id, event.candidate)
      }
    }
})

socket.on('answer', (id, description) => {
  console.log('Answer Listener')
  peerConnections[id].setRemoteDescription(description)
})

socket.on('candidateStream', (id, candidate) => {
  console.log('Candidate Stream Listener')
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e))
})

socket.on('candidateWatch', (id, candidate) => {
  console.log('Candidate Watch Listener')
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e))
})


socket.on('offer', (id, description) => {
    console.log('Offer Listener with' + id)
    peerConnection = new RTCPeerConnection(config)
    peerConnection
      .setRemoteDescription(description)
      .then(() => peerConnection.createAnswer())
      .then(sdp => peerConnection.setLocalDescription(sdp))
      .then(() => {
        console.log('Call Anwser with' + id)
        socket.emit('answer', id, peerConnection.localDescription)
      })

    
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          console.log('Call Candidate')
          socket.emit('candidateStream', id, event.candidate)
        }
      }
      
      peerConnection.ontrack = event => {
        $videoRemote.srcObject = event.streams[0]
      }
})
  
socket.on('broadcaster', (id) => {
    console.log('Broadcaster Listener')
    console.log('Call Watcher')
    socket.emit('watcher', id)
})

socket.on('disconnectStream', id => {
  console.log('Disconnet Streaming Peer Listener')

  peerConnections[id].close()
  delete peerConnections[id]
})

socket.on('disconnectWatch', id => {
  console.log('Disconnet Watching Peer Listener')

  peerConnection.close()
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