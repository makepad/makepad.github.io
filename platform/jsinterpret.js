var logNonexisting = function(node) {
	console.log(node.type)
}

var protoInit = new WeakMap()
protoInit.initialize = function(proto){
	var stack = []
	while(proto){
		if(!this.get(proto)){
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
			this.set(proto, true)
		}
	}
}

module.exports = class JSInterpret{
	
	prototype() {
		var ops = this._ops = {
			PUSH_F32:1,
			PUSH_I32:2,
			PUSH_STR:3,
			PUSH_VEC2:4,
			PUSH_VEC3:5,
			PUSH_VEC4:6,
			PUSH_MAT4:7,
			ADD_F32_F32:20,
			SUB_F32_F32:21,
			MUL_F32_F32:22,
			DIV_F32_F32:23
		}

		this[ops.PUSH_F32] = function(){
			this.stack.push(this.f32[this.o++])
		}

		this[ops.PUSH_I32] = function(){
			this.stack.push(this.i32[this.o++])
		}

		this[ops.PUSH_ADD_F32_F32] = function(){
			this.stack.push(this.stack.pop() + this.stack.pop())
		}
			
		this[ops.PUSH_SUB_F32_F32] = function(){
			this.stack.push(this.stack.pop() - this.stack.pop())
		}

		this[ops.PUSH_MUL_F32_F32] = function(){
			this.stack.push(this.stack.pop() * this.stack.pop())
		}

		this[ops.PUSH_DIV_F32_F32] = function(){
			this.stack.push(this.stack.pop() / this.stack.pop())
		}
	}
	
	constructor(){
		var proto = Object.getPrototypeOf(this)
		if(!protoInit.get(proto)){
			protoInit.initialize(proto)
		}
		this.stack = []
	}

	run(buffer){
		this.f32 = new Float32Array(buffer)
		this.i32 = new Int32Array(buffer)
		this.o = 0
		while(1){
			var op = this.i32[this.o++]
			if(!op) break
			this[op]()
		}
	}
}