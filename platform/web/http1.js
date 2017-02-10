module.exports = class extends require('/platform/service'){

	constructor(...args){
		super(...args)
		this.name = 'http1'
	}

	user_get(msg){
		var req = new XMLHttpRequest()

		req.addEventListener("error", function(){
			this.postMessage({
				fn:'get',
				path:msg.path,
				error:'Error loading '+msg.path
			})
		}.bind(this))
		req.responseType = msg.binary?'arraybuffer':'text'
		req.addEventListener("load", function(){
			if(req.status !== 200){
				this.postMessage({
					fn:'get',
					id:msg.id,
					error:'Error loading '+msg.url,
					status:req.status
				})
				return
			}
			var transfers = []
			if(msg.binary) transfers.push(req.response)
			this.postMessage({
				fn:'get',
				id:msg.id,
				response:req.response
			}, transfers)
		}.bind(this))
		//!TODO add domain checks to url
		req.open("GET", msg.url)
		req.send()
	}
}
