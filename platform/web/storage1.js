module.exports = require('/platform/service').extend(function storage1(proto, base){

	proto.TAP_TIME = 350
	proto.TAP_DIST_TOUCH = 50
	proto.TAP_DIST_MOUSE = 5

	proto.onConstruct = function(){
		this.args.locationSearch = this.root.locationSearch
	}

	proto.user_load= function(msg){
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

	proto.user_save = function(msg){
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
})