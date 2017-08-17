var service = require('$audio1')
var IdAlloc = require('base/idalloc')
var classIds = new IdAlloc()

exports.AudioNode = class AudioNode extends require('base/bytecodecompiler'){

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
	}

	// root methods to ship over
	compile(){
		this.init()
		this.start(0.)
		this.stop(0.)
	}

	$start(overload){
		// do something
	}

	$compileByteCode(){
		super.$compileByteCode()
		// transmit this class to the main 
		this.$classId = classIds.alloc()
		// lets send this.$compiled over to the mainthread
		service.postMessage({
			fn:'compileClass',
			classId: this.$classId,
			idToName:this.$idToName,
			methods:this.$methods
		})
	}
}
/*
// store the Osc type
exports.Node.prototype.Osc = class Osc extends exports.AudioNode{
	prototype(){
		this.props = {
			output:{kind:'output'},
			frequency:{kind:'sample', value:440},
			detune:{kind:'sample', value:0.},
			type:{kind:'control', type:types.enum},
		}
		// this is a system device, use OscillatorNode
		this.system = 'OscillatorNode'
	}
}
*/
