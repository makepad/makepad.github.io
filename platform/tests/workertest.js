
var worker = require('services/worker')(function(){
	var owner = require('services/worker')

	owner.onMessage = function(msg){
		console.log("GOT MESSAGE FROM OWNER", msg)
	}
	//for(let i = 0; i < 10000000000000;i++);
	owner.postMessage("ho!")
})

worker.postMessage("hi")

worker.onMessage = function(msg){
	console.log("got message from worker", msg)
}

worker.ping(1000)
worker.onPingTimeout = function(){
	worker.terminate()
}
