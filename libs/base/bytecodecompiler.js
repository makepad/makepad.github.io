var service = require('$audio1')
var types = require('base/types')
var AstByteCodeGen = require('parsers/astbytecodegen')
var IdAlloc = require('base/idalloc')
var flowIds = new IdAlloc()

module.exports = class ByteCodeCompiler extends require('base/class'){

	prototype(){
		this.mixin(
			require('base/nest')
		)

		this.inheritable('props', function(){
			var props = this.props
			for(let key in props){
				this.$defineProp(key, props[key])
			}
		})
		// lets define the compiler
		//this.$compiler = AstByteCodeGen.generateCompiler(
		//	module.worker.args.audioByteCode
		//)
	}

	$defineProp(key, value){
		if(!this.hasOwnProperty('_props')){
			this._props = this._props?Object.create(this._props):{}
		}

		var config = value
		if(typeof config !== 'object' || config.constructor !== Object){
			config = {value:config}
		}

		var old = this._props[key]
		if(old){
			for(let key in old) if(!(key in config)){
				config[key] = old[key]
			}
		}

		this._props[key] = config
		if(config.value !== undefined) this[key] = config.value
		if(!config.type) config.type = types.typeFromValue(config.value)
	}

	constructor(config) {
		super()
	}

	onCompileVerbs(){
		this.__initproto__()
		if(!this.$compiled){
			this.$compileByteCode()
		}
		else{
			if(this.hasOwnProperty('$compiled')){
				return
			}

			this.$compiled = this.$compiled
			for(var key in this.$compiled){
				if(this.$compiled[key] !== this[key]){
					this.$compileByteCode()
				}
			}
		}
	}

	$compileByteCode(){
		// lets compile it!
		var bc = AstByteCodeGen.compileMethod(module.worker.args.audioByteCode, this, this.compile)

		var inputMethods = bc.methods
		var byteMethods = {}
		for(var key in inputMethods){
			if(key === 'compile') continue
			var input = inputMethods[key]
			var returnType = input.returnType

			byteMethods[key] = {
				buffer:input.f32.buffer,
				size:input.o,
				varTypeIds:input.varTypeIds,
				argTypeIds:input.argTypeIds,
				returnTypeId:returnType?returnType.id:Type.void.id
			}
		}
		this.$methods = inputMethods
		this.$idToName = bc.idToName
		this.$byteMethods = byteMethods
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
