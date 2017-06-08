function extend(body) { 
	
	class ExtendClass extends this{
	}
	
	var Constructor = ExtendClass 
	var proto = ExtendClass.prototype 
	
	var parentProto = this.prototype 
	if(!protoReady.get(parentProto)) parentProto.__initproto__() 
	
	Object.defineProperty(Constructor, 'extend', {writable: true, value: extend}) 
	
	// apply all args
	for(let i = 0; i < arguments.length; i++) { 
		var iter = arguments[i] 
		if(typeof iter === 'function') { 
			var check = {} 
			body.call(check, proto, this.prototype) 
			var keys = Object.keys(check) 
			if(keys.length) { 
				throw new Error('Dont use this in extend callback: '+JSON.stringify(keys))
			} 
		}
		else if(typeof iter === 'object') { 
			for(let key in iter) { 
				proto[key] = iter[key] 
			} 
		} 
	} 
	
	if(proto.constructor !== Constructor) {
		throw new Error("Please use ES6 constructor syntax") 
	} 
	
	return Constructor 
} 

module.exports = class RootClass{ 
	constructor() { 
		var proto = Object.getPrototypeOf(this) 
		if(!protoReady.get(proto)) proto.__initproto__() 
	} 
} 

function mixin(...args) { 
	for(var a = 0; a < args.length; a++) { 
		var proto = args[a] 
		if(!proto) continue 
		if(typeof proto === 'function') { 
			// passed in a class
			if(proto.prototype && proto.prototype !== Object) { 
				proto = proto.prototype 
			}
			else { 
				proto.call(this, this) 
				continue 
			} 
		} 
		
		if(!protoReady.get(proto) && proto.__initproto__) proto.__initproto__() 
		
		var props = Object.getOwnPropertyNames(proto) 
		for(var i = 0; i < props.length; i++) { 
			var key = props[i] 
			var desc = Object.getOwnPropertyDescriptor(proto, key) 
			if(key === '__inheritable__') { // copying inheritable is different
				var value = proto[key] 
				for(var j = 0; j < value.length; j++) { 
					var val = value[j] 
					this.inheritable(val.name, val.cb) 
				} 
			}
			else if(key !== 'constructor' && key !== 'prototype' && desc.configurable) { 
				Object.defineProperty(this, key, desc) 
			} 
		} 
	} 
} 

Object.defineProperty(module.exports.prototype, 'mixin', { 
	enumerable: false, 
	configurable: true, 
	get:function(){
		return mixin
	},
	set:function(arg){
		if(Array.isArray(arg)) mixin.apply(this, arg)
		else mixin.call(this, arg)
	} 
}) 

var protoReady = new WeakMap() 
var inheritReady = new WeakMap() 

Object.defineProperty(module.exports.prototype, 'inheritable', { 
	enumerable: false, 
	configurable: true, 
	writable: true, 
	value: function inheritable(name, callback, type) { 
		if(!callback){
			var inh = this.__inheritable__
			if(!inh) return false
			for(let i = inh.length - 1; i>=0; i--){
				if(inh[i].name === name) return true
			}
			return false
		}
		if(!this.hasOwnProperty('__inheritable__')) { 
			Object.defineProperty(this, '__inheritable__', { 
				enumerable: false, 
				configurable: true, 
				writable: true, 
				value: this.__inheritable__? Array.prototype.slice.apply(this.__inheritable__): [] 
			}) 
		} 
		this.__inheritable__.push({name: name, cb: callback, type:type}) 
	} 
}) 


Object.defineProperty(module.exports.prototype, '__initproto__', { 
	enumerable: false, 
	configurable: true, 
	writable: true, 
	value: function __initproto__() { 
		if(protoReady.get(proto)) return 
		
		var stack = [] 
		
		// run prototype functions
		var proto = this 
		while(proto && proto.prototype){ 
			if(!protoReady.get(proto) && proto.hasOwnProperty('prototype')) { 
				stack.push(proto) 
			} 
			protoReady.set(proto, true) 
			proto = Object.getPrototypeOf(proto) 
		} 
		for(let i = stack.length - 1; i >= 0; i--) { 
			proto = stack[i] 
			proto.prototype() 
		} 
		
		if(!this.__inheritable__) return 
		
		// run inheritable callbacks			
		for(let j = 0; j < this.__inheritable__.length; j++) { 
			var inherit = this.__inheritable__[j] 
			var key = inherit.name 
			// scan this inheritable
			stack.length = 0 
			proto = this 
			while(proto && proto[key]){ 
				if(!inheritReady.get(proto) && proto.hasOwnProperty(key)) { 
					stack.push(proto) 
				} 
				proto = Object.getPrototypeOf(proto) 
			} 
			var cb = inherit.cb 
			for(let i = stack.length - 1; i >= 0; i--) { 
				proto = stack[i]
				//inheritReady.set(proto, true) 
				cb.call(proto) 
			} 
		} 
		proto = this 
		while(proto && !inheritReady.get(proto)){ 
			inheritReady.set(proto, true) 
			// freeze it
			proto = Object.getPrototypeOf(proto) 
		} 
	} 
}) 

module.exports.extend = extend 
