const path = require('path')
const http = require('http')
const express = require('express')
const hbs = require('hbs')
const socketio = require('socket.io')
const wordsFilter = require('bad-words')
const { generateLocation } = require('./utils/messages')
const { generateMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom, getOtherUserInRoom } = require('./utils/users')

const { api } = require('./api/api')
const { register } = require('./api/registration/registration')
const e = require('express')

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

app.use('/css', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/css')))
app.use('/js', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/js')))
app.use('/js', express.static(path.join(__dirname, '../node_modules/jquery/dist')))

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
        const user = getUser(socket.id)
        socket.to(user.room).emit('broadcaster', user.id);
    })
    
    socket.on('watcher', (id) => {
         socket.to(id).emit('watcher', socket.id);
    })
    
    socket.on('offer', (id, message) => {
        socket.to(id).emit('offer', socket.id, message);
    })
    
    socket.on('answer', (id, message) => {
        socket.to(id).emit('answer', socket.id, message);
    })

    // socket.on('candidate', (id, message) => {
    //     const user = getUser(socket.id)
    //     const toUser = getOtherUserInRoom(id)

    //     socket.to(toUser.id).emit('candidate', user.id, message);
    // })

    socket.on('candidateStream', (id, message) => {
        socket.to(id).emit('candidateStream', socket.id, message);
    })

    socket.on('candidateWatch', (id, message) => {
        socket.to(id).emit('candidateWatch', socket.id, message);
    })
    

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        const otherUser = getOtherUserInRoom(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`), 'ADMIN')
            io.to(user.room).emit('roomData', {
                room : user.room,
                users : getUsersInRoom(user.room)
            })
            if (otherUser) {
                socket.to(otherUser.id).emit('disconnectStream', user.id);
                socket.to(otherUser.id).emit('disconnectWatch', user.id);
            }
        }
    })
})

app.get('', (req, res) => {
    res.render('index', {
        title : 'Chat App',
    })
})


app.get('/registration', (req, res) => {
    res.render('view/registration-html/registration')
})

app.post('/api/register', register);

server.listen(port, () => {
    console.log('Server is up on port ' + port)
})