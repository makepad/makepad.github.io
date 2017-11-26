var trace = true
var Type = module.globals.Type

class JSCompiler extends require('/platform/kernelclassids'){
	prototype(){
		var astIds = this.astIds
		// AST walkter implementation for JS

		this[astIds.LITERAL_INT] = function LITERAL_INT(){
			var type = this.i32[this.o++]
			var value = this.i32[this.o++]
			return String(value)
		}

		this[astIds.LITERAL_FLOAT] = function LITERAL_FLOAT(){
			var type = this.i32[this.o++]
			return this.literalStack.push(this.f32[this.o++]) - 1
		}

		this[astIds.LITERAL_BOOL] = function LITERAL_BOOL(){
			var type = this.i32[this.o++]
			var value = this.i32[this.o++]
			return value!=0?'true':'false'
		}

		this[astIds.ARGUMENT] = function ARGUMENT(){
			var type = this.i32[this.o++]
			var id = this.i32[this.o++]
			return 'a'+id
		}

		this[astIds.VARIABLE] = function VARIABLE(){
			var type = this.i32[this.o++]
			var id = this.i32[this.o++]
			return 'v'+id
		}

		// plug the node types on a recursive compiler
		this[astIds.BLOCK_STATEMENT] = function BLOCK_STATEMENT(){
			// block statement!. ok now what.
			var stmtlen = this.i32[this.o++]
			var s = ''
			for(var i = 0;i <= stmtlen; i++){
				if(this.o > this.size) throw this.SizeError()
				var op = this.i32[this.o++]
				if(trace) this.opTrace(astIds.BLOCK_STATEMENT,op)
				if(!this[op]) throw this.OpError(op)
				s += this[op]() + '\n'
			}
			return s
		}

		this[astIds.EXPRESSION_STATEMENT] = function EXPRESSION_STATEMENT(){
			var op = this.i32[this.o++]
			if(trace) this.opTrace(astIds.EXPRESSION_STATEMENT,op)
			if(!this[op]) throw this.OpError(op)
			return this[op]()
		}

		this[astIds.ARRAY_EXPRESSION] = function ARRAY_EXPRESSION(){
		}

		this[astIds.VARIABLE_DECLARATION] = function VARIABLE_DECLARATION(){
			var declslen = this.i32[this.o++]
			var s = ''
			for(var i = 0;i <= declslen; i++){
				if(this.o > this.size) throw this.SizeError()
				var op = this.i32[this.o++]
				if(op !== astIds.VARIABLE_DECLARATOR) throw this.OpError(op)
				if(i !== 0) s += ', '
				s += this[op]()
			}
			return s
		}

		this[astIds.VARIABLE_DECLARATOR] = function VARIABLE_DECLARATOR(){
			var varId = this.i32[this.o++]
			//var type = this.i32[this.o++]
			// we have a scopeId
			var s = ''//'v'+scopeId +' = '
			if(trace) this.opTrace(astIds.VARIABLE_DECLARATOR, op)
			// our init can be all sorts of things
			// if its a binary expression it will need us as write target
			var op = this.i32[this.o++]
			if(!this[op]) throw this.OpError(op)
			return this[op]('v'+varId)
		}

		var opToName = {
			'+':'add',
			'-':'sub',
			'*':'mul',
			'/':'div'
		}

		this[astIds.BINARY_EXPRESSION] = function BINARY_EXPRESSION(target){
			// types
			var outType = this.i32[this.o++]
			var op = opIdToName[this.i32[this.o++]]
			var lop = this.i32[this.o++]
			var ltypeId = this.i32[this.o]

			if(trace) this.opTrace(astIds.BINARY_EXPRESSION, lop)
			if(!this[lop]) throw this.OpError(lop)
			var sl = this[lop]()
			// right part
			var rop = this.i32[this.o++]
			var rtypeId = this.i32[this.o]
			if(trace) this.opTrace(astIds.BINARY_EXPRESSION, rop)
			if(!this[rop]) throw this.OpError(rop)
			var sr = this[rop]()

			// ok we have to either allocate a new slot on the stack
			if(!target){ // allocate a target address
				var sz = this.stackSize
				this.stackSize += Type.idToType[outType].slots//this.typeIdToSize[outType]
				target = 's+'+sz
			}
			var ltype = Type.idToType[ltypeId]
			var rtype = Type.idToType[rtypeId]
			return 'this.$'+opToName[op]+'_'+ltype.name+'_'+rtype.name+'('+target+','+sl+','+sr+')'
		}


		this[astIds.RETURN_VOID] = function RETURN_VOID(){
			return 'return'
		}

		this[astIds.RETURN_VALUE] = function RETURN_VALUE(){
			var type = this.i32[this.o++]
			var op = this.i32[this.o++]
			if(trace) this.opTrace(astIds.RETURN_VALUE, op)
			if(!this[op]) throw this.OpError(op)
			return 'return '+this[op]('r')
		}

		this[astIds.BUILTIN_CALL] = function BUILTIN_CALL(){
			var type = this.i32[this.o++]
			var builtinId = this.i32[this.o++]
			var argslen = this.i32[this.o++]

			var name = 'this.$' + builtinIdToName[builtinId]+'_T'
			var args = ''
			for(var i = 0; i < argslen; i++){
				var op = this.i32[this.o++]
				var typeId = this.i32[this.o]
				name += '_'+Type.idToType[typeId].name
				if(trace) this.opTrace(astIds.BUILTIN_CALL,op)
				if(!this[op]) throw this.OpError(op)
				if(i) args += ','
				args += this[op]()
			}
			return name + '(' + args + ')'
		}

		this[astIds.NEW_OBJECT] = function NEW_OBJECT(){
			var classId = this.i32[this.o++]
			var argslen = this.i32[this.o++]
			var args = ''
			for(var i = 0; i < argslen; i++){
				var op = this.i32[this.o++]
				var typeId = this.i32[this.o]
				if(trace) this.opTrace(astIds.NEW_OBJECT,op)
				if(!this[op]) throw this.OpError(op)
				if(i) args += ','
				args += this[op]()
			}
			return ''
		}

		this[astIds.FOR_OF_STATEMENT] = function FOR_OF_STATEMENT(){

		}
	}

	SizeError(){
		return new Error('Offset invalid '+this.o+' > '+ this.size)
	}

	opToName(op){
		for(var key in this.astIds){
			if(this.astIds[key] === op){
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
			var varTypeIds = method.varTypeIds

			var retSize = Type.idToType[method.returnTypeId].slots//this.typeIdToSize[method.returnType]
			if(retSize>0){
				stackSize += retSize
			}

			for(var i = 0; i < varTypeIds.length; i++){
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
			var argTypeIds = method.argTypeIds
			var argSize = 0
			for(var i = 0; i < argTypeIds.length; i++){
				var arg = 'a'+i
				mainArgs.push(arg)
				wrapArgs.push(arg)
				mainArgStr += ',s+'+argSize
				var typeId = argTypeIds[i]
				var slots = Type.idToType[typeId].slots
				if(slots > 1){
					for(var j = 0; j < slots; j++){
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
			target['_'+methodName] = wrap
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

JSCompiler.prototype.__initproto__()

class KernelClassJS extends require('/platform/class'){
	
	prototype() {
		this.$maxStack = 1024*1024
		this.$initStack = 1024
	}
	
	$compileClass(data){
		var compiler = new this.constructor.JSCompiler()
		compiler.compileClass(data, this)
	}

	$sleep_T_float(a){
		var t = a<0?this.$f32[((-a&0x7fffffff)+a)/-0x100000000][(-a&0x7fffffff)]:this.$s[a]
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

KernelClassJS.JSCompiler = JSCompiler
KernelClassJS.prototype.__initproto__()

module.exports = KernelClassJS
