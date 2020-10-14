const path = require('path')
const http = require('http')
const express = require('express')
const hbs = require('hbs')
const socketio = require('socket.io')
const wordsFilter = require('bad-words')
const { generateLocation } = require('./utils/messages')
const { generateMessage } = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')
const users = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

const viewsPath = path.join(__dirname, '../templates/views')
const partialsPath = path.join(__dirname, '../templates/partials')

// Setup handlebars engine and views location
app.set('view engine', 'hbs')
app.set('views', viewsPath)
hbs.registerPartials(partialsPath)

// Setup static directory to serve
app.use(express.static(publicDirectoryPath))


io.on('connection', (socket) => {
    
    socket.on('join', ({ username, room }, callback) => {
        const { error, user} = addUser( { id: socket.id, username, room})

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Welcome!'), 'ADMIN')
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`), 'ADMIN')
        io.to(user.room).emit('roomData', {
            room : user.room,
            users : getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('userMessage', (message, callback) => {
        const filter = new wordsFilter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(message), user.username)
        callback()
    })

    socket.on('userLocation', (message, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('located', generateLocation(message), user.username)
        callback()
    })

    socket.on('broadcaster', () => {
        socket.broadcast.emit("broadcaster");
    });
    
    socket.on('watcher', () => {
        const user = getUser(socket.id)

        io.to(user.room).emit('watcher', user.id);
    });
    
    socket.on('offer', (room, message) => {
        const user = getUser(socket.id)

        io.to(room).emit('offer', user.id, message);
    });
    
    socket.on('answer', (room, message) => {
        const user = getUser(socket.id)

        socket.to(room).emit('answer', user.id, message);
    });
    
    socket.on('candidate', (room, message) => {
        const user = getUser(socket.id)

        socket.to(room).emit('candidate', user.id, message);
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`), 'ADMIN')
            io.to(user.room).emit('roomData', {
                room : user.room,
                users : getUsersInRoom(user.room)
            })
            io.to(user.room).emit('disconnectPeer', user.id);
        }
    })
})

app.get('', (req, res) => {
    res.render('index', {
        title : 'Chat App',
    })
})

server.listen(port, () => {
    console.log('Server is up on port ' + port)
})