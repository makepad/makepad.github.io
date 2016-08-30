var service = require('$storage1')

var requires = {}
var promises = {}

service.onMessage = function(msg){
	var prom = promises[msg.path]
	promises[msg.path] = undefined
	prom.resolve(msg.response)
}

function makePromise(final){
	var prom = Promise.defer()
	if(promises[final]) throw new Error('Already loading '+final)
	promises[final] = prom
	return prom
}

exports.onRequire = function(args, absParent, buildPath){

	if(requires[absParent]) return requires[absParent]

	var storage = {
		load:function(path, binary){
			var final = buildPath(absParent, path)
			var prom = makePromise(final)
			service.postMessage({
				fn:'load',
				binary:binary,
				path:final
			})
			return prom
		},
		save:function(path, data){
			var final = buildPath(absParent, path)
			var prom = makePromise(final)
			service.postMessage({
				fn:'save',
				path:final,
				data:data
			})
			return prom
		}
	}

	storage.search = service.args.search

	requires[absParent] = storage
	return storage
}