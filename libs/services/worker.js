var service = require('$worker1')

var localIdsAlloc = 0
var localIds = {}
var requires = {}
var pingTimeouts

service.onMessage = function(msg){
	if(msg.fn === 'toWorker'){
		for(let key in requires){
			requires[key].onMessage(msg.msg)
		}
	}
	else if(msg.fn === 'toParent'){
		localIds[msg.localId].onMessage(msg.msg)
	}
	else if(msg.fn === 'pong'){
		localIds[msg.localId].onPong()
	}
}

exports.onRequire = function(args, absParent, buildPath){

	var Worker = require('base/class').extend(function Worker(proto){
		proto.constructor = function(serviceList, platform){
			var run
			if(typeof serviceList === 'function') run = serviceList, serviceList = undefined

			var localId = localIdsAlloc++

			this.postMessage = function(msg, transfers){
				if(!localIds[localId]) throw new Error('worker already terminated')
				service.postMessage({
					fn:'toWorker',
					localId:localId,
					msg:msg,
					transfers:transfers
				}, transfers)
			},
			this.batchMessage = function(msg, transfers){
				if(!localIds[localId]) throw new Error('worker already terminated')
				service.batchMessage({
					fn:'toWorker',
					localId:localId,
					msg:msg,
					transfers:transfers
				}, transfers)
			},
			
			localIds[localId] = this
			
			// start the worker already before we send init
			service.batchMessage({
				fn:'start',
				localId:localId,
				serviceList:serviceList,
				platform:platform
			})
			
			// initialize worker from a function
			// TODO only send actual dependencies
			this.run = function(run){
				var myres = module.worker.resources
				var resources = {}
				for(let key in myres){
					resources[key] = myres[key]
				}
				resources['main'] = run.toString().replace(/function\s*\([^\)]*?\)\s*\{([\S\s]*)\}\s*$/, function(m,b){return b})
				this.init('main', resources)
			}

			this.onPingTimeout = function(){
			}

			// default pong handler
			this.onPong = function(){
				clearTimeout(this.pingTimer)
				var delta = Date.now() - this.pingStart
				// we should wait for half delta
				this.pingTimer = setTimeout(function(){
					this.pingTimer = undefined
					this.ping(this.pingTimeout)
				}.bind(this), (this.pingTimeout - delta))
			}

			this.ping = function(timeout){
				if(this.pingTimer) throw new Error("Ping already in progress")
				this.pingStart = Date.now()
				this.pingTimer = setTimeout(function(){
					this.onPingTimeout()
				}.bind(this), timeout)

				this.pingTimeout = timeout
				service.batchMessage({
					fn: 'ping',
					localId: localId
				})
			}

			// initialize worker from main and resources
			this.init = function(main, resources, init){
				if(!localIds[localId]) throw new Error('worker already terminated')
				// alright someone wants to run resources with a main
				service.batchMessage({
					fn: 'init',
					main: main,
					resources: resources,
					init: init,
					localId: localId
				})
			}

			this.terminate = function(){
				if(!localIds[localId]) throw new Error('worker already terminated')
				service.postMessage({
					fn: 'terminate',
					localId: localId
				})
				localIds[localId] = undefined
			}

			if(run) this.run(run)
		}

		proto.onRun = function(){}
		
		proto.onMessage = function(msg){}

		var construct = proto.constructor

		construct.onMessage = function(msg){}
		construct.postMessage = function(msg, transfers){
			service.postMessage({
				fn:'toParent',
				msg:msg,
				transfers:transfers
			}, transfers)
		}
		construct.batchMessage = function(msg, transfers){
			service.batchMessage({
				fn:'toParent',
				msg:msg,
				transfers:transfers
			}, transfers)
		}
	})

	if(requires[absParent]) return requires[absParent]
	requires[absParent] = Worker

	return Worker
}