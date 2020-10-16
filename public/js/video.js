let peerConnection
const peerConnections = {}
const config = {
  iceServers: [
    {
      urls: ['stun.l.google.com:19302',
        'stun1.l.google.com:19302',
        'stun2.l.google.com:19302',
        'stun3.l.google.com:19302',
        'stun4.l.google.com:19302',
        'stun01.sipphone.com',
        'stun.ekiga.net',
        'stun.fwdnet.net',
        'stun.ideasip.com',
        'stun.iptel.org',
        'stun.rixtelecom.se',
        'stun.schlund.de',
        'stunserver.org',
        'stun.softjoys.com',
        'stun.voiparound.com',
        'stun.voipbuster.com',
        'stun.voipstunt.com',
        'stun.voxgratia.org',
        'stun.xten.com']
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
          // audio: true,
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
  
    peerConnection.ontrack = event => {
      $videoRemote.srcObject = event.streams[0]
    }
  
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        console.log('Call Candidate')
        socket.emit('candidateStream', id, event.candidate)
      }
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