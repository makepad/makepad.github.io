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
			},
			play:function(notes){
				// process notes into a typed array
				// then pass that sequence to the other side.
				
			}
		}
		this.props = {
			output:{kind:'output'}
		}
	}

	// root methods to ship over
	compile(){
		this.init()
		this.start(0.)
		this.stop(0.)
	}

	init(){
	}

	start(t=0.){
	}

	stop(t=0.){		
	}
	
	$start(){
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
			methods:this.$byteMethods
		})
	}
}