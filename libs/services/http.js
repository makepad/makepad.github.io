var service = require('$http1')

var promises = {}
var promId = 0

class Http extends require('base/class'){
	prototype(){
		this.mixin(require('base/events'))
	}

	get(url){
		var id = promId++
		var prom = promises[id] = new Promise.defer()
		service.postMessage({fn:'get', url:url, id:promId})
		return prom
	}
}

service.onMessage = function(msg){
	var prom = promises[msg.id]
	if(!prom) return
	prom.resolve(msg.response)
}

module.exports = new Http()