module.exports = class Service{
	constructor(root, worker, parent, platform, args){
		this.root = root
		this.worker = worker
		this.parent = parent
		this.platform = platform
		this.args = args
	}

	batchMessage(msg, transfers){
		if(this.debug) console.log("batch ",msg)
		this.worker.batchMessages.push({
			$:this.name,
			msg:msg
		})
		if(transfers){
			this.worker.batchTransfers.push.apply(this.worker.batchTransfers, transfers)
		}
	}

	postMessage(msg, transfers){
		if(this.debug) console.log("post ",msg)
		this.worker.postMessage({
			$:this.name,
			msg:msg
		}, transfers)
	}

	onMessage(msg){
		var name = 'user_' + msg.fn
		if(!this[name]){
			return console.log("User method "+name+' not found')
		}
		this[name](msg)
	}
}