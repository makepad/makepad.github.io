module.exports = require('class').extend(function ShaderGen(){
	
	var types  = require('types')
	var parser = require('jsparser/jsparser')

	var parsecache = {}
	var painter = require('painter')

	this.constructor.generateGLSL = function(root, fn, varyin, mapexception){
		
		var gen = new this()

		// the attributes found
		gen.attributes = {}
		// the props found
		gen.props = {}

		// all uniforms found
		gen.uniforms = {}
		// all structs used
		gen.structs = {}
		//  varyings found
		gen.varyout = {}
		// varying inputs
		gen.varyin = varyin

		// outputs used
		gen.outputs = {}

		// functions generated
		gen.generatedfns = {}

		// the function object info of the current function
		var sourcecode = fn.toString()
		gen.currentfn = {
			inout:{},
			scope:{},
			callee:fn,
			sourcecode:sourcecode
		}
		// textures used
		gen.textures = {}
		// do our indentation
		gen.indent = '\t'
	
		gen.root = root

		gen.ctxprefix = ''
		gen.context = root

		var ast = parsecache[sourcecode] || (parsecache[sourcecode] = parser.parse(sourcecode))

		if(mapexception){ // very ugly.
			try{
				gen.main = gen.block(ast.body[0].body.body)
			}
			catch(error){
				// lets get this to the right file/line
				// first of all we need to grab the current function
				var state = error.state
				var curfn = state.currentfn
				try{
					curfn.callee()
				}
				catch(efn){
					// ok lets parse out the line offset of this thing
					var stack = efn.stack.toString()
					var fileerr = efn.stack.slice(stack.indexOf('(')+1, stack.indexOf(')'))
					var filename = fileerr.slice(0, fileerr.indexOf('.js:')+3)
					var lineoff = parseInt(fileerr.slice(fileerr.indexOf('.js:')+4, fileerr.lastIndexOf(':')))
					// alright we have a lineoff, now we need to take the node
					var lines = curfn.sourcecode.split('\n')
					// lets count the linenumbers
					var node = error.node
					var off = 0, realcol = 0
					for(var line = 0; line < lines.length; line++){
						if(off >= node.start){
							realcol = off - node.start - 3
							break
						}
						off += lines[line].length + 1
					}
					var realline = line + lineoff - 1
					if(curfn.sourcecode.indexOf('{$') === -1) realline+='(missing $ after { for linenumbers)'
					console.error(
						filename+':'+realline+':'+realcol, error.type + ': '+ error.message
					)
				}			
			}
		}
		else{
			gen.main = gen.block(ast.body[0].body.body)
		}

		return gen
	}

	this.walk = function(node, parent){
		node.parent = parent
		node.infer = undefined
		var typefn = this[node.type]
		if(!typefn) throw this.SyntaxErr(node, 'Type not found ' + node.type)
		return typefn.call(this,node)
	}

	this.block = function(array, parent){
		var ret = ''
		for(var i = 0; i < array.length; i++){
			var line = this.walk(array[i], parent)
			if(line.length) ret += this.indent + line + ';'
			if(ret.charCodeAt(ret.length - 1) !== 10) ret += '\n'
		}
		return ret
	}
	
	this.Program = function(node){
		// ok lets fetch the first function declaration if we have one
		return this.block(node.body, node)
	}

	this.BlockStatement = function(node){
		var oi = this.indent
		this.indent += '\t'
		var ret = '{\n'
		ret += this.block(node.body, node)
		this.indent = oi
		ret += this.indent + '}'
		return ret
	}

	//EmptyStatement:{}
	this.EmptyStatement = function(node){
		return ''
	}

	//ExpressionStatement:{expression:1},
	this.ExpressionStatement = function(node){
		return this.walk(node.expression, node)
	}

	//SequenceExpression:{expressions:2}
	this.SequenceExpression = function(node){
		var ret = ''
		var exps = node.expressions
		for(var i = 0; i < exps.length; i++){
			var exp = exps[i]
			if(i) i += ', '
			ret += this.walk(exp, node)
		}
		return ret
	}

	//ParenthesizedExpression:{expression:1}
	this.ParenthesizedExpression = function(node){
		var ret = '(' + this.walk(node.expression, node) + ')'
		node.infer = node.expression.infer
		return ret
	}

	//Literal:{raw:0, value:0},
	this.Literal = function(node){
		var infer = {
			kind:'value'
		}
		node.infer = infer
		if(node.kind === 'regexp') throw this.SyntaxErr(node,'Cant use regexps in shaders')
		if(node.kind === 'string'){
			infer.type = types.vec4
			// return the parsed color!
			return 'vec4(0.,0.,0.,0.)'
		}
		if(node.kind === 'num'){
			if(node.raw.indexOf('.') !== -1){
				infer.type = types.float
				return node.raw
			}
			infer.type = types.int
			return node.raw
		}
		throw this.SyntaxErr(node,'Unknown literal kind'+node.kind)
	}

	this.mapObjectProperty = function(node, name, value, prefix){

		// its a function
		if(typeof value === 'function'){
			node.infer = {
				kind: 'function',
				name: prefix + name,
				prefix: prefix,
				callee: value
			}
			return name
		}

		if(typeof value === 'string'){
			var ret = prefix + name
			this.uniforms[ret] = {
				type:types.vec4,
				name:name
			}
			node.infer = {
				kind:'value',
				type:types.vec4
			}
			return ret
		}

		if(Array.isArray(value)){
			console.log("FIX ARRAY UNIFORMS")
			return name
		}

		if(typeof value === 'number'){
			var ret = prefix + name
			this.uniforms[ret] = {
				type:types.float,
				name:name
			}
			node.infer = {
				kind:'value',
				type:types.float
			}
			return ret
		}

		else if(typeof value === 'boolean'){ 
			var ret = prefix + name
			this.uniforms[ret] = {
				type:types.bool,
				name:name
			}
			node.infer = {
				kind:'value',
				type:types.bool
			}
			return ret
		}

		if(typeof value === 'object'){
	
			// its a typed uniform!
			if(value._name){
				var ret = prefix + name
				this.uniforms[ret] = {
					type:value,
					name:name
				}
				node.infer = {
					kind:'value',
					type:value
				}
				return ret
			}
			
			// check if its a mesh attribute
			if(value instanceof painter.Mesh){
				proptype = value.struct
				var ret = prefix + name
				this.attributes[ret] = {
					kind:'attribute',
					type:proptype,
					name:name
				}

				node.infer = {
					kind:'value',
					type:proptype
				}
				return ret
			}

			// its a library object
			node.infer = {
				kind: 'object',
				prefix: prefix + name + "_DOT_",
				object: value
			}
			return name
		}
	}

	//Identifier:{name:0},
	this.Identifier = function(node){
		var name = node.name

		if(name === '$') return ''
		if(name === '$CALCULATETWEEN') return name

		// first we check the scope
		var scopeinfer = this.currentfn.scope[name]

		if(scopeinfer){
			node.infer = scopeinfer
			return name
		}

		// native functions
		var glslfn = this.glslfunctions[name]
		if(glslfn){
			node.infer = {
				kind: 'function',
				glsl: name,
				callee: glslfn
			}
			return name
		}

		// then we check the native types
		var glsltype = this.glsltypes[name]
		if(glsltype){
			node.infer = {
				kind: 'type',
				type: glsltype
			}
			return name
		}

		if(name === 'vary' || name === 'props' || name === 'out'){
			node.infer = {
				kind:name
			}
			return name
		}

		// check defines
		var defstr = this.context._defines && this.context._defines[name] || this.root._defines && this.root._defines[name]
		if(defstr){ // expand the define

		}

		// struct on context
		var structtype = this.context._structs && this.context._structs[name]
		if(structtype){ // return struct
			node.infer = {
				kind: 'type',
				type: structtype
			}
			return this.ctxprefix + name
		}
		// struct on root
		structtype = this.root._structs && this.root._structs[name]
		if(structtype){ // return struct
			node.infer = {
				kind: 'type',
				type: structtype
			}
			return name
		}

		// lets check on our context
		var value = this.context[name]
		if(value !== undefined)	return this.mapObjectProperty(node, name, value, this.ctxprefix)

		if(!value) value = this.root[name]
		if(value !== undefined)	return this.mapObjectProperty(node, name, value, '')
	
		// otherwise type it
		throw this.ResolveErr(node, 'Cannot resolve '+name)
	}

	// the swizzle lookup tables
	var swiz1 = {pick:{120:0,114:1,115:2,}, set:[{120:1},{114:1},{115:1}]}
	var swiz2 = {pick:{120:0, 121:0, 114:1, 103:1, 115:2, 116:2}, set:[{120:1, 121:1}, {114:1, 103:1}, {115:1, 116:1}]}
	var swiz3 = {pick:{120:0, 121:0, 122:0, 114:1, 103:1, 98:1, 115:2, 116:2, 117:2}, set:[{120:1, 121:1, 122:1}, {114:1, 103:1, 98:1}, {115:1, 116:1, 117:1}]}
	var swiz4 = {pick:{120:0, 121:0, 122:0, 119:0, 114:1, 103:1, 98:1, 97:1, 115:2, 116:2, 117:2, 118:2}, set:[{120:1, 121:1, 122:1, 119:1}, {114:1, 103:1, 98:1, 97:1}, {115:1, 116:1, 117:1, 118:1}]}
	var swizlut = {float:swiz1, int:swiz1, bool:swiz1,vec2:swiz2, ivec2:swiz2, bvec2:swiz2,vec3:swiz3, ivec3:swiz3, bvec3:swiz3,vec4:swiz4, ivec4:swiz4, bvec4:swiz4}
	var swiztype = {float:'vec', int:'ivec', bool:'bvec',vec2:'vec', ivec2:'ivec', bvec2:'bvec',vec3:'vec', ivec3:'ivec', bvec3:'bvec',vec4:'vec', ivec4:'ivec', bvec4:'bvec'}
	var swizone = {float:'float', int:'int', bool:'bool',vec2:'float', ivec2:'int', bvec2:'bool',vec3:'float', ivec3:'int', bvec3:'bool',vec4:'float', ivec4:'int', bvec4:'bool'}

	//MemberExpression:{object:1, property:types.gen, computed:0},
	this.MemberExpression = function(node){
		// just chuck This
		if(node.object.type === 'ThisExpression'){
			var ret = this.walk(node.property)
			node.infer = node.property.infer
			return ret
		}

		var objectstr = this.walk(node.object, node)

		if(node.computed){
			if(node.object.infer.kind !== 'value'){
				throw new this.InferErr(node, 'cannot use index[] on non value type')
			}
			return console.error('implement node.computed')
		}
		else{
			var objectinfer = node.object.infer
			var propname = node.property.name

			if(objectinfer.kind === 'value'){
				var type = objectinfer.type
				var proptype = type[propname]
				if(!proptype){ // do more complicated bits
					// check swizzling or aliases
					var proplen = propname.length
					if(proplen < 1 || proplen > 4) throw this.InferErr(node, 'Invalid property '+objectstr+'.'+propname)
					var typename = type._name

					proptype = types[proplen === 1? swizone[typename]: (swiztype[typename] + proplen)]

					var swiz = swizlut[typename]
					if(!swiz) throw this.InferErr(node, 'Invalid swizzle '+objectstr+'.'+propname)
					for(var i = 0, set = swiz.set[swiz.pick[propname.charCodeAt(0)]]; i < proplen; i++){
						if(!set || !set[propname.charCodeAt(i)]) throw this.InferErr(node, 'Invalid swizzle '+objectstr+'.'+propname)
					}
				}
				// look up property propname
				node.infer = {
					kind:'value',
					lvalue:objectinfer.lvalue, // propagate lvalue-ness
					type:proptype
				}
				return objectstr + '.' + propname
			}
			else if(objectinfer.kind === 'props'){
				var props = this.root._props
				var config = props[propname]
				if(config === undefined || config.value === undefined){
					throw this.InferErr(node, 'cant find props.'+propname)
				}
				var value = config.value
				var proptype = types.typeFromValue(value)
				var ret = 'props_DOT_'+propname

				this.props[ret] = {
					type:proptype,
					name:propname,
					config:config
				}

				node.infer = {
					kind:'value',
					type:proptype
				}

				return ret
			}
			else if(objectinfer.kind === 'object'){
				var value = objectinfer.object[propname]
				return this.mapObjectProperty(node, propname, value, objectinfer.prefix)
			}
			else if(objectinfer.kind === 'out'){
				var ret = 'out_DOT_'+propname
				// its already defined
				var prev = this.outputs[ret]
				if(prev){
					node.infer = {
						kind: 'value',
						lvalue:true,
						type: prev
					}
				}
				else{
					node.infer = {
						kind: 'outundef',
						lvalue:true,
						name: propname
					}
				}
				// lets check if node.infer holds property
				return ret
			}
			else if(objectinfer.kind === 'vary'){
				var ret = 'vary_DOT_'+propname
				// its already defined
				var prev = this.varyout[ret] || this.varyin && this.varyin[ret]
				if(prev){
					this.varyout[ret] = prev
					node.infer = {
						kind: 'value',
						lvalue:true,
						type: prev
					}
				}
				else{
					node.infer = {
						kind: 'varyundef',
						lvalue:true,
						name: propname
					}
				}
				// lets check if node.infer holds property
				return ret
			}		
			throw this.InferErr(node, 'Cant determine type for '+objectstr+'.'+propname)
		}
	}

	//CallExpression:{callee:1, arguments:2},
	this.CallExpression = function(node){
		var calleestr = this.walk(node.callee, node)
		var callee = node.callee
		var calleeinfer = node.callee.infer

		var args = node.arguments
		var argstrs = []

		for(var i = 0; i < args.length; i++){
			argstrs.push(this.walk(args[i], node))
		}

		if(calleeinfer.kind === 'type'){
			node.infer = {
				kind:'value',
				type:calleeinfer.type
			}
			return calleestr + '(' +argstrs.join(', ')+')'
		}
		else if(calleeinfer.kind === 'function' ){
			if(calleeinfer.glsl){	// check the args
				var fnname = calleeinfer.glsl
				var glslfn = this.glslfunctions[fnname]

				var gentype
				var params = glslfn.params

				for(var i = 0; i < args.length; i++){
					var arg = args[i]
					var param = params[i]

					if(param.type === types.gen){
						gentype = arg.infer.type
					}
					else if(arg.infer.type !== param.type){
						// barf
						throw this.InferErr(arg, "GLSL Builtin wrong arg " +fnname+' arg '+i+' -> ' +param.name)
					}
				}

				node.infer = {
					kind: 'value',
					type: glslfn.return === types.gen? gentype: glslfn.return
				}

				return fnname + '(' + argstrs.join() + ')'
			}
			// expand function macro
			var sourcecode = calleeinfer.callee.toString()

			// parse it, should never not work since it already parsed 
			try{
				var ast = parsecache[sourcecode] || (parsecache[sourcecode] = parser.parse(sourcecode))
			}
			catch(e){
				throw this.SyntaxErr(node, "Cant parse function " + sourcecode)
			}
			
			// lets build the function name
			var fnname = calleeinfer.name
			var realargs = []
			fnname += '_T'
			for(var i = 0; i < args.length; i++){
				var arg = args[i]
				var arginfer = arg.infer
				if(arginfer.kind === 'value'){
					fnname += '_' +arginfer.type._name
					realargs.push(argstrs[i])
				}
				else if(arginfer.kind === 'function'){ // what do we do?...
					fnname += '_' + arginfer.name
				}
				else throw this.SyntaxErr(node, "Cant use " +arginfer.kind+" as a function argument") 
			}

			var prevfunction = this.generatedfns[fnname]

			if(prevfunction){
				var params = prevfunction.ast.body[0].params
				for(var i = 0; i < args.length; i++){
					// write the args on the scope
					var arg = args[i]
					var arginfer = arg.infer
					var name = params[i].name
					if(arginfer.kind === 'value'){
						if(prevfunction.inout[name] && !arginfer.lvalue){
							throw this.InferErr(arg, "Function arg is inout but argument is not a valid lvalue: " +name)
						}
					}
				}
				node.infer = {
					kind: 'value',
					type: prevfunction.return.type
				}
				return fnname + '(' + realargs.join() + ')'
			}
			
			var subfunction = this.generatedfns[fnname] = {
				scope:{},
				inout:{},
				sourcecode:sourcecode,
				callee:calleeinfer.callee,
				return:{
					kind:'value',
					type:types.void
				}
			}

			var sub = Object.create(this)

			if(!ast.body || !ast.body[0] || ast.body[0].type !== 'FunctionDeclaration'){
				throw this.SyntaxErr(node, "Not a function")
			}
			subfunction.ast = ast

			// we have our args, lets process the function declaration
			// make a new scope
			sub.indent = ''
			sub.currentfn = subfunction
			sub.ctxprefix = calleeinfer.prefix

			var params = ast.body[0].params
			var paramdef = ''
			if(args.length !== params.length){
				throw this.SyntaxErr(node, "Called function with wrong number of args: "+args.length+" needed: "+params.length)
				throw this.SyntaxErr(node, "Called function with wrong number of args: "+args.length+" needed: "+params.length)
			}
			for(var i = 0; i < args.length; i++){
				var arg = args[i]
				var arginfer = arg.infer
				var name = params[i].name
				if(arginfer.kind === 'value'){
					subfunction.scope[name] = {
						kind:'value',
						lvalue:true,
						type:arginfer.type,
						scope:true,
						isarg:true
					}
				}
				else if(arginfer.kind === 'function'){
					subfunction.scope[name] = {
						kind:'value',
						scope:true,
						isarg:true,
						function: arginfer.function
					}
				}
			}

			// alright lets run the function body.
			var body = sub.walk(ast.body[0].body)

			for(var i = 0; i < args.length; i++){
				// write the args on the scope
				var arg = args[i]
				var arginfer = arg.infer
				var name = params[i].name
				if(arginfer.kind === 'value'){
					if(paramdef) paramdef += ', '
					if(subfunction.inout[name]){
						paramdef += 'inout '
						if(!arg.infer.lvalue){
							throw this.InferErr(arg, "Function arg is inout but argument is not a valid lvalue: " +name)
						}
					}

					paramdef += arginfer.type._name + ' ' + name
				}
				else if(arginfer.kind === 'function'){

				}
			}

			var code = subfunction.return.type._name 
			code += ' ' + fnname + '(' + paramdef + ')' + body
			subfunction.generatedcode = code

			node.infer = {
				kind: 'value',
				type: subfunction.return.type
			}

			return fnname + '(' + realargs.join() + ')'
		}
		else throw this.SyntaxErr(node,"Not a callable type")
		// ok so now lets type specialize and call our function
		// ie generate it
	}

	//ReturnStatement:{argument:1},
	this.ReturnStatement = function(node){
		var ret = 'return ' 
		var infer
		if(node.argument !== null){
			this.walk(node.argument, node)
			infer = node.argument.infer
		}
		else{
			infer = {
				kind:'value',
				type:types.void
			}
		}
	
		if(infer.kind !== 'value'){
			throw this.InferErr(node, 'Cant return a non value type '+infer.kind)
		}
		if(this.currentfn.return && this.currentfn.return.type !== types.void && this.currentfn.return.type !== infer.type){
			throw this.InferErr(node, 'Cant return more than one type '+this.currentfn.return.type._name+'->'+infer.type._name)
		}
		node.infer = infer
		this.currentfn.return = node.infer
		return 'return '+ this.walk(node.argument)
	}

	//FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	this.FunctionExpression = function(node){
		console.error("FunctionExpression not implemented")
		return ''
	}

	//FunctionDeclaration: {id:1, params:2, expression:0, body:1},
	this.FunctionDeclaration = function(node){
		// an inline function declaration
		console.error("FunctionDeclaration not implemented")
		return ''
	}

	//VariableDeclaration:{declarations:2, kind:0},
	this.VariableDeclaration = function(node){
		// ok we have to split into the types of the declarations
		var decls = node.declarations
		var ret = ''
		for(var i = 0; i < decls.length; i++){
			if(i) ret += ';'
			var decl = decls[i]
			var str = this.walk(decl, node)
			if(decl.infer.kind === 'value'){
				ret += decl.infer.type._name + ' ' + str
			}
		}
		return ret
	}

	//VariableDeclarator:{id:1, init:1},
	this.VariableDeclarator = function(node){

		if(!node.init){
			throw this.InferErr(node, node.type + ' cant infer type without initializer '+node.id.name)
		}

		var initstr = this.walk(node.init, node)
		var init = node.init
		var initinfer = init.infer

		if(initinfer.kind === 'value'){
			node.infer = this.currentfn.scope[node.id.name] = {
				kind:'value',
				lvalue:true,
				scope:true,
				type:initinfer.type
			}
		}
		else throw this.InferErr(node, 'Cannot turn type '+initinfer.kind+' into local variable')

		if(init.infer.kind === 'type' && init.type === 'CallExpression' && init.args.length === 0){
			// just take the type, no constructor args
			return node.id.name
		}

		return node.id.name + ' = ' + initstr
	}

	//LogicalExpression:{left:1, right:1, operator:0},
	this.LogicalExpression = function(node){
		//!TODO check node.left.infer and node.right.infer for compatibility
		var ret = this.walk(node.left, node) + ' ' + node.operator + ' ' + this.walk(node.right, node)
		node.infer = {
			kind:'value',
			type:types.bool
		}
		return ret
	}

	//BinaryExpression:{left:1, right:1, operator:0},
	this.BinaryExpression = function(node){
		//!TODO check node.left.infer and node.right.infer for compatibility
		var ret = this.walk(node.left, node) + ' ' + node.operator + ' ' + this.walk(node.right, node)
		var leftinfer = node.left.infer
		var rightinfer = node.right.infer
		//!TODO fix this
		node.infer = {
			kind:'value',
			type:leftinfer.type
		}
		return ret
	}

	//AssignmentExpression: {left:1, right:1},
	this.AssignmentExpression = function(node){
		var leftstr = this.walk(node.left, node)
		var rightstr =  this.walk(node.right, node)
		var ret = leftstr+ ' = ' + rightstr
		var leftinfer = node.left.infer
		var rightinfer = node.right.infer

		if(leftinfer.kind === 'varyundef'){
			// create a varying
			var existvary = this.varyout[leftstr]
			if(existvary && existvary !== rightinfer.type) throw this.InferErr(node, 'Varying changed type '+existvary._name + ' -> '+ rightinfer.type._name)
			this.varyout[leftstr] = {
				type:rightinfer.type
			}
			return ret
		}

		if(leftinfer.kind === 'outundef'){
			// create a varying
			var existout = this.outputs[leftstr]
			if(existout && existout !== rightinfer.type) throw this.InferErr(node, 'Output changed type '+existout._name + ' -> '+ rightinfer.type._name)
			this.outputs[leftstr] =  rightinfer.type
			return ret
		}
		if(!leftinfer.lvalue){
			throw this.InferErr(node, 'Left hand side not an lvalue ')
		}
		// mark arg as inout
		if(leftinfer.scope && leftinfer.isarg){
			this.currentfn.inout[leftstr] = true
		}

		// lets check
		if(leftinfer.type !==  rightinfer.type){
			throw this.InferErr(node, 'lefthand differs from righthand in assignment '+leftinfer.type._name +' = '+ rightinfer.type._name)
		}
		node.infer = rightinfer
		return ret
	}

	//ConditionalExpression:{test:1, consequent:1, alternate:1},
	this.ConditionalExpression = function(node){
		//!TODO check types
		var ret = this.walk(node.test, node) + '?' + this.walk(node.consequent, node) + ':' + this.walk(node.alternate, node)
		return ret
	}

	//UpdateExpression:{operator:0, prefix:0, argument:1},
	this.UpdateExpression = function(node){
		var ret = this.walk(node.argument, node)
		node.infer = node.argument.infer
		if(node.prefix){
			return node.operator + ret
		}
		return ret + node.operator
 	}

	//IfStatement:{test:1, consequent:1, alternate:1},
	this.IfStatement = function(node){
		var ret = 'if(' + this.walk(node.test) + ') ' 

		ret += this.walk(node.consequent, node)

		if(node.alternate){
			ret+= 'else '+this.walk(node.alternate, node)
		} 
		return ret
	}

	//ForStatement:{init:1, test:1, update:1, body:1},
	this.ForStatement = function(node){
		var ret = 'for(' + this.walk(node.init) + ';' 
		ret += this.walk(node.test)+';'
		ret += this.walk(node.update)+') '
		ret += this.walk(node.body, node)
		return ret
	}

	this.BreakStatement = function(node){
		return 'break'
	}

	this.ContinueStatement = function(node){
		return 'continue'
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

	// Exceptions
	this.ResolveErr = function(node, message){
		return new Err(this, node, 'ResolveError', message)
	}

	this.SyntaxErr = function(node, message){
		return new Err(this, node, 'SyntaxError', message)
	}

	this.InferErr = function(node, message){
		return new Err(this, node, 'InferenceError', message)
	 }
	// Unsupported syntax
	//UnaryExpression:{operator:0, prefix:0, argument:1},


	//ThisExpression:{},
	this.ThisExpression = function(node){throw this.SyntaxErr(node,'ThisExpression')}
	this.UnaryExpression = function(node){throw this.SyntaxErr(node,'UnaryExpression')}
	this.YieldExpression = function(node){throw this.SyntaxErr(node,'YieldExpression')}
	this.ThrowStatement = function(node){throw this.SyntaxErr(node,'ThrowStatement')}
	this.TryStatement = function(node){throw this.SyntaxErr(node,'TryStatement')}
	this.CatchClause = function(node){throw this.SyntaxErr(node,'CatchClause')}
	this.Super = function(node){throw this.SyntaxErr(node,'Super')}
	this.AwaitExpression = function(node){throw this.SyntaxErr(node,'AwaitExpression')}
	this.MetaProperty = function(node){throw this.SyntaxErr(node,'MetaProperty')}
	this.NewExpression = function(node){throw this.SyntaxErr(node,'NewExpression')}
	this.ArrayExpression = function(node){throw this.SyntaxErr(node,'ArrayExpression')}
	this.ObjectExpression = function(node){throw this.SyntaxErr(node,'ObjectExpression')}
	this.ObjectPattern = function(node){throw this.SyntaxErr(node,'ObjectPattern')}
	this.ArrowFunctionExpression = function(node){throw this.SyntaxErr(node,'ArrowFunctionExpression')}
	this.ForInStatement = function(node){throw this.SyntaxErr(node,'ForInStatement')}
	this.ForOfStatement = function(node){throw this.SyntaxErr(node,'ForOfStatement')}
	this.WhileStatement = function(node){throw this.SyntaxErr(node,'WhileStatement')}
	this.DoWhileStatement = function(node){throw this.SyntaxErr(node,'DoWhileStatement')}
	this.SwitchStatement = function(node){throw this.SyntaxErr(node,'SwitchStatement')}
	this.SwitchCase = function(node){throw this.SyntaxErr(node,'SwitchCase')}
	this.TaggedTemplateExpression = function(node){throw this.SyntaxErr(node,'TaggedTemplateExpression')}
	this.TemplateElement = function(node){throw this.SyntaxErr(node,'TemplateElement')}
	this.TemplateLiteral = function(node){throw this.SyntaxErr(node,'TemplateLiteral')}
	this.ClassDeclaration = function(node){throw this.SyntaxErr(node,'ClassDeclaration')}
	this.ClassExpression = function(node){throw this.SyntaxErr(node,'ClassExpression')}
	this.ClassBody = function(node){throw this.SyntaxErr(node,'ClassBody')}
	this.MethodDefinition = function(node){throw this.SyntaxErr(node,'MethodDefinition')}
	this.ExportAllDeclaration = function(node){throw this.SyntaxErr(node,'ExportAllDeclaration')}
	this.ExportDefaultDeclaration = function(node){throw this.SyntaxErr(node,'ExportDefaultDeclaration')}
	this.ExportNamedDeclaration = function(node){throw this.SyntaxErr(node,'ExportNamedDeclaration')}
	this.ExportSpecifier = function(node){throw this.SyntaxErr(node,'ExportSpecifier')}
	this.ImportDeclaration = function(node){throw this.SyntaxErr(node,'ImportDeclaration')}
	this.ImportDefaultSpecifier = function(node){throw this.SyntaxErr(node,'ImportDefaultSpecifier')}
	this.ImportNamespaceSpecifier = function(node){throw this.SyntaxErr(node,'ImportNamespaceSpecifier')}
	this.ImportSpecifier = function(node){throw this.SyntaxErr(node,'ImportSpecifier')}
	this.DebuggerStatement = function(node){throw this.SyntaxErr(node,'DebuggerStatement')}
	this.LabeledStatement = function(node){throw this.SyntaxErr(node,'LabeledStatement')}
	this.WithStatement = function(node){throw this.SyntaxErr(node,'WithStatement')}

	// Types

	this.glslvariables = {
		gl_Position:types.vec4,
		gl_FragCoord:types.vec4,
		gl_PointCoord:types.vec2,
		gl_PointSize:types.float,
		gl_VertexID:types.int,
		gl_InstanceID:types.int,
		gl_FrontFacing:types.bool,
		gl_ClipDistance:types.float,
		gl_MaxVertexAttribs:types.int,
		gl_MaxVertexUniformVectors:types.int,
		gl_MaxVaryingVectors:types.int,
		gl_MaxVertexTextureImageUnits:types.int,
		gl_MaxCombinedTextureImageUnits:types.int,
		gl_MaxTextureImageUnits:types.int,
		gl_MaxFragmentUniformVectors:types.int,
		gl_MaxDrawBuffers:types.int,
		discard:types.void
	}

	this.glsltypes = {
		float:types.float,
		bool:types.bool,
		vec2:types.vec2,
		vec3:types.vec3,
		vec4:types.vec4,
		bvec2:types.bvec2,
		bvec3:types.bvec3,
		bvec4:types.bvec4,
		mat2:types.mat2,
		mat3:types.mat3,
		mat4:types.mat4
	}

	this.glslfunctions ={
		typeof:{return:types.gen, params:[{name:'type',type:types.gen}]}, 
		sizeof:{return:types.int, params:[{name:'type',type:types.gen}]},

		radians:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		degrees:{return:types.gen, params:[{name:'x', type:types.gen}]},

		sin:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		cos:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		tan:{return:types.gen, params:[{name:'x', type:types.gen}]},
		asin:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		acos:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		atan:{return:types.gen, params:[{name:'x', type:types.gen},{name:'y', type:types.genopt}]},

		pow:{return:types.gen, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]}, 
		exp:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		log:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		exp2:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		log2:{return:types.gen, params:[{name:'x', type:types.gen}]},

		sqrt:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		inversesqrt:{return:types.gen, params:[{name:'x', type:types.gen}]},

		abs:{return:types.gen, params:[{name:'x', type:types.gen}]},
		sign:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		floor:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		ceil:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		fract:{return:types.gen, params:[{name:'x', type:types.gen}]},

		mod:{return:types.gen, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		min:{return:types.gen, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		max:{return:types.gen, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		clamp:{return:types.gen, params:[{name:'x', type:types.gen},{name:'min', type:types.gen},{name:'max', type:types.gen}]},

		mix:{return:types.gen, params:[{name:'x', type:types.gen},{name:'y', type:types.gen},{name:'t',type:types.gen}]},
		step:{return:types.gen, params:[{name:'edge', type:types.gen},{name:'x', type:types.gen}]}, 
		smoothstep:{return:types.gen, params:[{name:'edge0', type:types.genfloat}, {name:'edge1', type:types.genfloat}, {name:'x', type:types.gen}]},

		length:{return:types.float, params:[{name:'x', type:types.gen}]}, 
		distance:{return:types.float, params:[{name:'p0', type:types.gen}, {name:'p1', type:types.gen}]}, 
		dot:{return:types.float, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		cross:{return:types.vec3, params:[{name:'x', type:types.vec3},{name:'y', type:types.vec3}]},
		normalize:{return:types.gen, params:[{name:'x', type:types.gen}]},
		faceforward:{return:types.gen, params:[{name:'n', type:types.gen}, {name:'i', type:types.gen}, {name:'nref', type:types.gen}]},
		reflect:{return:types.gen, params:[{name:'i', type:types.gen}, {name:'n', type:types.gen}]}, 
		refract:{return:types.gen, params:[{name:'i', type:types.gen}, {name:'n', type:types.gen}, {name:'eta', type:types.float}]},
		matrixCompMult:{return:types.mat4,params:[{name:'a', type:types.mat4},{name:'b', type:types.mat4}]},

		lessThan:{return:types.bvec, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		lessThanEqual:{return:types.bvec, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		greaterThan:{return:types.bvec, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		greaterThanEqual:{return:types.bvec, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		equal:{return:types.bvec, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		notEqual:{return:types.bvec, params:[{name:'x', type:types.gen},{name:'y', type:types.gen}]},
		any:{return:types.bool, params:[{name:'x', type:types.bvec}]},
		all:{return:types.bool, params:[{name:'x', type:types.bvec}]},
		not:{return:types.bvec, params:[{name:'x', type:types.bvec}]},

		dFdx:{return:types.gen, params:[{name:'x', type:types.gen}]}, 
		dFdy:{return:types.gen, params:[{name:'x', type:types.gen}]},

		texture2DLod:{return:types.vec4, params:[{name:'sampler', type:types.sampler2D}, {name:'coord', type:types.vec2}, {name:'lod', type:types.float}]},
		texture2DProjLod:{return:types.vec4, params:[{name:'sampler', type:types.sampler2D}, {name:'coord', type:types.vec2}, {name:'lod', type:types.float}]},
		textureCubeLod:{return:types.vec4, params:[{name:'sampler', type:types.sampler2D}, {name:'coord', type:types.vec3}, {name:'lod', type:types.float}]},
		texture2D:{return:types.vec4, params:[{name:'sampler', type:types.sampler2D}, {name:'coord', type:types.vec2}, {name:'bias', type:types.floatopt}]},
		texture2DProj:{return:types.vec4, params:[{name:'sampler', type:types.sampler2D}, {name:'coord', type:types.vec2}, {name:'bias', type:types.floatopt}]},
		textureCube:{return:types.vec4, params:[{name:'sampler', type:types.sampler2D}, {name:'coord', type:types.vec3}, {name:'bias', type:types.floatopt}]},
	}

})