var bus = service.bus

var workers = []
var mainWorker = service.worker
bus.onMessage = function(msg){

	if(msg.fn === 'owner'){
		service.owner.batchMessages.push({
			$:'worker',
			msg:msg
		})
		if(msg.transfers && msg.transfers.length){
			service.owner.batchTransfers.push.apply(service.owner.batchTransfers, msg.transfers)
		}
		var post = service.owner.postEntry

		if(mainWorker.postFunctions.indexOf(post) === -1){
			mainWorker.postFunctions.push(post)
		}		
	}
	else if(msg.fn === 'worker'){
		var handle = workers[msg.workerId]
		var subWorker = handle.worker
		if(subWorker){
			subWorker.batchMessages.push({
				$:'worker',
				msg:msg
			})
			if(msg.transfers && msg.transfers.length){
				subWorker.batchTransfers.push.apply(subWorker.batchTransfers, msg.transfers)
			}
			var post = handle.worker.postEntry
			if(mainWorker.postFunctions.indexOf(post) === -1){
				mainWorker.postFunctions.push(post)
			}
		}
		else{
			handle.preInitQueue.push(msg)
			if(msg.transfers) handle.preInitTransfers.push.apply(handle.preInitTransfers, msg.transfers)
		}
	}
	else if(msg.fn === 'run'){
		var handle = workers[msg.workerId]
		if(handle){
			service.updateWorker(handle, msg.url, msg.function, msg.args)
		}
		else {
			workers[msg.workerId] = service.runWorker(msg.url, service.canvas, service.worker, msg.function,msg.args)
		}
	}
}