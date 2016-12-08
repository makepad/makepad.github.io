var service = require('$socket1')

class Socket extends require('base/class'){
	prototype(){
		this.mixin(require('base/events'))
	}

	postMessage(data){
		if(data && data.constructor === Object) data = JSON.stringify(data)
		service.postMessage({fn:'postMessage', data:data})
	}
}

var socket = module.exports = new Socket

service.onMessage = function(msg){
	let data = msg.data
	if(typeof data === 'string') data = JSON.parse(data)
	socket.onMessage(data)
}