module.exports = class extends require('/platform/service'){

	constructor(...args){
		super(...args)
		this.name = 'storage1'
		this.args.locationSearch = this.root.locationSearch
	}

	user_clearCache(){
		this.root.cache = {}	
		// lets check localstorage
		while (localStorage.length) {
			localStorage.removeItem(localStorage.key(0))
		}
	}

	user_load(msg){
		// if its already in the root cache, dont load it
		var cache = this.root.cache[msg.path]
		if(!cache) cache = localStorage.getItem('storage1:'+msg.path)

		if(cache){
			this.postMessage({
				fn:'onLoad',
				path:msg.path,
				response:cache
			})
			return
		}

		var req = new XMLHttpRequest()

		req.addEventListener("error", function(){
			this.postMessage({
				fn:'onLoad',
				path:msg.path,
				error:'Error loading '+msg.path
			})
		}.bind(this))
		req.responseType = msg.binary?'arraybuffer':'text'
		req.addEventListener("load", function(){
			if(req.status !== 200){
				this.postMessage({
					fn:'onLoad',
					path:msg.path,
					error:'Error loading '+msg.url,
					status:req.status
				})
				return
			}
			var transfers = []
			if(msg.binary) transfers.push(req.response)
			this.postMessage({
				fn:'onLoad',
				path:msg.path,
				response:req.response
			}, transfers)
		}.bind(this))
		//!TODO add domain checks to url
		req.open("GET", location.origin+msg.path)
		req.send()
	}

	user_save(msg){
		if(location.hostname !== 'localhost' && location.hostname !== '127.0.0.1'){
			localStorage.setItem('storage1:'+msg.path, msg.data)
			this.postMessage({
				fn:'onSave',
				path:msg.path,
				response:'local'
			})
			return
		}
		var req = new XMLHttpRequest()
		// compare todo against domains
		req.addEventListener("error", function(){
			this.postMessage({
				fn:'onSave',
				path:msg.path,
				error:'Error saving '+msg.path
			})
		}.bind(this))
		//req.responseType = 'text'
		req.addEventListener("load", function(){
			if(req.status !== 200){
				this.postMessage({
					fn:'onSave',
					path:msg.path,
					error:'Error loading '+msg.path,
					status:req.status
				})
				return
			}
			this.postMessage({
				fn:'onSave',
				path:msg.path,
				response:req.response
			})
		}.bind(this))
		//!TODO add domain checks to url
		req.open("POST", location.origin+msg.path, true)
		req.send(msg.data)
	}

	user_saveAs(msg){
		var link  = window.document.createElementNS("http://www.w3.org/1999/xhtml", "a")
		var blob = new Blob([msg.data], {type:msg.encoding})
		var url = URL.createObjectURL(blob)
		link.href = url
		link.download = msg.name
		var event = new MouseEvent("click")
		link.dispatchEvent(event)
		URL.revokeObjectURL(url)
	}

}