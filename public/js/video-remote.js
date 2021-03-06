let peerConnection
const config = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302']
    }
  ]
}

const socket = io()

const $videoRemote = document.querySelector('#remote')

socket.on('offer', (id, description) => {
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

window.onunload = window.onbeforeunload = () => {
  socket.close()
}