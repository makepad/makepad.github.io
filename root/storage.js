var service = require('services/storage')
var bus = service.bus

var requires = {}
var promises = {}

bus.onMessage = function(msg){
	var prom = promises[msg.url]
	promises[msg.url] = undefined
	prom.resolve(msg.response)
}

function makePromise(final){
	var res, rej
	var prom = new Promise(function(s, j){res = s, rej = j})
	if(promises[final]) return reject('already loading')
	promises[final] = prom
	prom.resolve = res
	prom.reject = rej
	return prom
}

exports.onRequire = function(args, resolve, moduleurl){

	if(requires[moduleurl]) return requires[moduleurl]

	var storage = {
		loadText:function(url){
			var final = resolve(url)
			var prom = makePromise(final)
			bus.postMessage({
				fn:'loadText',
				url:final
			})
			return prom
		},
		saveText:function(url, data){
			var final = resolve(url)
			var prom = makePromise(final)
			bus.postMessage({
				fn:'saveText',
				url:final,
				data:data
			})
			return prom
		}
	}

	requires[moduleurl] = storage
	return storage
}