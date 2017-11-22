var trace = true
var Type = module.globals.Type

class ByteCodeCompiler{
	prototype(){

		var o = 1
		var astIds = this.astIds = {
			BLOCK_STATEMENT:o++,
			ARRAY_EXPRESSION:o++,
			EXPRESSION_STATEMENT:o++,
			SEQUENCE_EXPRESSION:o++,
			LITERAL_INT:o++,
			LITERAL_FLOAT:o++,
			LITERAL_BOOL:o++,
			ARGUMENT:o++,
			VARIABLE:o++,

			// call types
			THIS_CALL:o++,
			OBJECT_CALL:o++,
			NEW_OBJECT:o++,
			BUILTIN_CALL:o++,

			// property accesses
			THIS_MEMBER:o++,
			OBJECT_MEMBER:o++,
			STRUCT_FIELD:o++,
			VEC_SWIZZLE:o++,
			ARRAY_INDEX:o++,

			THIS_EXPRESSION:o++,

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
			FOR_OF_STATEMENT:o++,
			WHILE_STATEMENT:o++,
			DOWHILE_STATEMENT:o++,
			BREAK_STATEMENT:o++,
			CONTINUE_STATEMENT:o++,
			//YIELD_EXPRESSION:o++,
			SWITCH_STATEMENT:o++,
			SWITCH_CASE:o++
		}

		var s = 1
		// default symbols for global functions
		var builtinIds = this.builtinIds = {
			sin:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			cos:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			tan:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			asin:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			acos:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			atan:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}, {name:'y', typeId:Type.genFloat.id, opt:true}]},
			
			radians:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},
			degrees:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'angle', typeId:Type.genFloat.id}]},

			pow:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			exp:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			log:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			exp2:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			log2:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			
			sqrt:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			inversesqrt:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			
			abs:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			sign:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			floor:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			ceil:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			fract:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			
			mod:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			min:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			max:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			clamp:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'min', typeId:Type.genFloat.id},{name:'max', typeId:Type.genFloat.id}]},
			
			mix:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'a', typeId:Type.genFloat.id},{name:'b', typeId:Type.genFloat.id},{name:'t', typeId:Type.genFloat.id}]},
			step:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'edge', typeId:Type.genFloat.id},{name:'x', typeId:Type.genFloat.id}]},
			smoothstep:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'edge0', typeId:Type.genFloat.id},{name:'edge1', typeId:Type.genFloat.id},{name:'x', typeId:Type.genFloat.id}]},
			
			length:{id:s++, returnTypeId:Type.float.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			distance:{id:s++, returnTypeId:Type.float.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			dot:{id:s++, returnTypeId:Type.float.id, params:[{name:'x', typeId:Type.genFloat.id},{name:'y', typeId:Type.genFloat.id}]},
			cross:{id:s++, returnTypeId:Type.vec3.id, params:[{name:'x', typeId:Type.vec3.id},{name:'y', typeId:Type.vec3.id}]},
			normalize:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},

			faceforward:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'n', typeId:Type.genFloat.id},{name:'i', typeId:Type.genFloat.id},{name:'nref', typeId:Type.genFloat.id}]},
			reflect:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'i', typeId:Type.genFloat.id},{name:'n', typeId:Type.genFloat.id}]},
			refract:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'i', typeId:Type.genFloat.id},{name:'n', typeId:Type.genFloat.id},{name:'eta', typeId:Type.genFloat.id}]},
			matrixCompMult:{returnTypeId:Type.mat4.id,params:[{name:'a', typeId:Type.mat4.id},{name:'b', typeId:Type.mat4.id}]},

			dFdx:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			dFdy:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},
			fwidth:{id:s++, returnTypeId:Type.genFloat.id, params:[{name:'x', typeId:Type.genFloat.id}]},

			texture2DLod:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.sampler2D.id}, {name:'coord', typeId:Type.vec2.id}, {name:'lod', typeId:Type.float.id}]},
			texture2DProjLod:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.sampler2D.id}, {name:'coord', typeId:Type.vec2.id}, {name:'lod', typeId:Type.float.id}]},
			textureCubeLod:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.samplerCube.id}, {name:'coord', typeId:Type.vec3.id}, {name:'lod', typeId:Type.float.id}]},
			texture2D:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.sampler2D.id}, {name:'coord', typeId:Type.vec2.id}, {name:'bias', typeId:Type.float.id, opt:true}]},
			texture2DProj:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.sampler2D.id}, {name:'coord', typeId:Type.vec2.id}, {name:'bias', typeId:Type.float.id, opt:true}]},
			textureCube:{returnTypeId:Type.vec4.id, params:[{name:'sampler', typeId:Type.samplerCube.id}, {name:'coord', typeId:Type.vec3.id}, {name:'bias', typeId:Type.float.id, opt:true}]},

			sleep:{id:s++, returnTypeId:Type.void.id, params:[{name:'timeMs', typeId:Type.float.id}]}

			// do we really need these
			/*
			lessThan:s++,
			lessThanEqual:s++,
			greaterThan:s++,
			greaterThanEqual:s++,
			equal:s++,
			notEqual:s++,
			any:s++,
			all:s++,
			not:s++,
			*/
		}

		var o = 1
		var opIds = this.opIds = {
			'+':o++,
			'-':o++,
			'/':o++,
			'*':o++,
			'>>':o++,
			'<<':o++,
			'|':o++,
			'&':o++,
			'++':o++,
			'--':o++,
			'<':o++,
			'>':o++,
			'<=':o++,
			'>=':o++,
			'==':o++,
			'||':o++,
			'&&':o++
		}

		var opToId = {}
		for(var key in opIds){
			opToId[opIds[key]] = key
		}

		var builtinIdToName = this.builtinIdToName = {}
		for(var key in builtinIds){
			var fn = builtinIds[key]
			builtinIdToName[fn.id] = key
		}

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
			1:'add',
			2:'sub',
			3:'mul',
			4:'div'
		}

		this[astIds.BINARY_EXPRESSION] = function BINARY_EXPRESSION(target){
			// types
			var outType = this.i32[this.o++]
			var op = this.i32[this.o++]
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