var service = require('services/load')
var bus = service.bus

var requires = {}
var promises = {}

bus.onMessage = function(msg){
	promises[msg.url].resolve(msg.response)
}

exports.onRequire = function(args, resolve, moduleurl){

	if(requires[moduleurl]) return requires[moduleurl]

	var load = {
		text:function(url){
			// alright lets fetch
			var final = resolve(url)
			
			if(promises[final]) return promises[final]

			var res, rej
			var prom = promises[final] = new Promise(function(s, j){res = s, rej = j})
			prom.resolve = res
			prom.reject = rej
			// alright so now we load it somehow.
			bus.postMessage({
				fn:'text',
				url:final
			})
			return prom
		}
	}

	requires[moduleurl] = load
	return load
}