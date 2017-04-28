var service = require('$worker1')

var localIdsAlloc = 1
var localIds = {}
var requires = {}
var pingTimeouts

var pileupQueue = []
var pileupTimer

function flushPileupQueue(){
	for(let i = 0; i < pileupQueue.length; i++){
		var msg = pileupQueue[i]
		if(msg.fn === 'toWorker'){
			for(let key in requires){
				requires[key].onMessage(msg.msg)
			}
		}
		else if(msg.fn === 'toParent'){
			localIds[msg.localId].onMessage(msg.msg)
		}
		else if(msg.fn == 'onError'){
			localIds[msg.localId].onError(msg.error)
		}
		else if(msg.fn == 'onLog'){
			localIds[msg.localId].onLog(msg)
		}
		else if(msg.fn == 'onTrace'){
			localIds[msg.localId].onTrace(msg)
		}
	}
	pileupQueue.length = 0
}


service.onMessage = function(msg){

	if(msg.fn === 'pong'){
		localIds[msg.localId].onPong()
		return
	}
	
	// check the pileupTimer
	if(Date.now() - msg.pileupTime > 16){
		if(pileupTimer) clearTimeout(pileupTimer)
		pileupQueue.push(msg)
		pileupTimer = setTimeout(flushPileupQueue, 16)
		return
	}
	if(pileupTimer) clearTimeout(pileupTimer), pileupTimer = undefined
	pileupQueue.push(msg)
	flushPileupQueue()
}

exports.onRequire = function(args, absParent, buildPath){

	var Worker = class Worker extends require('base/class'){
		constructor(serviceList, platform){
			super()
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

			this.onDebug = function(){
			}

			this.onPingTimeout = function(){
			}

			this.onError = function(){
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
					if(this.onPingTimeout) this.onPingTimeout()
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

		onRun(){}
		
		onMessage(msg){}

		static onMessage(msg){}

		static postMessage(msg, transfers){
			service.postMessage({
				fn:'toParent',
				msg:msg,
				transfers:transfers
			}, transfers)
		}

		static batchMessage(msg, transfers){
			service.batchMessage({
				fn:'toParent',
				msg:msg,
				transfers:transfers
			}, transfers)
		}

		static setFocus(localId){
			//if(!localIds[localId]) throw new Error('worker already terminated')
			service.postMessage({
				fn:'setFocus',
				localId: localId
			})
		}
	}

	if(requires[absParent]) return requires[absParent]
	requires[absParent] = Worker

	return Worker
}