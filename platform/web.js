(function(){
	// the loader provides the platform interfaces for web.
	var root = {}
	root.platformPath = 'platform/'
	root.platform = 'web'
	root.isWindows = typeof navigator !== 'undefined' && navigator.appVersion.indexOf("Win") > -1
	root.isIPad = navigator.userAgent.match(/iPad/)
	root.isIOSDevice = navigator.userAgent.match(/(iPod|iPhone|iPad)/) && navigator.userAgent.match(/AppleWebKit/)
	root.isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints)
	root.locationSearch = location.search

	// creates a worker creator
	root.makeWorkerCreator = function(source){
		var src = 
			'(function(){'+
			'	var global = self\n'+
			'	var worker = {postMessage:self.postMessage.bind(self)}\n'+
			'	self.onmessage = function(msg){worker.onMessage(msg.data)}\n'+
			source+'\n'+
			cleanWebWorker.toString()+';cleanWebWorker();\n'+
			'})()'

		var blob = URL.createObjectURL(new Blob([src], {type: "text/javascript"}))

		return function(){
			var worker = new Worker(blob)
			worker.onmessage = function(msg){
				this.onMessage(msg.data)
			}
			return worker
		}
	}

	// watches a file
	root.watchFile = function(localFile){

	}

	// inject a script tag for url
	root.showParseError = function(path){
		var script = document.createElement('script')
		script.type = 'text/javascript'
		script.src = location.origin+'/'+path
		document.getElementsByTagName('head')[0].appendChild(script)
	}

	// downloads a resource
	root.resourceCache = {}

	root.downloadResource = function(localFile, isBinary){
		return new Promise(function(resolve, reject){
			var req = new XMLHttpRequest()
		
			req.addEventListener("error", function(){
				console.error('Error loading '+resourceurl+' from '+parenturl)
				reject(resource)
			})
			req.responseType = isBinary?'arraybuffer':'text'
			req.addEventListener("load", function(){
				if(req.status !== 200){
					return reject(resource)
				}
				root.resourceCache[localFile] = req.response
				resolve(req.response)
			})
			req.open("GET", location.origin+'/'+localFile)
			req.send()
		})
	}

	var canvasses =	document.getElementsByClassName('makepad')
	

	var initApps 
	function init(){

		var apps = []
		for(var i = 0; i < canvasses.length; i++){
			var canvas = canvasses[i]
			apps.push({
				main:canvas.getAttribute('main'),
				platform:{
					canvas:canvas,
					search:location.search && location.search.slice(1)
				}
			})
		}
		if(root.onInitApps) root.onInitApps(apps) 
		else initApps = apps
	}

	document.addEventListener('DOMContentLoaded', init)

	// load up boot file
	root.downloadResource(root.platformPath+'boot.js').then(function(result){
		// start it up
		try{
			new Function("root", result)(root)
		}
		catch(e){
			root.showParseError(root.platformPath+'boot.js')
			return
		}
		// if we were slower than DOMContentLoaded
		if(initApps) root.onInitApps(initApps)
	})

	function watchFileChange(){
		var req = new XMLHttpRequest()
		req.timeout = 60000
		req.addEventListener("error", function(){
			setTimeout(watchFileChange, 500)
		})
		req.responseType = 'text'
		req.addEventListener("load", function(){
			if(req.response === '{continue:true}') return watchFileChange()
			// do something with data, or not
			location.href = location.href
		})
		req.open("GET", "/$watch?"+(''+Math.random()).slice(2))
		req.send()
	}

	watchFileChange()

	function cleanWebWorker(){
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
			XMLHttpRequest:1, importScript:1, importScripts:1, webkitIDBCursor:2, IDBCursor:1, 
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
			onunhandledrejection:1,self:1//,postMessage:2
		}

		var LocalFunction = self.Function
		self.Function = function(){
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
				if(id == 1) Object.defineProperty(self, key,{value:undefined})
				if(id == 2) self[key] = undefined
			}catch(e){
				console.log("Error with "+key)
			}
		}
		self = undefined
	}
})()