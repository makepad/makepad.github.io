module.exports = class storage1 extends require('/platform/service'){

	constructor(...args){
		super(...args)
		this.args.locationSearch = this.root.locationSearch
	}

	user_load(msg){
		// if its already in the root cache, dont load it
		var cache = this.root.resourceCache[msg.path]
		if(cache){
			this.postMessage({
				path:msg.path,
				response:cache
			})
			return
		}
		var req = new XMLHttpRequest()

		req.addEventListener("error", function(){
			this.postMessage({
				path:msg.path,
				error:'Error loading '+msg.path
			})
		}.bind(this))
		req.responseType = msg.binary?'arraybuffer':'text'
		req.addEventListener("load", function(){
			if(req.status !== 200){
				this.postMessage({
					path:msg.path,
					error:'Error loading '+msg.url,
					status:req.status
				})
				return
			}
			var transfers = []
			if(msg.binary) transfers.push(req.response)
			this.postMessage({
				path:msg.path,
				response:req.response
			}, transfers)
		}.bind(this))
		//!TODO add domain checks to url
		req.open("GET", location.origin+'/'+msg.path)
		req.send()
	}

	user_save(msg){
		var req = new XMLHttpRequest()
		// compare todo against domains
		req.addEventListener("error", function(){
			this.postMessage({
				path:msg.path,
				error:'Error saving '+msg.path
			})
		}.bind(this))
		//req.responseType = 'text'
		req.addEventListener("load", function(){
			if(req.status !== 200){
				this.postMessage({
					path:msg.path,
					error:'Error loading '+msg.path,
					status:req.status
				})
				return
			}
			this.postMessage({
				path:msg.path,
				response:req.response
			})
		}.bind(this))
		//!TODO add domain checks to url
		req.open("POST", location.origin+'/'+msg.path, true)
		req.send(msg.data)
	}
}