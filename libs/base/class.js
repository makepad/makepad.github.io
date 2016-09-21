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

		Constructor = proto.constructor
		Constructor.prototype = proto
		Object.defineProperty(Constructor, 'extend', {writable:true,value:extend})
		// Fake ES6 constructor static methods by copying them
		var cons = this.prototype.constructor
		while(cons && cons !== Object){
			var props = Object.getOwnPropertyNames(cons)
			for(let i = 0; i < props.length; i++){
				var name = props[i]
				if(name in staticSkip) continue
				if(!(name in Constructor)) Constructor[name] = cons[name]
			}
			if(cons.hasOwnProperty('__body__')) cons = null
			else{
				var cproto =  Object.getPrototypeOf(cons.prototype)
				cons = cproto && cproto.constructor
			}
		}
	}

	if(this.prototype.onExtendClass) this.prototype.onExtendClass.call(proto)
	Object.defineProperty(Constructor, '__body__', {value:body})
	return Constructor
}

var protoReady = new WeakMap()

module.exports = class RootClass{
	constructor(){
		var proto = Object.getPrototypeOf(this)
		if(protoReady.get(proto)) return
		proto.__initproto__()
	}
}

Object.defineProperty(module.exports.prototype, '__initproto__',{
	value: function(){
		var proto = this
		if(protoReady.get(proto)) return
		// lazily initialize the prototype chain
		var stack = []	

		while(proto && proto.prototype){
			if(!protoReady.get(proto) && proto.hasOwnProperty('prototype')){
				stack.push(proto)
			}
			proto = Object.getPrototypeOf(proto)
		}

		for(let i = stack.length-1;i>=0;i--){
			proto = stack[i]
			proto.prototype()
			protoReady.set(proto, true)
		}
	}
})

module.exports.extend = extend
