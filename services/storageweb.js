var bus = service.bus

var userMessage = {
	loadText:function(msg){
		var req = new XMLHttpRequest()

		req.addEventListener("error", function(){
			bus.postMessage({
				url:msg.url,
				error:'Error loading '+msg.url
			})
		})
		req.responseType = 'text'
		req.addEventListener("load", function(){
			if(req.status !== 200){
				bus.postMessage({
					url:msg/url,
					error:'Error loading '+msg.url,
					status:req.status
				})
				return
			}
			bus.postMessage({
				url:msg.url,
				response:req.response
			})
		})
		//!TODO add domain checks to url
		req.open("GET", msg.url)
		req.send()
	},
	loadBinary:function(msg){
		var req = new XMLHttpRequest()

		req.addEventListener("error", function(){
			bus.postMessage({
				url:msg,url,
				error:'Error loading '+msg.url
			})
		})
		req.responseType = 'arraybuffer'
		req.addEventListener("load", function(){
			if(req.status !== 200){
				bus.postMessage({
					url:msg.url,
					error:'Error loading '+msg.url,
					status:req.status
				})
				return
			}
			var buffer = req.response
			bus.postMessage({
				url:msg.url,
				response:buffer
			}, [buffer])
		})
		//!TODO add domain checks to url
		req.open("GET", msg.url)
		req.send()
	},
	saveText:function(msg){
		var req = new XMLHttpRequest()
		// compare todo against domains
		req.addEventListener("error", function(){
			bus.postMessage({
				url:msg.url,
				error:'Error saving '+msg.url
			})
		})
		//req.responseType = 'text'
		req.addEventListener("load", function(){
			if(req.status !== 200){
				bus.postMessage({
					url:msg.url,
					error:'Error loading '+msg.url,
					status:req.status
				})
				return
			}
			bus.postMessage({
				url:msg.url,
				response:req.response
			})
		})
		//!TODO add domain checks to url
		req.open("POST", msg.url, true)
		req.send(msg.data)
	},
}

bus.onMessage = function(msg){
	if(!userMessage[msg.fn]) console.error('cant find '+msg.fn)
	userMessage[msg.fn](msg)
}