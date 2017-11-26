// very basic class with support for prototype()
var protoInit = new WeakMap()

class Class{
	constructor(){
		if(!protoInit.get(Object.getPrototypeOf(this))){
			this.__initproto__()
		}
	}
}

Object.defineProperty(Class.prototype, '__initproto__', { 
	enumerable: false, 
	configurable: true, 
	writable: true, 
	value: function __initproto__() { 
		var proto = this
		var stack = []
		while(proto){
			if(!protoInit.get(proto)){
				stack.push(proto)
			}
			else break
			proto = Object.getPrototypeOf(proto)
		}
		if(stack.length){
			for(var i = stack.length-1; i >= 0; i--){
				proto = stack[i]
				if(proto.hasOwnProperty('prototype')){
					proto.prototype()
				}
				protoInit.set(proto, true)
			}
		}
	}
})

module.exports = Class