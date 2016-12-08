let socket = require('services/socket')

socket.postMessage("Hello from worker")

socket.onMessage = function(msg){
	console.log("WE GOT", msg)
}
