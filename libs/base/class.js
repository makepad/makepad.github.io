var staticSkip = {
	length:1,
	arguments:1,
	caller:1,
	name:1,
	prototype:1,
	__body__:1
}

function extend(body){

	class ExtendClass extends this{
	}

	var Constructor = ExtendClass
	var proto = ExtendClass.prototype
	
	// make sure we initialize our prototype
	var parentProto = this.prototype
	if(!protoReady.get(parentProto)) parentProto.__initproto__()

	Object.defineProperty(Constructor, 'extend', {writable:true,value:extend})

	// apply all args
	for(let i = 0; i < arguments.length; i++){
		var iter = arguments[i]
		if(typeof iter === 'function'){
			var check = {}
			body.call(check, proto, this.prototype)
			var keys = Object.keys(check)
			if(keys.length){
				throw new Error('Dont assign things to this in class body, use proto as first arg: this.'+keys.join(', '))
			}
		}
		else if(typeof iter === 'object'){
			for(let key in iter){
				proto[key] = iter[key]
			}
		}
	}

	//!TODO remove this, we dont support extend classes that replace the constructor
	
	if(proto.constructor !== Constructor){
		throw new Error("Please use ES6 constructor syntax")
	}
	if(this.prototype.onExtendClass) this.prototype.onExtendClass.call(proto)

	return Constructor
}

module.exports = class RootClass{
	constructor(){
		var proto = Object.getPrototypeOf(this)
		if(!protoReady.get(proto)) proto.__initproto__()
	}
}

Object.defineProperty(module.exports.prototype, 'mixin',{
	enumerable:false,
	configurable:true,
	writable:true,
	value:function mixin(...args){
		for(var a = 0; a < args.length; a++){
			var proto = args[a]
			if(!proto) continue
			if(typeof proto === 'function'){
				// passed in a class
				if(proto.prototype && proto.prototype !== Object){
					proto = proto.prototype
				}
				// plain function
				else{
					proto.call(this, this)
					continue
				}
			}

			if(!protoReady.get(proto) && proto.__initproto__) proto.__initproto__()

			var props = Object.getOwnPropertyNames(proto)
			for(var i = 0; i < props.length; i++){
				var key = props[i]
				var desc = Object.getOwnPropertyDescriptor(proto, key)
				if(key === '__inheritable__'){ // copying inheritable is different
					var value = proto[key]
					for(var j = 0; j < value.length; j++){
						var val = value[j]
						this.inheritable(val.name, val.cb)
					}
				}
				else if(key !== 'constructor' && desc.configurable){
					Object.defineProperty(this, key, desc)
				}
			}
		}
	}
})

Object.defineProperty(module.exports.prototype, 'inheritable',{
	enumerable:false,
	configurable:true,
	writable:true,
	value:function(name, callback){
		if(!this.hasOwnProperty('__inheritable__')) this.__inheritable__ = this.__inheritable__?Array.prototype.slice.apply(this.__inheritable__):[]
		this.__inheritable__.push({name:name, cb:callback})
	}
})

Object.defineProperty(module.exports.prototype, '__inheritable__',{
	enumerable:false,
	configurable:true,
	writable:true,
	value:null
})


var protoReady = new WeakMap()
var inheritReady = new WeakMap()

function scanInheritable(proto, key){

}

Object.defineProperty(module.exports.prototype, '__initproto__',{
	value: function(){
		if(protoReady.get(proto)) return
	
		var stack = []	

		// run prototype functions
		var proto = this
		while(proto && proto.prototype){
			if(!protoReady.get(proto) && proto.hasOwnProperty('prototype')){
				stack.push(proto)
			}
			protoReady.set(proto, true)
			proto = Object.getPrototypeOf(proto)
		}
		for(let i = stack.length - 1;i>=0;i--){
			proto = stack[i]
			proto.prototype()
		}

		// run inheritable callbacks
		if(!this.__inheritable__) return
		for(let j = 0; j< this.__inheritable__.length; j++){
			var inherit = this.__inheritable__[j]
			var key = inherit.name
			// scan this inheritable
			stack.length = 0
			proto = this
			while(proto && proto[key]){
				if(!inheritReady.get(proto) && proto.hasOwnProperty(key)){
					stack.push(proto)
				}
				proto = Object.getPrototypeOf(proto)
			}
			var cb = inherit.cb
			for(let i = stack.length - 1;i>=0;i--){
				cb.call(stack[i])
			}
		}
		proto = this
		while(proto && !inheritReady.get(proto)){
			inheritReady.set(proto, true)
			proto = Object.getPrototypeOf(proto)
		}
	}
})

module.exports.extend = extend
