

var loadServices = [
	"debug1",
	"fingers1",
	"keyboard1",
	"painter1",
	"storage1",
	"worker1",
	"audio1"
//	"dropfiles1",
]


//
//
// Recursive downloader with dependencies
//
//

root.downloadWithDeps = function(absUrl, parentUrl, singleLoad, resources, appProgress){
	if(singleLoad[absUrl]) return singleLoad[absUrl]
	var isBinary = absUrl.lastIndexOf('.js') !== absUrl.length - 3
	var prom = singleLoad[absUrl] = root.downloadResource(absUrl, isBinary, appProgress)

	return prom.then(function(result){
		resources[absUrl] = result
		if(typeof result !== 'string') return Promise.resolve(result)
		// load dependencies
		var code = result.replace(/\/\*[\S\s]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')
		var deps = []
		// look up loads
		code.replace(/require\s*\(\s*['"](.*?)["']/g, function(m, path){
			if(path.indexOf('$') === 0) return // its a service
			var subUrl = buildPath(absUrl, path)
			deps.push(root.downloadWithDeps(subUrl, absUrl, singleLoad, resources, appProgress))
		})
		return Promise.all(deps)
	}, 
	function(error){
		console.log("Error loading "+absUrl+" from "+parentUrl)
		return Promise.reject(error)
	})
}

// the services
var serviceModules = {}

var workerSrc = 
	buildPath.toString() + '\n' +
	workerRequire.toString() + '\n' +
	mathLib.toString() + '\n' +
	traceLib.toString() + '\n' + 
	timerLib.toString() + '\n' + 
	promiseLib.toString() +'\n' + 
	createOnMessage.toString() + '\n'+
	workerBoot.toString() + ';workerBoot();\n' 


root.createMainWorker = root.makeWorkerCreator(workerSrc, false)//root.hardwareConcurrency>=4?false:true)
root.createSubWorker = root.makeWorkerCreator(workerSrc, false)

//
//
// initialize a single app 
//
//

root.workerIds = {}
root.workerIdsAlloc = 1

root.startWorker = function(serviceList, platform, parent){

	var worker = parent?root.createSubWorker():root.createMainWorker()

	worker.workerId = root.workerIdsAlloc++
	worker.serviceList = serviceList
	worker.platform = platform
	worker.parent = parent
	root.workerIds[worker.workerId] = worker

	var args = worker.args = {}

	var services = worker.services = {
		exception:{
			onMessage:function(msg){
				root.showParseError(msg.path)
			}
		},
		debug:{
			onMessage:function(msg){
				console.log(msg)
			}
		},
		pong:{
			onMessage:function(msg){
				if(parent) parent.services.worker1.pong(worker)
			}
		}
	}
	var userArgs = {}
	// lets create a bunch of services
	for(let i = 0; i < serviceList.length; i++){
		var name = serviceList[i]
		var serviceModule = serviceModules[servicePaths[name]]
		services[name] = new serviceModule.exports(root, worker, parent, platform, args)
	}
	createOnMessage(worker)

	return worker
}

root.initWorker = function(worker, main, resources, init, ismain){
	worker.postMessage({
		$:'init',
		msg:{
			hasParent:worker.parent?true:false,
			main:main,
			resources:resources,
			args:worker.args,
			init:init
		}
	})
}


//
//
// called by the bootloader to initialize apps
//
//

var allApps = []
root.onInitApps = function(apps){
	for(let i =0; i < apps.length; i++){
		var app = apps[i]
		app.singleLoad = {}
		app.resources = {}
		app.main = buildPath('/',app.main)
		allApps.push(
			root.downloadWithDeps(app.main, '', app.singleLoad, app.resources, app)
		)
	}

	Promise.all(allApps).then(function(){
		// start the apps
		for(let i = 0; i < apps.length; i++){
			var app = apps[i]
			var worker = root.startWorker(loadServices, app.platform)
			root.initWorker(worker, app.main, app.resources, undefined)
		}
	})
}

//
//
// Initialize service modules
//
//

var allServices = []
var serviceSingleLoad = {}
var serviceResults = {}
var servicePaths = {}
var serviceModules = {}

for(let i = 0; i < loadServices.length; i++){
	var name = loadServices[i]
	var path = servicePaths[name] = root.platformPath+root.platform+'/'+name+'.js'
	allServices.push(
		root.downloadWithDeps(path, '', serviceSingleLoad, serviceResults) 
	)
}

allApps.push(Promise.all(allServices).then(function(){

	function serviceRequire(absParent){
		return function(path){
			var absPath = buildPath(absParent, path)
			var module = serviceModules[absPath]
			if(!module.exports){
				module.exports = {}
				var ret = module.factory.call(module.exports, serviceRequire(absPath), module.exports, module)
				if(ret !== undefined) module.exports = ret
			}
			return module.exports
		}
	}
	// make all the factories
	var init = []
	for(let path in serviceResults){
		var source = serviceResults[path]
		try{
			serviceModules[path] = {
				factory: new Function("require", "exports","module", source+ '\n//# sourceURL='+path+'\n'),
				source: source
			}
		}
		catch(e){
			root.showParseError(path)
		}
	}

	// load up the service modules
	for(let key in serviceModules){	
		var module = serviceModules[key]
		if(!module.exports){
			module.exports = {}
			var ret = module.factory.call(module.exports, serviceRequire(key), module.exports, module)
			if(ret !== undefined) module.exports = ret
		}
	}

	return Promise.resolve()
}))

//
//
// Worker boot entrypoint
//
//

function workerBoot(){
	var modules = {}

	worker.services = {init:{}, ping:{}}
	worker.modules = modules
	worker.appMain = undefined
	worker.buildPath = buildPath
	createOnMessage(worker)

	worker.define$ = function(getset){
		Object.defineProperty(global,'$',{
			configurable:true,
			get:getset.get,
			set:getset.set
		})
	}

	// parse and normalize exception x-browser
	worker.decodeException = function(e){
		if(e.number !== undefined){ // ms edge
			//edge: e.message, e.description, e.number, e.stack
			var lines = e.stack.split(/[\r\n]+/)
			var stack = []
			for(var i = 1; i < lines.length; i++){
				var line = lines[i].match(/\s*at\s*(.*?)\s\((.*?)\:(\d+)\:(\d+)\)/)
				if(line){
					stack.push({
						method:line[1],
						line:parseInt(line[3]),
						path:line[2],
						column:parseInt(line[4])
					})
				}
			}
			return {
				message:e.message,
				line:stack[0].line,
				column:stack[0].column,
				stack:stack
			}
		}
		else if(e.fileName !== undefined){ // firefox
			var lines = e.stack.split(/[\r\n]+/)
			var stack = []
			for(var i = 0; i < lines.length; i++){
				var line = lines[i].match(/(.*?)\@(.*?)\:(\d+)\:(\d+)/)
				if(line){
					stack.push({
						method:line[1],
						line:parseInt(line[3]),
						path:line[2],
						column:parseInt(line[4])
					})
				}
			}
			//firefox: e.message, e.fileName, e.lineNumber, e.columnNumber
			return {
				message:e.message,
				line:e.lineNumber,
				path:e.fileName,
				column:e.columnNumber,
				stack:stack
			}
		}
		else if(e.line !== undefined){ // safari
			var lines = e.stack.split(/\n/)
			var stack = []
			stack.push({
				path:null,
				line:parseInt(e.line),
				column:parseInt(e.column)
			})
			for(var i = 1; i < lines.length; i++){
				var line = lines[i].match(/(.*?)\@(.*?)\:(\d+)\:(\d+)/)
				if(line){
					stack.push({
						method:line[1],
						path:line[2],
						line:parseInt(line[3]),
						column:parseInt(line[4])
					})
				}
			}
			return {
				message:e.message,
				line:stack[0].line,
				path:stack[0].path,
				column:stack[0].column,
				stack:stack
			}

		} 
		else if(e.stack !== undefined){ // probably chrome
			//chrome: e.message, e.stack (parse it)
			var lines = e.stack.split(/\n/)
			var stack = []
			for(var i = 1; i < lines.length; i++){
				var line = lines[i].match(/\s*at\s*(.*?)\s\((.*?)\:(\d+)\:(\d+)\)/)
				if(line){
					stack.push({
						method:line[1],
						line:parseInt(line[3]) - 2,
						path:line[2],
						column:parseInt(line[4])
					})
				}
			}
			return {
				message:lines[0],
				line:stack[0].line,
				path:stack[0].path,
				column:stack[0].column,
				stack:stack
			}
		}
		else{ // amazing.
			return {
				message:JSON.stringify(e)
			}
		}
	}

	function invalidateModuleDeps(module){
		if(!module || !module.exports) return
		for(var key in module.deps){
			var oldModule = module.deps[key]
			modules[key].exports = undefined
			invalidateModuleDeps(oldModule)
		}
	}

	worker.services.ping.onMessage = function(msg){
		worker.postMessage({$:'pong'})
	}

	worker.services.init.onMessage = function(msg){
		var resources = msg.resources
		worker.resources = resources
		worker.args = msg.args
		worker.init = msg.init
		worker.hasParent = msg.hasParent
		
		if(worker.hasParent && !worker.onError){ // onError handling

			worker.onError = function(e){
				worker.postMessage({
					$:'worker1',
					msg:{
						fn:'onError',
						error:e
					}
				})
			}
			try{
				return this.onMessage(msg)
			}
			catch(e){
				worker.onError(worker.decodeException(e))
			}
			return
		}
	
		var serviceArgs = msg.args
		for(let path in resources){
			var source = resources[path]

			// invalidate dependencies
			invalidateModuleDeps(modules[path])

			if(typeof source !== 'string'){
				modules[path] = {
					path:path,
					deps:{},
					source:source,
					worker:worker,
					exports:source
				}

				continue
			}
			try{
				modules[path] = {
					deps:{},
					path:path,
					worker:worker,
					source:source,
					factory: new Function("require", "exports", "module", source + '\n//# sourceURL='+path+'\n')
				}
			}
			catch(e){
				if(worker.onError) worker.onError(worker.decodeException(e))
			//	console.log("POSTING",e.message)
				worker.postMessage({
					$:'exception',
					msg:{path:path}
				})
			}
		}

		// lets boot it up
		var module = modules[msg.main]
		module.exports = {}
		if(!module.factory) return console.log("Cannot boot factory "+msg.main, module)
		var ret = module.factory.call(module.exports, workerRequire(msg.main, worker, modules, serviceArgs), module.exports, module)
		if(ret !== undefined) module.exports = ret
		worker.clearAllTimers()
		if(typeof module.exports === 'function'){
			if(worker.appMain && worker.appMain.destroy){
				worker.appMain.destroy()
			}
			worker.appMain = new module.exports()
		}
	}

	// define math and promise globals
	timerLib(global)
	mathLib(global)
	promiseLib(global)
	traceLib(global)
}



//
//
// Worker require
//
//

function workerRequire(absParent, worker, modules, args){
	return function require(path){
		if(path.charCodeAt(0) === 36){
			var name = path.slice(1)
			// we have to return a service interface
			var service = worker.services[name]
			if(service) return service
			return worker.services[name] =  {
				args:args,
				batchMessage: function(msg, transfers){
					if(this.debug) console.error('batchMessage '+name, msg)
					worker.batchMessages.push({
						$:name,
						msg:msg
					})
					if(transfers) worker.batchTransfers.push.apply(worker.batchTransfers, transfers)
				},
				postMessage: function(msg, transfers){
					if(this.debug) console.error('postMessage '+name, msg)
					worker.postMessage({
						$:name, 
						msg:msg
					},transfers)
				}
			}
		}
		var absPath = buildPath(absParent, path)
		var module = modules[absPath]
		if(!module)console.log(module, absPath)
		module.deps[absParent] = modules[absParent]

		if(!module) throw new Error("Cannot require "+absPath+" from "+absParent)
		if(!module.exports){
			module.exports = {}
			if(!module.factory) throw new Error("Cannot require, no factory "+absPath+" from "+absParent)

			var ret = module.factory.call(module.exports, workerRequire(absPath, worker, modules, args), module.exports, module)
			if(ret !== undefined) module.exports = ret
		}

		if(module.exports.onRequire){
			return module.exports.onRequire(arguments, absParent)
		}
		if(module.exports)

		return module.exports
	}
}

//
//
// onMessage implementation for both sides
//
//

function createOnMessage(worker){
	worker.batchMessages = []
	worker.batchTransfers = []
	worker.afterEntryCallbacks = []	

	worker.onAfterEntry = function(level){
		var batchMessages = worker.batchMessages
		if(batchMessages.length){
			var transfers = worker.batchTransfers
			for(let i = 0; i < batchMessages.length; i++){
				var msg = batchMessages[i]
				var body = msg.msg
	
				if(typeof body !== 'object' || body.constructor === Object) continue
				if(worker.onError){
					try{
						var ret = body.toMessage()
					}
					catch(e){
						worker.onError(worker.decodeException(e))
					}
				}
				else{
					var ret = body.toMessage()
				}

				msg.msg = undefined
				if(!ret) continue

				if(!Array.isArray(ret)){
					console.error("Return value of toMessage needs to be an [msg,[transfer]] array")
					continue
				}
				msg.msg = ret[0]
				var tr = ret[1]
				if(tr){
					if(!Array.isArray(ret)){
						console.error("Return value of toMessage transfer needs to be an array [msg,[transfer]] array")
						continue
					}
					transfers.push.apply(transfers, tr)
				}
			}
			try{
				worker.postMessage({
					$:'batch',
					msgs:batchMessages
				}, transfers)
			}
			catch(e){
				console.error('cloneError', batchMessages)
			}
			worker.batchMessages = []
			worker.batchTransfers = []
		}
		// send out any produced sync messages in one go
		if(worker.afterEntryCallbacks.length){
			var afterEntryCallbacks = worker.afterEntryCallbacks
			worker.afterEntryCallbacks = []
			for(let i = 0; i < afterEntryCallbacks.length; i++){
				if(worker.onError){
					try{
						afterEntryCallbacks[i]()
					}
					catch(e){
						worker.onError(worker.decodeException(e))
					}
				}
				else{
					afterEntryCallbacks[i]()
				}
			}
		}
		if(!level) level = 0
		if((worker.afterEntryCallbacks.length || worker.batchMessages.length) && level<5) worker.onAfterEntry(level+1)
	}

	worker.onMessage = function(msg){
		//try{

		if(msg.$ === 'batch'){
			for(let i = 0, msgs = msg.msgs; i < msgs.length; i++){
				msg = msgs[i]

				var service = this.services[msg.$]
				var bmsg = msg.msg
				if(service && service.onMessage && bmsg !== undefined){
					if(worker.onError){
						try{
							service.onMessage(bmsg)
						}
						catch(e){
							worker.onError(worker.decodeException(e))
						}
					}
					else{
						service.onMessage(bmsg)
					}
				}
			}
		}
		else{
			var service = this.services[msg.$]
			if(worker.onError){
				try{
					if(service && service.onMessage) service.onMessage(msg.msg)
				}
				catch(e){
					worker.onError(worker.decodeException(e))
				}
			}
			else{
				if(service && service.onMessage) service.onMessage(msg.msg)
			}
		}
		this.onAfterEntry()
		//}catch($$){
			//console.log($$)
		//	this.postMessage({$:"debug",msg:{msg:msg, data:JSON.stringify($$.line)}})
		//}
	}
}


//
//
// Path builder
//
//

function buildPath(parent, path){
	var s = path.lastIndexOf('/')
	var d = path.lastIndexOf('.')
	if(d === -1 || d < s) path = path + '.js'
	var a = path.charAt(0)
	var b = path.charAt(1)
	if(a === '/') return path//path.slice(1)
	if(a === '.'){
		if(b === '.') throw new Error("IMPLEMENT RELATIVE PATHS")
		var out = parent.slice(0,parent.lastIndexOf('/')) + path.slice(1)
		return out
	}
	return '/libs/' + path
}


//
//
// support tracing
//
//

function traceLib(g){
	g.__ = {}
	function set(v){
		console.error("Trace", v)
		return v
	}
	Object.defineProperty(g.__, 'T', {
		get:function(){return set},
		set:set
	})
}

//
//
// make timers support postEntry
//
//

function timerLib(g){
	var _setTimeout = g.setTimeout
	var _clearTimeout = g.clearTimeout
	var _setInterval = g.setInterval
	var _clearInterval = g.clearInterval

	var allTimeouts = []
	var allIntervals = []

	worker.clearAllTimers = function(){
		for(let i = 0; i < allTimeouts.length; i++){
			_clearTimeout(allTimeouts[i])
		}
		allTimeouts.length = 0
		for(let i = 0; i < allIntervals.length; i++){
			_clearInterval(allIntervals[i])
		}
		allIntervals.length = 0
	}

	g.clearTimeout = function(id){
		var i = allTimeouts.indexOf(id)
		if(i !== -1) allTimeouts.splice(i, 1)
		return _clearTimeout(id)
	}

	g.clearInterval = function(id){
		var i = allIntervals.indexOf(id)
		if(i !== -1) allIntervals.splice(i, 1)
		return _clearInterval(id)
	}

	g.setTimeout = function(fn, time){

		var id = _setTimeout(function(){
			var i = allTimeouts.indexOf(id)
			if(i !== -1) allTimeouts.splice(id, 1)
			if(worker.onError){
				try{
					fn()
				}
				catch(e){
					worker.onError(worker.decodeException(e))
				}
			}
			else{
				fn()
			}
			worker.onAfterEntry()
		}, time)
		allTimeouts.push(id)
		return id
	}

	g.setInterval = function(fn, time){
		if(time === undefined)throw new Error("Provide timeout")
		var id = _setInterval(function(){
			if(worker.onError){
				try{
					fn()
				}
				catch(e){
					worker.onError(worker.decodeException(e))
				}
			}
			else{
				fn()
			}
			worker.onAfterEntry()
		}, time)
		allIntervals.push(id)
		return id
	}

	g.setImmediate = function(fn){
		worker.afterEntryCallbacks.push(fn)
		return worker.afterEntryCallbacks.length
	}
}

//
//
// Make math global
//
//

function mathLib(g){
	g.E = Math.E
	g.LN10 = Math.LN10
	g.LN2 = Math.LN2
	g.LOG10E = Math.LOG10E
	g.LOG10 = Math.LOG10
	g.PI = Math.PI
	g.SQRT2 = Math.SQRT2
	g.SQRT1_2 = Math.SQRT1_2

	g.random = Math.random
	g.radians = function(v){ return v * 0.017453292519943295}
	g.degrees = function(v){ return v / 0.017453292519943295}
	g.sin = Math.sin
	g.cos = Math.cos
	g.tan = Math.tan
	g.asin = Math.asin
	g.acos = Math.acos
	g.atan = function(x, y){
		if(y !== undefined) return Math.atan2(x, y)
		return Math.atan(x)
	}

	g.pow = Math.pow
	g.exp = Math.exp
	g.log = Math.log
	g.exp2 = function(v){return Math.pow(2, v)}
	g.log2 = Math.log2
	g.sqrt = Math.sqrt
	g.inversesqrt = function(v){return 1/Math.sqrt(v)}
	g.abs = Math.abs
	g.sign = Math.sign
	g.floor = Math.floor
	g.ceil = Math.ceil
	g.fract = function(v){return v-Math.trunc(v)}
	g.mod = function(v, w){return v%w}
	g.min = Math.min
	g.max = Math.max
	g.clamp = function(v, min, max){return Math.min(Math.max(v,min),max)}
	g.step = function(edge, v){ return v < edge? 0: 1}
	g.smoothstep = function(e0, e1, v){
		var e2 = e1 - e0
		var t = Math.max(Math.min(v - e0 / e2, 1),0)
		return t * t * (3 - 2 * t)
	}
	g.mix = function(a, b, f){
		return a*(1. - f) + b * f
	}
}

//
//
// Promise library that can support post entry and has 'immediate' support
//
//

function promiseLib(g){

	function Promise(fn, immediate) {
		if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
		if (typeof fn !== 'function') throw new TypeError('not a function')
		this._state = null
		this._value = null
		this._deferreds = []
		this._immediate = immediate
		doResolve(fn, resolve.bind(this), reject.bind(this), immediate)
	}

	function handle(deferred, immediate) {
		var me = this
		if (this._state === null) {
			this._deferreds.push(deferred)
			return
		}
		function handle() {
			var cb = me._state ? deferred.onFulfilled : deferred.onRejected
			if (cb === null) {
				(me._state ? deferred.resolve : deferred.reject)(me._value)
				return
			}
			var ret;
			//try {
				ret = cb(me._value)
			//}
			//catch (e) {
			//	deferred.reject(e)
			//	return
			//}
			deferred.resolve(ret)
		}
		if(this._immediate || immediate){
			handle()
		}
		else{
			if(g.setImmediate.debug) debugger
			g.setImmediate(handle)
		}
	}

	function resolve(newValue) {
		//try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
			if (newValue === this) throw new TypeError('A promise cannot be resolved with itself.')
			if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
				var then = newValue.then
				if (typeof then === 'function') {
					doResolve(then.bind(newValue), resolve.bind(this), reject.bind(this), this._immediate)
					return;
				}
			}
			this._state = true
			this._value = newValue
			finale.call(this)
		//} catch (e) { reject.call(this, e); }
	}

	function reject(newValue) {
		this._state = false
		this._value = newValue
		finale.call(this)
	}

	function finale() {
		for (var i = 0, len = this._deferreds.length; i < len; i++) {
			handle.call(this, this._deferreds[i])
		}
		this._deferreds = null
	}

	function Handler(onFulfilled, onRejected, resolve, reject){
		this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
		this.onRejected = typeof onRejected === 'function' ? onRejected : null
		this.resolve = resolve
		this.reject = reject
	}

	function doResolve(fn, onFulfilled, onRejected, immediate) {
		var done = false;
		//try {
			fn(function (value) {
				if (done) return
				done = true
				onFulfilled(value)
			}, function (reason) {
				if (done) return
				done = true
				onRejected(reason)
			}, immediate)
		//} catch (ex) {
		//	if (done) return
		//	done = true
		//	onRejected(ex)
		//}
	}

	Promise.prototype.catch = function (onRejected) {
		return this.then(null, onRejected)
	}

	Promise.prototype.then = function(onFulfilled, onRejected, immediate) {
		var me = this;
		return new Promise(function(resolve, reject, immediate) {
			handle.call(me, new Handler(onFulfilled, onRejected, resolve, reject), immediate)
		}, immediate)
	}

	Promise.all = function () {
		var args
		var immediate
		if(Array.isArray(arguments[0])){
			args = arguments[0]
			immediate = arguments[1]
		}
		else{
			args = arguments
		}

		return new Promise(function (resolve, reject) {
			if (args.length === 0) return resolve([])
			var remaining = args.length
			function res(i, val) {
				//try {
					if (val && (typeof val === 'object' || typeof val === 'function')) {
						var then = val.then
						if (typeof then === 'function') {
							then.call(val, function (val) { res(i, val) }, reject)
							return
						}
					}
					args[i] = val
					if (--remaining === 0) {
						resolve(args)
					}
				//} catch (ex) {
				//	reject(ex)
				//}
			}
			for (var i = 0; i < args.length; i++) {
				res(i, args[i])
			}
		}, immediate)
	}

	Promise.resolve = function (value, immediate) {
		if (value && typeof value === 'object' && value.constructor === Promise) {
			return value
		}

		return new Promise(function (resolve) {
			resolve(value)
		}, immediate)
	}

	Promise.reject = function (value, immediate) {
		return new Promise(function (resolve, reject) {
			reject(value)
		}, immediate)
	}

	Promise.defer = function(immediate){
		var res, rej
		var prom = new Promise(function(resolve, reject){
			res = resolve, rej = reject
		}, immediate)
		prom.resolve = res
		prom.reject = rej
		return prom
	}

	Promise.race = function (values, immediate) {
		return new Promise(function (resolve, reject) {
			for(let i = 0, len = values.length; i < len; i++) {
				values[i].then(resolve, reject, immediate)
			}
		}, immediate)
	}

	g.Promise = Promise
}
