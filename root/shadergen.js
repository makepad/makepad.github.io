module.exports = require('class').extend(function ShaderGen(){
	
	var types  = require('types')
	var parser = require('jsparser/jsparser')

	this.onconstruct = function(root, stamp){
		// the current variable scope
		this.scope = {}
		// wether scope variables got assigned to and need to be marked as in/out
		this.scopeinout = {}
		// the attributes found
		this.attributes = {}
		// all uniforms found
		this.uniforms = {}
		// all structs used
		this.structs = {}
		// name of current scope
		this.scopename = ''
		//  varyings found
		this.varyings = {}
		// functions generated
		this.functions = {}
		// textures used
		this.textures = {}
		// do our indentation
		this.indent = ''
		// default context
		this.stamp = stamp

		this.root = root
		this.context = root
	}

	this.walk = function(node, parent){
		node.parent = parent
		node.infer = undefined
		var typefn = this[node.type]
		if(!typefn) throw new Error('Type not found ' + node.type)
		return typefn.call(this,node)
	}

	this.block = function(array, parent){
		var s = ''
		for(var i = 0; i < array.length; i++){
			s += this.indent + this.walk(array[i], parent) + ';'
			if(s.charCodeAt(s.length - 1) !== 10) s += '\n'
		}
		return s
	}
	
	this.Program = function(node){
		// ok lets fetch the first function declaration if we have one
		return this.block(node.body, node)
	}

	this.BlockStatement = function(node){
		var oi = this.indent
		this.indent += '\t'
		var s = '{\n'
		s += this.block(node.body, node)
		this.indent = oi
		s += this.indent + '}'
		return s
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
		var s = ''
		var exps = node.expressions
		for(var i = 0; i < exps.length; i++){
			var exp = exps[i]
			if(i) i += ', '
			s += this.walk(exp, node)
		}
		return s
	}

	//ParenthesizedExpression:{expression:1}
	this.ParenthesizedExpression = function(node){
		return '(' + this.walk(node.expression, node) + ')'
	}

	//ReturnStatement:{argument:1},
	this.ReturnStatement = function(node){
		this.returnvalue = node
		return 'return '+ this.walk(node.argument)
	}

	//Identifier:{name:0},
	this.Identifier = function(node){
		var name = node.name
		// first we check the scope
		var scopetype = this.scope[name]

		if(scopetype){
			node.infer = {
				kind: 'scope',
				type: scopetype
			}
			return name
		}

		// native functions
		var glslfn = this.glslfunctions[name]
		if(glslfn){
			node.infer = {
				kind: 'functionref',
				glsl: true,
				callee: glslfn
			}
			return name
		}

		// then we check the native types
		var glsltype = this.glsltypes[name]
		if(glsltype){
			node.infer = {
				kind: 'typeref',
				typeref: glsltype
			}
			return name
		}
	
		// special kind
		if(name === 'vary' || name === 'props' || name === 'stamp' || name === 'view' || name === 'globals' || name === 'mesh' || name === 'locals'){
			node.infer = {
				kind:name
			}
			return name
		}

		// lets check on our context
		var value = this.context[name]

		// its a function
		if(typeof value === 'function'){
			node.infer = {
				kind: 'functionref',
				callee: value
			}
			return name
		}

		// its a define
		if(typeof value === 'string'){
			var ast = parser.parse(value)
			console.log(ast)
		}

		// its a struct
		if(typeof value === 'object' && value._type){
			node.infer = {
				kind: 'typeref',
				typeref: value
			}
		}
		
		// otherwise typeref it
		throw new Err('resolve', 'Cannot resolve '+name, node, this)
	}

	//Literal:{raw:0, value:0},
	this.Literal = function(node){
		if(node.kind === 'regexp') throw Err('syntax','Cant use regexps in shaders',node,this)
		if(node.kind === 'string'){
			node.infer = types.vec4
		}
		return node.raw
	}

	//ThisExpression:{},
	this.ThisExpression = function(node){		
		console.error("ThisExpression not implemented")
		return ''
	}

	//CallExpression:{callee:1, arguments:2},
	this.CallExpression = function(node){
		var s = this.walk(node.callee, node)
		var callee = node.callee
		var infer = node.callee.infer

		var args = node.arguments
		s += '('
		for(var i = 0; i < args.length; i++){
			if(i) s += ', '
			s += this.walk(args[i], node)
		}
		s += ')'

		if(infer.kind === 'typeref'){
			node.infer = {
				kind:'value',
				typeref:infer.typeref
			}
		}
		else if(infer.kind === 'functionref' && !infer.kind.glsl){
			// expand function macro
		}

		// ok so now lets type specialize and call our function
		// ie generate it
		return s
	}

	//MemberExpression:{object:1, property:types.gen, computed:0},
	this.MemberExpression = function(node){
		var objectstr = this.walk(node.object, node)

		if(node.computed){
			return 'huh'
		}
		else{
			console.log(node.object.infer)
			// lets check if node.infer holds property
			return objectstr + '.' + node.property.name
		}
		return ''
	}

	//FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	this.FunctionExpression = function(node){
		console.error("FunctionExpression not implemented")
		return ''
	}

	//FunctionDeclaration: {id:1, params:2, expression:0, body:1},
	this.FunctionDeclaration = function(node){
		console.error("FunctionDeclaration not implemented")
		return ''
	}

	//VariableDeclaration:{declarations:2, kind:0},
	this.VariableDeclaration = function(node){
		// ok we have to split into the types of the declarations
		var decls = node.declarations
		var s = ''
		for(var i = 0; i < decls.length; i++){
			if(i) i += ';'
			var decl = decls[i]
			var str = this.walk(decl, node)
			s += decl.infer.typeref._type + ' ' + str
		}
		return s
	}

	//VariableDeclarator:{id:1, init:1},
	this.VariableDeclarator = function(node){

		if(!node.init){
			throw Err('inference',node.type + ' cant infer type without initializer '+node.id.name, node, this)
		}

		var initstr = this.walk(node.init, node)
		var init = node.init

		// lets store it on our scope
		this.scope[node.id.name] = init.infer

		if(init.infer.kind === 'typeref' && init.type === 'CallExpression' &&
			init.args.length === 0){
			// just take the type, no constructor args
			return node.id.name
		}
		node.infer = init.infer

		return node.id.name + ' = ' + initstr
	}

	//LogicalExpression:{left:1, right:1, operator:0},
	this.LogicalExpression = function(node){
		console.error("LogicalExpression not implemented")
		return ''
	}

	//BinaryExpression:{left:1, right:1, operator:0},
	this.BinaryExpression = function(node){
		var s = this.walk(node.left, node) + ' ' + node.operator + ' ' + this.walk(node.right, node)
		return s
	}

	//AssignmentExpression: {left:1, right:1},
	this.AssignmentExpression = function(node){
		console.error("AssignmentExpression not implemented")
		return ''
	}

	//ConditionalExpression:{test:1, consequent:1, alternate:1},
	this.ConditionalExpression = function(node){
		console.error("ConditionalExpression not implemented")
		return ''
	}

	//UpdateExpression:{operator:0, prefix:0, argument:1},
	this.UpdateExpression = function(node){
		console.error("UpdateExpression not implemented")
		return ''
	}

	//UnaryExpression:{operator:0, prefix:0, argument:1},
	this.UnaryExpression = function(node){
		console.error("UnaryExpression not implemented")
		return ''
	}

	//IfStatement:{test:1, consequent:1, alternate:1},
	this.IfStatement = function(node){
		var s = 'if(' + this.walk(node.test) + ') ' 

		s += this.walk(node.consequent, node)

		//if(s.charCodeAt(s.length - 1) !== '\n') s += '\n'
		//s += '}'
		if(node.alternate){
			s+= 'else '+this.walk(node.alternate, node)
			//if(s.charCodeAt(s.length - 1) !== '\n') s += '\n'
		} 
		return s
	}

	//ForStatement:{init:1, test:1, update:1, body:1},
	this.ForStatement = function(node){
		console.error("ForStatement not implemented")

		return ''
	}

	// Exceptions
	function Err(type, message, node, state){
		var obj = this
		if(!(obj instanceof Err)) obj = Objectypes.create(Err.prototype)
		obj.type = type
		obj.message = message
		obj.node = node
		obj.state = state
		return obj
	}
	this.Err = Err
	Err.prototype.toString = function(){
		return this.type + ' ' + this.message
	}
	// Unsupported syntax

	this.YieldExpression = function(node){throw Err('syntax','YieldExpression',node, this)}
	this.ThrowStatement = function(node){throw Err('syntax','ThrowStatement',node, this)}
	this.TryStatement = function(node){throw Err('syntax','TryStatement',node, this)}
	this.CatchClause = function(node){throw Err('syntax','CatchClause',node, this)}
	this.Super = function(node){throw Err('syntax','Super',node, this)}
	this.AwaitExpression = function(node){throw Err('syntax','AwaitExpression',node, this)}
	this.MetaProperty = function(node){throw Err('syntax','MetaProperty',node, this)}
	this.NewExpression = function(node){throw Err('syntax','NewExpression',node, this)}
	this.ArrayExpression = function(node){throw Err('syntax','ArrayExpression',node, this)}
	this.ObjectExpression = function(node){throw Err('syntax','ObjectExpression',node, this)}
	this.ObjectPattern = function(node){throw Err('syntax','ObjectPattern',node, this)}
	this.ArrowFunctionExpression = function(node){throw Err('syntax','ArrowFunctionExpression',node, this)}
	this.ForInStatement = function(node){throw Err('syntax','ForInStatement',node, this)}
	this.ForOfStatement = function(node){throw Err('syntax','ForOfStatement',node, this)}
	this.WhileStatement = function(node){throw Err('syntax','WhileStatement',node, this)}
	this.DoWhileStatement = function(node){throw Err('syntax','DoWhileStatement',node, this)}
	this.SwitchStatement = function(node){throw Err('syntax','SwitchStatement',node, this)}
	this.SwitchCase = function(node){throw Err('syntax','SwitchCase',node, this)}
	this.TaggedTemplateExpression = function(node){throw Err('syntax','TaggedTemplateExpression',node, this)}
	this.TemplateElement = function(node){throw Err('syntax','TemplateElement',node, this)}
	this.TemplateLiteral = function(node){throw Err('syntax','TemplateLiteral',node, this)}
	this.ClassDeclaration = function(node){throw Err('syntax','ClassDeclaration',node, this)}
	this.ClassExpression = function(node){throw Err('syntax','ClassExpression',node, this)}
	this.ClassBody = function(node){throw Err('syntax','ClassBody',node, this)}
	this.MethodDefinition = function(node){throw Err('syntax','MethodDefinition',node, this)}
	this.ExportAllDeclaration = function(node){throw Err('syntax','ExportAllDeclaration',node, this)}
	this.ExportDefaultDeclaration = function(node){throw Err('syntax','ExportDefaultDeclaration',node, this)}
	this.ExportNamedDeclaration = function(node){throw Err('syntax','ExportNamedDeclaration',node, this)}
	this.ExportSpecifier = function(node){throw Err('syntax','ExportSpecifier',node, this)}
	this.ImportDeclaration = function(node){throw Err('syntax','ImportDeclaration',node, this)}
	this.ImportDefaultSpecifier = function(node){throw Err('syntax','ImportDefaultSpecifier',node, this)}
	this.ImportNamespaceSpecifier = function(node){throw Err('syntax','ImportNamespaceSpecifier',node, this)}
	this.ImportSpecifier = function(node){throw Err('syntax','ImportSpecifier',node, this)}
	this.DebuggerStatement = function(node){throw Err('syntax','DebuggerStatement',node, this)}
	this.LabeledStatement = function(node){throw Err('syntax','LabeledStatement',node, this)}
	this.WithStatement = function(node){throw Err('syntax','WithStatement',node, this)}

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
		typeof:{return:types.gen, params:{type:types.gen}}, 
		sizeof:{return:types.int, params:{type:types.gen}},

		radians:{return:types.gen, params:{x:types.gen}}, 
		degrees:{return:types.gen, params:{x:types.gen}},

		sin:{return:types.gen, params:{x:types.gen}}, 
		cos:{return:types.gen, params:{x:types.gen}}, 
		tan:{return:types.gen, params:{x:types.gen}},
		asin:{return:types.gen, params:{x:types.gen}}, 
		acos:{return:types.gen, params:{x:types.gen}}, 
		atan:{return:types.gen, params:{x:types.gen, y:types.genopt}},

		pow:{return:types.gen, params:{x:types.gen, y:types.gen}}, 
		exp:{return:types.gen, params:{x:types.gen}}, 
		log:{return:types.gen, params:{x:types.gen}}, 
		exp2:{return:types.gen, params:{x:types.gen}}, 
		log2:{return:types.gen, params:{x:types.gen}},

		sqrt:{return:types.gen, params:{x:types.gen}}, 
		inversesqrt:{return:types.gen, params:{x:types.gen}},

		abs:{return:types.gen, params:{x:types.gen}},
		sign:{return:types.gen, params:{x:types.gen}}, 
		floor:{return:types.gen, params:{x:types.gen}}, 
		ceil:{return:types.gen, params:{x:types.gen}}, 
		fract:{return:types.gen, params:{x:types.gen}},

		mod:{return:types.gen, params:{x:types.gen, y:types.gen}},
		min:{return:types.gen, params:{x:types.gen, y:types.gen}},
		max:{return:types.gen, params:{x:types.gen, y:types.gen}},
		clamp:{return:types.gen, params:{x:types.gen,min:types.gen,max:types.gen}},

		mix:{return:types.gen, params:{x:types.gen,y:types.gen,t:types.gen}},
		step:{return:types.gen, params:{edge:types.gen,x:types.gen}}, 
		smoothstep:{return:types.gen, params:{edge0:types.genfloat, edge1:types.genfloat, x:types.gen}},

		length:{return:types.float, params:{x:types.gen}}, 
		distance:{return:types.float, params:{p0:types.gen, p1:types.gen}}, 
		dot:{return:types.float, params:{x:types.gen, y:types.gen}},
		cross:{return:types.vec3, params:{x:types.vec3, y:types.vec3}},
		normalize:{return:types.gen, params:{x:types.gen}},
		faceforward:{return:types.gen, params:{n:types.gen, i:types.gen, nref:types.gen}},
		reflect:{return:types.gen, params:{i:types.gen, n:types.gen}}, 
		refract:{return:types.gen, params:{i:types.gen, n:types.gen, eta:types.float}},
		matrixCompMult:{return:types.mat4,params:{a:types.mat4,b:types.mat4}},

		lessThan:{return:types.bvec, params:{x:types.gen, y:types.gen}},
		lessThanEqual:{return:types.bvec, params:{x:types.gen, y:types.gen}},
		greaterThan:{return:types.bvec, params:{x:types.gen, y:types.gen}},
		greaterThanEqual:{return:types.bvec, params:{x:types.gen, y:types.gen}},
		equal:{return:types.bvec, params:{x:types.gen, y:types.gen}},
		notEqual:{return:types.bvec, params:{x:types.gen, y:types.gen}},
		any:{return:types.bool, params:{x:types.bvec}},
		all:{return:types.bool, params:{x:types.bvec}},
		not:{return:types.bvec, params:{x:types.bvec}},

		dFdx:{return:types.gen, params:{x:types.gen}}, 
		dFdy:{return:types.gen, params:{x:types.gen}},

		texture2DLod:{return:types.vec4, params:{sampler:types.sampler2D, coord:types.vec2, lod:types.float}},
		texture2DProjLod:{return:types.vec4, params:{sampler:types.sampler2D, coord:types.vec2, lod:types.float}},
		textureCubeLod:{return:types.vec4, params:{sampler:types.sampler2D, coord:types.vec3, lod:types.float}},
		texture2D:{return:types.vec4, params:{sampler:types.sampler2D, coord:types.vec2, bias:types.floatopt}},
		texture2DProj:{return:types.vec4, params:{sampler:types.sampler2D, coord:types.vec2, bias:types.floatopt}},
		textureCube:{return:types.vec4, params:{sampler:types.sampler2D, coord:types.vec3, bias:types.floatopt}},
	}

})