var logNonexisting = function(node) {
	console.log(node.type)
}

var types = require('base/types')
var jsparser = require('parsers/js')

module.exports = class AstByteCodeGen extends require('base/class'){
	
	static generateByteCode(ops, root, fn){
		var bc = new this()
		bc.ops = ops
		bc.root = root
		bc.context = root
		
		var source = fn.toString()
		if(source.indexOf('function') !== 0){
			source = 'function ' + source
		}

		var ast = jsparser.parse(source)
		// generate it
		bc[ast.type](ast)
		// return our generator
		return bc
	}

	prototype() {
	}
	
	constructor(ops){
		super()
		this.ops = ops
		this.alloc = 0
		this.o = 0
		this.scope = {}
	}
		
	resize(){
		var f32 = this.f32
		var len = this.alloc
		this.alloc = len*2
		if(this.alloc <= this.o) this.alloc = this.o+1
		this.f32 = new Float32Array(this.alloc)
		this.i32 = new Int32Array(this.f32.buffer)
		for(var i = 0; i < len; i++){
			this.f32[i] = f32[i]
		}
	}

	push_f32(val){
		var o = this.o
		if((this.o+=2)>this.alloc) this.resize()
		this.i32[o++] = this.ops.PUSH_F32
		this.f32[o++] = val
	}

	push_i32(val){
		var o = this.o
		if((this.o+=2)>this.alloc) this.resize()
		this.i32[o++] = this.ops.PUSH_I32
		this.i32[o++] = val
	}

	add_f32_f32(){
		var o = this.o
		if((this.o+=1)>this.alloc) this.resize()
		this.i32[o++] = this.ops.ADD_F32_F32
	}

	sub_f32_f32(){
		var o = this.o
		if((this.o+=1)>this.alloc) this.resize()
		this.i32[o++] = this.ops.SUB_F32_F32
	}

	mul_f32_f32(){
		var o = this.o
		if((this.o+=1)>this.alloc) this.resize()
		this.i32[o++] = this.ops.MUL_F32_f32
	}

	div_f32_f32(){
		var o = this.o
		if((this.o+=1)>this.alloc) this.resize()
		this.i32[o++] = this.ops.DIV_F32_F32
	}


	//Program:{ body:2 },	
	Program(node) {
		this.BlockStatement(node)
		return
	}
	
	BlockStatement(node) {
		var body = node.body
		var bodylen = body.length - 1
		//
		// do the statements
		for(var i = 0;i <= bodylen;i++){
			var statement = body[i]
			var ret = this[statement.type](statement)
		}
	}

	
	//ArrayExpression:{elements:2},
	ArrayExpression(node) {
		var elems = node.elements
		var elemslen = elems.length - 1
		
		for(var i = 0;i <= elemslen;i++){
			var elem = elems[i]
			
			if(elem) {
				this[elem.type](elem)
			}
		}
	}
	
	//ObjectExpression:{properties:3},
	ObjectExpression(node) {
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
		}
	}
	
	//ClassBody:{body:2},
	ClassBody(node) {

		var body = node.body
		var bodylen = body.length - 1
		for(var i = 0;i <= bodylen;i++){
			var method = body[i]
			this[method.type](method)
		}
	}
	
	//EmptyStatement:{}
	EmptyStatement(node) {
		console.log(node)
	}
	
	//ExpressionStatement:{expression:1},
	ExpressionStatement(node) {
		var exp = node.expression
		this[exp.type](exp)
	}
	
	//SequenceExpression:{expressions:2}
	SequenceExpression(node) {
		
		var exps = node.expressions
		var expslength = exps.length - 1
		for(var i = 0;i <= expslength;i++){
			var exp = exps[i]
			if(exp) this[exp.type](exp)
		}
	}
	
	//ParenthesizedExpression:{expression:1}
	ParenthesizedExpression(node) {
		var exp = node.expression
		this[exp.type](exp)
	}
	
	//Literal:{raw:0, value:0},
	Literal(node) {
		if(node.kind === 'num'){
			if(node.raw.indexOf('.')!==-1){
				node.infer = {kind:'value', type:types.float}
				this.push_f32(node.value)
			}
			else {
				node.infer = {kind:'value', type:types.int}
			}
			// lets push our type
		}
	}
	
	//Identifier:{name:0},
	Identifier(node) {
		var name = node.name
		// we have to have it in scope
		//var id = this.scope[name]
		//this.text += this.mapId(name)
	}
		
	//ThisExpression:{},
	ThisExpression(node) {
	}
	
	//MemberExpression:{object:1, property:1, computed:0},
	MemberExpression(node) {
		var obj = node.object
		this[obj.type](obj)
		var prop = node.property
		
		if(node.computed) {
			this[prop.type](prop)
		}
		else {
			this[prop.type](prop)
		}
	}
	
	//CallExpression:{callee:1, arguments:2},
	CallExpression(node) {
		var callee = node.callee
		var args = node.arguments
		
		//if(this.traceMap) this.trace += '$T(' + this.traceMap.push(node)+','
		
		this[callee.type](callee)

		var argslen = args.length - 1
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			this[arg.type](arg)
		}
	}
	
	//NewExpression:{callee:1, arguments:2},
	NewExpression(node) {
		var callee = node.callee
		var args = node.arguments
		this.CallExpression(node)		
	}
	
	//ReturnStatement:{argument:1},
	ReturnStatement(node) {
		var arg = node.argument
		if(arg) {
			this[arg.type](arg)
		}
	}
	
	//FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	FunctionExpression(node) {
		return this.FunctionDeclaration(node)
	}
	
	//FunctionDeclaration: {id:1, params:2, expression:0, body:1},
	FunctionDeclaration(node, method) {
		var oldscope = this.scope
		this.scope = Object.create(this.scope)

		var id = node.id

		if(id) {
			var name = id.name
			if(!this.scope[name]){
			}
			if(node.generator) {
			}
		}
		else {
			if(!method) {
			}
			else {
			}
		}

		var params = node.params
		var paramslen = params.length - 1

		for(var i = 0;i <= paramslen;i++){
			var param = params[i]
			
			if(param.type === 'Identifier') {
				var name = param.name
				if(name.charAt(0)==='_'){
					this.scope[name] = name//'notouch'
					this.text += name
				}
				else{
					if(!this.scope[name]) this.scope[name] = this.scope['%']++
					this.text += this.mapId(name)
				}
			}
			else if(param.type === 'AssignmentPattern'){
				if(param.left.type === 'Identifier'){
					var name = param.left.name
					if(!this.scope[name]) this.scope[name] = this.scope['%']++
				}
				this[param.type](param)
			}
			else {
				if(param.type === 'RestElement') {
					var name = param.argument.name
					if(!this.scope[name]) this.scope[name] = this.scope['%']++
				}
				this[param.type](param)
			}
			if(i < paramslen) {
				this.text += ','
			}
		}
		this.text += ')'
		
		var body = node.body
		var ret = this[body.type](body)
		
		this.scope = oldscope
		return ret
	}
	
	//VariableDeclaration:{declarations:2, kind:0},
	VariableDeclaration(node) {
		var kind = node.kind
		var decls = node.declarations
		var declslen = decls.length - 1
		for(var i = 0;i <= declslen;i++){
			var decl = decls[i]
			this[decl.type](decl, kind)
			if(i !== declslen) {
			}
		}
	}
	
	//VariableDeclarator:{id:1, init:1},
	VariableDeclarator(node, kind) {
		var id = node.id
		
		if(id.type === 'Identifier') {
		}
		else this[id.type](id, path)
		
		var init = node.init
		if(init) {
			this[init.type](init)
		}
	}
	
	//LogicalExpression:{left:1, right:1, operator:0},
	LogicalExpression(node, path) {
		var left = node.left
		var right = node.right
		this[left.type](left)
		this[right.type](right)
		//this.text += node.operator
	}
	
	//BinaryExpression:{left:1, right:1, operator:0},
	BinaryExpression(node) {
		var left = node.left
		var right = node.right
		var op = node.operator
		this[left.type](left)
		this[right.type](right)
		if(op === '+') this.add_f32_f32()
		else if(op === '-') this.sub_f32_f32()
		else if(op === '*') this.mul_f32_f32()
		else if(op === '/') this.div_f32_f32()
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
		var left = node.left
		this[left.type](left)
		var right = node.right
		this[right.type](right)
		var body = node.body
		this[body.type](body)
	}
	
	//ForOfStatement:{left:1, right:1, body:1},
	ForOfStatement(node) {
		var left = node.left
		this[left.type](left)
		var right = node.right
		this[right.type](right)
		var body = node.body
		this[body.type](body)
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
		var arg = node.argument
		if(arg) {
			this[arg.type](arg)
		}
		else {
		}
	}
	
	//TryStatement:{block:1, handler:1, finalizer:1},
	TryStatement(node) {
		var block = node.block
		this[block.type](block)
		var handler = node.handler
		if(handler) {
			this[handler.type](handler)
		}
		var finalizer = node.finalizer
		if(finalizer) {
			this[finalizer.type](finalizer)
		}
	}
	
	//CatchClause:{param:1, body:1},
	CatchClause(node) {
		var param = node.param
		//if(!this.scope[param.name]) this.scope[param.name] = this.scope['%']++
		this[param.type](param)
		var body = node.body
		this[body.type](body)
	}
	
	//SpreadElement
	SpreadElement(node) {
		var arg = node.argument
		this[arg.type](arg)
	}
	
	//RestElement:{argument:1}
	RestElement(node) {
		var arg = node.argument
		this[arg.type](arg)
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
		logNonexisting(node)
	}
	
	
	//ObjectPattern:{properties:3},
	ObjectPattern(node) {
		this.ObjectExpression(node)
	}
	
	
	//ObjectPattern:{properties:3},
	ArrayPattern(node) {
		this.ArrayExpression(node)
	}
	
	// AssignmentPattern
	AssignmentPattern(node) {
		var left = node.left
		var right = node.right
		this[left.type](left)
		this[right.type](right)
	}
	
	
	//ArrowFunctionExpression:{params:2, expression:0, body:1},
	ArrowFunctionExpression(node) {
		//this.trace += '('
		if(!node.noParens) {
		}
		var params = node.params
		var paramslen = params.length - 1
		for(var i = 0;i <= paramslen;i++){
			var param = params[i]
			if(param.type === 'Identifier') {
				var name = param.name
				//if(!this.scope[name]) this.scope[name] = this.scope['%']++
			}
			else {
				if(param.type === 'RestElement') {
					var name = param.argument.name
					//if(!this.scope[name]) this.scope[name] = this.scope['%']++
				}
				this[param.type](param)
			}
		}
		//this.trace += ')'
		if(!node.noParens) {
		}
		var body = node.body
		this[body.type](body)
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
		var tag = node.tag
		this[tag.type](tag)
		var quasi = node.quasi
		this[quasi.type](quasi)
	}
	
	//TemplateElement:{tail:0, value:0},
	TemplateElement(node) {
		logNonexisting(node)
	}
	
	//TemplateLiteral:{expressions:2, quasis:2},
	TemplateLiteral(node) {
		var expr = node.expressions
		var quasis = node.quasis
		var qlen = quasis.length - 1
		//this.trace += '`'
		for(var i = 0;i <= qlen;i++){
			var raw = quasis[i].value.raw
			this.text += raw
			if(i !== qlen) {
				var exp = expr[i]
				this[exp.type](exp)
			}
		}
	}
	
	//ClassDeclaration:{id:1,superClass:1},
	ClassDeclaration(node) {
		//this.trace += 'class '
		var id = node.id
		if(id) {
			//this.scope[id.name] = 'class'
			this[id.type](id)
		}
		var base = node.superClass
		if(base) {
			this[base.type](base)
		}
		var body = node.body
		this[body.type](body)
	}
	
	//ClassExpression:{id:1,superClass:1},
	ClassExpression(node) {
		//this.trace += 'class '
		var id = node.id
		if(id) {
			this[id.type](id)
		}
		var base = node.superClass
		if(base) {
			this[base.type](base)
		}
		var body = node.body
		this[body.type](body)
	}
	
	//MethodDefinition:{value:1, kind:0, static:0},
	MethodDefinition(node) {
		var value = node.value
		var name = node.key.name
		if(node.static) {
		}
		var kind = node.kind
		if(kind === 'get' || kind === 'set') {
			var write = kind + ' '
		}
		this.FunctionDeclaration(value, path+'.'+name, name)
	}
	
	//ExportAllDeclaration:{source:1},
	ExportAllDeclaration(node) {
		logNonexisting(node)
	}
	
	//ExportDefaultDeclaration:{declaration:1},
	ExportDefaultDeclaration(node) {
		logNonexisting(node)
	}
	//ExportNamedDeclaration:{declaration:1, source:1, specifiers:2},
	ExportNamedDeclaration(node) {
		logNonexisting(node)
	}
	//ExportSpecifier:{local:1, exported:1},
	ExportSpecifier(node) {
		logNonexisting(node)
	}
	//ImportDeclaration:{specifiers:2, source:1},
	ImportDeclaration(node) {
		logNonexisting(node)
	}
	//ImportDefaultSpecifier:{local:1},
	ImportDefaultSpecifier(node) {
		logNonexisting(node)
	}
	//ImportNamespaceSpecifier:{local:1},
	ImportNamespaceSpecifier(node) {
		logNonexisting(node)
	}
	//ImportSpecifier:{imported:1, local:1},
	ImportSpecifier(node) {
		logNonexisting(node)
	}
	//DebuggerStatement:{},
	DebuggerStatement(node) {
		//this.trace += 'debugger'
		this.text += 'debugger'
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
		logNonexisting(node)
	}
}