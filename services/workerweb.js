var worker = exports
var bus = service.bus

var workers = []
var worker = service.worker

bus.onmessage = function(msg){
	if(msg.fn === 'owner'){
		service.owner.batchmessages.push(msg)
		var post = service.owner.postEntry
		if(worker.postfunctions.indexOf(post) === -1){
			worker.postfunctions.push(post)
		}		
	}
	else if(msg.fn === 'worker'){
		var workerhandle = workers[msg.workerid]
		if(workerhandle.worker){
			workerhandle.worker.batchmessages.push(msg)
			var post = workerhandle.worker.postEntry
			if(worker.postfunctions.indexOf(post) === -1){
				worker.postfunctions.push(post)
			}
		}
		else{
			workerhandle.queue.push(msg)
		}
	}
	else if(msg.fn === 'run'){
		if(workers[msg.workerid]) return console.error("Running worker with existing ID!")
		workers[msg.workerid] = service.runWorker(msg.url, service.canvas, service.worker, msg.function, msg.workerid)
	}
}