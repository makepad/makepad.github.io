var logNonexisting = function(node) {
	console.log(node.type)
}

module.exports = class JSMinimizer extends require('base/class'){
	
	prototype() {
		this.glslGlobals = {$:1}
		for(var glslKey in require('base/infer').prototype.glsltypes)this.glslGlobals[glslKey] = 1
		for(var glslKey in require('base/infer').prototype.glslfunctions)this.glslGlobals[glslKey] = 1
		for(var glslKey in require('base/infer').prototype.glslvariables)this.glslGlobals[glslKey] = 1

		this.lut = [
			'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
			'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
		]
	}
	
	constructor(){
		super()
		this.idMap = {}	
		this.idAlloc = 1
	}
	

	jsASTStrip(ast, stripSet, path, source, stats){
		this.stats = stats
		this.source = source
		this.stripSet = stripSet
		this.tracePaths = null
		this.text = ''
		this.scope = Object.create(this.defaultScope)
		this.scope['%'] = 1

		// run the AST formatter
		this[ast.type](ast, path)
	}

	jsASTMinimize(ast, tracePaths, path, source, stats) {
		this.stats = stats
		this.source = source
		this.stripSet = null
		this.tracePaths = tracePaths
		this.text = ''
		this.scope = Object.create(this.defaultScope)
		this.scope['%'] = 1
		// run the AST formatter
		this[ast.type](ast, path)
	}
	
	newLine(){
		this.text += '\n'
	}

	//Program:{ body:2 },	
	Program(node, path) {
		this.BlockStatement(node, path, true)
		return
	}
	
	BlockStatement(node, path, noblk) {
		
		if(!noblk) this.text += '{'
		var start = 0
		if(this.tracePaths || this.stripSet){
			// if(this.stripSet && node.body.length>0 && 
			// 	node.body[0].type === 'ExpressionStatement' &&
			// 	node.body[0].expression.type === 'Identifier' && 
			// 	node.body[0].expression.name === '$'){
			// 	// skip it
			// 	this.text += '}'
			// 	return
			// }
			if(node.body.length>0 && 
				node.body[0].type === 'ExpressionStatement' &&
				node.body[0].expression.type === 'Identifier' && 
				node.body[0].expression.name === '$_'){
				// skip it
				start = 1
			}
			else{
				if(this.stripSet){
					if(!noblk && !this.stripSet.has(path)){
						this.text+='}'
						return true
					}
				}
				else {
					this.tracePaths[path] = node
					if(!noblk) this.text += '_$="'+path+'";'
				}
			}
		}
		//this.newLine()

		var body = node.body
		var bodylen = body.length - 1
		
		for(var i = start;i <= bodylen;i++){
			var statement = body[i]
			// declare function
			// declare variables
			if(statement.type === 'FunctionDeclaration') {
				this.scope[statement.id.name] = this.scope['%']++
			}
			if(statement.type === 'VariableDeclaration'){
				// put the vars on the scope
				var decls = statement.declarations
				var declslen = decls.length - 1
				for(var j = 0;j <= declslen;j++){
					var decl = decls[j]
					var id = decl.id
					if(id.type === 'Identifier') {
						this.scope[id.name] = this.scope['%']++
					}
				}
			}
			if(statement.type === 'ClassDeclaration'){
				var id = statement.id
				if(id) {
					this.scope[id.name] = this.scope['%']++
				}
			}
		}

		for(var i = start;i <= bodylen;i++){
			var statement = body[i]
		
			var ret = this[statement.type](statement, path+'['+i+']')
			if(!ret && i!==bodylen)this.newLine()	
		}
		if(!noblk) this.text += '}'
		//this.newLine()
	}

	
	//ArrayExpression:{elements:2},
	ArrayExpression(node, path) {
		this.text += '['

		var elems = node.elements
		var elemslen = elems.length - 1
		
		for(var i = 0;i <= elemslen;i++){
			var elem = elems[i]
			
			if(elem) {
				this[elem.type](elem, path+'['+i+']')
			}
			if(node.trail || i < elemslen) {
				this.text += ','
			}
		}
		
		this.text += ']'
	}
	
	//ObjectExpression:{properties:3},
	ObjectExpression(node, path) {
		this.text += '{'

		var props = node.properties
		var propslen = props.length - 1

		for(var i = 0;i <= propslen;i++){
			
			var prop = props[i]
			var key = prop.key
			
			this[key.type](key, path+'key', true)
			
			if(!prop.shorthand) {
				this.text += ':'
				var value = prop.value
				this[value.type](value, path+'['+i+']')
			}
			
			if(node.trail || i < propslen) {
				this.text += ','
			}
		}
		
		this.text += '}'
	}
	
	//ClassBody:{body:2},
	ClassBody(node, path) {

		this.text += '{'
		this.newLine()

		var body = node.body
		var bodylen = body.length - 1
		for(var i = 0;i <= bodylen;i++){
			var method = body[i]
			if(!this[method.type](method, path+'['+i+']'))
				this.newLine()
		}
		this.text += '}'
		//this.newLine()
	}
	
	//EmptyStatement:{}
	EmptyStatement(node, path) {
		console.log(node)
	}
	
	//ExpressionStatement:{expression:1},
	ExpressionStatement(node, path) {
		var exp = node.expression
		this[exp.type](exp, path)
	}
	
	//SequenceExpression:{expressions:2}
	SequenceExpression(node, path) {
		
		var exps = node.expressions
		var expslength = exps.length - 1
		for(var i = 0;i <= expslength;i++){
			var exp = exps[i]
			if(exp) this[exp.type](exp, path+'['+i+']')
			if(i < expslength) {
				this.text += ','
			}
		}
	}
	
	//ParenthesizedExpression:{expression:1}
	ParenthesizedExpression(node, path) {
		var exp = node.expression
		this.text += '('
		this[exp.type](exp, path)
		this.text += ')'
	}
	
	//Literal:{raw:0, value:0},
	Literal(node, path) {
		this.text += node.raw
	}
	
	//Identifier:{name:0},
	Identifier(node, path, skip) {
		var name = node.name
		if(skip){
			this.text += name
			return
		}
		// we have to have it in scope
		var id = this.scope[name]
		if(typeof id === 'string'){
			this.text += name
			return
		}
		if(!id){
			if(this.glslGlobals[name]){
				this.text += name
				return
			}
			if(name.charCodeAt(0) === 36){
				this.text += name
				return
			}
			console.error("CANNOT FIND",name,this.source.slice(node.start -50, node.start+50))
			//console.error("CANNOT FIND"+name, this.source)
			return 
		}
		this.text += this.mapId(name)
	}
		
	mapId(name){
		var id = this.scope[name]
		var str = ''
		while(id){
			var step = id%(this.lut.length-1)
			str += this.lut[step]
			id = floor(id/this.lut.length)
		}
		return str
	}

	//ThisExpression:{},
	ThisExpression(node, path) {
		this.text += 'this'
	}
	
	//MemberExpression:{object:1, property:1, computed:0},
	MemberExpression(node, path) {
		var obj = node.object
		this[obj.type](obj)
		var prop = node.property
		
		if(node.computed) {
			this.text += '['
			this[prop.type](prop, path+'[]')
			this.text += ']'
		}
		else {
			this.text += '.'
			if(prop.type === 'Identifier' && this.stats){
				if(!this.stats[prop.name]) this.stats[prop.name] = 1
				else this.stats[prop.name]++
				// if(this.stripSet){
				// 	this.text += this.lut[Math.random()*this.lut.length|0]
				// 	return 
				// }
			}
			this[prop.type](prop, path+'.', true)
		}
	}
	
	//CallExpression:{callee:1, arguments:2},
	CallExpression(node, path) {
		var callee = node.callee
		var args = node.arguments
		
		//if(this.traceMap) this.trace += '$T(' + this.traceMap.push(node)+','
		
		this[callee.type](callee, path+'()')
		this.text += '('

		var argslen = args.length - 1
		
		for(var i = 0;i <= argslen;i++){
			var arg = args[i]
			this[arg.type](arg, path+'['+i+']')
			if(i < argslen) {
				this.text += ','
			}
		}
		this.text += ')'
	}
	
	//NewExpression:{callee:1, arguments:2},
	NewExpression(node, path) {
		var callee = node.callee
		var args = node.arguments
		this.text += 'new '
		this.CallExpression(node, path+'new')		
	}
	
	//ReturnStatement:{argument:1},
	ReturnStatement(node, path) {
		var arg = node.argument
		if(arg) {
			this.text += 'return '
			this[arg.type](arg, path+'ret')
		}
		else {
			this.text += 'return'
		}
	}
	
	//FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	FunctionExpression(node, path) {
		return this.FunctionDeclaration(node, path)
	}
	
	//FunctionDeclaration: {id:1, params:2, expression:0, body:1},
	FunctionDeclaration(node, path, method) {
		var oldscope = this.scope
		this.scope = Object.create(this.scope)

		var id = node.id

		if(id) {
			var name = id.name
			if(!this.scope[name]){
				this.scope[name] = this.scope['%']++
			}

			this.text += 'function '
			if(node.generator) {
				this.text += '*'
			}
			this.text += this.mapId(name)
		}
		else {
			if(!method) {
				this.text += 'function'
			}
			else {
				this.text += method
			}
		}
		this.text += '('
		
		var params = node.params
		var paramslen = params.length - 1

		for(var i = 0;i <= paramslen;i++){
			var param = params[i]
			
			if(param.type === 'Identifier') {
				var name = param.name
				if(name.charAt(0)==='_'){
					this.scope[name] = 'notouch'
					this.text += name
				}
				else{
					this.scope[name] = this.scope['%']++
					this.text += this.mapId(name)
				}
			}
			else if(param.type === 'AssignmentPattern'){
				if(param.left.type === 'Identifier'){
					var name = param.left.name
					this.scope[name] = this.scope['%']++
				}
				this[param.type](param, path+'('+i+')')
			}
			else {
				if(param.type === 'RestElement') {
					this.scope[param.argument.name] = 'arg'
				}
				this[param.type](param, path+'('+i+')')
			}
			if(i < paramslen) {
				this.text += ','
			}
		}
		this.text += ')'
		
		var body = node.body
		var ret = this[body.type](body, path+'{}')
		
		this.scope = oldscope
		return ret
	}
	
	//VariableDeclaration:{declarations:2, kind:0},
	VariableDeclaration(node, path) {
		var kind = node.kind

		this.text += kind + ' '

		var decls = node.declarations
		var declslen = decls.length - 1
		for(var i = 0;i <= declslen;i++){
			var decl = decls[i]
			this[decl.type](decl, path+'var['+i+']', kind)
			if(i !== declslen) {
				this.text += ','
			}
		}
	}
	
	//VariableDeclarator:{id:1, init:1},
	VariableDeclarator(node, path, kind) {
		var id = node.id
		
		if(id.type === 'Identifier') {
			if(!this.scope[id.name]) this.scope[id.name] = this.scope['%']++
			this.text += this.mapId(id.name)
		}
		else this[id.type](id, path)
		
		var init = node.init
		if(init) {
			this.text += '='
			this[init.type](init, path+'=')
		}
	}
	
	//LogicalExpression:{left:1, right:1, operator:0},
	LogicalExpression(node, path) {
		var left = node.left
		var right = node.right
		this[left.type](left,path+'L')
		this.text += node.operator
		this[right.type](right,path+'R')
	}
	
	//BinaryExpression:{left:1, right:1, operator:0},
	BinaryExpression(node, path) {
		var left = node.left
		var right = node.right
		var op = node.operator
		if(op === 'in') op = ' in '
		if(op === 'instanceof') op = ' instanceof '
		this[left.type](left,path+'L')
		this.text += op
		this[right.type](right,path+'R')
	}
	
	//AssignmentExpression: {left:1, operator:0, right:1},
	AssignmentExpression(node, path) {
		var old = this.text
		var left = node.left
		var right = node.right
		var lefttype = left.type
		this[lefttype](left,path+'L')
		this.text += node.operator
		if(this[right.type](right,path+'R')){
			this.text = old
			return true
		}
	}
	
	//ConditionalExpression:{test:1, consequent:1, alternate:1},
	ConditionalExpression(node, path) {
		var test = node.test
		this[test.type](test,path+'T')
		this.text += '?'
		var cq = node.consequent
		this[cq.type](cq,path+'?')
		this.text += ':'
		var alt = node.alternate
		this[alt.type](alt,path+':')
	}
		
	//UnaryExpression:{operator:0, prefix:0, argument:1},
	UnaryExpression(node, path) {
		if(node.prefix) {
			var op = node.operator
			if(op.length > 1) op = op + ' '
			this.text += op
			var arg = node.argument
			var argtype = arg.type
			this[argtype](arg,path+op)
		}
		else {
			var arg = node.argument
			var argtype = arg.type
			var op = node.operator
			this[argtype](arg,path+op)
			this.text += op
		}
	}
	
	//UpdateExpression:{operator:0, prefix:0, argument:1},
	UpdateExpression(node, path) {
		if(node.prefix) {
			var op = node.operator
			this.text += op
			var arg = node.argument
			var argtype = arg.type
			this[argtype](arg,path+op)
		}
		else {
			var arg = node.argument
			var argtype = arg.type
			var op = node.operator
			this[argtype](arg,path+op)
			this.text += op
		}
	}
	
	//IfStatement:{test:1, consequent:1, alternate:1},
	IfStatement(node, path) {
		var old = this.text
		this.text += 'if('

		var test = node.test
		this[test.type](test,path+'if')
		
		this.text += ')'
		var cq = node.consequent
		var alt = node.alternate

		if(this[cq.type](cq,path+'cons') && !alt){
			this.text = old
			return true
		}

		if(alt) {
			this.text += '\nelse '
			this[alt.type](alt,path+'alt')
		}
	}
	
	//ForStatement:{init:1, test:1, update:1, body:1},
	ForStatement(node, path) {
		this.text += 'for('
		var init = node.init
		if(init) this[init.type](init,path+'init')
		this.text += ';'
		var test = node.test
		if(test) this[test.type](test,path+'test')
		this.text += ';'
		var update = node.update
		if(update) this[update.type](update,path+'up')
		this.text += ')'
		var body = node.body
		this[body.type](body,path+'for')
	}
	
	//ForInStatement:{left:1, right:1, body:1},
	ForInStatement(node, path) {
		var left = node.left
		this.text += 'for('
		this[left.type](left,path+'inL')
		this.text += ' in '
		var right = node.right
		this[right.type](right,path+'inR')
		this.text += ')'
		var body = node.body
		this[body.type](body,path+'for')
	}
	
	//ForOfStatement:{left:1, right:1, body:1},
	ForOfStatement(node, path) {
		var left = node.left
		this.text += 'for('
		this[left.type](left,path+'ofL')
		this.text += ' of '
		var right = node.right
		this[right.type](right,path+'ofR')
		this.text += ')'
		var body = node.body
		this[body.type](body,path+'for')
	}
	
	//WhileStatement:{body:1, test:1},
	WhileStatement(node, path) {
		this.text += 'while('
		var test = node.test
		this[test.type](test,path+'test')
		this.text += ')'
		var body = node.body
		this[body.type](body,path+'while')
	}
	
	//DoWhileStatement:{body:1, test:1},
	DoWhileStatement(node, path) {
		this.text += 'do'
		var body = node.body
		this[body.type](body,path+'do')
		this.text += 'while('
		var test = node.test
		this[test.type](test,path+'test')
		this.text += ')'
	}
	
	//BreakStatement:{label:1},
	BreakStatement(node, path) {
		if(node.label) {
			var label = node.label
			this.text += 'break '
			this[label.type](label,path+'break', true)
		}
		else {
			this.text += 'break'
		}
	}
	
	//ContinueStatement:{label:1},
	ContinueStatement(node, path) {
		if(node.label) {
			var label = node.label
			this.text += 'continue '
			this[label.type](label,path+'cont', true)
		}
		else {
			this.text += 'continue'
		}
	}
	
	//YieldExpression:{argument:1, delegate:0}
	YieldExpression(node, path) {
		var arg = node.argument
		if(arg) {
			this.text += 'yield '
			if(node.delegate) {
				this.text += '*'
			}
			this[arg.type](arg,path+'yield')
		}
		else {
			this.text += 'yield'
		}
	}
	
	//ThrowStatement:{argument:1},
	ThrowStatement(node, path) {
		var arg = node.argument
		if(arg) {
			this.text += 'throw '
			this[arg.type](arg,path+'throw')
		}
		else {
			this.text += 'throw'
		}
	}
	
	//TryStatement:{block:1, handler:1, finalizer:1},
	TryStatement(node, path) {
		this.text += 'try'
		var block = node.block
		this[block.type](block,path+'try')
		var handler = node.handler
		if(handler) {
			this[handler.type](handler,path+'handle')
		}
		var finalizer = node.finalizer
		if(finalizer) {
			this.text += 'finally'
			this[finalizer.type](finalizer,path+'fin')
		}
	}
	
	//CatchClause:{param:1, body:1},
	CatchClause(node, path) {
		this.text += 'catch('
		var param = node.param
		if(!this.scope[param.name]) this.scope[param.name] = this.scope['%']++
		this[param.type](param,path+'param')
		this.text += ')'
		var body = node.body
		this[body.type](body,path+'catch')
	}
	
	//SpreadElement
	SpreadElement(node, path) {
		this.text += '...'
		var arg = node.argument
		this[arg.type](arg,path+'spr')
	}
	
	//RestElement:{argument:1}
	RestElement(node, path) {
		this.text += '...'
		var arg = node.argument
		this[arg.type](arg,path+'rest')
	}
	
	//Super:{},
	Super(node, path) {
		this.text += 'super'
	}
	
	//AwaitExpression:{argument:1},
	AwaitExpression(node, path) {
		logNonexisting(node)
	}
	
	//MetaProperty:{meta:1, property:1},
	MetaProperty(node, path) {
		logNonexisting(node)
	}
	
	
	//ObjectPattern:{properties:3},
	ObjectPattern(node, path) {
		this.ObjectExpression(node)
	}
	
	
	//ObjectPattern:{properties:3},
	ArrayPattern(node, path) {
		this.ArrayExpression(node)
	}
	
	// AssignmentPattern
	AssignmentPattern(node, path) {
		var left = node.left
		var right = node.right
		this[left.type](left,path+'L=')
		this.text += '='
		this[right.type](right,path+'R=')
	}
	
	
	//ArrowFunctionExpression:{params:2, expression:0, body:1},
	ArrowFunctionExpression(node, path) {
		//this.trace += '('
		if(!node.noParens) {
			this.text += '('
		}
		var params = node.params
		var paramslen = params.length - 1
		for(var i = 0;i <= paramslen;i++){
			var param = params[i]
			if(param.type === 'Identifier') {
				var name = param.name
				this.scope[name] = 'arg'
				this.text += name
			}
			else {
				if(param.type === 'RestElement') {
					this.scope[param.argument.name] = 'arg'
				}
				this[param.type](param,path+'('+i+')')
			}
			if(i < paramslen) {
				this.text +=','
			}
		}
		//this.trace += ')'
		if(!node.noParens) {
			this.text += ')'
		}
		this.text += '=>'
		var body = node.body
		this[body.type](body,path+'{}')
	}
	
	//SwitchStatement:{discriminant:1, cases:2},
	SwitchStatement(node, path) {
		this.text += 'switch('
		var disc = node.discriminant
		this[disc.type](disc,path+'disc')
		this.text += '){\n'
		var cases = node.cases
		var caseslen = cases.length
		for(var i = 0;i < caseslen;i++){
			var cas = cases[i]
			this[cas.type](cas,path+'case'+i)
		}
		this.text += '\n}'	
	}

	//SwitchCase:{test:1, consequent:2},
	SwitchCase(node, path) {
		var test = node.test
		if(!test) {
			this.text += 'default'
		}
		else {
			this.text += 'case '
			this[test.type](test,path+'test')
		}
		this.text += ':'
		var cqs = node.consequent
		var cqlen = cqs.length
		for(var i = 0;i < cqlen;i++){
			var cq = cqs[i]
			if(cq) this[cq.type](cq,path+'['+i+']')
			this.newLine()
		}
	}
	
	//TaggedTemplateExpression:{tag:1, quasi:1},
	TaggedTemplateExpression(node, path) {
		var tag = node.tag
		this[tag.type](tag,path+'tag')
		var quasi = node.quasi
		this[quasi.type](quasi,path+'qua')
	}
	
	//TemplateElement:{tail:0, value:0},
	TemplateElement(node, path) {
		logNonexisting(node)
	}
	
	//TemplateLiteral:{expressions:2, quasis:2},
	TemplateLiteral(node, path) {
		var expr = node.expressions
		var quasis = node.quasis
		var qlen = quasis.length - 1
		//this.trace += '`'
		this.text += '`'
		for(var i = 0;i <= qlen;i++){
			var raw = quasis[i].value.raw
			this.text += raw
			if(i !== qlen) {
				this.text += '${'
				var exp = expr[i]
				this[exp.type](exp,path+'['+i+']')
				this.text += '}'
			}
		}
		this.text += '`'
	}
	
	//ClassDeclaration:{id:1,superClass:1},
	ClassDeclaration(node, path) {
		//this.trace += 'class '
		this.text += 'class '
		var id = node.id
		if(id) {
			//this.scope[id.name] = 'class'
			this[id.type](id,path+'cls')
		}
		var base = node.superClass
		if(base) {
			this.text += ' extends '
			this[base.type](base, path+'ext')
		}
		var body = node.body
		this[body.type](body, path+'body')
	}
	
	//ClassExpression:{id:1,superClass:1},
	ClassExpression(node, path) {
		//this.trace += 'class '
		this.text += 'class '
		var id = node.id
		if(id) {
			//this.scope[id.name] = 'class'
			this[id.type](id, path+'cls', true)
		}
		var base = node.superClass
		if(base) {
			this.text += ' extends '
			this[base.type](base, path+'ext')
		}
		var body = node.body
		this[body.type](body, path+'body')
	}
	
	//MethodDefinition:{value:1, kind:0, static:0},
	MethodDefinition(node, path) {
		var value = node.value
		var name = node.key.name
		var old = this.text
		if(node.static) {
			this.text += 'static '
		}
		var kind = node.kind
		if(kind === 'get' || kind === 'set') {
			var write = kind + ' '
			this.text += write
		}
		if(this.FunctionDeclaration(value, path+'.'+name, name)){
			this.text = old
			return true
		}
	}
	
	//ExportAllDeclaration:{source:1},
	ExportAllDeclaration(node, path) {
		logNonexisting(node)
	}
	
	//ExportDefaultDeclaration:{declaration:1},
	ExportDefaultDeclaration(node, path) {
		logNonexisting(node)
	}
	//ExportNamedDeclaration:{declaration:1, source:1, specifiers:2},
	ExportNamedDeclaration(node, path) {
		logNonexisting(node)
	}
	//ExportSpecifier:{local:1, exported:1},
	ExportSpecifier(node, path) {
		logNonexisting(node)
	}
	//ImportDeclaration:{specifiers:2, source:1},
	ImportDeclaration(node, path) {
		logNonexisting(node)
	}
	//ImportDefaultSpecifier:{local:1},
	ImportDefaultSpecifier(node, path) {
		logNonexisting(node)
	}
	//ImportNamespaceSpecifier:{local:1},
	ImportNamespaceSpecifier(node, path) {
		logNonexisting(node)
	}
	//ImportSpecifier:{imported:1, local:1},
	ImportSpecifier(node, path) {
		logNonexisting(node)
	}
	//DebuggerStatement:{},
	DebuggerStatement(node, path) {
		//this.trace += 'debugger'
		this.text += 'debugger'
	}
	//LabeledStatement:{label:1, body:1},
	LabeledStatement(node, path) {
		var label = node.label
		this[label.type](label, path+'label', true)
		this.text += ':'
		var body = node.body
		this[body.type](body, path+'body')
	}
	// WithStatement:{object:1, body:1}
	WithStatement(node, path) {
		logNonexisting(node)
	}
}