var service = require('$storage1')

var requires = {}
var loadPromises = {}
var savePromises = {}


service.onMessage = function(msg){

	var prom
	if(msg.fn === 'onLoad'){
		prom = loadPromises[msg.path]
		//loadPromises[msg.path] = undefined
	}
	else if(msg.fn === 'onSave'){
		prom = savePromises[msg.path]
		savePromises[msg.path] = undefined
	}
	if(!prom) return
	prom.resolve(msg.response)
}

exports.onRequire = function(args, absParent){

	if(requires[absParent]) return requires[absParent]

	var storage = { 
		buildPath:module.worker.buildPath,
		load:function(path, binary){
			var final = module.worker.buildPath(absParent, path)

			var prom 
			if(loadPromises[final]){ // chain it
				
				prom = Promise.defer(true)
				loadPromises[final].then(prom.resolve, prom.reject, true)
				return prom
			}
			else{
				prom = Promise.defer(false)
				loadPromises[final] = prom
			}
			if(final.indexOf('//')!==-1){console.error("WHAA");debugger;}
			service.postMessage({
				fn:'load',
				binary:binary,
				path:final
			})
			return prom
		},
		save:function(path, data, override){
			var final = module.worker.buildPath(absParent, path)

			var prom = Promise.defer()
			if(!override && savePromises[final]){ // its still saving
				prom.reject("Still saving")
				return prom
			}
			else savePromises[final] = prom
			if(final.indexOf('//')!==-1){console.error("WHAA");debugger;}
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