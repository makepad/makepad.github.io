//var types = require('base/types')
var jsparser = require('parsers/js')

module.exports = class AstByteCodeGen extends require('base/class'){
	
	constructor(idTables, root){
		super()
		this.idToName = {}
		this.nameToId = {}
		this.nameIds = 1

		this.astIds = idTables.astIds
		this.builtinIds = idTables.builtinIds
		this.opIds = idTables.opIds
		
		this.root = root
		this.context = root
		
		this.methods = {}
	}


	static compileMethod(idTables, root, fn, name = 'compile'){
		var compiler = new this(idTables, root)
		compiler.compileMethod(name, fn, [])
		return compiler
	}
	
	prototype(){
		
		this.groupBinaryExpression = {
			'+':1,'-':1,'*':1,'/':1,
			'==':2,'!=':2,'>=':2,'<=':2,'<':2,'>':2,
			'===':3,'!==':3,
		}

		// the swizzle lookup tables
		var swiz1 = {pick:{120:0,114:1,115:2,}, set:[{120:1},{114:1},{115:1}]}
		var swiz2 = {pick:{120:0, 121:0, 114:1, 103:1, 115:2, 116:2}, set:[{120:1, 121:1}, {114:1, 103:1}, {115:1, 116:1}]}
		var swiz3 = {pick:{120:0, 121:0, 122:0, 114:1, 103:1, 98:1, 115:2, 116:2, 117:2}, set:[{120:1, 121:1, 122:1}, {114:1, 103:1, 98:1}, {115:1, 116:1, 117:1}]}
		var swiz4 = {pick:{120:0, 121:0, 122:0, 119:0, 114:1, 103:1, 98:1, 97:1, 115:2, 116:2, 117:2, 118:2}, set:[{120:1, 121:1, 122:1, 119:1}, {114:1, 103:1, 98:1, 97:1}, {115:1, 116:1, 117:1, 118:1}]}
		this.swizlut = {float:swiz1, int:swiz1, bool:swiz1,vec2:swiz2, ivec2:swiz2, bvec2:swiz2,vec3:swiz3, ivec3:swiz3, bvec3:swiz3,vec4:swiz4, ivec4:swiz4, bvec4:swiz4}
		this.swiztype = {float:'vec', int:'ivec', bool:'bvec',vec2:'vec', ivec2:'ivec', bvec2:'bvec',vec3:'vec', ivec3:'ivec', bvec3:'bvec',vec4:'vec', ivec4:'ivec', bvec4:'bvec'}
		this.swizone = {float:'float', int:'int', bool:'bool',vec2:'float', ivec2:'int', bvec2:'bool',vec3:'float', ivec3:'int', bvec3:'bool',vec4:'float', ivec4:'int', bvec4:'bool'}

		this.tableBinaryExpression = {
			float:{float:Type.float, vec2:Type.vec2, vec3:Type.vec3, vec4:Type.vec4},
			int:{int:Type.int, ivec2:Type.ivec2, ivec3:Type.ivec3, ivec4:Type.ivec4},
			vec2:{float:Type.vec2, vec2:Type.vec2, mat2:Type.vec2},
			vec3:{float:Type.vec3, vec3:Type.vec3, mat3:Type.vec3},
			vec4:{float:Type.vec4, vec4:Type.vec4, mat4:Type.vec4},
			ivec2:{int:Type.ivec2, ivec2:Type.ivec2},
			ivec3:{int:Type.ivec3, ivec3:Type.ivec3},
			ivec4:{int:Type.ivec4, ivec4:Type.ivec4},
			mat2:{vec2:Type.vec2, mat2:Type.mat2},
			mat3:{vec3:Type.vec3, mat3:Type.mat3},
			mat4:{vec4:Type.vec4, mat4:Type.mat4}
		}

		function Err(state, node, type, message){
			this.type = type
			this.message = message
			this.node = node
			this.state = state
		}

		Err.prototype.toString = function(){
			return this.message
		}

		this.Err = Err
	}

	// allocate a struct typeID 
	allocStructType(){

	}

	allocObjectType(){

	}

	getNameId(name){
		var id = this.nameToId[name]
		if(id !== undefined) return id
		id = this.nameIds++
		this.nameToId[name] = id
		this.idToName[id] = name
		return id
	}

	compileMethod(name, fn){
		var currentMethod = this.methodName

		this.methodName = name

		var m = this.method = this.methods[name] = {
			vars:Object.create(null),
			args:Object.create(null),
			varTypeIds:[],
			argTypeIds:[],
			varId:0,
			o:0,
			f32:null,
			i32:null,
			returnType:null,
			alloc:0
		}

		var source = fn.toString()
		if(source.indexOf('function') !== 0){
			source = 'function ' + source
		}

		// lets build the type info for 'this' from our props
		var ast = jsparser.parse(source)

		var body = ast.body[0].body
		var params = ast.body[0].params

		// lets parse our args, store the defaults on our method
		// the caller side can use it to fill in missing args

		var paramslen = params.length -1
		for(var i = 0;i <= paramslen;i++){
			//var arg = args[i]
			var param = params[i]
			var name
			// error if a param is not an assignmentpattern
			if(param.type !== 'AssignmentPattern') throw this.InferErr(param, 'Untyped parameter defined')

			// just call the init to typeinfer it
			var init = param.right
			this[init.type](init)

			// reset the output
			m.o = 0

			// pass in the inference info
			m.args[name] = {
				initNode:init,
				isArg:true,
				type:init.infer.type,
				argId:i
			}

			m.argTypeIds[i] = init.infer.type.id
		}

		// execute body
		this[body.type](body)

		// pop old one
		this.method = this.methods[currentMethod]
		this.methodName = currentMethod
		
		/*
		

		// just variable declare the default args
		if(i <= paramslen){
			var o = m.o
			if((m.o += 2) > m.alloc) this.resize()
			m.i32[o++] = this.astIds.VARIABLE_DECLARATION
			m.i32[o++] = (paramslen - i) + 1
			for(;i <= paramslen;i++){
				var param = params[i]
				if(param.type !== 'AssignmentPattern'){
					throw new this.InferErr(param, 'Param '+i+' skipped without default arg')
				}
				// ok now what we need to turn it into a variable declaration
				var o = m.o
				if((m.o += 2) > m.alloc) this.resize()
				m.i32[o++] = this.astIds.VARIABLE_DECLARATOR
				// lets run the init
				var init = param.right
				this[init.type](init)
				var varId = m.varId++
				m.i32[o++] = m.vars[param.left.name] = {
					type:init.infer.type,
					varId:varId
				}
				m.varTypes[varId] = init.infer.type
			}
		}*/

		return m
	}

	SupportErr(node){
		return new this.Err(this, node, 'SupportError', 'Dont support '+node.type)
	}

	InferErr(node, message){
		return new this.Err(this, node, 'InferenceError', message)
	}
		
	resize(){
		var m = this.method
		var f32 = m.f32
		var len = m.alloc
		m.alloc = len*2
		if(m.alloc <= m.o) m.alloc = m.o+1
		m.f32 = new Float32Array(m.alloc)
		m.i32 = new Int32Array(m.f32.buffer)
		for(var i = 0; i < len; i++){
			m.f32[i] = f32[i]
		}
	}

	//Program:{ body:2 },	
	Program(node) {
		this.BlockStatement(node)
		return
	}
	
	BlockStatement(node) {
		var m = this.method
		var body = node.body
		var bodylen = body.length - 1

		// resize the output
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()

		m.i32[o++] = this.astIds.BLOCK_STATEMENT
		m.i32[o++] = bodylen
		// do the statements
		for(var i = 0;i <= bodylen;i++){
			var statement = body[i]
			this[statement.type](statement)
		}
	}

	
	//ArrayExpression:{elements:2},
	ArrayExpression(node) {
		var m = this.method
		var elems = node.elements
		var elemslen = elems.length - 1
		var infer = undefined

		var o = m.o
		if((m.o += 3) > m.alloc) this.resize()

		m.i32[o++] = this.astIds.ARRAY_EXPRESSION
		m.i32[o++] = elemslen
		for(var i = 0;i <= elemslen;i++){
			var elem = elems[i]
			
			if(elem) {
				this[elem.type](elem)
				// lets count up the infers
				var einf = elem.infer
				if(infer && einf.name !== infer.name) throw this.InferErr(node, "Array can only be of single type")
			}
		}
		// the type of the thing
		m.i32[o++] = this.Type[infer?infer.name:'void']
	}
	
	//ObjectExpression:{properties:3},
	ObjectExpression(node) {
		logNonexisting(node)
		/*
		var props = node.properties
		var propslen = props.length - 1

		for(var i = 0;i <= propslen;i++){
			
			var prop = props[i]
			var key = prop.key
			
			this[key.type](key, true)
			
			if(!prop.shorthand) {
				this.text += ':'
				var value = prop.value
				this[value.type](value)
			}
		}*/
	}
	
	//ClassBody:{body:2},
	ClassBody(node) {
		logNonexisting(node)
		/*
		var body = node.body
		var bodylen = body.length - 1
		for(var i = 0;i <= bodylen;i++){
			var method = body[i]
			this[method.type](method)
		}*/
	}
	
	//EmptyStatement:{}
	EmptyStatement(node) {
		logNonexisting(node)
	}
	
	//ExpressionStatement:{expression:1},
	ExpressionStatement(node) {
		var m = this.method
		var exp = node.expression
		var o = m.o
		if((m.o += 1) > m.alloc) this.resize()

		m.i32[o++] = this.astIds.EXPRESSION_STATEMENT
		this[exp.type](exp)
		node.infer = exp.infer
	}
	
	//SequenceExpression:{expressions:2}
	SequenceExpression(node) {

		var m = this.method
		var o = m.o
		if((m.o += 3) > m.alloc) this.resize()
		m.i32[o++] = this.astIds.SEQUENCE_EXPRESSION
		
		var exps = node.expressions
		var expslength = exps.length - 1
		for(var i = 0;i <= expslength;i++){
			var exp = exps[i]
			if(exp) this[exp.type](exp)
		}
		// pass along the inference
		node.infer = exp?exp.infer:{kind:'void',type:Type.void}

		m.i32[o++] = node.infer.type.id//this.Type[node.infer.type.name]
		m.i32[o++] = expslength
	}
	
	//ParenthesizedExpression:{expression:1}
	ParenthesizedExpression(node) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()
		m.i32[o++] = this.astIds.PARENTHESIZED_EXPRESSION

		var exp = node.expression
		this[exp.type](exp)
		m.i32[o++] = exp.infer.type.id//this.Type[exp.infer.type.name]
		// pass along inference
		node.infer = exp.infer
	}
	
	//Literal:{raw:0, value:0},
	Literal(node) {
		var m = this.method
		// alright a literal. we need the type and value.
		// we also support strings
		var v = node.value
		var o = m.o
		if(node.kind === 'num'){
			if(node.raw.indexOf('.')!==-1){
				node.infer = {kind:'value', type:Type.float}
				if((m.o += 3) > m.alloc) this.resize()
				m.i32[o++] = this.astIds.LITERAL_FLOAT
				m.i32[o++] = Type.float.id
				m.f32[o++] = v
			}
			else {
				node.infer = {kind:'value', type:Type.int}
				if((m.o += 3) > m.alloc) this.resize()
				m.i32[o++] = this.astIds.LITERAL_INT
				m.i32[o++] = Type.int.id
				m.i32[o++] = v
			}
			// lets push our type
		}
		else if(node.kind === 'bool'){
			node.infer = {kind:'bool', type:Type.bool}
			if((m.o += 3) > m.alloc) this.resize()
			m.i32[o++] = this.astIds.LITERAL_BOOL
			m.i32[o++] = Type.bool.id
			m.i32[o++] = v
		}
		else if(node.kind === 'string'){ // do we support these?
			// no strings supported
			// must be parsed as a color or something else
		}
		else{
			throw new Error("Invalid literal "+node.kind + ':'+node.raw)
		}
	}
	
	//Identifier:{name:0},
	Identifier(node) {
		var m = this.method
		var name = node.name
		// resolve symbol on scope
		// or throw an error
		var infer
		var builtin
		var o = m.o
		if(infer = m.args[name]){
			if((m.o += 3) > m.alloc) this.resize()		
			m.i32[o++] = this.astIds.ARGUMENT
			m.i32[o++] = infer.type.id//this.Type[infer.type.name]
			m.i32[o++] = infer.argId
		}
		else if(infer = m.vars[name]){
			if((m.o += 3) > m.alloc) this.resize()		
			m.i32[o++] = this.astIds.VARIABLE
			m.i32[o++] = infer.type.id//this.Type[infer.type.name]
			m.i32[o++] = infer.varId
		}
		else{
			throw this.InferErr(node, "Invalid identifier: "+name)
		}
		// we have an identifier, so we need to use the id map
		node.infer = infer
	}
		
	//ThisExpression:{},
	ThisExpression(node) {
		var m = this.method
		var o = m.o
		if((m.o += 1) > m.alloc) this.resize()
		m.i32[o++] = this.astIds.THIS_EXPRESSION
		node.infer = {
			kind:'value',
			type:Type.object,
			object:this.root,
			isThis:true
		}
	}

	//MemberExpression:{object:1, property:1, computed:0},
	MemberExpression(node) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()
		var obj = node.object

		this[obj.type](obj)
		var prop = node.property

		// lets check the type of the thing we need a memberexpression on
		var objinfer = obj.infer
		if(objinfer.kind === 'type' || objinfer.kind === 'function'){ // its a Type
			// error we dont have member expressions on types
			throw this.InferErr(node, 'No members on type or function')
		}
		else if(objinfer.kind === 'this'){ // its this
			// ho
		}
		else if(objinfer.kind === 'value'){ // its a value
			// so this thing must become a struct member



			// its a value.
			var type = objinfer.type
			if(type === Type.object){
				// we are accessing a property on a JS object.
				if(node.computed) throw this.InferErr(node, 'Dont support [] on object')
				if(prop.type !== 'Identifier')  throw this.InferErr(node, 'Dont support non Identifier on object')
				// its an Object. so, 
				var obj = objinfer.object
				var value = obj[prop.name]
				if(typeof value === 'function'){
					node.infer = {
						kind:'function',
						callee:value,
						name:prop.name,
						object:obj,
						isThis:objinfer.isThis
					}
				}
				// ok so what do we serialize.

			}
			// ok so, wwhat are we accessing on our value.
			// but what kind of value?
			if(type === Type.object){
				if(node.computed) throw this.InferErr(node, 'Dont support [] on object')
				if(prop.type !== 'Identifier')  throw this.InferErr(node, 'Dont support non Identifier on object')
				// its an Object. so, 
				var obj = objinfer.object
				var value = obj[prop.name]
				if(typeof value === 'function'){
					node.infer = {
						kind:'method',
						callee:value,
						name:prop.name,
						object:obj,
						isThis:objinfer.isThis
					}
					// dont write it
					m.o = o
					return
				}
				// ok so what are we writing here.
				// its a fn call, the object is in there
				// so we need a symbol.
				m.i32[o++] = this.astIds.THIS_MEMBER_OBJECT
				m.i32[o++] = this.getNameId(prop.name)
				return 
			}
			else{ // lets see if we have this member on struct
				if(node.computed) {
					m.i32[o++] = this.astIds.THIS_MEMBER_COMPUTED
					this[prop.type](prop)
					// figure out computed typed
					// which member are we accessing?
					m.i32[o++] = type.id//this.Type[infer.type.name]
				}
				else{
					m.i32[o++] = this.astIds.THIS_MEMBER_EXPRESSION
					// figure out member type
					m.i32[o++] = type.id//this.Type[infer.type.name]
					this[prop.type](prop)
				}
			}
		}
		
		// we have to compute the type of the member we are accessing
		else {
			// use our name index and store the member expression
			this[prop.type](prop)
		}
	}

	builtinCall(node){
		var m = this.method
		var o = m.o
		if((m.o += 4) > m.alloc) this.resize()

		var callee = node.callee
		var args = node.arguments

		var argslen = args.length - 1
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			this[arg.type](arg)
		}

		// resolve callee to builtin id
		var builtin = this.builtinIds[callee.name]
		if(builtin === undefined) throw this.InferErr(node, "Cannot resolve builtin "+callee.name)

		var genSpecialise

		// ok so first, we figure out if our arguments fit.
		var params = builtin.params

		if(params.length !== args.length){
			throw this.InferErr(node, "Not the right number of args")
		}

		for(var i = 0; i < args.length; i++){
			var arg = args[i]
			var param = params[i]
			var argType = arg.infer.type
			var paramType = Type.idToType[param.typeId]
			
			if(paramType.isGen && argType.gen === paramType){
				if(genSpecialise && genSpecialise !== argType.gen) throw this.InferErr(node, "Gentype mix fail")
				genSpecialise = argType
			}
			else if(paramType !== argType){
				throw this.InferErr(node, "Argument is wrong type")
			}
		}
		
		var returnType = Type.idToType[builtin.returnTypeId]
		if(returnType.isGen){
			if(!genSpecialise) throw this.InferErr(node, "genType return but no argument passed")
			if(genSpecialise.gen !== returnType) throw this.InferErr(node, "genType return fails to match arg")
			returnType = genSpecialise
		}

		node.infer = {
			kind:'value',
			type:returnType
		}

		m.i32[o++] = this.astIds.BUILTIN_CALL
		m.i32[o++] = node.infer.type.id
		m.i32[o++] = argslen + 1
		m.i32[o++] = builtinId	
		return 
	}

	newObject(node, proto){
		var m = this.method
		var o = m.o
		if((m.o += 3) > m.alloc) this.resize()

		var callee = node.callee
		var args = node.arguments

		var argslen = args.length - 1
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			this[arg.type](arg)
		}
		
		var compiled = proto.$methods.init

		// check arg type
		var argslen = args.length - 1
		var argTypeIds = compiled.argTypeIds
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			if(arg.infer.type.id !== argTypeIds[i]){
				// error
				throw new this.InferErr(node, "Method"+methodName+" invalid argument type")
			}
		}

		// ok so well, we have a classId/
		node.infer = {
			kind:'value',
			infer:Type.object,
			classId: proto.$classId
		}

		var compiled = proto.$methods.init
		if(!compiled){
			throw new this.InferErr(node, "Class "+methodName+" does not have an init function"+argTypes)
		}

		m.i32[o++] = this.astIds.NEW_OBJECT
		m.i32[o++] = proto.$classId
		m.i32[o++] = argslen + 1
		return
	}

	thisCall(node, methodName){
		var m = this.method
		var o = m.o
		if((m.o += 4) > m.alloc) this.resize()

		var methodFn = this.root[methodName]

		// its a normal method call
		var compiled = this.methods[methodName]

		if(!compiled){ // switch over to do this method
			compiled = this.compileMethod(methodName, methodFn)
		}

		var args = node.arguments
		var argslen = args.length - 1
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			this[arg.type](arg)
		}

		// check arg type
		var argslen = args.length - 1
		var argTypeIds = compiled.argTypeIds
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			if(arg.infer.type.id !== argTypeIds[i]){
				// error
				throw new this.InferErr(node, "Method"+methodName+" invalid argument type")
			}
		}

		node.infer = {
			kind:'value',
			infer:compiled.returnType
		}

		var returnType = compiled.returnType

		// lets get the method name
		m.i32[o++] = this.astIds.THIS_CALL
		m.i32[o++] = returnType?returnType.id:Type.void.id
		m.i32[o++] = this.getNameId(methodName)
		m.i32[o++] = argslen + 1
		// its a THIS_CALL		
	}

	objectCall(node){
		var m = this.method
		var o = m.o
		if((m.o += 4) > m.alloc) this.resize()

		var callee = node.callee
		var args = node.arguments

		var argslen = args.length - 1
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			this[arg.type](arg)
		}

		// type infer the callee, it acn only be an object call
		this[callee.type](callee)
		var infer = callee.infer

		if(infer.type !== Type.object){
			throw this.InferErr(node, "Non object callee not supported")
		}
		
		m.i32[o++] = this.astIds.OBJECT_CALL
		m.i32[o++] = // return type
		m.i32[o++] = argslen + 1 // no args
		m.i32[o++] = infer.objectClass.$classId//0//this.getNameId(methodName)
	}

	//CallExpression:{callee:1, arguments:2},
	CallExpression(node) {
		var callee = node.callee

		if(callee.type === 'Identifier'){
			return this.builtinCall(node)
		}

		if(callee.type !== 'MemberExpression'){
			// unsupported callee type
			throw this.InferErr(node, "Callee not supported")
		}

		if(callee.object.type === 'ThisExpression'){
			
			var property = callee.property
			if(property.type !== 'Identifier') throw this.InferErr(node, "Call not on method on this")

			var methodName = property.name
			var methodFn = this.root[methodName]

			if(typeof methodFn !== 'function')  throw this.InferErr(node, "Calling "+property.name+" but its not a function")

			var proto = methodFn.prototype

			// its a class constructor!
			if(proto && Object.getPrototypeOf(proto) !== Object.prototype){
				if(proto.$classId == undefined){
					throw this.InferErr(node, "Class "+methodName+' not a compiled class')
				}
				return this.newObject(node, proto)
			}

			return this.thisCall(node, methodName)
		}

		return this.objectCall(node)
	}
	
	//NewExpression:{callee:1, arguments:2},
	NewExpression(node) {
		// new is optional
		this.CallExpression(node)		
	}
	
	//ReturnStatement:{argument:1},
	ReturnStatement(node) {
		// return statement
		var m = this.method
		var o = m.o
		var arg = node.argument
		if(arg) {
			if((m.o += 2) > m.alloc) this.resize()
			m.i32[o++] = this.astIds.RETURN_VALUE
			this[arg.type](arg)
			var infer = arg.infer
			if(m.returnType){
				if(m.returnType !== infer.type){
					throw this.InferErr(node, "Return uses mixed types")
				}
			}
			else m.returnType = infer.type
			m.i32[o++] = infer.type.id
		}
		else{
			if((m.o += 1) > m.alloc) this.resize()
			m.i32[o++] = this.astIds.RETURN_VOID
			if(m.returnType !== Type.void){
				throw this.InferErr(node, "Return uses mixed types")
			}
			else m.returnType = Type.void
		}
	}
	
	//FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	FunctionExpression(node) {
		throw this.SupportErr(node)
	}
	
	//FunctionDeclaration: {id:1, params:2, expression:0, body:1},

	FunctionDeclaration(node, method) {
		throw this.SupportErr(node)
	}
	
	//VariableDeclaration:{declarations:2, kind:0},
	VariableDeclaration(node) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()

		var kind = node.kind
		var decls = node.declarations
		var declslen = decls.length - 1

		m.i32[o++] = this.astIds.VARIABLE_DECLARATION
		m.i32[o++] = declslen

		for(var i = 0;i <= declslen;i++){
			var decl = decls[i]
			this[decl.type](decl, kind)
		}
	}
	
	//VariableDeclarator:{id:1, init:1},
	VariableDeclarator(node, kind) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()
		m.i32[o++] = this.astIds.VARIABLE_DECLARATOR

		var id = node.id
		
		if(id.type !== 'Identifier') {
			throw this.InferErr(node, 'Variable can only be simple identifier')
		}

		var init = node.init
		if(!init) {
			throw this.InferErr(node, 'Need init value for variable')
		}
		
		this[init.type](init)

		var varId = m.varId++

		m.i32[o++] = m.vars[id.name] = {
			varId:varId,
			type:init.infer.type
		}

		m.varTypeIds[varId] =  init.infer.type.id
	}
	
	//LogicalExpression:{left:1, right:1, operator:0},
	LogicalExpression(node, path) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()
		m.i32[o++] = this.astIds.LOGICAL_EXPRESSION

		var left = node.left
		var right = node.right
		this[left.type](left)
		this[right.type](right)
		
		//this.text += node.operator
		console.log("LOGICAL EXPRESSION IMPL NEEDED", node.operator)
		//if(op === '+') this.i32[o++] = 1
		//else if(op === '-') this.i32[o++] = 2
		//else if(op === '*') this.i32[o++] = 3
		//else if(op === '/') this.i32[o++] = 4
	}
	
	//BinaryExpression:{left:1, right:1, operator:0},
	BinaryExpression(node) {
		var left = node.left
		var right = node.right
		var op = node.operator
		var m = this.method
		var o = m.o
		// make a combined literal
		if(left.type === 'Literal' && right.type === 'Literal'){
			var a = left.value
			var b = right.value
			var r 
			if(op === '+') r = a + b
			else if(op === '-') r = a - b
			else if(op === '*') r = a * b
			else if(op === '/') r = a / b

			if((m.o += 3) > m.alloc) this.resize()
			if(left.raw.indexOf('.') !== -1 || right.raw.indexOf('.') !== -1){
				m.i32[o++] = this.astIds.LITERAL_FLOAT
				m.i32[o++] = Type.float.id
				m.f32[o++] = r
				node.infer = {kind:'value', type:Type.float}
			}
			else{
				m.i32[o++] = this.astIds.LITERAL_INT
				m.i32[o++] = Type.int.id
				m.i32[o++] = r
				node.infer = {kind:'value', type:Type.int}
			}
			return
		}

		if((m.o += 3) > m.alloc) this.resize()
		m.i32[o++] = this.astIds.BINARY_EXPRESSION

		this[left.type](left)
		this[right.type](right)

		var type
		var group = this.groupBinaryExpression[node.operator]
		if(group === 1){
			var lt = this.tableBinaryExpression[left.infer.type.name]

			if(!lt) throw this.InferErr(node, 'No production rule for type '+left.infer.type.name)

			type = lt[right.infer.type.name]
			if(!type){
				throw this.InferErr(node, 'No production rule for type '+left.infer.type.name+' and '+right.infer.type.name)
			}

			node.infer = {
				type:type,
				kind:'value'
			}
		}
		else if(group === 2){
			if(left.infer.type !== right.infer.type){
				throw this.InferErr(node, 'Cant compare '+left.infer.type.name+' with '+right.infer.type.name)
			}
			node.infer = {
				type:type = types.bool,
				kind:'value'
			}
		}
		
		// lets output the left/right/result types
		m.i32[o++] = type.id//this.Type[type.name].id
		//m.i32[o++] = this.Type[left.infer.type.name]
		//m.i32[o++] = this.Type[right.infer.type.name]
		var opId = this.opIds[op]
		if(opId === undefined) throw this.InferError(node, 'Binary expression not supported '+op )
		m.i32[o++] = opId
	}
	
	//AssignmentExpression: {left:1, operator:0, right:1},
	AssignmentExpression(node) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()
		m.i32[o++] = this.astIds.ASSIGNMENT_EXPRESSION
		var opId = this.opIds[node.operator]
		if(opId === undefined) throw this.InferError(node, 'Assignment expression operator not supported '+node.operator )
		m.i32[o++] = opId

		// also, if the LHS is this.something
		// we need to create it
		// or atleast typecheck it
		var old = this.text
		var left = node.left
		var right = node.right
		var lefttype = left.type

		// figure out rhs type first
		this[right.type](right)

		left.assignType = right.infer
		// pass it to the lhs
		//if(lefttype === 'MemberExpression' && left.object === 'ThisExpression'){
			// just mark it with that its an assignment
			// the memberexpression will check assignType
			// to see if its valid
		//	left.assignType = right.infer
		//}
		this[lefttype](left)
		
		// check if the lhs infer fits the rhs
		
	}
	
	//ConditionalExpression:{test:1, consequent:1, alternate:1},
	ConditionalExpression(node) {
		var test = node.test
		this[test.type](test)
		var cq = node.consequent
		this[cq.type](cq)
		var alt = node.alternate
		this[alt.type](alt)
	}
		
	//UnaryExpression:{operator:0, prefix:0, argument:1},
	UnaryExpression(node) {
		if(node.prefix) {
			var op = node.operator
			//if(op.length > 1) op = op + ' '
			var arg = node.argument
			var argtype = arg.type
			this[argtype](arg)
		}
		else {
			var arg = node.argument
			var argtype = arg.type
			var op = node.operator
			this[argtype](arg)
		}
	}
	
	//UpdateExpression:{operator:0, prefix:0, argument:1},
	UpdateExpression(node) {
		if(node.prefix) {
			var op = node.operator
			var arg = node.argument
			var argtype = arg.type
			this[argtype](arg)
		}
		else {
			var arg = node.argument
			var argtype = arg.type
			var op = node.operator
			this[argtype](arg)
		}
	}
	
	//IfStatement:{test:1, consequent:1, alternate:1},
	IfStatement(node) {

		var test = node.test
		this[test.type](test)
		
		var cq = node.consequent
		var alt = node.alternate

		this[cq.type](cq)

		if(alt) {
			this[alt.type](alt)
		}
	}
	
	//ForStatement:{init:1, test:1, update:1, body:1},
	ForStatement(node) {
		var init = node.init
		if(init) this[init.type](init)
		var test = node.test
		if(test) this[test.type](test)
		var update = node.update
		if(update) this[update.type](update)
		var body = node.body
		this[body.type](body)
	}
	
	//ForOfStatement:{left:1, right:1, body:1},
	ForOfStatement(node) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()
		m.i32[o++] = this.astIds.FOR_OF_STATEMENT

		// as left we only support var x
		// so lets allocate it and write it in
		// then we do right hand side
		// which needs to return an array
		// essentially this must be a var x / let x
		var left = node.left 
		if(left.type !== 'VariableDeclaration') throw this.InferErr(node, 'Only support var decl in or of')

		if(left.declarations.length !== 1 ||
			left.declarations[0].id.type !== 'Identifier') throw this.InferErr(node, 'Only support single var def in for of')
		var declId = left.declarations[0].id

		// ok so 
		//this[left.type](left)
		
		// lets process right hand side
		var right = node.right
		this[right.type](right)

		console.log(right)

		// and then we have the body
		var bod = node.body
		this[body.type](body)

		throw this.SupportErr(node)
	}
	

	//ForInStatement:{left:1, right:1, body:1},
	ForInStatement(node) {
		throw this.SupportErr(node)
	}

	//WhileStatement:{body:1, test:1},
	WhileStatement(node) {
		var test = node.test
		this[test.type](test)
		var body = node.body
		this[body.type](body)
	}
	
	//DoWhileStatement:{body:1, test:1},
	DoWhileStatement(node) {
		var body = node.body
		this[body.type](body)
		var test = node.test
		this[test.type](test)
	}
	
	//BreakStatement:{label:1},
	BreakStatement(node) {
		if(node.label) {
			var label = node.label
			this[label.type](label)
		}
		else {
		}
	}
	
	//ContinueStatement:{label:1},
	ContinueStatement(node) {
		if(node.label) {
			var label = node.label
			this[label.type](label)
		}
		else {
		}
	}
	
	//YieldExpression:{argument:1, delegate:0}
	YieldExpression(node) {
		var arg = node.argument
		if(arg) {
			if(node.delegate) {
			}
			this[arg.type](arg)
		}
		else {
		}
	}
	
	//ThrowStatement:{argument:1},
	ThrowStatement(node) {
		throw this.SupportErr(node)
	}
	
	//TryStatement:{block:1, handler:1, finalizer:1},
	TryStatement(node) {
		throw this.SupportErr(node)
	}
	
	//CatchClause:{param:1, body:1},
	CatchClause(node) {
		throw this.SupportErr(node)
	}
	
	//SpreadElement
	SpreadElement(node) {
		throw this.SupportErr(node)
	}
	
	//RestElement:{argument:1}
	RestElement(node) {
		throw this.SupportErr(node)
	}
	
	//Super:{},
	Super(node) {
	}
	
	//AwaitExpression:{argument:1},
	AwaitExpression(node) {
		logNonexisting(node)
	}
	
	//MetaProperty:{meta:1, property:1},
	MetaProperty(node) {
		throw this.SupportErr(node)
	}
		
	//ObjectPattern:{properties:3},
	ObjectPattern(node) {
		throw this.SupportErr(node)
	}
	
	
	//ObjectPattern:{properties:3},
	ArrayPattern(node) {
		throw this.SupportErr(node)
	}
	
	// AssignmentPattern
	AssignmentPattern(node) {
		throw this.SupportErr(node)
	}
	
	
	//ArrowFunctionExpression:{params:2, expression:0, body:1},
	ArrowFunctionExpression(node) {
		throw this.SupportErr(node)
	}
	
	//SwitchStatement:{discriminant:1, cases:2},
	SwitchStatement(node) {
		var disc = node.discriminant
		this[disc.type](disc)
		var cases = node.cases
		var caseslen = cases.length
		for(var i = 0;i < caseslen;i++){
			var cas = cases[i]
			this[cas.type](cas)
		}
	}

	//SwitchCase:{test:1, consequent:2},
	SwitchCase(node) {
		var test = node.test
		if(!test) {
		}
		else {
			this[test.type](test)
		}
		var cqs = node.consequent
		var cqlen = cqs.length
		for(var i = 0;i < cqlen;i++){
			var cq = cqs[i]
			if(cq) this[cq.type](cq)
			this.newLine()
		}
	}
	
	//TaggedTemplateExpression:{tag:1, quasi:1},
	TaggedTemplateExpression(node) {
		throw this.SupportErr(node)
	}
	
	//TemplateElement:{tail:0, value:0},
	TemplateElement(node) {
		throw this.SupportErr(node)
	}
	
	//TemplateLiteral:{expressions:2, quasis:2},
	TemplateLiteral(node) {
		throw this.SupportErr(node)
	}
	
	//ClassDeclaration:{id:1,superClass:1},
	ClassDeclaration(node) {
		throw this.SupportErr(node)
	}
	
	//ClassExpression:{id:1,superClass:1},
	ClassExpression(node) {
		throw this.SupportErr(node)
	}
	
	//MethodDefinition:{value:1, kind:0, static:0},
	MethodDefinition(node) {
		throw this.SupportErr(node)
	}
	
	//ExportAllDeclaration:{source:1},
	ExportAllDeclaration(node) {
		throw this.SupportErr(node)
	}
	
	//ExportDefaultDeclaration:{declaration:1},
	ExportDefaultDeclaration(node) {
		throw this.SupportErr(node)
	}
	//ExportNamedDeclaration:{declaration:1, source:1, specifiers:2},
	ExportNamedDeclaration(node) {
		throw this.SupportErr(node)
	}
	//ExportSpecifier:{local:1, exported:1},
	ExportSpecifier(node) {
		throw this.SupportErr(node)
	}
	//ImportDeclaration:{specifiers:2, source:1},
	ImportDeclaration(node) {
		throw this.SupportErr(node)
	}
	//ImportDefaultSpecifier:{local:1},
	ImportDefaultSpecifier(node) {
		throw this.SupportErr(node)
	}
	//ImportNamespaceSpecifier:{local:1},
	ImportNamespaceSpecifier(node) {
		throw this.SupportErr(node)
	}
	//ImportSpecifier:{imported:1, local:1},
	ImportSpecifier(node) {
		throw this.SupportErr(node)
	}
	//DebuggerStatement:{},
	DebuggerStatement(node) {
		throw this.SupportErr(node)
	}
	//LabeledStatement:{label:1, body:1},
	LabeledStatement(node) {
		var label = node.label
		this[label.type](label)
		var body = node.body
		this[body.type](body)
	}
	// WithStatement:{object:1, body:1}
	WithStatement(node, path) {
		throw this.SupportErr(node)
	}
}

var logNonexisting = function(node) {
	console.log(node.type)
}