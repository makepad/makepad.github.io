module.exports = class worker1 extends require('/platform/service'){

	constructor(...args){
		super(...args)
		this.workers = []
	}

	user_toParent(msg){
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

	user_toWorker(msg){
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

	pong(worker){
		this.postMessage({fn:'pong', localId: worker.localId})
	}

	user_ping(msg){
		var worker = this.workers[msg.localId]
		worker.postMessage({$:'ping'})
	}

	user_start(msg){
		// start a worker
		var worker = this.workers[msg.localId] = this.root.startWorker(
			msg.serviceList || this.worker.serviceList, 
			msg.platform || this.worker.platform, 
			this.worker
		)
		worker.localId = msg.localId
	}

	user_init(msg){
		var worker = this.workers[msg.localId]
		this.root.initWorker(worker, msg.main, msg.resources, msg.init)
	}

	user_terminate(msg){
		var worker = this.workers[msg.localId]
		worker.terminate()
	}
}