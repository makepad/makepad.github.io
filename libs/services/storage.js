var service = require('$services/storage1')
var bus = service.bus

var requires = {}
var promises = {}

bus.onMessage = function(msg){
	var prom = promises[msg.url]
	promises[msg.url] = undefined
	prom.resolve(msg.response)
}

function makePromise(final){
	var prom = Promise.defer()
	if(promises[final]) return reject('already loading')
	promises[final] = prom
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

	storage.search = service.args.search

	requires[moduleurl] = storage
	return storage
}