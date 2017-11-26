
var KernelClassCompiler = require('base/kernelclasscompiler')
var IdAlloc = require('base/idalloc')
var infer = require('base/infer')

module.exports = class KernelClass extends require('base/class'){

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
		if(!config.type) config.type = infer.typeFromValue(config.value)
	}

	constructor(config) {
		super()
	}

	onCompileVerbs(target){
		this.__initproto__()

		// lets make alist of keys we have
		var keys = Object.keys(this)

		for(var i = 0; i < keys.length; i++){
			var key = keys[i]
			if(key.charCodeAt(0) === 36 || key === 'prototype') continue // starts with $
			var getter = this.__lookupGetter__(key)
			if(getter !== undefined){ // we have a getter
				console.log('getter', key)

			}
			else{
				var fn = this[key]
				if(typeof fn !== 'function') continue
				// what if our property is a class?
				if(fn.prototype && Object.getPrototypeOf(fn.prototype) !== Object.prototype){
					// its a class, lets skip it
					continue
				}
				// compile our method
				console.log('compile', key)

			}
		}

		// lets compile it!
		var bc = KernelClassCompiler.compileMethod(
			this.$kernelClassIDs, this, this.compile
		)

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

		if(target instanceof KernelClass) return true
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
