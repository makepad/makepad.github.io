(function(){
	var rootUrl = location.origin
	var WorkerClass
	// insert meta config tags
	function init(){

		if(location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.indexOf('10.') === 0)
			watchFileChange()

		var canvasses =	document.getElementsByClassName('makepad')
		
		//!TODO multiple canvasses boot up cycle fix
		for(var i = 0; i < canvasses.length; i++){
			var canvas = canvasses[i]
			var mainUrl = buildURL(rootUrl, location.href, canvas.getAttribute('main'), 'code')
			WorkerClass = canvas.getAttribute("noworker")?FakeWorker:Worker
			// boot it up!
			runWorker(mainUrl, canvas)
		}
	}

	var webworkersrc = 
		'(function(){\n'+
//		'var Blob = self.Blob\n'+
//		'var URL = self.URL\n'+
		mathLib.toString()+'\n'+
		parseFileName.toString()+'\n'+
		buildURL.toString()+'\n'+
		createOnMessage.toString()+'\n'+
		createRequire.toString()+'\n'+
		cleanWorker.toString()+'\n'+
		timerWorker.toString()+'\n'+
		initUserCode.toString()+'\n'+
		initWorker.toString()+'\n'+
		'initWorker()\n'+
		'})()'

	var workerbloburl = URL.createObjectURL(new Blob([webworkersrc], {type: "text/javascript"}))

	function updateWorker(handle, mainUrl, functionSource, workerArgs){
		// lets delta the resources
		handle.lastResources = handle.resources

		handle.resources = {
			services:[],
			codefiles:[],
			binaries:[]
		}
		console.error("UPDATE WOKRER", functionSource)
		loadResourceAndDeps(mainUrl, mainUrl, 'code', handle.resources, functionSource).then(function(result){

			// so kernel services... 
			var userArgs = {}

			initKernelServices(handle.resources.services, handle.kernelBusses, handle.kernelServices, handle.canvas, handle.worker, userArgs, handle.owner, workerArgs)
			
			handle.worker.postMessage({
				$:'initworker', 
				msg:{
					workerId: handle.workerId,
					rootUrl: rootUrl, 
					resources: handle.resources,
					userArgs: userArgs,
					workerArgs: workerArgs
				}
			})
		})
	}

	//keep track of all the workers
	var workerHandles = []

	function runWorker(mainUrl, canvas, owner, functionSource, workerId, workerArgs){
		// a forward reference for the owner
		var handle = {
			owner:owner,
			workerId:workerId,
			canvas:canvas,
			preInitQueue:[],
			preInitTransfers:[],
			resources:{
				services:[],
				codefiles:[],
				binaries:[]
			}
		}

		loadResourceAndDeps(mainUrl, mainUrl, 'code', handle.resources, functionSource).then(function(result){
			var worker = new WorkerClass(workerbloburl, webworkersrc)

			var subworkers = []
			handle.kernelBusses = {
				parseerror:{
					onMessage:function(msg){
						var script = document.createElement('script')
						script.type = 'text/javascript'
						script.src = msg.url
						document.getElementsByTagName('head')[0].appendChild(script)
					}
				}
			}

			handle.kernelServices = {}
			var userArgs = {}

			initKernelServices(handle.resources.services, handle.kernelBusses, handle.kernelServices, canvas, worker, userArgs, owner, workerArgs)

			worker.postMessage({
				$:'initworker', 
				msg:{
					workerId: handle.workerId,
					rootUrl: rootUrl, 
					resources: handle.resources,
					userArgs: userArgs,
					workerArgs: workerArgs
				}
			})

			// our owner worker has already sent messages whilst the worker was initializing, send them
			if(handle.preInitQueue.length){
				worker.postMessage({
					$:'batch',
					msgs:handle.preInitQueue
				}, handle.preInitTransfers)
			}

			worker.batchTransfers = []
			worker.batchMessages = []
			worker.postFunctions = []
			worker.onmessage = createOnMessage(handle.kernelBusses, worker, true)
			worker.handle = handle
			// now the worker can receive messages instead of queues
			handle.worker = worker
		}, 
		function(err){
			console.error("Error loading "+mainUrl+" cannot load "+err.resourceurl+" loaded from "+err.parenturl)
		})
		workerHandles.push(handle)
		return handle
	}

	function initWorker(){

		// substitute for self
		var worker = {
			postMessage:self.postMessage.bind(self),
			batchMessages:[],
			batchTransfers:[],
			postFunctions:[]
		}

		var userbusses = {
			updateworker:{
				onMessage:function(msg){
					console.log("UPDATIN", msg.resources)
				}
			},
			initworker:{
				onMessage:function(msg){
					var resources = msg.resources
					worker.workerId =  msg.workerId
					initUserCode(
						msg.rootUrl, 
						resources.codefiles, 
						resources.binaries,
						modules, 
						factories,
						worker, 
						userbusses,
						msg.userArgs
					)
				}
			}
		}
		var userservices = {}
		var modules = {}
		var factories = {}

		self.onmessage = createOnMessage(userbusses, worker, false)

		if(!self.fakeworker){
			mathLib(self)
			timerWorker(self, worker)
			cleanWorker(self)
		}
		else{
			mathLib(window)
		}
	}

	function createOnMessage(busses, worker, inkernel){
		worker.postEntry = function(level){
			var batchMessages = worker.batchMessages
			if(batchMessages.length){
				var transfers = worker.batchTransfers
				for(var i = 0; i <batchMessages.length; i++){
					var msg = batchMessages[i]
					var body = msg.msg
					if(typeof body === 'object' && body.constructor !== Object){
						var ret = body.toMessage()
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
				}
				worker.postMessage({
					$:'batch',
					msgs:batchMessages
				}, transfers)

				if(worker.fakeworker){
					worker.batchMessages = []
					worker.batchTransfers = []
				}
				else worker.batchMessages.length = worker.batchTransfers.length = 0
			}
			// send out any produced sync messages in one go
			if(worker.postFunctions.length){
				var postFunctions = worker.postFunctions
				worker.postFunctions = []
				for(var i = 0; i < postFunctions.length; i++){
					postFunctions[i]()
				}
			}
			if(worker.batchMessages.length && !level) worker.postEntry(1)
		}
		return function onMessage(e){
			var msg = e.data
			if(msg.$ === 'debug'){
				console.log(msg.msg)
			}
			else if(msg.$ === 'batch'){
				for(var i = 0, msgs = msg.msgs; i < msgs.length; i++){
					msg = msgs[i]
					var bus = busses[msg.$]
					if(bus && bus.onMessage) bus.onMessage(msg.msg)
				}
			}
			else{
				var bus = busses[msg.$]
				if(bus && bus.onMessage) bus.onMessage(msg.msg)
			}
			worker.postEntry()
		}
	}

	function initKernelServices(serviceresources, kernelBusses, kernelServices, canvas, worker, userArgs, owner, workerArgs){

		for(var i = serviceresources.length - 1; i >=0; i--){

			var serviceresource = serviceresources[i]

			var serviceName = parseFileName(serviceresource.resourceurl).slice(0,-3)

			var oldService = kernelServices[serviceName]
			if(oldService){
				if(oldService.onHotReload) oldService.onHotReload()
				continue
			}

			try{
				var kernelfn = new Function("exports", "service", serviceresource.response+'\n//# sourceURL='+serviceresource.resourceurl+'\n')
			}
			catch(e){
				var script = document.createElement('script')
				script.type = 'text/javascript'
				script.src = serviceresource.resourceurl
				document.getElementsByTagName('head')[0].appendChild(script)
			}

			var kernelService = {}

			var kernelServiceBus = {
				batchMessage:function(serviceName, msg, transfers){
					worker.batchMessages.push({$:serviceName,msg:msg})
					if(transfers) worker.batchTransfers.push.apply(worker.batchTransfers,transfers)
				}.bind(kernelService, serviceName),
				postMessage:function(serviceName, msg, transfers){
					worker.postMessage({$:serviceName, msg:msg}, transfers)
				}.bind(kernelService, serviceName)
			}
			var myuserargs = userArgs[serviceName] = {}

			kernelfn(kernelService, {
				bus:kernelServiceBus,
				args:myuserargs,
				workerArgs:workerArgs && workerArgs[serviceName],
				canvas:canvas,
				others:kernelServices,
				ownerServices:owner && owner.handle.kernelServices,
				owner:owner,
				worker:worker,
				runWorker:runWorker,
				updateWorker:updateWorker
			})
		
			kernelBusses[serviceName] = kernelServiceBus
			kernelServices[serviceName] = kernelService
		}
	}

	function initUserCode(rootUrl, codefiles, binaries, modules, factories, worker, userbusses, userArgs){

		worker.loadworkerid = 1
		var last
		var binarylut = {}
		for(var i = binaries.length - 1; i >= 0; i--){
			var binary = binaries[i]
			binarylut[binary.resourceurl] = binary.response
		}

		for(var i = codefiles.length - 1; i >=0; i--){
			var code = codefiles[i]
			var old = modules[code.resourceurl]

			if(old){
				if(old.source !== code.response){
					if(old.onHotRemove) old.onHotRemove()
				}
				else continue
			}
			var factory

			// name the constructors of the classes
			try{
				var source = code.response+'\n//# sourceURL='+code.resourceurl+'\n'
				// lets auto pass Math.* into the module?
				factory = new Function("require", "exports", "module", source)
			} 
			catch(e){
				return worker.postMessage({$:'parseerror', msg:{url:code.resourceurl}})
			}

			modules[code.resourceurl] = last = {
				require: createRequire(rootUrl, code.resourceurl, modules, binarylut, worker, userbusses, userArgs),
				factory: factory,
				source: code.response
			}
		}

		// initialize the last module 
		if(!last) return
		last.exports = {}
		var ret = last.factory.call(last.exports, last.require, last.exports, last)
		if(ret) last.exports = ret
		if(typeof last.exports === 'function') last.exports()
	}

	function buildURL(rootUrl, parenturl, path){

		if(path.indexOf('services/') == 0){
			path = path+'web.js'
		}
		var sidx = path.lastIndexOf('/')
		var didx = path.lastIndexOf('.') 
		if(didx === -1 || didx < sidx) path = path + '.js'

		var c1 = path.charAt(0)
		var c2 = path.charAt(1)
		if(c1 === '/'){
			return rootUrl + path.slice(1)
		}
		else if(c1 === '.'){
			if(c2 === '.'){
				console.log("IMPLEMENT RELATIVE PATHS")
			}
			else{
				return parenturl.slice(0,parenturl.lastIndexOf('/')) + path.slice(1)
			}
		}
		else if(path.indexOf('/') === -1) path = 'root/'+path
		//else if(path.indexOf('services/') !== 0){
		//	path = 'home/' + path
		//}
		return rootUrl + '/' + path
	}

	function createRequire(rootUrl, moduleurl, modules, binarylut, worker, userbusses, userArgs){
		function require(path, args){
			if(path.indexOf('services/') === 0){
				//!TODO lock down this require to root/ modules
				var serviceName = path.slice(9)
				// return a user service interface
				var service = {
					args:userArgs[serviceName],
					workerId:worker.workerId,
					bus:{
						batchMessage:function(serviceName, msg, transfers){
							worker.batchMessages.push({$:serviceName,msg:msg})
							if(transfers) worker.batchTransfers.push.apply(worker.batchTransfers,transfers)
						}.bind(null, serviceName),
						postMessage:function(serviceName, msg, transfers){
							worker.postMessage({$:serviceName,msg:msg}, transfers)
						}.bind(null, serviceName),
					}
				}
				userbusses[serviceName] = service.bus
				return service
			}

			// require module
			var url = buildURL(rootUrl, moduleurl, path)

			if(url.indexOf('.js') !== url.length - 3){ // its a binary
				return binarylut[url]
			}
			var module = modules[url]
			if(!module) throw new Error('Cannot require '+url)

			if(!('exports' in module)){
				module.exports = {}
				var ret = module.factory.call(module.exports, module.require, module.exports, module)
				if(ret) module.exports = ret
			}

			var exports = module.exports
			//!TODO lock this down to services
			if(exports.onRequire){
				function resolve(path){
					return buildURL(rootUrl, moduleurl, path)
				}
				return exports.onRequire(args, resolve, moduleurl)
			}
			return exports
		}

		require.log = function(msg){
			worker.postMessage({$:'debug', msg:msg})
		}

		var perf
		var perfNow = typeof performance !== 'undefined'?performance:Date

		require.perf = function(id){
			var t = perfNow.now()
			if(!perf) perf = {}
			var obj = perf[id] || (perf[id] = {})
			if(obj.sample){
				var dt = (t - obj.sample)
				if(!obj.list) obj.list = [dt]
				else obj.list.push(dt)

				var avg = 0
				for(var i = 0; i < obj.list.length;i++)avg += obj.list[i]
				avg = avg / obj.list.length
				require.log('Perf'+(id?'('+id+')':'')+':'+dt+ ' Avg: '+avg)
				obj.sample = undefined
			}
			else obj.sample = t
		}

		require.module = function(exports){
			// lets find the module
			for(var key in modules){
				if(modules[key].exports === exports) return modules[key]
			}
		}

		return require
	}

	function parseFileName(url){
		return url.slice(url.lastIndexOf('/')+1,url.lastIndexOf('.')) || 'path_parse_error'
	}

	var resourcerequests = {}

	var allresources = {}

	function loadResourceAndDeps(parenturl, resourceurl, type, resources, functionSource){

		var resolve, reject
		var prom = new Promise(function(res, rej){resolve = res, reject = rej})

		if(functionSource !== undefined){
			resources.codefiles.push({resourceurl: resourceurl, response:functionSource})
			
			var deps = processCode(functionSource)
			
			Promise.all(deps).then(function(result){
				resolve(result)
			}, function(err){
				reject(err)
			})

			return prom
		}

		// ok this is to prevent recursive loads from happening
		if(allresources[resourceurl]){

			var array
			if(type === 'binary'){
				array = resources.binaries
			}
			else if(type === 'service'){
				array = resources.services
			}
			else if(type === 'code'){
				array = resources.codefiles
			}

			// lets find our resource and move it up
			for(var i = 0; i < array.length; i++)if(array[i].resourceurl === resourceurl){
				var resource = array[i]
				array.splice(i, 1)
				array.push(resource)
				resolve(resource)
				return prom
			}

			// load any deps
			var resource = allresources[resourceurl]
			array.push(resource)
			if(type === 'code'){
				console.log("LOADING",resourceurl, resource)
				var deps = processCode(resource.response)
				Promise.all(deps).then(function(result){
					resolve(resource)
				}, function(err){
					reject(err)
				})
			}
			else{
				resolve(resource)
			}
			return prom
		}
		
		function processCode(incode){
			// rip out all comments
			var code = incode.replace(/\/\*[\S\s]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')

			var deps = []

			// look up loads
			code.replace(/require\s*\(\s*['"](.*?)["']/g, function(m, path){
				// lets check if we are loading a service
				var suburl = buildURL(rootUrl, resourceurl, path)
		
				var deptype = 'code'

				if(path.indexOf('services/') === 0) deptype = 'service'
				var ext = suburl.slice(suburl.lastIndexOf('.')).toLowerCase()
				if(ext !== '.js') deptype = 'binary'

				deps.push(loadResourceAndDeps(resourceurl, suburl, deptype, resources))
			})

			return deps
		}

		if(type === 'binary'){

			var req = new XMLHttpRequest()
			// store in reading
			resourcerequests[resourceurl] = req

			var resource = {
				parenturl: parenturl,
				resourceurl: resourceurl
			}
			allresources[resourceurl] = resource
			resources.binaries.push(resource)

			req.addEventListener("error", function(){
				console.error('Error loading '+resourceurl+' from '+parenturl)
				reject(resource)
			})
			req.responseType = 'arraybuffer'
			req.addEventListener("load", function(){
				if(req.status !== 200){
					return reject(resource)
				}
				resource.response = req.response
				resolve(resource)
			})
			req.open("GET", resourceurl)
			req.send()

		}
		else if(type === 'service'){
			// load up a driver object
			// string load script and all its deps
			var req = new XMLHttpRequest()
			// store in reading
			resourcerequests[resourceurl] = req

			var resource = {
				parenturl: parenturl,
				resourceurl: resourceurl
			}
			allresources[resourceurl] = resource
			resources.services.push(resource)

			req.addEventListener("error", function(){
				console.error('Error loading '+resourceurl+' from '+parenturl)
				reject(resource)
			})
			req.responseType = 'text'
			req.addEventListener("load", function(){
				if(req.status !== 200){
					return reject(resource)
				}
				resource.response = req.response
				resolve(resource)
			})
			req.open("GET", resourceurl)
			req.send()
		}
		else if(type === 'code'){
			// string load script and all its deps
			var req = new XMLHttpRequest()
			
			var resource = {
				parenturl: parenturl,
				resourceurl: resourceurl
			}

			resources.codefiles.push(resource)
			allresources[resourceurl] = resource

			req.addEventListener("error", function(){
				console.error('Error loading '+resourceurl+' from '+parenturl)
				reject(resource)
			})
			req.responseType = 'text'
			req.addEventListener("load", function(){
				if(req.status !== 200){
					return reject(resource)
				}
				
				resource.response = req.response

				var incode = req.response
				var deps = processCode(incode)

				Promise.all(deps).then(function(result){
					resolve(resource)
				}, function(err){
					reject(err)
				})
			})
			req.open("GET", resourceurl)
			req.send()
		}
		return prom
	}

	// very short math mapping GLSL<>JS without support for vectors
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
		g.atan = Math.atan
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

	function watchFileChange(){
		var req = new XMLHttpRequest()
		req.timeout = 60000
		req.addEventListener("error", function(){
			setTimeout(watchFileChange, 500)
		})
		req.responseType = 'text'
		req.addEventListener("load", function(){
			if(req.response === '{continue:true}') return watchFileChange()
			// do something with data
			location.href = location.href
		})
		req.open("GET", "/$watch?"+(''+Math.random()).slice(2))
		req.send()
	}

	function FakeWorker(blob, src){
		var workerfn = new Function("self", src)
		var worker = this

		var workerself = {
			fakeworker:true,
			postMessage:function(msg){
				setTimeout(function(){
					worker.onmessage({data:msg})
				},0)
			}
		}
		
		this.postMessage = function(msg){
			setTimeout(function(){
				workerself.onmessage({data:msg})
			},0)
		}
		workerfn.call(workerself, workerself)
	}

	function cleanWorker(worker){
		var clean = {
			location:1,navigator:1,webkitIndexedDB:2,indexedDB:1,
			CacheStorage:1, Cache:1, Event:1, EventSource:1, EventTarget:1,
			CustomEvent:1, DOMException:1, Crypto:1, CryptoKey:1, CloseEvent:1, Blob:1, 
			Headers:1, MessageChannel:1, MessageEvent:1, MessagePort:1, Notification:1, 
			PermissionStatus:1, Permissions:1, ProgressEvent:1, Proxy:1, 
			ReadableByteStream:1, ReadableStream:1, ReferenceError:1, Reflect:1, 
			Request:1, Response:1, ServiceWorkerRegistration:1, 
			SubtleCrypto:1, TextDecoder:1, TextEncoder:1, 
			DedicatedWorkerGlobalScope:1, URLSearchParams:1, 
			WorkerGlobalScope:1, WorkerLocation:1, WorkerNavigator:1, 
			XMLHttpRequestEventTarget:1, XMLHttpRequestUpload:1, 
			File:1, FileError:1, FileList:1, FileReader:1, FileReaderSync:1, FormData:1, 
			XMLHttpRequest:1, importScript:1, webkitIDBCursor:2, IDBCursor:1, 
			webkitIDBCursorWithValue:2, IDBCursorWithValue:1, 
			webkitIDBDatabase:2, IDBDatabase:1, webkitIDBFactory:2, IDBFactory:1, 
			webkitIDBIndex:2,  IDBIndex:1, webkitIDBKeyRange:2, IDBKeyRange:1, 
			webkitIDBObjectStore:2, IDBObjectStore:1, webkitIDBOpenDBRequest:2, IDBOpenDBRequest:1, 
			webkitIDBRequest:2, IDBRequest:1, webkitIDBTransaction:2, IDBTransaction:1, 
			webkitIDBVersionChangeEvent:2, IDBVersionChangeEvent:1, 
			WebSocket:1, location:1, navigator:1, webkitRequestFileSystem:2, 
			webkitRequestFileSystemSync:2, webkitResolveLocalFileSystemSyncURL:2, 
			webkitResolveLocalFileSystemURL:2, webkitResolveLocalFileSystemUrl:2,  
			escape:1, decodeURI:1, decodeURIComponent:1, encodeURI:1, encodeURIComponent:1, 
			URL:1,crypto:1,onerror:1,onmessage:1,onrejectionhandled:1,
			onunhandledrejection:1,self:1,postMessage:1
		}

		var LocalFunction = worker.Function
		worker.Function = function(){
			var args = []
			var len = arguments.length
			for(var i = 0; i < len - 1; i++) args.push(arguments[i])
			args.push('caches')
			args.push(arguments[len -1])
			return LocalFunction.apply(null, args)
		}
		for(var key in clean){
			var id = clean[key]
			try{
			if(id == 1) Object.defineProperty(worker, key,{value:undefined})
			if(id == 2) worker[key] = undefined
			}catch(e){
				console.log("Error with "+key)
			}
		}
	}

	function timerWorker(self, worker){

		// give the worker a clearAllTimers call
		var _setTimeout = self.setTimeout
		var _clearTimeout = self.clearTimeout
		var _setInterval = self.setInterval
		var _clearInterval = self.clearInterval

		var allTimeouts = []
		var allIntervals = []

		worker.clearAllTimers = function(){
			for(var i = 0; i < allTimeouts.length; i++){
				_clearTimeout(allTimeouts[i])
			}
			allTimeouts.length = 0
			for(var i = 0; i < allIntervals.length; i++){
				_clearInterval(allIntervals[i])
			}
			allIntervals.length = 0
		}

		self.clearTimeout = function(id){
			var idx = allTimeouts.indexOf(id)
			if(idx !== -1) allTimeouts.splice(idx, 1)
			return _clearTimeout(id)
		}

		self.clearInterval = function(id){
			var idx = allIntervals.indexOf(id)
			if(idx !== -1) allIntervals.splice(idx, 1)
			return _clearInterval(id)
		}

		self.setTimeout = function(fn, time){
			var id = _setTimeout(function(){
				var idx = allTimeouts.indexOf(id)
				if(idx !== -1) allTimeouts.splice(id, 1)
				fn()
				worker.postEntry()
			}, time)
			allTimeouts.push(id)
			return id
		}

		self.setInterval = function(fn, time){
			var id = localSetInterval(function(){
				fn()
				worker.postEntry()
			}, time)
			allIntervals.push(id)
			return id
		}

		self.setImmediate = function(fn){
			worker.postFunctions.push(fn)
			return worker.postFunctions.length
		}
	}

	document.addEventListener('DOMContentLoaded', init)
})({})