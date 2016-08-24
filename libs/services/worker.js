var service = require('$services/worker1')
var bus = service.bus

var workerIdsAlloc = 0
var workerIds = {}
var requires = {}

bus.onMessage = function(msg){
	if(msg.fn === 'worker'){
		for(var key in requires){
			requires[key].onMessage(msg.msg)
		}
	}
	else if(msg.fn === 'owner'){
		workerIds[msg.workerId].onMessage(msg.msg)
	}
}

exports.onRequire = function(args, resolve, moduleurl){

	var Worker = require('base/class').extend(function Worker(proto){
		proto.onConstruct = function(onRun, args){
			var workerId = workerIdsAlloc++

			this.postMessage = function(msg, transfers){
				bus.postMessage({
					fn:'worker',
					workerId:workerId,
					msg:msg,
					transfers:transfers
				}, transfers)
			},
			this.batchMessage = function(msg, transfers){
				bus.batchMessage({
					fn:'worker',
					workerId:workerId,
					msg:msg,
					transfers:transfers
				}, transfers)
			},
			
			workerIds[workerId] = this

			// run more code
			this.run = function(onRun,args){
				if(!onRun) onRun = this.onRun
				var code
				if(typeof onRun === 'function'){
					// send message to workerweb to start this worker
					code = onRun.toString().replace(/function\s*\([^\)]*?\)\s*\{([\S\s]*)\}\s*$/, function(m,b){return b})
				}
				else if(typeof onRun === 'string'){
					code = onRun
				}
				else{
					throw new Error("No onRun function specified for worker")
				}

				bus.postMessage({
					fn: 'run',
					url: moduleurl,
					args: args, 
					workerId: workerId,
					function: code
				})
			}
		
			this.run(onRun,args)
		}

		proto.onRun = function(){}
		
		proto.onMessage = function(msg){}

		var construct = proto.constructor

		construct.onMessage = function(msg){}
		construct.postMessage = function(msg, transfers){
			bus.postMessage({
				fn:'owner',
				workerId:service.workerId,
				msg:msg,
				transfers:transfers
			}, transfers)
		}
		construct.batchMessage = function(msg, transfers){
			bus.batchMessage({
				fn:'owner',
				workerId:service.workerId,
				msg:msg,
				transfers:transfers
			}, transfers)
		}
	})

	if(requires[moduleurl]) return requires[moduleurl]
	requires[moduleurl] = Worker

	return Worker
}