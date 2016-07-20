var service = require('services/worker')
var bus = service.bus

var workeridalloc = 0
var workerids = {}
var requires = {}

bus.onMessage = function(msg){
	if(msg.fn === 'worker'){
		for(var key in requires){
			requires[key].onMessage(msg.msg)
		}
	}
	else if(msg.fn === 'owner'){
		workerids[msg.workerid].onMessage(msg.msg)
	}
}

exports.onRequire = function(args, resolve, moduleurl){

	var Worker = require('class').extend(function Worker(proto){
		proto.onConstruct = function(onrun){

			if(!onrun) onrun = this.onrun

			var workerid = workeridalloc++
			if(typeof onrun === 'function'){
				// send message to workerweb to start this worker
				var fncode = onrun.toString().replace(/function\s*\([^\)]*?\)\s*\{([\S\s]*)\}\s*$/, function(m,b){return b})
				bus.postMessage({
					fn: 'run',
					url: moduleurl,
					workerid: workerid,
					function: fncode
				})
			}
			else{// TODO
				console.log("No other onrun types supported")
			}
			this.postMessage = function(msg){
				bus.postMessage({
					fn:'worker',
					workerid:workerid,
					msg:msg
				})
			},
			this.batchMessage = function(msg){
				bus.batchMessage({
					fn:'worker',
					workerid:workerid,
					msg:msg
				})
			},
			
			workerids[workerid] = this
		}

		proto.onrun = function(){}
		
		proto.onMessage = function(msg){}

		var construct = proto.constructor

		construct.onMessage = function(msg){}
		construct.postMessage = function(msg){
			bus.postMessage({
				fn:'owner',
				workerid:service.workerid,
				msg:msg
			})
		}
		construct.batchMessage = function(msg){
			bus.batchMessage({
				fn:'owner',
				workerid:service.workerid,
				msg:msg
			})
		}
	})

	if(requires[moduleurl]) return requires[moduleurl]
	requires[moduleurl] = Worker

	return Worker
}