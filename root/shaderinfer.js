module.exports = require('class').extend(function ShaderInfer(proto){
	
	var types  = require('types')
	var parser = require('jsparser/jsparser')
	var canvas 
	var parsecache = {}
	var painter = require('painter')

	proto.constructor.generateGLSL = function(root, fn, varyIn, mapexception){
		
		var gen = new this()

		// geometry props
		gen.geometryProps = {}
		// instance props
		gen.instanceProps = {}

		// all samplers
		gen.samplers = {}

		// all uniforms found
		gen.uniforms = {}
		// all structs used
		gen.structs = {}
		//  varyIngs found
		gen.varyOut = {}
		// varyIng inputs
		gen.varyIn = varyIn
		// structs used
		gen.structs = {}

		// outputs used
		gen.outputs = {}

		// functions generated
		gen.genFunctions = {}

		// the function object info of the current function
		var source = fn.toString()
		gen.curFunction = {
			deps:{},
			inout:{},
			scope:{},
			callee:fn,
			source:source
		}
		// textures used
		gen.textures = {}
		// do our indentation
		gen.indent = '\t'
	
		gen.root = root

		gen.ctxprefix = ''
		gen.context = root

		var ast = parsecache[source] || (parsecache[source] = parser.parse(source))

		if(mapexception){ // very ugly.
			try{
				gen.main = gen.block(ast.body[0].body.body)
			}
			catch(error){
				gen.mapException(error)
			}
		}
		else{
			gen.main = gen.block(ast.body[0].body.body)
		}

		return gen
	}

	proto.mapException = function(error){
		// lets get this to the right file/line
		// first of all we need to grab the current function
		var state = error.state
		if(!state) throw error
		var curfn = state.curFunction
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
			var lines = curfn.source.split('\n')
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
			if(curfn.source.indexOf('{$') === -1) realline+='(missing $ after { for linenumbers)'

			this.exception = {
				filename:filename,
				line:realline,
				col:realcol,
				type:error.type,
				message:error.message
			}

			console.error(
				filename+':'+realline+':'+realcol, error.type + ': '+ error.message
			)
		}			
	}

	proto.walk = function(node, parent){
		node.parent = parent
		node.infer = undefined
		var typefn = this[node.type]
		if(!typefn) throw this.SyntaxErr(node, 'Type not found ' + node.type)
		return typefn.call(this,node)
	}

	proto.block = function(array, parent){
		var ret = ''
		for(var i = 0; i < array.length; i++){
			var line = this.walk(array[i], parent)
			if(line.length){
				ret += this.indent + line + ';'
				if(ret.charCodeAt(ret.length - 1) !== 10) ret += '\n'
			}
		}
		return ret
	}
	
	proto.Program = function(node){
		// ok lets fetch the first function declaration if we have one
		return this.block(node.body, node)
	}

	proto.BlockStatement = function(node){
		var oi = this.indent
		this.indent += '\t'
		var ret = '{\n'
		ret += this.block(node.body, node)
		this.indent = oi
		ret += this.indent + '}'
		return ret
	}

	//EmptyStatement:{}
	proto.EmptyStatement = function(node){
		return ''
	}

	//ExpressionStatement:{expression:1},
	proto.ExpressionStatement = function(node){
		var ret = this.walk(node.expression, node)
		node.infer = node.expression.infer
		return ret
	}

	//SequenceExpression:{expressions:2}
	proto.SequenceExpression = function(node){
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
	proto.ParenthesizedExpression = function(node){
		var ret = '(' + this.walk(node.expression, node) + ')'
		node.infer = node.expression.infer
		return ret
	}

	//Literal:{raw:0, value:0},
	proto.Literal = function(node){
		var infer = {
			kind:'value'
		}
		node.infer = infer
		if(node.kind === 'regexp') throw this.SyntaxErr(node,'Cant use regexps in shaders')
		if(node.kind === 'string'){
			infer.type = types.vec4
			// return the parsed color!
			// parse the color
			var v4 = []
			if(!types.colorFromString(node.value, 1.0, v4, 0)){
				throw this.SyntaxErr(node,'Cant parse color '+node.value)
			}
			return 'vec4('+v4[0]+','+v4[1]+','+v4[2]+','+v4[3]+')'
		}
		if(node.kind === 'num'){
			if(node.raw.indexOf('.') !== -1){
				infer.type = types.float
				var dotidx = node.raw.indexOf('.')
				if(dotidx === 0){
					return '0'+node.raw
				}
				if(dotidx === node.raw.length - 1){
					return node.raw + '0'
				}
				return node.raw
			}
			else if(node.raw.indexOf('e') !== -1){
				infer.type = types.float
				return node.raw
			}
			infer.type = types.int
			return node.raw
		}
		throw this.SyntaxErr(node,'Unknown literal kind'+node.kind)
	}

	var uniformslotmap = {
		1:types.float,
		2:types.vec2,
		3:types.vec3,
		4:types.vec4
	}

	//Identifier:{name:0},
	proto.Identifier = function(node){
		var name = node.name

		if(name === '$') return ''
		// cant use $ in shaders so just return the value directly
		if(name.indexOf('$') === 0) return name

		// first we check the scope
		var scopeinfer = this.curFunction.scope[name]

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

		// native functions
		var glslvar = this.glslvariables[name]
		if(glslvar){
			node.infer = {
				kind: 'value',
				lvalue:true,
				type:glslvar,
				glsl: name
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

		if(name === 'base'){
			// lets find the current function on the protochain
			var fn = this.curFunction
			var proto = this.root
			var basecallee

			while(proto){
				if(proto.hasOwnProperty(fn.name) && proto[fn.name] === fn.callee){
					// found it!
					proto = Object.getPrototypeOf(proto)
					basecallee = proto[fn.name]
					break
				}
				proto = Object.getPrototypeOf(proto)
			}

			var ret = 'base_'+fn.fullname
			node.infer = {
				kind:'function',
				fullname:ret,
				callee:basecallee,
			}

			return ret
		}

		// check defines
		var defstr = this.context !== this.root && this.context.defines && this.context.defines[name] || this.root._defines && this.root._defines[name]
		if(defstr){ // expand the define
			try{
				var ast = parsecache[defstr] || (parsecache[defstr] = parser.parse(defstr))
			}
			catch(e){
				throw this.SyntaxErr(node, "Cant parse define " + defstr)
			}
			// just jump to it
			var astnode = ast.body[0]
			var ret = this.walk(astnode, node)
			node.infer = astnode.infer
			return ret
		}		

		// struct on context
		var structtype = this.context !== this.root && this.context._structs && this.context._structs[name]
		if(structtype){ // return struct
			node.infer = {
				kind: 'type',
				type: structtype
			}
			this.structs[name] = structtype
			return name
		}

		// struct on root
		structtype = this.root._structs && this.root._structs[name]
		if(structtype){ // return struct
			node.infer = {
				kind: 'type',
				type: structtype
			}
			this.structs[name] = structtype
			return name
		}

		// requires on context
		var required = this.context !== this.root && this.context._requires && this.context._requires[name]
		if(required){ // return struct
			node.infer = {
				kind: 'require',
				require: required
			}
			return this.ctxprefix + name
		}

		// requires on root
		required = this.root._requires && this.root._requires[name]
		if(structtype){ // return struct
			node.infer = {
				kind: 'require',
				require: required
			}
			return name
		}

		// otherwise type it
		throw this.ResolveErr(node, 'Cannot resolve '+name)
	}

	//ThisExpression:{},
	proto.ThisExpression = function(node){
		node.infer = {
			kind:'this',
			prefix:this.ctxprefix || 'this_DOT_'
		}
		return ''
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
	proto.MemberExpression = function(node){
		// just chuck This
		//if(node.object.type === 'ThisExpression' || node.object.type === 'Identifier' && ignore_objects[node.object.name]){
		//	var ret = this.walk(node.property)
		//	node.infer = node.property.infer
		//	return ret
		//}

		var objectstr = this.walk(node.object, node)

		if(node.computed){
			var objinfer = node.object.infer
			if(objinfer.kind !== 'value'){
				throw new this.InferErr(node, 'cannot use index[] on non value type')
			}
			var objtype = objinfer.type
			if(objtype.slots <= 1){
				throw new this.InferErr(node, 'cannot use index[] on item with size 1')
			}
			var argstr = this.walk(node.property, node)

			var primtype = objtype.primary
	
			if(objtype.name === 'mat4'){
				primtype = types.vec4
			}
			else if(objtype.name === 'mat3'){
				primtype = types.vec3
			}
			else if(objtype.name === 'mat2'){
				primtype = types.vec2
			}

			node.infer = {
				kind:'value',
				type:primtype
			}
			return objectstr + '[' + argstr + ']'
		}
		else{
			var objectinfer = node.object.infer
			var propname = node.property.name
			if(objectinfer.kind === 'value'){
				var type = objectinfer.type
				if(!type.fields){
					throw this.InferErr(node, 'Object not a struct '+objectstr+'.'+propname)
				}
				var proptype = type.fields[propname]
				if(!proptype){ // do more complicated bits
					// check swizzling or aliases
					var proplen = propname.length
					if(proplen < 1 || proplen > 4) throw this.InferErr(node, 'Invalid property '+objectstr+'.'+propname)
					var typename = type.name

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
			else if(objectinfer.kind === 'this'){

				var value = this.root[propname]
				var fullname = 'this_DOT_' + propname

				// its a function
				if(typeof value === 'function'){
					node.infer = {
						kind: 'function',
						name: propname,
						fullname: fullname,
						callee: value
					}
					return fullname
				}

				var props = this.root._props
				var config = props[propname]

				if(config !== undefined ){
					// we found a prop!
					// check kind
					if(config.kind === 'instance'){

						var value = config.value

						this.instanceProps[fullname] = {
							type:config.type,
							name:propname,
							config:config
						}

						node.infer = {
							kind:'value',
							lvalue:true,
							type:config.type
						}

						return fullname
					}
					else if(config.kind === 'uniform'){
						if(this.uniforms[fullname]){
							this.uniforms[fullname].refcount++
						}
						else{
							this.uniforms[fullname] = {
								type:config.type,
								config:config,
								name:propname,
								refcount:1
							}
						}
						node.infer = {
							kind:'value',
							type:config.type
						}
						return fullname
					}
					else if(config.kind === 'sampler'){
						var sampler = config.sampler
						this.samplers[fullname] = {
							name:propname,
							sampler:sampler
						}
						node.infer = {
							kind:'value',
							name:propname,
							sampler:sampler,
							type:sampler.type
						}
						return fullname
					}
					else if(config.kind === 'geometry'){
						proptype = config.type
						this.geometryProps[fullname] = {
							type:proptype,
							name:propname
						}

						node.infer = {
							kind:'value',
							type:proptype
						}
						return fullname
					}
					else if(config.kind === 'output'){
						// its already defined
						var type = config.type
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
								name: name
							}
						}
						return fullname
					}
				}

				// use of unconfigured sampler
				if(value instanceof painter.Texture){
					this.samplers[fullname] = {
						name:ret,
						sampler:sampler
					}
					var sampler = value.sampler || painter.SAMPLER2DNEAREST
					node.infer = {
						kind:'value',
						name:ret,
						sampler:sampler,
						type:sampler.type
					}
					return fullname
				}

				// check if its a mesh attribute
				if(value instanceof painter.Mesh){

					proptype = value.type
					this.geometryProps[fullname] = {
						type:proptype,
						name:propname
					}

					node.infer = {
						kind:'value',
						type:proptype
					}
					return fullname
				}

				if(value === undefined){ // something undefined
					// its already defined
					var prev = this.varyOut[fullname] || this.varyIn && this.varyIn[fullname]

					if(prev){
						this.varyOut[fullname] = prev
						node.infer = {
							kind: 'value',
							lvalue:true,
							type: prev.type
						}
					}
					else{
						if(this.varyIn){
							var out = this.outputs[fullname]
							if(out){
								node.infer = {
									kind: 'value',
									lvalue:true,
									type:out
								}
							}
							else{
								node.infer = {
									kind: 'outundef',
									lvalue:true,
									name: propname
								}
							}
						}
						else{
							node.infer = {
								kind: 'varyundef',
								lvalue:true,
								name: propname
							}
						}
					}
					// lets check if node.infer holds property
					return fullname
				}

				// default to instanced property
				var type = types.typeFromValue(value)

				if(type){
					this.instanceProps[fullname] = {
						type:type,
						name:propname,
						config:{type:type}
					}

					node.infer = {
						kind:'value',
						lvalue:true,
						type:type
					}

					return fullname
				}

			}

			throw this.InferErr(node, 'Cant determine type for this.'+propname)
		}
	}

	function recursiveDependencyUpdate(genfn, dep, key){
		delete genfn[key]
		genfn[key] = dep
		for(var key in dep.deps){
			recursiveDependencyUpdate(genfn, dep.deps[key], key)
		}
	}

	//CallExpression:{callee:1, arguments:2},
	proto.CallExpression = function(node){
		var calleestr = this.walk(node.callee, node)
		var callee = node.callee
		var calleeinfer = node.callee.infer

		// its a macro overlay
		var macro = callee.infer.macro
		if(macro){
			return macro.call(this, node)
		}

		var args = node.arguments
		var argstrs = []
		for(var i = 0; i < args.length; i++){
			argstrs.push(this.walk(args[i], node))
		}

		if(calleeinfer.kind === 'type'){
			if(!args.length){
				node.infer = {
					kind:'type',
					type:calleeinfer.type
				}
				return ''
			}
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
					if(arg.infer.kind !== 'value'){
						throw this.InferErr(arg, "GLSL Builtin cant use non value arg " +argstrs[i])
					}
					//console.log(param,arg.infer)
					if(param.type === types.gen){
						gentype = arg.infer.type
					}
					else if(param.type !== types.genfloat && param.type !== arg.infer.type){
						throw this.InferErr(arg, "GLSL Builtin wrong arg " +fnname+' arg '+i+' -> ' +param.name)
					}
				}

				node.infer = {
					kind: 'value',
					type: glslfn.return === types.gen? gentype: glslfn.return
				}

				return fnname + '(' + argstrs.join(', ') + ')'
			}
			// expand function macro
			var source = calleeinfer.callee.toString()

			// parse it, should never not work since it already parsed 
			try{
				var ast = parsecache[source] || (parsecache[source] = parser.parse(source))
			}
			catch(e){
				throw this.SyntaxErr(node, "Cant parse function " + source)
			}
			
			// lets build the function name
			var fnname = calleeinfer.fullname
			var realargs = []
			fnname += '_T'
			for(var i = 0; i < args.length; i++){
				var arg = args[i]
				var arginfer = arg.infer
				if(arginfer.kind === 'value'){
					fnname += '_' +arginfer.type.name
					realargs.push(argstrs[i])
				}
				else if(arginfer.kind === 'function'){ // what do we do?...
					fnname += '_' + arginfer.name
				}
				else throw this.SyntaxErr(node, "Cant use " +arginfer.kind+" as a function argument") 
			}

			var prevfunction = this.genFunctions[fnname]

			if(prevfunction){
				// store dependency
				this.curFunction.deps[fnname] = prevfunction
				// push all our recursive dependencies to the top
				recursiveDependencyUpdate(this.genFunctions, prevfunction, fnname)

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
				return fnname + '(' + realargs.join(', ') + ')'
			}
			var subfunction = this.genFunctions[fnname] = {
				scope:{},
				inout:{},
				deps:{},
				source:source,
				callee:calleeinfer.callee,
				name:calleeinfer.name,
				fullname:calleeinfer.fullname,
				return:{
					kind:'value',
					type:types.void
				}
			}
			this.curFunction.deps[fnname] = subfunction

			var sub = Object.create(this)

			if(!ast.body || !ast.body[0] || ast.body[0].type !== 'FunctionDeclaration'){
				throw this.SyntaxErr(node, "Not a function")
			}
			subfunction.ast = ast

			// we have our args, lets process the function declaration
			// make a new scope
			sub.indent = ''
			sub.curFunction = subfunction
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

					paramdef += arginfer.type.name + ' ' + name
				}
				else if(arginfer.kind === 'function'){

				}
			}

			var code = subfunction.return.type.name 
			code += ' ' + fnname + '(' + paramdef + ')' + body
			subfunction.code = code

			node.infer = {
				kind: 'value',
				type: subfunction.return.type
			}

			return fnname + '(' + realargs.join() + ')'
		}
		else throw this.SyntaxErr(node,"Not a callable type: "+calleestr+'('+argstrs.join()+')'+calleeinfer.name+" "+calleeinfer.kind)
		// ok so now lets type specialize and call our function
		// ie generate it
	}

	//ReturnStatement:{argument:1},
	proto.ReturnStatement = function(node){
		var ret = 'return ' 
		var infer
		if(node.argument !== null){
			ret += this.walk(node.argument, node)
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
		if(this.curFunction.return && this.curFunction.return.type !== types.void && this.curFunction.return.type !== infer.type){
			throw this.InferErr(node, 'Cant return more than one type '+this.curFunction.return.type.name+'->'+infer.type.name)
		}
		node.infer = infer
		this.curFunction.return = node.infer
		return ret
	}

	//FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	proto.FunctionExpression = function(node){
		console.error("FunctionExpression not implemented")
		return ''
	}

	//FunctionDeclaration: {id:1, params:2, expression:0, body:1},
	proto.FunctionDeclaration = function(node){
		// an inline function declaration
		console.error("FunctionDeclaration not implemented")
		return ''
	}

	//VariableDeclaration:{declarations:2, kind:0},
	proto.VariableDeclaration = function(node){
		// ok we have to split into the types of the declarations
		var decls = node.declarations
		var ret = ''
		for(var i = 0; i < decls.length; i++){
			if(i) ret += ';'
			var decl = decls[i]
			var str = this.walk(decl, node)
			if(decl.infer.kind === 'value'){
				ret += decl.infer.type.name + ' ' + str
			}
		}
		return ret
	}

	//VariableDeclarator:{id:1, init:1},
	proto.VariableDeclarator = function(node){

		if(!node.init){
			throw this.InferErr(node, node.type + ' cant infer type without initializer '+node.id.name)
		}

		var initstr = this.walk(node.init, node)
		var init = node.init
		var initinfer = init.infer

		if(initinfer.kind === 'value' || initinfer.kind === 'type'){
			node.infer = this.curFunction.scope[node.id.name] = {
				kind:'value',
				lvalue:true,
				scope:true,
				type:initinfer.type
			}
		}
		else throw this.InferErr(node, 'Cannot turn type '+initinfer.kind+' into local variable')

		if(init.infer.kind === 'type'){
			// just take the type, no constructor args
			return node.id.name
		}

		return node.id.name + ' = ' + initstr
	}

	//LogicalExpression:{left:1, right:1, operator:0},
	proto.LogicalExpression = function(node){
		//!TODO check node.left.infer and node.right.infer for compatibility
		var ret = this.walk(node.left, node) + ' ' + node.operator + ' ' + this.walk(node.right, node)
		node.infer = node.right.infer
		return ret
	}

	var tableBinaryExpression = {
		float:{float:types.float, vec2:types.vec2, vec3:types.vec3, vec4:types.vec4},
		int:{int:types.int, ivec2:types.ivec2, ivec3:types.ivec3, ivec4:types.ivec4},
		vec2:{float:types.vec2, vec2:types.vec2, mat2:types.vec2},
		vec3:{float:types.vec3, vec3:types.vec3, mat3:types.vec3},
		vec4:{float:types.vec4, vec4:types.vec4, mat4:types.vec4},
		ivec2:{int:types.ivec2, ivec2:types.ivec2},
		ivec3:{int:types.ivec3, ivec3:types.ivec3},
		ivec4:{int:types.ivec4, ivec4:types.ivec4},
		mat2:{float:types.vec4, vec4:types.vec4, mat4:types.vec4},
		mat3:{float:types.vec4, vec4:types.vec4, mat4:types.vec4},
		mat4:{float:types.vec4, vec4:types.vec4, mat4:types.vec4},
	}

	var groupBinaryExpression = {
		'+':1,'-':1,'*':1,'/':1,
		'==':2,'!=':2,'>=':2,'<=':2,'<':2,'>':2,
		'===':3,'!==':3,
	}

	//BinaryExpression:{left:1, right:1, operator:0},
	proto.BinaryExpression = function(node){
		var leftstr = this.walk(node.left, node)
		var rightstr = this.walk(node.right, node)
		var leftinfer = node.left.infer
		var rightinfer = node.right.infer

		if(leftinfer.kind !== 'value' || rightinfer.kind !== 'value'){
			throw this.InferErr(node, 'Not a value type '+ret)
		}
		var group = groupBinaryExpression[node.operator]
		if(group === 1){
			var lt = tableBinaryExpression[leftinfer.type.name]
			if(!lt) throw this.InferErr(node, 'No production rule for type '+leftinfer.type.name)

			var type = lt[rightinfer.type.name] 
			if(!type) throw this.InferErr(node, 'No production rule for type '+leftinfer.type.name+' and '+rightinfer.type.name)

			node.infer = {
				type:type,
				kind:'value'
			}
			return leftstr + ' ' + node.operator + ' ' +rightstr
		}
		if(group === 2){
			if(leftinfer.type !== rightinfer.type){
				throw this.InferErr(node, 'Cant compare '+leftinfer.type.name+' with '+rightinfer.type.name)
			}
			node.infer = {
				type:types.bool,
				kind:'value'
			}
			return leftstr + ' ' + node.operator + ' ' +rightstr
		}
		throw this.InferErr(node, 'Please implement === !== ')
	}

	//AssignmentExpression: {left:1, right:1},
	proto.AssignmentExpression = function(node){
		var leftstr = this.walk(node.left, node)
		var rightstr =  this.walk(node.right, node)

		var ret = leftstr + ' '+ node.operator +' '+  rightstr
		var leftinfer = node.left.infer
		var rightinfer = node.right.infer

		if(leftinfer.kind === 'varyundef'){
			// create a varyIng
			var existvary = this.varyOut[leftstr]
			if(existvary && existvary !== rightinfer.type) throw this.InferErr(node, 'Varying changed type '+existvary.name + ' -> '+ rightinfer.type.name)
			this.varyOut[leftstr] = {
				type:rightinfer.type
			}
			return ret
		}

		if(leftinfer.kind === 'outundef'){
			// create a varyIng
			var existout = this.outputs[leftstr]
			if(existout && existout !== rightinfer.type) throw this.InferErr(node, 'Output changed type '+existout.name + ' -> '+ rightinfer.type.name)
			this.outputs[leftstr] =  rightinfer.type
			return ret
		}
		if(!leftinfer.lvalue){
			throw this.InferErr(node, 'Left hand side not an lvalue: '+leftstr)
		}
		// mark arg as inout
		if(leftinfer.scope && leftinfer.isarg){
			this.curFunction.inout[leftstr] = true
		}


		if(node.operator.length > 1){
			node.infer = leftinfer
		}
		else{
			node.infer = rightinfer
			if(!leftinfer || !rightinfer){
				console.log(node)
			}
			// lets check
			if(leftinfer.type !==  rightinfer.type){
				throw this.InferErr(node, 'lefthand differs from righthand in assignment '+JSON.stringify(leftinfer) +' = '+ JSON.stringify(rightinfer))
			}
		}

		return ret
	}

	//ConditionalExpression:{test:1, consequent:1, alternate:1},
	proto.ConditionalExpression = function(node){
		//!TODO check types
		var ret = this.walk(node.test, node) + '? ' + this.walk(node.consequent, node) + ': ' + this.walk(node.alternate, node)
		// check types
		if(node.consequent.infer.type !== node.alternate.infer.type){
			throw this.InferErr(node, 'Conditional expression returning more than one type '+ret)
		}
		node.infer = node.consequent.infer
		return ret
	}

	//UpdateExpression:{operator:0, prefix:0, argument:1},
	proto.UpdateExpression = function(node){
		var ret = this.walk(node.argument, node)
		node.infer = node.argument.infer
		if(node.prefix){
			return node.operator + ret
		}
		return ret + node.operator
 	}


	//UnaryExpression:{operator:0, prefix:0, argument:1},
	proto.UnaryExpression = function(node){
		var ret = this.walk(node.argument, node)
		node.infer = node.argument.infer
		if(node.prefix){
			return node.operator + ret
		}
		return ret + node.operator
 	}

	//IfStatement:{test:1, consequent:1, alternate:1},
	proto.IfStatement = function(node){
		var ret = 'if(' + this.walk(node.test) + ') ' 

		ret += this.walk(node.consequent, node)

		if(node.alternate){
			if(node.consequent.type !== 'BlockStatement') ret += ';'
			ret+= '\n'+this.indent+'else '+this.walk(node.alternate, node)
		} 
		return ret
	}

	//ForStatement:{init:1, test:1, update:1, body:1},
	proto.ForStatement = function(node){
		var ret = 'for(' + this.walk(node.init) + ';' 
		ret += this.walk(node.test)+';'
		ret += this.walk(node.update)+') '
		ret += this.walk(node.body, node)
		return ret
	}

	proto.BreakStatement = function(node){
		return 'break'
	}

	proto.ContinueStatement = function(node){
		return 'continue'
	}

	// non GLSL literals
	proto.ArrayExpression = function(node){
		throw this.SyntaxErr(node,'ArrayExpression')
	}


	proto.ObjectExpression = function(node){
		node.infer = {
			kind:'objectexpression',
			object:node
		}
		return ''
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
	proto.ResolveErr = function(node, message){
		return new Err(this, node, 'ResolveError', message)
	}

	proto.SyntaxErr = function(node, message){
		return new Err(this, node, 'SyntaxError', message)
	}

	proto.InferErr = function(node, message){
		return new Err(this, node, 'InferenceError', message)
	}


	proto.YieldExpression = function(node){throw this.SyntaxErr(node,'YieldExpression')}
	proto.ThrowStatement = function(node){throw this.SyntaxErr(node,'ThrowStatement')}
	proto.TryStatement = function(node){throw this.SyntaxErr(node,'TryStatement')}
	proto.CatchClause = function(node){throw this.SyntaxErr(node,'CatchClause')}
	proto.Super = function(node){throw this.SyntaxErr(node,'Super')}
	proto.AwaitExpression = function(node){throw this.SyntaxErr(node,'AwaitExpression')}
	proto.MetaProperty = function(node){throw this.SyntaxErr(node,'MetaProperty')}
	proto.NewExpression = function(node){throw this.SyntaxErr(node,'NewExpression')}
	proto.ObjectPattern = function(node){throw this.SyntaxErr(node,'ObjectPattern')}
	proto.ArrowFunctionExpression = function(node){throw this.SyntaxErr(node,'ArrowFunctionExpression')}
	proto.ForInStatement = function(node){throw this.SyntaxErr(node,'ForInStatement')}
	proto.ForOfStatement = function(node){throw this.SyntaxErr(node,'ForOfStatement')}
	proto.WhileStatement = function(node){throw this.SyntaxErr(node,'WhileStatement')}
	proto.DoWhileStatement = function(node){throw this.SyntaxErr(node,'DoWhileStatement')}
	proto.SwitchStatement = function(node){throw this.SyntaxErr(node,'SwitchStatement')}
	proto.SwitchCase = function(node){throw this.SyntaxErr(node,'SwitchCase')}
	proto.TaggedTemplateExpression = function(node){throw this.SyntaxErr(node,'TaggedTemplateExpression')}
	proto.TemplateElement = function(node){throw this.SyntaxErr(node,'TemplateElement')}
	proto.TemplateLiteral = function(node){throw this.SyntaxErr(node,'TemplateLiteral')}
	proto.ClassDeclaration = function(node){throw this.SyntaxErr(node,'ClassDeclaration')}
	proto.ClassExpression = function(node){throw this.SyntaxErr(node,'ClassExpression')}
	proto.ClassBody = function(node){throw this.SyntaxErr(node,'ClassBody')}
	proto.MethodDefinition = function(node){throw this.SyntaxErr(node,'MethodDefinition')}
	proto.ExportAllDeclaration = function(node){throw this.SyntaxErr(node,'ExportAllDeclaration')}
	proto.ExportDefaultDeclaration = function(node){throw this.SyntaxErr(node,'ExportDefaultDeclaration')}
	proto.ExportNamedDeclaration = function(node){throw this.SyntaxErr(node,'ExportNamedDeclaration')}
	proto.ExportSpecifier = function(node){throw this.SyntaxErr(node,'ExportSpecifier')}
	proto.ImportDeclaration = function(node){throw this.SyntaxErr(node,'ImportDeclaration')}
	proto.ImportDefaultSpecifier = function(node){throw this.SyntaxErr(node,'ImportDefaultSpecifier')}
	proto.ImportNamespaceSpecifier = function(node){throw this.SyntaxErr(node,'ImportNamespaceSpecifier')}
	proto.ImportSpecifier = function(node){throw this.SyntaxErr(node,'ImportSpecifier')}
	proto.DebuggerStatement = function(node){throw this.SyntaxErr(node,'DebuggerStatement')}
	proto.LabeledStatement = function(node){throw this.SyntaxErr(node,'LabeledStatement')}
	proto.WithStatement = function(node){throw this.SyntaxErr(node,'WithStatement')}

	// Types

	proto.glslvariables = {
		gl_Position:types.vec4,
		gl_FragColor:types.vec4,
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
		discard:types.void,
		painterPickPass:types.int,
		painterPickMat4:types.mat4
	}

	proto.glsltypes = {
		float:types.float,
		int:types.int,
		bool:types.bool,
		vec2:types.vec2,
		vec3:types.vec3,
		vec4:types.vec4,
		bvec2:types.bvec2,
		bvec3:types.bvec3,
		bvec4:types.bvec4,
		ivec2:types.ivec2,
		ivec3:types.ivec3,
		ivec4:types.ivec4,
		mat2:types.mat2,
		mat3:types.mat3,
		mat4:types.mat4
	}

	proto.glslfunctions ={
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

		mix:{return:types.gen, params:[{name:'x', type:types.gen},{name:'y', type:types.gen},{name:'t',type:types.genfloat}]},
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
		textureCubeLod:{return:types.vec4, params:[{name:'sampler', type:types.samplerCube}, {name:'coord', type:types.vec3}, {name:'lod', type:types.float}]},
		texture2D:{return:types.vec4, params:[{name:'sampler', type:types.sampler2D}, {name:'coord', type:types.vec2}, {name:'bias', type:types.floatopt}]},
		texture2DProj:{return:types.vec4, params:[{name:'sampler', type:types.sampler2D}, {name:'coord', type:types.vec2}, {name:'bias', type:types.floatopt}]},
		textureCube:{return:types.vec4, params:[{name:'sampler', type:types.samplerCube}, {name:'coord', type:types.vec3}, {name:'bias', type:types.floatopt}]},
	}

})