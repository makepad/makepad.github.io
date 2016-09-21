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
		throw new Error("Please use ES6 constructor syntax")
	}
	if(this.prototype.onExtendClass) this.prototype.onExtendClass.call(proto)

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
