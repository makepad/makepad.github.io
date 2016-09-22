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

function buildPath(parent, path){
	
	var s = path.lastIndexOf('/')
	var d = path.lastIndexOf('.')
	if(d === -1 || d < s) path = path + '.js'
	var a = path.charAt(0)
	var b = path.charAt(1)
	if(a === '/') return path.slice(1)
	if(a === '.'){
		if(b === '.') throw new Error("IMPLEMENT RELATIVE PATHS")
		return parent.slice(0,parent.lastIndexOf('/')) + path.slice(1)
	}
	return 'libs/' + path
}

exports.buildPath = buildPath

exports.onRequire = function(args, absParent){

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