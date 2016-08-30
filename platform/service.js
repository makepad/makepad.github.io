function extend(body){

	var proto = Object.create(this.prototype)

	function Service(root, worker, parent, platform, args){
		this.platform = platform
		this.args = args
		this.root = root
		this.worker = worker
		this.parent = parent
		if(this.onConstruct) this.onConstruct()
	}

	Service.prototype = proto
	Service.extend = extend

	if(typeof body === 'object'){
		for( var key in body) proto[key] = body[key]
	}
	else if(typeof body === 'function'){
		body(proto, this.prototype)
		if(!proto.name && body.name) proto.name = body.name
	}

	return Service
}

module.exports = extend.call(Object, {
	batchMessage: function(msg, transfers){
		if(this.debug) console.log("batch ",msg)
		this.worker.batchMessages.push({
			$:this.name,
			msg:msg
		})
		if(transfers){
			this.worker.batchTransfers.push.apply(this.worker.batchTransfers, transfers)
		}
	},
	postMessage: function(msg, transfers){
		if(this.debug) console.log("post ",msg)
		this.worker.postMessage({
			$:this.name,
			msg:msg
		}, transfers)
	},
	onMessage: function(msg){
		if(!msg) return
		var name = 'user_' + msg.fn
		if(!this[name]){
			return console.log("User method "+name+' not found')
		}
		this[name](msg)
	}
})