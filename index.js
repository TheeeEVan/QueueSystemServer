// import all the things
const express = require("express")
const app = express()
const http = require("http")
const server = http.createServer(app)
const { Server } = require("socket.io")
const cors = require('cors')
const generateUniqueId = require('generate-unique-id');

app.use(cors())

// create new instance of server allowing all possible urls through cors
const io = new Server(server, { 
	cors: {
		origin: [
			"http://localhost:5500",
			"http://127.0.0.1:5500",
			"https://QueueSystem.evananderson13.repl.co",
			"https://theeeevan.github.io"
		],
		allowedHeaders: [
			"type"
		]
	}
})

/* IMPORTANT VARIABLE THINGS USED THROUGHOUT THE APP */
// this object will contain all of the queues and data about them
let queues = {
	/*
	"12345": {
		users: [{ name: "Evan", id: "COOLID"}],
		options: {
			"duplicates": false,
		}
	}*/
}

// all connections
let connections = {
	/*
	"1234": {
		type: "host",
		socket: socket
	},
	"5678": {
		type: "client",
		socket: socket
	}
	*/
}

// on connection
io.on("connection", (socket) => {
	// actions to perform on connection
	// create id for user
	let id = generateUniqueId({ length: 4, useLetters: true })

	// make sure id doesnt exist already so we can have the full 1,679,616 max users (this is exact)
	while (Object.keys(connections).includes(id)) {
		// make a new id cause the old one sucks
		id = generateUniqueId({ length: 4, useLetters: true })
	}

	// add user to list of connections
	connections[id] = {
		type: socket.handshake.headers.type,
		// we store the socket here so we can access it anywhere
		socket: socket
	}

	// send user their id to be logged or if host, displayed
	socket.emit("id", id)

	// ALL EVENTS
	// on disonnect delete everything
	socket.on("disconnect", () => {
		// does user have queue
		if (queues[id]) {
			// tell each user in queue to go away
			queues[id].users.forEach(user => {
				connections[user.id].socket.emit("disconnected", {reason: "Lost connection to server."})
			})
			// destroy the queue cause it has no friends and all its users went away
			delete queues[id]
		} else if (socket.handshake.headers.type == "client") {
			// go through all the queues in queues yes
			for (let queue in queues) {
				// its 4am and i have to write this algorithm save me
				// for every queue's users
				queues[queue].users.forEach((user, index) => {
					// if user id is the same we remove that id from queue and update
					if (user.id == id) {
						if (index > 0) {
							queues[queue].users.splice(index, 1);
							updateQueue(connections[queue].socket, queue)
						}
					}
				})
			}
		}
		// delete the connection
		delete connections[id]
	})

	// HOST EVENTS
	// make user a queue, in production this fires immediatly after initial connection if user is a host
	socket.on("create-queue", (data) => {
		// ensure user is host
		if (connections[id].type == "host") {
			// add a queue with users id
			queues[id] = {
				users: [],
				options: data
			}

			updateQueue(socket, id)
		}
	})

	socket.on("next", () => {
		// check if queue exists
		if (queues[id]) {
			if (queues[id].users.length > 0) {
				// remove first user and store in variable
				let removed = queues[id].users.splice(0, 1)

				// notify removed user
				if (connections[removed[0].id]) {
					connections[removed[0].id].socket.emit("disconnected", {reason: "first"})
				}
				// update queue
				updateQueue(socket, id);
			}
		}
	})

	socket.on("kick", (data) => {
		// make sure queue exists
		if (queues[id]) {
			// go trough all users
			for (var i = 0; i < queues[id].users.length; i++) {
				// if this is the user we want
				if (queues[id].users[i].name == data) {
					// kick that user
					let removed = queues[id].users.splice(i, 1)

					connections[removed[0].id].socket.emit("disconnected", {reason: "You have been kicked from the queue."})
					updateQueue(socket, id)
				}
			}
		}
	})

	// CLIENT EVENTS
	socket.on("join-queue", (data) => {
		// ensure user is client
		if (connections[id].type == "client") {
			// check if queue exists
			if (queues[data.id.toLowerCase()]) {
				// if no duplicates
				if (!queues[data.id.toLowerCase()].options.duplicates) {
					// this changes based on next test
					let exists = false

					queues[data.id.toLowerCase()].users.forEach(user => {
						// for every user check if name is the current one
						if (user.name.toLowerCase() == data.name.toLowerCase()) {
							// if it is being used set exists to true
							exists = true
						}
					})

					// if exists is true send error otherwise add normally
					if (exists) {
						socket.emit("join-status", { status: 0, reason: "That name is being used!" })
					} else {
						// add user object to queue
						queues[data.id.toLowerCase()].users.push({ name: data.name, id: id })
						// update this hosts queue
						updateQueue(connections[data.id.toLowerCase()].socket, data.id.toLowerCase())
						// send response to user
						socket.emit("join-status", { status: 1, reason: "Joined" })
					}
				} else {
					// add user object to queue
					queues[data.id.toLowerCase()].users.push({ name: data.name, id: id })
					// update this hosts queue
					updateQueue(connections[data.id.toLowerCase()].socket, data.id.toLowerCase())
					// send response to user
					socket.emit("join-status", { status: 1, reason: "Joined" })
				}
			} else {
				socket.emit("join-status", {status: 0, reason: "Invalid queue code!"})
			}
		}
	})
})

function updateQueue(socket, id) {
	// update host list
	socket.emit("update", queues[id].users)

	// update user positions
	queues[id].users.forEach((user, key) => {
		connections[user.id].socket.emit("position", {current: key + 1, total: queues[id].users.length})
	})
}

server.listen(process.env.PORT || 3000)
