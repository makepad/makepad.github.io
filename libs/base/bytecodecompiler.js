var service = require('$audio1')
var AstByteCodeGen = require('parsers/astbytecodegen')
var IdAlloc = require('base/idalloc')
var flowIds = new IdAlloc()

module.exports = class ByteCodeCompiler extends require('base/class'){

	prototype(){
		this.mixin(
			require('base/tools')
		)

		this.inheritable('props', function(){
			var props = this.props
			for(let key in props){
				this.$defineProp(key, props[key])
			}
		})
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
		var code = this.init.toString()

		var bc = AstByteCodeGen.generateByteCode(
			module.worker.args.audioByteCode,
			this,
			this.compile
		)

		var inputs = bc.methods
		var methods = {}
		for(var key in inputs){
			if(key === 'compile') continue
			var input = inputs[key]
			var ret = input.return
			methods[key] = {
				buffer:input.f32.buffer,
				size:input.o,
				varTypes:input.varTypes,
				argTypes:input.argTypes,
				returnType:ret?bc.typeIds[ret.name]:bc.typeIds.void
			}
		}
		this.$idToName = bc.idToName
		this.$methods = methods
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
