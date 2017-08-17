var trace = false

class ByteCodeCompiler{
	prototype(){
		var o = 1
		var codeIds = this.codeIds = {
			BLOCK_STATEMENT:o++,
			ARRAY_EXPRESSION:o++,
			EXPRESSION_STATEMENT:o++,
			SEQUENCE_EXPRESSION:o++,
			LITERAL_INT:o++,
			LITERAL_FLOAT:o++,
			LITERAL_BOOL:o++,
			ARGUMENT:o++,
			VARIABLE:o++,
			THIS_EXPRESSION:o++,
			MEMBER_EXPRESSION:o++,
			MEMBER_COMPUTED:o++,
			MEMBER_OBJECT:o++,
			CALL_BUILTIN:o++,
			CALL_TYPE:o++,
			CALL_THIS:o++,
			CALL_OBJECT:o++,
			NEW_EXPRESSION:o++,
			RETURN_VALUE:o++,
			RETURN_VOID:o++,
			VARIABLE_DECLARATION:o++,
			VARIABLE_DECLARATOR:o++,
			LOGICAL_EXPRESSION:o++,
			BINARY_EXPRESSION:o++,
			ASSIGNMENT_EXPRESSION:o++,
			CONDITIONAL_EXPRESSION:o++,
			UNARY_EXPRESSION:o++,
			UPDATE_EXPRESSION:o++,
			IF_STATEMENT:o++,
			FOR_STATEMENT:o++,
			WHILE_STATEMENT:o++,
			DOWHILE_STATEMENT:o++,
			BREAK_STATEMENT:o++,
			CONTINUE_STATEMENT:o++,
			YIELD_EXPRESSION:o++,
			SWITCH_STATEMENT:o++,
			SWITCH_CASE:o++
		}
		var t = 1
		var typeIds = this.typeIds = {
			void:t++,
			float:t++,
			int:t++,
			bool:t++,
			vec2:t++,
			vec3:t++,
			vec4:t++,
			ivec2:t++,
			ivec3:t++,
			ivec4:t++,
			mat2:t++,
			mat3:t++,
			mat4:t++
		}

		var typeSizes  = {
			void:0,
			float:1,
			int:1,
			bool:1,
			vec2:2,
			vec3:3,
			vec4:4,
			ivec2:2,
			ivec3:3,
			ivec4:4,
			mat2:4,
			mat3:9,
			mat4:16
		}
		this.typeIdToSize = Object.create(null)
		
		for(var key in typeIds){
			this.typeIdToSize[typeIds[key]] = typeSizes[key]
		}

		// create reverse mapping
		var typeIdToName = Object.create(null)
		for(var key in typeIds){
			typeIdToName[typeIds[key]] = key
		}

		var s = 1
		// default symbols for global functions
		var fns = this.builtinIds = {
			sin:s++,
			cos:s++,
			tan:s++,
			asin:s++,
			acos:s++,
			atan:s++,
			pow:s++,
			exp:s++,
			log:s++,
			exp2:s++,
			log2:s++,
			sqrt:s++,
			inversesqrt:s++,
			abs:s++,
			sign:s++,
			floor:s++,
			ceil:s++,
			fract:s++,
			mod:s++,
			min:s++,
			max:s++,
			clamp:s++,
			mix:s++,
			step:s++,
			smoothstep:s++,
			length:s++,
			distance:s++,
			dot:s++,
			cross:s++,
			normalize:s++
		}


		this[codeIds.LITERAL_INT] = function LITERAL_INT(){
			var type = this.i32[this.o++]
			var value = this.i32[this.o++]
			return String(value)
		}

		this[codeIds.LITERAL_FLOAT] = function LITERAL_FLOAT(){
			var type = this.i32[this.o++]
			return this.literalStack.push(this.f32[this.o++]) - 1
		}

		this[codeIds.LITERAL_BOOL] = function LITERAL_BOOL(){
			var type = this.i32[this.o++]
			var value = this.i32[this.o++]
			return value!=0?'true':'false'
		}

		this[codeIds.ARGUMENT] = function ARGUMENT(){
			var type = this.i32[this.o++]
			var id = this.i32[this.o++]
			return 'a'+id
		}

		this[codeIds.VARIABLE] = function VARIABLE(){
			var type = this.i32[this.o++]
			var id = this.i32[this.o++]
			return 'v'+id
		}

		// plug the node types on a recursive compiler
		this[codeIds.BLOCK_STATEMENT] = function BLOCK_STATEMENT(){
			// block statement!. ok now what.
			var stmtlen = this.i32[this.o++]
			var s = ''
			for(var i = 0;i <= stmtlen; i++){
				if(this.o > this.size) throw this.SizeError()
				var op = this.i32[this.o++]
				if(trace) this.opTrace(codeIds.BLOCK_STATEMENT,op)
				if(!this[op]) throw this.OpError(op)
				s += this[op]() + '\n'
			}
			return s
		}

		this[codeIds.EXPRESSION_STATEMENT] = function EXPRESSION_STATEMENT(){
			var op = this.i32[this.o++]
			if(trace) this.opTrace(codeIds.EXPRESSION_STATEMENT,op)
			if(!this[op]) throw this.OpError(op)
			return this[op]()
		}

		this[codeIds.ARRAY_EXPRESSION] = function ARRAY_EXPRESSION(){
		}

		this[codeIds.VARIABLE_DECLARATION] = function VARIABLE_DECLARATION(){
			var declslen = this.i32[this.o++]
			var s = ''
			for(var i = 0;i <= declslen; i++){
				if(this.o > this.size) throw this.SizeError()
				var op = this.i32[this.o++]
				if(op !== codeIds.VARIABLE_DECLARATOR) throw this.OpError(op)
				if(i !== 0) s += ', '
				s += this[op]()
			}
			return s
		}

		this[codeIds.VARIABLE_DECLARATOR] = function VARIABLE_DECLARATOR(){
			var varId = this.i32[this.o++]
			//var type = this.i32[this.o++]
			// we have a scopeId
			var s = ''//'v'+scopeId +' = '
			if(trace) this.opTrace(codeIds.VARIABLE_DECLARATOR, op)
			// our init can be all sorts of things
			// if its a binary expression it will need us as write target
			var op = this.i32[this.o++]
			if(!this[op]) throw this.OpError(op)
			return this[op]('v'+varId)
		}

		var opToName = {
			1:'add',
			2:'sub',
			3:'mul',
			4:'div'
		}

		this[codeIds.BINARY_EXPRESSION] = function BINARY_EXPRESSION(target){
			// types
			var outType = this.i32[this.o++]
			var op = this.i32[this.o++]
			var lop = this.i32[this.o++]
			var ltype = this.i32[this.o]
			if(trace) this.opTrace(codeIds.BINARY_EXPRESSION, lop)
			if(!this[lop]) throw this.OpError(lop)
			var sl = this[lop]()
			// right part
			var rop = this.i32[this.o++]
			var rtype = this.i32[this.o]
			if(trace) this.opTrace(codeIds.BINARY_EXPRESSION, rop)
			if(!this[rop]) throw this.OpError(rop)
			var sr = this[rop]()

			// ok we have to either allocate a new slot on the stack
			if(!target){ // allocate a target address
				var sz = this.stackSize
				this.stackSize += this.typeIdToSize[outType]
				target = 's+'+sz
			}

			return 'this.$'+opToName[op]+'_'+typeIdToName[ltype]+'_'+typeIdToName[rtype]+'('+target+','+sl+','+sr+')'
		}


		this[codeIds.RETURN_VOID] = function RETURN_VOID(){
			return 'return'
		}

		this[codeIds.RETURN_VALUE] = function RETURN_VALUE(){
			var type = this.i32[this.o++]
			var op = this.i32[this.o++]
			if(trace) this.opTrace(codeIds.RETURN_VALUE, op)
			if(!this[op]) throw this.OpError(op)
			return 'return '+this[op]('r')
		}

	}

	SizeError(){
		return new Error('Offset invalid '+this.o+' > '+ this.size)
	}

	opToName(op){
		for(var key in this.codeIds){
			if(this.codeIds[key] === op){
				return key
			}
		}
	}

	OpError(op){
		return new Error('Not implemented: ' + this.opToName(op) + ', id:' + op)
	}

	opTrace(parent, op){
		console.error('Trace '+(this.opToName(parent)||'ROOT')+'->'+this.opToName(op))
	}

	compileClass(data, target){
		this.idToName = data.idToName
		this.literalStack = []
		var methods = this.methods = data.methods
		for(var methodName in methods){
			// safety check for method name
			if(!methodName.match(/^[a-zA-Z][a-zA-Z0-9\_]+$/)) continue

			var method = methods[methodName]

			this.f32 = new Float32Array(method.buffer)
			var i32 = this.i32 = new Int32Array(method.buffer)
			if(trace) console.error("Trace "+methodName)
			// lets declare all variables this method will use
			this.o = 0

			var s = ''

			// lets compute the size of the stack
			// and allocate all the vars we need
			var stackSize = 0
			var stackOffsets = this.stackOffsets = []
			var varTypes = method.varTypes

			var retSize = this.typeIdToSize[method.returnType]
			if(retSize>0){
				stackSize += retSize
			}

			for(var i = 0; i < varTypes.length; i++){
				// allocate stackspace
				var type = varTypes[i]
				s += 'var v'+i+' = s+'+stackSize+'\n'
				stackOffsets[i] = stackSize
				stackSize += this.typeIdToSize[type]
			}

			this.stackSize = stackSize
			this.size = method.size
			while(this.o < this.size){
				var op = i32[this.o++]
				if(trace) this.opTrace(null, op)
				if(!this[op]) throw this.OpError(op)
				s += this[op]()+'\n'
			}
			// 
			if(this.stackSize) s = 'if(z > this.$size) this.$rz(z)\n' + s
			s = 'var z = s + '+this.stackSize+'\n' + s

			// build the arguments and wrapper function
			var wrapCode = '', mainArgStr = ''
			var wrapArgs = []
			var mainArgs = ['s','r']
			var argTypes = method.argTypes
			var argSize = 0
			for(var i = 0; i < argTypes.length; i++){
				var arg = 'a'+i
				mainArgs.push(arg)
				wrapArgs.push(arg)
				mainArgStr += ',s+'+argSize
				var type = argTypes[i]
				var props = this.typeIdToSize[type]
				if(props > 1){
					for(var j = 0; j < props; j++){
						wrapCode += '$s[s+'+argSize+'] = '+arg+'['+j+']\n'
						argSize++
					}
				}
				else{
					wrapCode += '$s[s+'+argSize+'] = '+arg+'\n'
					argSize++
				}
			}
			wrapCode = 'var s = this.$lit, z = s + '+argSize+'\nif(z > this.$size) this.$rz(z)\nvar $s = this.$s\n' + wrapCode
			wrapCode += 'this._$'+methodName+'(z,s'+mainArgStr+')\n'
			if(retSize>0){
				if(retSize > 1){
					wrapCode += 'return ['
					for(var i = 0 ;i < retSize; i++){
						if(i) wrapCode += ','
						wrapCode += '$s[s+'+i+']'
					}
					wrapCode += ']\n'
				}
				else{
					wrapCode += 'return $s[s]\n'
				}
			}

			wrapArgs.push(wrapCode)
			mainArgs.push(s)
			// lets make a function and store it on target
			var main = Function.apply(null, mainArgs)
			target['_$' + methodName] = main
			// do we make a wrapper fn?.. lets just do it
			var wrap = Function.apply(null, wrapArgs)
			target['_'+methodName.slice(0,methodName.indexOf('_T'))] = wrap
		}
		// build literalStack storage

		target.$lit = this.literalStack.length
		// create a stack
		target.$size = target.$lit + target.$initStack
		var $s = target.$s = new Float64Array(target.$size)

		// init stack with literals
		for(var i = 0; i < target.$lit;i++){
			$s[i] = this.literalStack[i]
		}
	}
}


module.exports = class ByteCodeRun{
	
	prototype() {
		this.$ByteCodeCompiler = ByteCodeCompiler
		this.$maxStack = 1024*1024
		this.$initStack = 1024
	}
	
	constructor(){
		var proto = Object.getPrototypeOf(this)
		if(!protoInit.get(proto)){
			protoInit.initialize(proto)
		}
		
	}

	// resize our stack.
	$rz(stackSize){
		var newSize = this.$size * 2
		if(stackSize > newSize) newSize = stackSize
		if(newSize > this.$maxStack) throw new Error('Stack overflow')
		var oldStack = this.$s
		var newStack = new Float64Array(newSize)
		for(var i = 0, l = this.$size; i < l; i ++){
			newStack[i] = oldStack[i]
		} 
		this.$size = newSize
		this.$s = newStack
	}

	$compileClass(data){
		var compiler = new this.$ByteCodeCompiler()
		compiler.compileClass(data, this)
	}

	// casting assignments
	$asn_int_float(o, a){
		var $s = this.$s
		var a1 = a<0?this.$f32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		if(o<0) this.$i32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1
		else $s[o] = Math.floor(a1)
		return o
	}

	$asn_float_int(o, a){
		var $s = this.$s
		if(o<0) this.$f32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1
		else $s[o] = a1
		return o
	}

	$asn_ivec2_vec2(o, a){
		var $s = this.$s
		var a1, a2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], m[r] = a1, m[r+1] = a2
		else $s[o] = Math.floor(a1), $s[o+1] = Math.floor(a2)
		return o
	}

	$asn_ivec2_float(o, a){
		var $s = this.$s
		var a1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], m[r] = a1, m[r+1] = a1
		else $s[o] = $s[o+1] = Math.floor(a1)
		return o
	}

	$asn_ivec3_vec3(o, a){
		var $s = this.$s
		var a1, a2, a3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a2, m[r+2] = a3
		else $s[o] = Math.floor(a1), $s[o+1] = Math.floor(a2), $s[o+2] = Math.floor(a3)
		return o
	}

	$asn_ivec3_float(o, a){
		var $s = this.$s
		var a1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a1, m[r+2] = a1
		else $s[o] = $s[o+1] = $s[o+2] = Math.floor(a1)
		return o
	}

	$asn_ivec4_vec4(o, a){
		var $s = this.$s
		var a1, a2, a3, a4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a2, m[r+2] = a3, m[r+3] = a4
		else $s[o] = a1, $s[o+1] = a2, $s[o+2] = a3, $s[o+3] = a4
		return o
	}

	$asn_ivec4_float(o, a){
		var $s = this.$s
		var a1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a1, m[r+2] = a1, m[r+3] = a1
		else $s[o] = $s[o+1] = $s[o+2] = $s[o+3] = Math.floor(a1)
		return o
	}

	$asn_int_int(o, a){
		var $s = this.$s
		var a1 = a<0?this.$i32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		if(o<0) this.$i32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1
		else $s[o] = a1
		return o
	}

	$add_int_int(o, a, b){
		var $s = this.$s
		var a1 = a<0?this.$i32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		var b1 = b<0?this.$i32[((-b&0x7fffffff)+b)/-0x100000000][(-b&0x7fffffff)]:$s[b]
		if(o<0) this.$i32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1 + b1
		else $s[o] = a1 + b1
		return o
	}

	$sub_int_int(o, a, b){
		var $s = this.$s
		var a1 = a<0?this.$i32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		var b1 = b<0?this.$i32[((-b&0x7fffffff)+b)/-0x100000000][(-b&0x7fffffff)]:$s[b]
		if(o<0) this.$i32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1 - b1
		else $s[o] = a1 - b1
		return o
	}

	$mul_int_int(o, a, b){
		var $s = this.$s
		var a1 = a<0?this.$i32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		var b1 = b<0?this.$i32[((-b&0x7fffffff)+b)/-0x100000000][(-b&0x7fffffff)]:$s[b]
		if(o<0) this.$i32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1 * b1
		else $s[o] = a1 * b1
		return o
	}

	$div_int_int(o, a, b){
		var $s = this.$s
		var a1 = a<0?this.$i32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		var b1 = b<0?this.$i32[((-b&0x7fffffff)+b)/-0x100000000][(-b&0x7fffffff)]:$s[b]
		if(o<0) this.$i32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1 / b1
		else $s[o] = Math.floor(a1 / b1)
		return o
	}

	$asn_ivec2_ivec2(o, a){
		var $s = this.$s
		var a1, a2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a2
		else $s[o] = a1, $s[o+1] = a2
		return o
	}

	$asn_ivec2_int(o, a){
		var $s = this.$s
		var a1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a1
		else $s[o] = a1, $s[o+1] = a1
		return o
	}

	$asn_ivec2_int_int(o, a, b){
		var $s = this.$s
		var a1, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = b
		else $s[o] = a, $s[o+1] = b1
		return o
	}

	$add_ivec2_ivec2(o, a, b){
		var $s = this.$s
		var a1, a2, b1, b2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b2
		else $s[o] = a1 + b1, $s[o+1] = a2 + b2
		return o
	}

	$add_ivec2_int(o, a, b){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b1
		else $s[o] = a1 + b1, $s[o+1] = a2 + b1
		return o
	}

	$sub_ivec2_ivec2(o, a, b){
		var $s = this.$s
		var a1, a2, b1, b2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b2
		else $s[o] = a1 - b1, $s[o+1] = a2 - b2
		return o
	}

	$sub_ivec2_int(o, a, b){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b1
		else $s[o] = a1 - b1, $s[o+1] = a2 - b1
		return o
	}

	$sub_int_ivec2(o, b, a){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = b1 - a1, m[r+1] = b1 - a2
		else $s[o] = b1 - a1, $s[o+1] = b1 - a2
		return o
	}

	$mul_ivec2_ivec2(o, a, b){
		var $s = this.$s
		var a1, a2, b1, b2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b2
		else $s[o] = a1 + b1, $s[o+1] = a2 + b2
		return o
	}

	$mul_ivec2_int(o, a, b){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 * b1
		else $s[o] = a1 * b1, $s[o+1] = a2 * b1
		return o
	}

	$div_ivec2_ivec2(o, a, b){
		var $s = this.$s
		var a1, a2, b1, b2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b2
		else $s[o] = a1 / b1, $s[o+1] = a2 / b2
		return o
	}

	$div_ivec2_int(o, a, b){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b1
		else $s[o] = Math.floor(a1 / b1), $s[o+1] = Math.floor(a2 / b1)
		return o
	}

	$div_int_ivec2(o, b, a){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = b1 / a1, m[r+1] = b1 / a2
		else $s[o] = Math.floor(b1 / a1), $s[o+1] = Math.floor(b1 / a2)
		return o
	}

	$asn_ivec3_ivec3(o, a){
		var $s = this.$s
		var a1, a2, a3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a2, m[r+2] = a3
		else $s[o] = a1, $s[o+1] = a2, $s[o+2] = a3
		return o
	}

	$asn_ivec3_int(o, a){
		var $s = this.$s
		var a1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a1, m[r+2] = a1
		else $s[o] = a1, $s[o+1] = a1, $s[o+2] = a1
		return o
	}

	$asn_ivec3_int_int_int(o, a, b, c){
		var $s = this.$s
		var a1, c1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(c<0) r = -c&0x7fffffff, m = this.$i32[(r+c)/-0x100000000], c1 = m[r]
		else c1 = $s[c]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a, m[r+1] = b, m[r+2] = c1
		else $s[o] = a1, $s[o+1] = b1, $s[o+2] = c1
		return o
	}

	$add_ivec3_ivec3(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, b2, b3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b2, m[r+2] = a3 + b3
		else $s[o] = a1 + b1, $s[o+1] = a2 + b2, $s[o+2] = a3 + b3
		return o
	}

	$add_ivec3_int(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b1, m[r+2] = a3 + b1
		else $s[o] = a1 + b1, $s[o+1] = a2 + b1, $s[o+2] = a3 + b1
		return o
	}

	$sub_ivec3_ivec3(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, b2, b3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b2, m[r+2] = a3 - b3
		else $s[o] = a1 - b1, $s[o+1] = a2 - b2, $s[o+2] = a3 - b3
		return o
	}

	$sub_ivec3_int(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b1, m[r+2] = a3 - b1
		else $s[o] = a1 - b1, $s[o+1] = a2 - b1, $s[o+2] = a3 - b1
		return o
	}

	$sub_int_ivec3(o, b, a){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = b1 - a1, m[r+1] = b1 - a2, m[r+2] = b1 - a3
		else $s[o] = b1 - a1, $s[o+1] = b1 - a2, $s[o+2] = b1 - a3
		return o
	}

	$mul_ivec3_ivec3(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, b2, b3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 * b1, m[r+1] = a2 * b2, m[r+2] = a3 * b3
		else $s[o] = a1 * b1, $s[o+1] = a2 * b2, $s[o+2] = a3 * b3
		return o
	}

	$mul_ivec3_int(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 * b1, m[r+1] = a2 * b1, m[r+2] = a3 * b1
		else $s[o] = a1 * b1, $s[o+1] = a2 * b1, $s[o+2] = a3 * b1
		return o
	}

	$div_ivec3_ivec3(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, b2, b3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b2, m[r+2] = a3 / b3
		else $s[o] = Math.floor(a1 / b1), $s[o+1] = Math.floor(a2 / b2), $s[o+2] = Math.floor(a3 / b3)
		return o
	}

	$div_ivec3_int(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b1, m[r+2] = a3 / b1
		else $s[o] = Math.floor(a1 / b1), $s[o+1] = Math.floor(a2 / b1), $s[o+2] = Math.floor(a3 / b1)
		return o
	}

	$div_int_ivec3(o, b, a){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = b1 / a1, m[r+1] = b1 / a2, m[r+2] = b1 / a3
		else $s[o] = Math.floor(b1 / a1), $s[o+1] = Math.floor(b1 / a2), $s[o+2] = Math.floor(b1 / a3)
		return o
	}

	$asn_ivec4_ivec4(o, a){
		var $s = this.$s
		var a1, a2, a3, a4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a2, m[r+2] = a3, m[r+3] = a4
		else $s[o] = a1, $s[o+1] = a2, $s[o+2] = a3, $s[o+3] = a4
		return o
	}

	$asn_ivec4_int(o, a){
		var $s = this.$s
		var a1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a1, m[r+2] = a1, m[r+3] = a1
		else $s[o] = a1, $s[o+1] = a1, $s[o+2] = a1, $s[o+3] = a1
		return o
	}

	$asn_ivec4_int_int_int_int(o, a, b, c, d){
		var $s = this.$s
		var a1, b1, c1, d1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(c<0) r = -c&0x7fffffff, m = this.$i32[(r+c)/-0x100000000], c1 = m[r]
		else c1 = $s[c]
		if(d<0) r = -d&0x7fffffff, m = this.$i32[(r+d)/-0x100000000], d1 = m[r]
		else d1 = $s[d]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = b1, m[r+2] = c1, m[r+3] = d1
		else $s[o] = a1, $s[o+1] = b1, $s[o+2] = c1, $s[o+3] = d1
		return o
	}

	$add_ivec4_ivec4(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, b2, b3, b4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2], b4 = m[r+3]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2], b4 = $s[b+3]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b2, m[r+2] = a3 + b3, m[r+3] = a4 + b4
		else $s[o] = a1 + b1, $s[o+1] = a2 + b2, $s[o+2] = a3 + b3, $s[o+3] = a4 + b4
		return o
	}

	$add_ivec4_int(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b1, m[r+2] = a3 + b1, m[r+3] = a4 + b1
		else $s[o] = a1 + b1, $s[o+1] = a2 + b1, $s[o+2] = a3 + b1, $s[o+3] = a4 + b1
		return o
	}

	$sub_ivec4_ivec4(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, b2, b3, b4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2], b4 = m[r+3]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2], b4 = $s[a+3]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b2, m[r+2] = a3 - b3, m[r+3] = a4 - b4
		else $s[o] = a1 - b1, $s[o+1] = a2 - b2, $s[o+2] = a3 - b3, $s[o+3] = a4 - b4
		return o
	}

	$sub_ivec4_int(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b1, m[r+2] = a3 - b1, m[r+3] = a4 - b1
		else $s[o] = a1 - b1, $s[o+1] = a2 - b1, $s[o+2] = a3 - b1, $s[o+3] = a4 - b1
		return o
	}

	$sub_int_ivec4(o, b, a){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = b1 - a1, m[r+1] = b1 - a2, m[r+2] = b1 - a3, m[r+3] = b1 - a4
		else $s[o] = b1 - a1, $s[o+1] = b1 - a2, $s[o+2] = b1 - a3, $s[o+3] = b1 - a4
		return o
	}

	$sub_imm_ivec4(o, b, a){
		var $s = this.$s
		var a1, a2, a3, a4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], m[r] = b - a1, m[r+1] = b - a2, m[r+2] = b - a3, m[r+3] = b - a4
		else $s[o] = b - a1, $s[o+1] = b - a2, $s[o+2] = b - a3, $s[o+3] = b - a4
		return o
	}

	$mul_ivec4_ivec4(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, b2, b3, b4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2], b4 = m[r+3]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2], b4 = $s[b+3]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 * b1, m[r+1] = a2 * b2, m[r+2] = a3 * b3, m[r+3] = a4 * b4
		else $s[o] = a1 * b1, $s[o+1] = a2 * b2, $s[o+2] = a3 * b3, $s[o+3] = a4 * b4
		return o
	}

	$mul_ivec4_int(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 * b1, m[r+1] = a2 * b1, m[r+2] = a3 * b1, m[r+3] = a4 * b1
		else $s[o] = a1 * b1, $s[o+1] = a2 * b1, $s[o+2] = a3 * b1, $s[o+3] = a4 * b1
		return o
	}

	$div_ivec4_ivec4(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, b2, b3, b4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2], b4 = m[r+3]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2], b4 = $s[b+3]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b2, m[r+2] = a3 / b3, m[r+3] = a4 / b4
		else $s[o] = Math.floor(a1 / b1), $s[o+1] = Math.floor(a2 / b2), $s[o+2] = Math.floor(a3 / b3), $s[o+3] = Math.floor(a4 / b4)
		return o
	}

	$div_ivec4_int(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b1, m[r+2] = a3 / b1, m[r+3] = a4 / b1
		else $s[o] = Math.floor(a1 / b1), $s[o+1] = Math.floor(a2 / b1), $s[o+2] = Math.floor(a3 / b1), $s[o+3] = Math.floor(a4 / b1)
		return o
	}

	$div_int_ivec4(o, b, a){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$i32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$i32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$i32[(r+o)/-0x100000000], m[r] = b1 / a1, m[r+1] = b1 / a2, m[r+2] = b1 / a3, m[r+3] = b1 / a4
		else $s[o] = Math.floor(b1 / a1), $s[o+1] = Math.floor(b1 / a2), $s[o+2] = Math.floor(b1 / a3), $s[o+3] = Math.floor(b1 / a4)
		return o
	}

	$asn_float_float(o, a){
		var $s = this.$s
		var a1 = a<0?this.$f32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		if(o<0) this.$f32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1
		else $s[o] = a1
		return o
	}

	$add_float_float(o, a, b){
		var $s = this.$s
		var a1 = a<0?this.$f32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		var b1 = b<0?this.$f32[((-b&0x7fffffff)+b)/-0x100000000][(-b&0x7fffffff)]:$s[b]
		if(o<0) this.$f32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1 + b1
		else $s[o] = a1 + b1
		return o
	}

	$sub_float_float(o, a, b){
		var $s = this.$s
		var a1 = a<0?this.$f32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		var b1 = b<0?this.$f32[((-b&0x7fffffff)+b)/-0x100000000][(-b&0x7fffffff)]:$s[b]
		if(o<0) this.$f32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1 - b1
		else $s[o] = a1 - b1
		return o
	}

	$mul_float_float(o, a, b){
		var $s = this.$s
		var a1 = a<0?this.$f32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		var b1 = b<0?this.$f32[((-b&0x7fffffff)+b)/-0x100000000][(-b&0x7fffffff)]:$s[b]
		if(o<0) this.$f32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1 * b1
		else $s[o] = a1 * b1
		return o
	}

	$div_float_float(o, a, b){
		var $s = this.$s
		var a1 = a<0?this.$f32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:$s[a]
		var b1 = b<0?this.$f32[((-b&0x7fffffff)+b)/-0x100000000][(-b&0x7fffffff)]:$s[b]
		if(o<0) this.$f32[((-o&0x7fffffff)+o)/-0x100000000][-o&0x7fffffff] = a1 / b1
		else $s[o] = a1 / b1
		return o
	}

	$asn_vec2_vec2(o, a){
		var $s = this.$s
		var a1, a2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], m[r] = a1, m[r+1] = a2
		else $s[o] = a1, $s[o+1] = a2
		return o
	}

	$asn_vec2_float(o, a){
		var $s = this.$s
		var a1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a1
		else $s[o] = a1, $s[o+1] = a1
		return o
	}

	$asn_vec2_float_float(o, a, b){
		var $s = this.$s
		var a1, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = b
		else $s[o] = a, $s[o+1] = b1
		return o
	}

	$add_vec2_vec2(o, a, b){
		var $s = this.$s
		var a1, a2, b1, b2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b2
		else $s[o] = a1 + b1, $s[o+1] = a2 + b2
		return o
	}

	$add_vec2_float(o, a, b){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b1
		else $s[o] = a1 + b1, $s[o+1] = a2 + b1
		return o
	}

	$sub_vec2_vec2(o, a, b){
		var $s = this.$s
		var a1, a2, b1, b2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b2
		else $s[o] = a1 - b1, $s[o+1] = a2 - b2
		return o
	}

	$sub_vec2_float(o, a, b){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b1
		else $s[o] = a1 - b1, $s[o+1] = a2 - b1
		return o
	}

	$sub_float_vec2(o, b, a){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = b1 - a1, m[r+1] = b1 - a2
		else $s[o] = b1 - a1, $s[o+1] = b1 - a2
		return o
	}

	$mul_vec2_vec2(o, a, b){
		var $s = this.$s
		var a1, a2, b1, b2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b2
		else $s[o] = a1 + b1, $s[o+1] = a2 + b2
		return o
	}

	$mul_vec2_float(o, a, b){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 * b1
		else $s[o] = a1 * b1, $s[o+1] = a2 * b1
		return o
	}

	$div_vec2_vec2(o, a, b){
		var $s = this.$s
		var a1, a2, b1, b2, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b2
		else $s[o] = a1 / b1, $s[o+1] = a2 / b2
		return o
	}

	$div_vec2_float(o, a, b){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b1
		else $s[o] = a1 / b1, $s[o+1] = a2 / b1
		return o
	}

	$div_float_vec2(o, b, a){
		var $s = this.$s
		var a1, a2, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1]
		else a1 = $s[a], a2 = $s[a+1]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b], b2 = $s[b+1]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = b1 / a1, m[r+1] = b1 / a2
		else $s[o] = b1 / a1, $s[o+1] = b1 / a2
		return o
	}

	$asn_vec3_vec3(o, a){
		var $s = this.$s
		var a1, a2, a3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a2, m[r+2] = a3
		else $s[o] = a1, $s[o+1] = a2, $s[o+2] = a3
		return o
	}

	$asn_vec3_float(o, a){
		var $s = this.$s
		var a1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a1, m[r+2] = a1
		else $s[o] = a1, $s[o+1] = a1, $s[o+2] = a1
		return o
	}

	$asn_vec3_float_float_float(o, a, b, c){
		var $s = this.$s
		var a1, c1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(c<0) r = -c&0x7fffffff, m = this.$f32[(r+c)/-0x100000000], c1 = m[r]
		else c1 = $s[c]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a, m[r+1] = b, m[r+2] = c1
		else $s[o] = a1, $s[o+1] = b1, $s[o+2] = c1
		return o
	}

	$add_vec3_vec3(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, b2, b3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b2, m[r+2] = a3 + b3
		else $s[o] = a1 + b1, $s[o+1] = a2 + b2, $s[o+2] = a3 + b3
		return o
	}

	$add_vec3_float(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b1, m[r+2] = a3 + b1
		else $s[o] = a1 + b1, $s[o+1] = a2 + b1, $s[o+2] = a3 + b1
		return o
	}

	$sub_vec3_vec3(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, b2, b3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b2, m[r+2] = a3 - b3
		else $s[o] = a1 - b1, $s[o+1] = a2 - b2, $s[o+2] = a3 - b3
		return o
	}

	$sub_vec3_float(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b1, m[r+2] = a3 - b1
		else $s[o] = a1 - b1, $s[o+1] = a2 - b1, $s[o+2] = a3 - b1
		return o
	}

	$sub_float_vec3(o, b, a){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = b1 - a1, m[r+1] = b1 - a2, m[r+2] = b1 - a3
		else $s[o] = b1 - a1, $s[o+1] = b1 - a2, $s[o+2] = b1 - a3
		return o
	}

	$mul_vec3_vec3(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, b2, b3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 * b1, m[r+1] = a2 * b2, m[r+2] = a3 * b3
		else $s[o] = a1 * b1, $s[o+1] = a2 * b2, $s[o+2] = a3 * b3
		return o
	}

	$mul_vec3_float(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 * b1, m[r+1] = a2 * b1, m[r+2] = a3 * b1
		else $s[o] = a1 * b1, $s[o+1] = a2 * b1, $s[o+2] = a3 * b1
		return o
	}

	$div_vec3_vec3(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, b2, b3, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b2, m[r+2] = a3 / b3
		else $s[o] = a1 / b1, $s[o+1] = a2 / b2, $s[o+2] = a3 / b3
		return o
	}

	$div_vec3_float(o, a, b){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b1, m[r+2] = a3 / b1
		else $s[o] = a1 / b1, $s[o+1] = a2 / b1, $s[o+2] = a3 / b1
		return o
	}

	$div_float_vec3(o, b, a){
		var $s = this.$s
		var a1, a2, a3, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = b1 / a1, m[r+1] = b1 / a2, m[r+2] = b1 / a3
		else $s[o] = b1 / a1, $s[o+1] = b1 / a2, $s[o+2] = b1 / a3
		return o
	}

	$asn_vec4_vec4(o, a){
		var $s = this.$s
		var a1, a2, a3, a4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a2, m[r+2] = a3, m[r+3] = a4
		else $s[o] = a1, $s[o+1] = a2, $s[o+2] = a3, $s[o+3] = a4
		return o
	}

	$asn_vec4_float(o, a){
		var $s = this.$s
		var a1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = a1, m[r+2] = a1, m[r+3] = a1
		else $s[o] = a1, $s[o+1] = a1, $s[o+2] = a1, $s[o+3] = a1
		return o
	}

	$asn_vec4_float_float_float_float(o, a, b, c, d){
		var $s = this.$s
		var a1, b1, c1, d1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r]
		else a1 = $s[a]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(c<0) r = -c&0x7fffffff, m = this.$f32[(r+c)/-0x100000000], c1 = m[r]
		else c1 = $s[c]
		if(d<0) r = -d&0x7fffffff, m = this.$f32[(r+d)/-0x100000000], d1 = m[r]
		else d1 = $s[d]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1, m[r+1] = b1, m[r+2] = c1, m[r+3] = d1
		else $s[o] = a1, $s[o+1] = b1, $s[o+2] = c1, $s[o+3] = d1
		return o
	}

	$add_vec4_vec4(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, b2, b3, b4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2], b4 = m[r+3]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2], b4 = $s[b+3]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b2, m[r+2] = a3 + b3, m[r+3] = a4 + b4
		else $s[o] = a1 + b1, $s[o+1] = a2 + b2, $s[o+2] = a3 + b3, $s[o+3] = a4 + b4
		return o
	}

	$add_vec4_float(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 + b1, m[r+1] = a2 + b1, m[r+2] = a3 + b1, m[r+3] = a4 + b1
		else $s[o] = a1 + b1, $s[o+1] = a2 + b1, $s[o+2] = a3 + b1, $s[o+3] = a4 + b1
		return o
	}

	$sub_vec4_vec4(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, b2, b3, b4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2], b4 = m[r+3]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2], b4 = $s[a+3]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b2, m[r+2] = a3 - b3, m[r+3] = a4 - b4
		else $s[o] = a1 - b1, $s[o+1] = a2 - b2, $s[o+2] = a3 - b3, $s[o+3] = a4 - b4
		return o
	}

	$sub_vec4_float(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 - b1, m[r+1] = a2 - b1, m[r+2] = a3 - b1, m[r+3] = a4 - b1
		else $s[o] = a1 - b1, $s[o+1] = a2 - b1, $s[o+2] = a3 - b1, $s[o+3] = a4 - b1
		return o
	}

	$sub_float_vec4(o, b, a){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = b1 - a1, m[r+1] = b1 - a2, m[r+2] = b1 - a3, m[r+3] = b1 - a4
		else $s[o] = b1 - a1, $s[o+1] = b1 - a2, $s[o+2] = b1 - a3, $s[o+3] = b1 - a4
		return o
	}

	$mul_vec4_vec4(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, b2, b3, b4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2], b4 = m[r+3]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2], b4 = $s[b+3]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 * b1, m[r+1] = a2 * b2, m[r+2] = a3 * b3, m[r+3] = a4 * b4
		else $s[o] = a1 * b1, $s[o+1] = a2 * b2, $s[o+2] = a3 * b3, $s[o+3] = a4 * b4
		return o
	}

	$mul_vec4_float(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 * b1, m[r+1] = a2 * b1, m[r+2] = a3 * b1, m[r+3] = a4 * b1
		else $s[o] = a1 * b1, $s[o+1] = a2 * b1, $s[o+2] = a3 * b1, $s[o+3] = a4 * b1
		return o
	}

	$div_vec4_vec4(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, b2, b3, b4, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r], b2 = m[r+1], b3 = m[r+2], b4 = m[r+3]
		else b1 = $s[b], b2 = $s[b+1], b3 = $s[b+2], b4 = $s[b+3]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b2, m[r+2] = a3 / b3, m[r+3] = a4 / b4
		else $s[o] = a1 / b1, $s[o+1] = a2 / b2, $s[o+2] = a3 / b3, $s[o+3] = a4 / b4
		return o
	}

	$div_vec4_float(o, a, b){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = a1 / b1, m[r+1] = a2 / b1, m[r+2] = a3 / b1, m[r+3] = a4 / b1
		else $s[o] = a1 / b1, $s[o+1] = a2 / b1, $s[o+2] = a3 / b1, $s[o+3] = a4 / b1
		return o
	}

	$div_float_vec4(o, b, a){
		var $s = this.$s
		var a1, a2, a3, a4, b1, r, m
		if(a<0) r = -a&0x7fffffff, m = this.$f32[(r+a)/-0x100000000], a1 = m[r], a2 = m[r+1], a3 = m[r+2], a4 = m[r+3]
		else a1 = $s[a], a2 = $s[a+1], a3 = $s[a+2], a4 = $s[a+3]
		if(b<0) r = -b&0x7fffffff, m = this.$f32[(r+b)/-0x100000000], b1 = m[r]
		else b1 = $s[b]
		if(o<0) r = -o&0x7fffffff, m = this.$f32[(r+o)/-0x100000000], m[r] = b1 / a1, m[r+1] = b1 / a2, m[r+2] = b1 / a3, m[r+3] = b1 / a4
		else $s[o] = b1 / a1, $s[o+1] = b1 / a2, $s[o+2] = b1 / a3, $s[o+3] = b1 / a4
		return o
	}
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

protoInit.initialize(ByteCodeCompiler.prototype)
protoInit.initialize(module.exports.prototype)