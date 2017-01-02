let socket = require('services/socket')

socket.postMessage({controller:0,buzzer:0,led:true})

socket.onMessage = function(msg){
	console.log("WE GOT", msg)
}
