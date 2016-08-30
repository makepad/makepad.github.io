module.exports = require('/platform/service').extend(function worker1(proto, base){

	proto.onConstruct = function(){
		this.workers = []
	}

	proto.user_toParent = function(msg){
		// slap on the local ID
		msg.localId = this.worker.localId
		this.parent.batchMessages.push({
			$:'worker1',
			msg:msg
		})
		if(msg.transfers && msg.transfers.length){
			this.parent.batchTransfers.push.apply(this.parent.batchTransfers, msg.transfers)
		}
		var after = this.parent.onAfterEntry
		if(this.worker.afterEntryCallbacks.indexOf(after) === -1){
			this.worker.afterEntryCallbacks.push(after)
		}
	}

	proto.user_toWorker = function(msg){
		var worker = this.workers[msg.localId]

		worker.batchMessages.push({
			$:'worker1',
			msg:msg
		})
		if(msg.transfers && msg.transfers.length){
			worker.batchTransfers.push.apply(worker.batchTransfers, msg.transfers)
		}

		var after = worker.onAfterEntry
		if(this.worker.afterEntryCallbacks.indexOf(after) === -1){
			this.worker.afterEntryCallbacks.push(after)
		}
	}

	proto.pong = function(worker){
		this.postMessage({fn:'pong', localId: worker.localId})
	}

	proto.user_ping = function(msg){
		var worker = this.workers[msg.localId]
		worker.postMessage({$:'ping'})
	}

	proto.user_start = function(msg){
		// start a worker
		var worker = this.workers[msg.localId] = this.root.startWorker(
			msg.serviceList || this.worker.serviceList, 
			msg.platform || this.worker.platform, 
			this.worker
		)
		worker.localId = msg.localId
	}

	proto.user_init = function(msg){
		var worker = this.workers[msg.localId]
		this.root.initWorker(worker, msg.main, msg.resources, msg.init)
	}

	proto.user_terminate = function(msg){
		var worker = this.workers[msg.localId]
		worker.terminate()
	}
})