var types = require('base/types')
var jsparser = require('parsers/js')
var AstGlslGen = require('./astglslgen')

module.exports = class AstByteCodeGen extends require('base/class'){
	
	static generateByteCode(props, root, fn){
		var bc = new this()
		
		// external ops/types/symbols
		bc.codeIds = props.codeIds
		bc.typeIds = props.typeIds
		bc.builtin = props.builtin
		bc.idToName = {}
		bc.nameToId = {}
		bc.ids = 1

		// compiler limits (differentiate gpu/bytecode)
		bc.limits = {}

		bc.root = root
		bc.context = root

		bc.methods = {}
		
		// lets build type info
		root._type = types.Object(root._props)

		bc.compileMethod('compile', fn, [])
		
		// return our generator
		return bc
	}

	prototype(){
		var ag = new AstGlslGen()
		this.tableBinaryExpression = ag.tableBinaryExpression
		this.groupBinaryExpression = ag.groupBinaryExpression
		this.swizlut = ag.swizlut
		this.swiztype = ag.swiztype
		this.swizone = ag.swizone
		this.Err = ag.Err
		this.glslfunctions = ag.glslfunctions
	}

	getId(name){
		var id = this.nameToId[name]
		if(id !== undefined) return id
		id = this.ids++
		this.nameToId[name] = id
		this.idToName[id] = name
		return id
	}

	compileMethod(name, fn, args){
		var currentMethod = this.methodName
		this.methodName = name
		var m = this.method = this.methods[name] = {
			vars:Object.create(null),
			args:Object.create(null),
			varTypes:[],
			argTypes:[],
			varId:0,
			o:0,
			f32:null,
			i32:null,
			return:null,
			alloc:0
		}

		var source = fn.toString()
		if(source.indexOf('function') !== 0){
			source = 'function ' + source
		}

		// lets build the type info for 'this' from our props
		var ast = jsparser.parse(source)

		var node = ast.body[0].body
		var params = ast.body[0].params

		// set up args scope stuff
		var argslen = args.length - 1
		var paramslen = params.length -1
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			var param = params[i]
			var name
			if(param.type === 'Identifier') name = param.name
			else if(param.type === 'AssignmentPattern') name = param.left.name
			else throw new this.InferErr(param, 'Unknown parameter type')
			// pass in the inference info
			m.args[name] = {
				isArg:true,
				type:arg.infer.type,
				id:i
			}
			m.argTypes[i] = this.typeIds[arg.infer.type.name]
			// lets store it in args
			if(i > paramslen) throw new this.InferErr(arg, 'Too many args for function')
		}
		// just variable declare the default args
		if(i <= paramslen){
			var o = m.o
			if((m.o += 2) > m.alloc) this.resize()
			m.i32[o++] = this.codeIds.VARIABLE_DECLARATION
			m.i32[o++] = (paramslen - i) + 1
			for(;i <= paramslen;i++){
				var param = params[i]
				if(param.type !== 'AssignmentPattern'){
					throw new this.InferErr(param, 'Param '+i+' skipped without default arg')
				}
				// ok now what we need to turn it into a variable declaration
				var o = m.o
				if((m.o += 2) > m.alloc) this.resize()
				m.i32[o++] = this.codeIds.VARIABLE_DECLARATOR
				// lets run the init
				var init = param.right
				this[init.type](init)
				var varId = m.varId++
				m.i32[o++] = m.vars[param.left.name] = {
					type:init.infer.type.name,
					id:varId
				}
				m.varTypes[varId] = this.typeIds[init.infer.type.name]
			}
		}

		this[node.type](node)
		this.method = this.methods[currentMethod]
		this.methodName = currentMethod
		return m
	}

	SupportErr(node){
		return new this.Err(this, node, 'SupportError', 'Dont support '+node.type)
	}

	InferErr(node, message){
		return new this.Err(this, node, 'InferenceError', message)
	}
	
	constructor(ops){
		super()
		this.codeIds = ops
		this.alloc = 0
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

		m.i32[o++] = this.codeIds.BLOCK_STATEMENT
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

		m.i32[o++] = this.codeIds.ARRAY_EXPRESSION
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
		m.i32[o++] = this.typeIds[infer?infer.name:'void']
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

		m.i32[o++] = this.codeIds.EXPRESSION_STATEMENT
		this[exp.type](exp)
		node.infer = exp.infer
	}
	
	//SequenceExpression:{expressions:2}
	SequenceExpression(node) {

		var m = this.method
		var o = m.o
		if((m.o += 3) > m.alloc) this.resize()
		m.i32[o++] = this.codeIds.SEQUENCE_EXPRESSION
		
		var exps = node.expressions
		var expslength = exps.length - 1
		for(var i = 0;i <= expslength;i++){
			var exp = exps[i]
			if(exp) this[exp.type](exp)
		}
		// pass along the inference
		node.infer = exp?exp.infer:{kind:'void',infer:types.void}

		m.i32[o++] = this.typeIds[node.infer.type.name]
		m.i32[o++] = expslength
	}
	
	//ParenthesizedExpression:{expression:1}
	ParenthesizedExpression(node) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()
		m.i32[o++] = this.codeIds.PARENTHESIZED_EXPRESSION

		var exp = node.expression
		this[exp.type](exp)
		m.i32[o++] = this.typeIds[exp.infer.type.name]
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
				node.infer = {kind:'value', type:types.float}
				if((m.o += 3) > m.alloc) this.resize()
				m.i32[o++] = this.codeIds.LITERAL_FLOAT
				m.i32[o++] = this.typeIds.float
				m.f32[o++] = v
			}
			else {
				node.infer = {kind:'value', type:types.int}
				if((m.o += 3) > m.alloc) this.resize()
				m.i32[o++] = this.codeIds.LITERAL_INT
				m.i32[o++] = this.typeIds.int
				m.i32[o++] = v
			}
			// lets push our type
		}
		else if(node.kind === 'bool'){
			node.infer = {kind:'bool', type:types.bool}
			if((m.o += 3) > m.alloc) this.resize()
			m.i32[o++] = this.codeIds.LITERAL_BOOL
			m.i32[o++] = this.typeIds.bool
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
		var o = m.o
		if((m.o += 3) > m.alloc) this.resize()		
		if(infer = m.args[name]){
			m.i32[o++] = this.codeIds.ARGUMENT
			m.i32[o++] = this.typeIds[infer.type.name]
			m.i32[o++] = infer.id
		}
		else if(infer = m.vars[name]){
			m.i32[o++] = this.codeIds.VARIABLE
			m.i32[o++] = this.typeIds[infer.type.name]
			m.i32[o++] = infer.id
		}
		else{
			throw this.InferErr(node, "Invalid identifier"+name)
		}
		// we have an identifier, so we need to use the id map
		node.infer = infer
	}
		
	//ThisExpression:{},
	ThisExpression(node) {
		var m = this.method
		var o = m.o
		if((m.o += 1) > m.alloc) this.resize()
		m.i32[o++] = this.codeIds.THIS_EXPRESSION
		node.infer = {
			kind:'value',
			type:this.root._type,
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
		else if(objinfer.kind === 'value'){ // its a value
			// but what kind of value?
			var type = objinfer.type
			if(type.name === 'object'){
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
				m.i32[o++] = this.codeIds.THIS_MEMBER_OBJECT
				m.i32[o++] = this.getId(prop.name)
				return 
			}
			else{ // lets see if we have this member on struct
				if(node.computed) {
					m.i32[o++] = this.codeIds.THIS_MEMBER_COMPUTED
					this[prop.type](prop)
					// figure out computed typed
					// which member are we accessing?
					m.i32[o++] = this.typeIds[infer.type.name]
				}
				else{
					m.i32[o++] = this.codeIds.THIS_MEMBER_EXPRESSION
					// figure out member type
					m.i32[o++] = this.typeIds[infer.type.name]
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
	
	//CallExpression:{callee:1, arguments:2},
	CallExpression(node) {
		var m = this.method
		var o = m.o
		if((m.o += 3) > m.alloc) this.resize()

		// TEMPLATE-EXPAND INTO A CALL
		var callee = node.callee
		var args = node.arguments

		// type infer callee
		this[callee.type](callee)
		var infer = callee.infer

		// process args
		var argslen = args.length - 1
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			this[arg.type](arg)
		}

		if(infer.kind === 'builtin'){
			// call a builtin fn
			m.i32[o++] = this.codeIds.CALL_BUILTIN
			m.i32[o++] = argslen
		}
		else if(infer.kind === 'method'){

			if(infer.isThis){ // method call on this
				m.i32[o++] = this.codeIds.CALL_THIS
				m.i32[o++] = argslen

				var methodName = infer.name + '_T'
				var argslen = args.length - 1
				for(var i = 0;i <= argslen;i++){
					var arg = args[i]
					methodName += '_' + arg.infer.type.name
				}
				
				var compiled = this.methods[methodName]
				m.i32[o++] = this.getId(methodName)
				if(!compiled){ // switch over to do this method
					compiled = this.compileMethod(methodName, infer.callee, args)
				}
				node.infer = {
					kind:'value',
					infer:compiled.return
				}
			}			
			else{ // method call on object
				
				m.i32[o++] = this.codeIds.CALL_OBJECT
				m.i32[o++] = argslen
			}

		}
		else throw this.InferErr(node, "Call not a method or a builtin")

	}
	
	//NewExpression:{callee:1, arguments:2},
	NewExpression(node) {
		var callee = node.callee
		var args = node.arguments
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
			m.i32[o++] = this.codeIds.RETURN_VALUE
			this[arg.type](arg)
			var infer = arg.infer
			if(m.return){
				if(m.return.name !== infer.type.name){
					throw this.InferErr(node, "Return uses mixed types")
				}
			}
			else m.return = infer.type
			m.i32[o++] = this.typeIds[arg.infer.type.name]
		}
		else{
			if((m.o += 1) > m.alloc) this.resize()
			m.i32[o++] = this.codeIds.RETURN_VOID
			if(m.return){
				if(m.return.name !== 'void'){
					throw this.InferErr(node, "Return uses mixed types")
				}
			}
			else m.return = types.void
		}
	}
	
	//FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	FunctionExpression(node) {
		throw this.Supporterr(node)
	}
	
	//FunctionDeclaration: {id:1, params:2, expression:0, body:1},

	FunctionDeclaration(node, method) {
		throw this.Supporterr(node)
	}
	
	//VariableDeclaration:{declarations:2, kind:0},
	VariableDeclaration(node) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()

		var kind = node.kind
		var decls = node.declarations
		var declslen = decls.length - 1

		m.i32[o++] = this.codeIds.VARIABLE_DECLARATION
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
		m.i32[o++] = this.codeIds.VARIABLE_DECLARATOR

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
			id:varId,
			type:init.infer.type
		}

		m.varTypes[varId] =  this.typeIds[init.infer.type.name]
	}
	
	//LogicalExpression:{left:1, right:1, operator:0},
	LogicalExpression(node, path) {
		var m = this.method
		var o = m.o
		if((m.o += 2) > m.alloc) this.resize()
		m.i32[o++] = this.codeIds.LOGICAL_EXPRESSION

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

			if((m.o += 2) > m.alloc) this.resize()
			if(left.raw.indexOf('.') !== -1 || right.raw.indexOf('.') !== -1){
				m.i32[o++] = this.codeIds.LITERAL_FLOAT
				m.f32[o++] = r
				node.infer = {kind:'value', type:types.float}
			}
			else{
				m.i32[o++] = this.codeIds.LITERAL_INT
				m.i32[o++] = r
				node.infer = {kind:'value', type:types.int}
			}
			return
		}

		if((m.o += 3) > m.alloc) this.resize()
		m.i32[o++] = this.codeIds.BINARY_EXPRESSION

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
		m.i32[o++] = this.typeIds[type.name]
		//m.i32[o++] = this.typeIds[left.infer.type.name]
		//m.i32[o++] = this.typeIds[right.infer.type.name]
		if(op === '+') m.i32[o++] = 1
		else if(op === '-') m.i32[o++] = 2
		else if(op === '*') m.i32[o++] = 3
		else if(op === '/') m.i32[o++] = 4
		else throw new Error('Binary expression not supported '+op )

	}
	
	//AssignmentExpression: {left:1, operator:0, right:1},
	AssignmentExpression(node) {
		var old = this.text
		var left = node.left
		var right = node.right
		var lefttype = left.type
		this[lefttype](left)
		this[right.type](right)
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
	
	//ForInStatement:{left:1, right:1, body:1},
	ForInStatement(node) {
		throw this.Supporterr(node)
	}
	
	//ForOfStatement:{left:1, right:1, body:1},
	ForOfStatement(node) {
		throw this.Supporterr(node)
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
		throw this.Supporterr(node)
	}
	
	//TryStatement:{block:1, handler:1, finalizer:1},
	TryStatement(node) {
		throw this.Supporterr(node)
	}
	
	//CatchClause:{param:1, body:1},
	CatchClause(node) {
		throw this.Supporterr(node)
	}
	
	//SpreadElement
	SpreadElement(node) {
		throw this.Supporterr(node)
	}
	
	//RestElement:{argument:1}
	RestElement(node) {
		throw this.Supporterr(node)
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
		throw this.Supporterr(node)
	}
		
	//ObjectPattern:{properties:3},
	ObjectPattern(node) {
		throw this.Supporterr(node)
	}
	
	
	//ObjectPattern:{properties:3},
	ArrayPattern(node) {
		throw this.Supporterr(node)
	}
	
	// AssignmentPattern
	AssignmentPattern(node) {
		throw this.Supporterr(node)
	}
	
	
	//ArrowFunctionExpression:{params:2, expression:0, body:1},
	ArrowFunctionExpression(node) {
		throw this.Supporterr(node)
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
		throw this.Supporterr(node)
	}
	
	//TemplateElement:{tail:0, value:0},
	TemplateElement(node) {
		throw this.Supporterr(node)
	}
	
	//TemplateLiteral:{expressions:2, quasis:2},
	TemplateLiteral(node) {
		throw this.Supporterr(node)
	}
	
	//ClassDeclaration:{id:1,superClass:1},
	ClassDeclaration(node) {
		throw this.Supporterr(node)
	}
	
	//ClassExpression:{id:1,superClass:1},
	ClassExpression(node) {
		throw this.Supporterr(node)
	}
	
	//MethodDefinition:{value:1, kind:0, static:0},
	MethodDefinition(node) {
		throw this.Supporterr(node)
	}
	
	//ExportAllDeclaration:{source:1},
	ExportAllDeclaration(node) {
		throw this.Supporterr(node)
	}
	
	//ExportDefaultDeclaration:{declaration:1},
	ExportDefaultDeclaration(node) {
		throw this.Supporterr(node)
	}
	//ExportNamedDeclaration:{declaration:1, source:1, specifiers:2},
	ExportNamedDeclaration(node) {
		throw this.Supporterr(node)
	}
	//ExportSpecifier:{local:1, exported:1},
	ExportSpecifier(node) {
		throw this.Supporterr(node)
	}
	//ImportDeclaration:{specifiers:2, source:1},
	ImportDeclaration(node) {
		throw this.Supporterr(node)
	}
	//ImportDefaultSpecifier:{local:1},
	ImportDefaultSpecifier(node) {
		throw this.Supporterr(node)
	}
	//ImportNamespaceSpecifier:{local:1},
	ImportNamespaceSpecifier(node) {
		throw this.Supporterr(node)
	}
	//ImportSpecifier:{imported:1, local:1},
	ImportSpecifier(node) {
		throw this.Supporterr(node)
	}
	//DebuggerStatement:{},
	DebuggerStatement(node) {
		throw this.Supporterr(node)
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
		throw this.Supporterr(node)
	}
}

var logNonexisting = function(node) {
	console.log(node.type)
}