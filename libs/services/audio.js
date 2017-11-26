var service = require('$audio1')
var IdAlloc = require('base/idalloc')
var classIds = new IdAlloc()
var KernelClass = require('base/kernelclass')
class AudioNode extends KernelClass{

	prototype(){
		this.verbs = {
			start: function(overload){
				var id = overload.id
				if(!this.$audioNodes) this.$audioNodes = {}
				var node = this.$audioNodes[id]
				if(!node){
					this.$audioNodes[id] = node = new this.NAME(this,overload)
				}
				else if(node.constructor !== this.NAME) throw new Error('View id collision detected' + id)
				
				node.$start(this, overload)
				return node
			}
		}

		this.nest = {
			Osc:Osc
		}

		// declare props on this thing
		this.props = {
			output:{kind:'output'}
		}

		// import libraries, either as object or into the scope
		this.imports = [
			//require('base/mylib')
		]

		this.$kernelClassIDs = module.worker.args.audio1.kernelClassIds
	}

	// someone is newing us
	constructor(args){
		super()
		// cool, so lets map ourselves to something on the other side.
		// and call start on it

	}

	// root methods to ship over
	compile(){
		this.init()
		this.start(0.)
		this.stop(0.)
	}

	init(){
	}

	start(t = 0.){
	}

	stop(t = 0.){		
	}
	       
	onCompileVerbs(target){
		var ret = super.onCompileVerbs(target)
		// ok so, we should have a set of methods to communicate

		// transmit this class to the main 
		this.$classId = classIds.alloc()
		// lets send this.$compiled over to the mainthread
		service.postMessage({
			fn:'compileClass',
			classId: this.$classId,
			idToName:this.$idToName,
			methods:this.$byteMethods
		})
		return ret
	}
}

// typedecl for system api
class AudioParam extends AudioNode{
	prototype(){
		this.props = {
			defaultValue:{readOnly:true, type:float}
		}
		this.$systemClassId = module.worker.args.AudioParamID
	}

	get defaultValue(){
		return float
	}

	get maxValue(){
		return float
	}

	get minValue(){
		return float
	}

	setValueAtTime(value = float, startTime = float){
	}

	connect(to = AudioNode){
	}
}

class Osc extends AudioNode{
	prototype(){
		this.props = {
			frequency:{type:AudioParam}
		}
	}
}

exports.AudioNode = AudioNode
exports.AudioParam = AudioParam
exports.Osc = Osc