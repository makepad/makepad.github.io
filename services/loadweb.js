var bus = service.bus

var userMessage = {
	text:function(msg){
		var req = new XMLHttpRequest()

		req.addEventListener("error", function(){
			bus.postMessage({
				url:msg,url,
				error:'Error loading '+msg.url
			})
		})
		req.responseType = 'text'
		req.addEventListener("load", function(){
			if(req.status !== 200){
				bus.postMessage({
					url:msg,url,
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
	binary:function(msg){
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
					url:msg,url,
					error:'Error loading '+msg.url,
					status:req.status
				})
				return
			}
			var buffer = req.response
			bus.postMessage({
				url:msg,url,
				response:buffer
			}, [buffer])
		})
		//!TODO add domain checks to url
		req.open("GET", msg.url)
		req.send()
	}	
}

bus.onMessage = function(msg){
	if(!userMessage[msg.fn]) console.error('cant find '+msg.fn)
	userMessage[msg.fn](msg)
}