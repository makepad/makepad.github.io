const Worker = require('services/worker')

module.exports = class UserProcess extends require('views/draw'){

	prototype(){
		this.surface = true
		this.props = {
			resource:null
		}
	}

	onRemove(){
		// we have to free all associated resources.
	}

	onDraw(){
		this.drawBg(this.viewGeom)
	}

	onResource(e){	
		// it changes! lets reload?..
	}

	onDraw() { 
		this.onDraw = undefined 
		this.startWorker()
	} 

	reloadWorker(){
		var newDeps = {} 
		var oldDeps = this.deps 
		var deltaDeps = {} 
		this.app.findResourceDeps(this.resource, newDeps) 
		// delta the deps
		for(var key in newDeps) { 
			if(oldDeps[key] !== newDeps[key]) { 
				oldDeps[key] = deltaDeps[key] = newDeps[key] 
			} 
		} 
		// send new init message to worker
		this.store.act("clearRuntimeError",store=>{
			this.process.runtimeErrors.length = 0
		})

		this.worker.init(
			this.process.path,
			deltaDeps
		) 
	}

	startWorker(){

		this.worker = new Worker(null, {
			parentFbId: this.$renderPasses.surface.framebuffer.fbId 
		})
		
		// OK so lets compose all deps
		this.deps = {} 
		//this.main = this.resource 
		this.app.findResourceDeps(this.resource, this.deps)
		// lets add our process to all the deps

		this.store.act("addProcessToResources", store=>{
			//var resmap = store.resourceList
			var process = this.process
			var resourceMap = this.store.resourceMap
			for(var key in this.deps){
				var res = resourceMap.get(key)
				res.processes.push(process)
			}
		})
		
		this.worker.init( 
			this.resource.path, 
			this.deps
		)

		function equals(a,b){
			if(a && a.__proxymeta__) a = a.__proxymeta__.object
			if(b && b.__proxymeta__) b = b.__proxymeta__.object
			if(Array.isArray(a) && Array.isArray(b)){
				if(a.length !== b.length) return false
				for(let i = a.length - 1; i >=0; --i){
					if(!equals(a[i], b[i])) return false
				}
				return true
			}
			if(typeof a === 'object' && typeof b === 'object'){
				var ak = Object.keys(a), bk = Object.keys(b)
				if(ak.length !== bk.length) return false
				for(let i = ak.length - 1; i >=0; --i){
					let k = ak[i]
					if(k !== bk[i]) return false
					if(!equals(a[k], b[k])) return false
				}
				return true
			}
			return a === b
		}

		this.worker.onDebug = e=>{
			console.log("HERE",e)
			// alright so where do we put it.
			this.store.act("addLog", store=>{
				var logs = this.process.logs
				// check if we are the same as the last
				var last = logs[logs.length - 1]
				console.log(e)
				//logs.push(e)
				//if(logs.length > 10000){
				//	logs.unshift()
				//}
			})
		}

		this.worker.onError = e => {
			// we haz error, update the process
			this.store.act("addRuntimeError",store=>{
				var rt = this.process.runtimeErrors
				var logs = this.process.logs
				logs.push(e)
				if(logs.length > 10000){
					logs.unshift()
				}

				// lets find a duplicate entry
				for(let i = rt.length-1; i >=0; i--){
					var r = rt[i]
					if(r.file == e.file && r.line == e.line && r.column == e.column && r.message == e.message && equals(r.stack, e.stack)){
						r.count++
						return
					}
				}
				if(rt.length>1){
					if(rt.length<=2){
						this.process.runtimeErrors.push({
							message:'Too many errors', stack:[]
						})
					}
					return
				}
				e.count = 1
				this.process.runtimeErrors.push(e)
			})
		}

		this.worker.ping(2000)
		this.worker.onPingTimeout = ()=>{
			this.worker.terminate()
			this.app.findAll(/^Source/).forEach(s=>{
				this.store.act("addRuntimeError",store=>{
					this.process.runtimeErrors.push({
						message:"Infinite loop detected, restarting"
					})
				})
			})
			this.startWorker()
		}
	}
}