module.exports = require('views/editview').extend(function CodeView(proto){
	
	var parser = require('jsparser/jsparser')

	Object.defineProperty(proto,'styles',{
		get:function(){ return this.style },
		set:function(inStyles){
			this._protoStyles = protoInherit(this._protoStyles, inStyles)
			this.style = protoFlatten({}, this._protoStyles)
		}
	})


	proto.onDraw = function(){

		this.beginBg(this.viewBgProps)

		this.drawSelect()

		// ok lets parse the code
		try{
			var ast = parser.parse(this.text)


			// first we format the code
			this.indent = 0
			// the indent size
			this.indentSize = this.Text.prototype.font.fontmap.glyphs[32].advance * this.style.fontSize * 3
			this.lineHeight = this.style.fontSize
			this.fastTextOutput = ''

			this[ast.type](ast, null)

			this.text = this.fastTextOutput

		}
		catch(e){ // uhoh.. we need to fall back to textmode
			this.fastText(this.text, this.style)
			// OR we do use tabs but
			// we dont use spaces.
			// yea we can use special character margins
			// which will be the same everywhere
			// problem is we cant vertically align objects
		}

		if(this.hasFocus){
			var cursors = this.cs.cursors
			for(var i = 0; i < cursors.length; i++){
				var cursor = cursors[i]

				var t = this.cursorRect(cursor.end)
				var boxes = this.$boundRectsText(cursor.lo(), cursor.hi())

				for(var j = 0; j < boxes.length;j++){
					var box = boxes[j]
					this.drawSelect({
						x:box.x,
						y:box.y,
						w:box.w,
						h:box.h
					})
					// lets tell the keyboard
				}
				/*
				if(cursor.byFinger && boxes.length){
					var box = boxes[0]
					this.drawSelectHandle({
						x:box.x-15,
						y:box.y-15,
						h:30,
						w:30
					})
					var box = boxes[boxes.length-1]
					this.drawSelectHandle({
						x:box.x+box.w-15,
						y:box.y+box.h-15,
						h:30,
						w:30
					})

				}*/

				this.drawCursor({
					x:t.x-1,
					y:t.y,
					w:2,
					h:t.h
				})
			}
		}
		this.endBg()
	}

	proto.tools = {

	}

	// nice cascading high perf styles for the text
	proto.styles = {
		fontSize:12,
		boldness:0.,
		color:'white',

		outlineColor:[0,0,0,0],

		shadowblur:0,
		shadowSpread:0,
		shadowOffset:[0,0],
		shadowColor:[0,0,0,0],

		italic:0,
		outlineWidth:0,
		lockScroll:1,

		ease:[0,0,0,0],
		duration:0.,
		tween:0.,

		margin:[0,0,0,0],

		Paren:{
			boldness:0.,
			FunctionDeclaration:{},
			CallExpression:{}
		},
		Comma:{
			FunctionDeclaration:{},
			CallExpression:{},
			ArrayExpression:{},
			ObjectExpression:{}
		},
		Curly:{
			BlockStatement:{},
			ObjectExpression:{}
		},
		Dot:{
			MemberExpression:{}
		},
		Bracket:{
			MemberExpression:{},
			ArrayExpression:{
				boldness:0.
			}
		},
		Colon:{
			ObjectExpression:{
				boldness:0.,
				color:'#fff'
			}
		},

		Program:{},
		EmptyStatement:{},
		ExpressionStatement:{},
		BlockStatement:{},
		SequenceExpression:{},
		ParenthesizedExpression:{},
		ReturnStatement:{},
		YieldExpression:{},
		ThrowStatement:{},
		TryStatement:{},
		CatchClause:{},
		// simple bits
		Identifier:{
			color:'#eee',
			ObjectExpression:{
				color:'#f77'
			},
			FunctionDeclaration:{
				color:"#bbb"
			}
		},
		Literal:{
			string:{
				color:'#0f0'
			},
			num:{
				boldness:0.4,
				color:'#77f'
			},
			boolean:{},
			regexp:{},
		},
		ThisExpression:{
			boldness:0.3,
			color:'#f9f'
		},
		Super:{},
		// await
		AwaitExpression:{},

		// new and call
		MetaProperty:{},
		NewExpression:{},
		CallExpression:{},

		// Objects and arrays
		ArrayExpression:{},
		ObjectExpression:{
			key:{}
		},
		ObjectPattern:{},
		MemberExpression:{},

		// functions
		FunctionExpression:{},
		ArrowFunctionExpression:{},
		FunctionDeclaration:{
			boldness:0.2,
			color:'#ffdf00'
		},

		// variable declarations
		VariableDeclaration:{},
		VariableDeclarator:{},

		// a+b
		LogicalExpression:{},
		BinaryExpression:{},
		AssignmentExpression:{
			boldness:0.3,
			'=':{
				color:'#ff9f00',
				margin:[0,.5,0,.5]
			}
		},
		ConditionalExpression:{},
		UpdateExpression:{},
		UnaryExpression:{},

		// if and for
		IfStatement:{},
		ForStatement:{},
		ForInStatement:{},
		ForOfStatement:{},
		WhileStatement:{},
		DoWhileStatement:{},
		BreakStatement:{},
		ContinueStatement:{},

		// switch
		SwitchStatement:{},
		SwitchCase:{},

		// templates
		TaggedTemplateExpression:{},
		TemplateElement:{},
		TemplateLiteral:{},

		// classes
		ClassDeclaration:{},
		ClassExpression:{},
		ClassBody:{},
		MethodDefinition:{},
		
		// modules
		ExportAllDeclaration:{},
		ExportDefaultDeclaration:{},
		ExportNamedDeclaration:{},
		ExportSpecifier:{},
		ImportDeclaration:{},
		ImportDefaultSpecifier:{},
		ImportNamespaceSpecifier:{},
		ImportSpecifier:{},

		// other
		DebuggerStatement:{},
		LabeledStatement:{},
		WithStatement:{}

	}

	var logNonexisting = function(node){
		console.log(node.type)
	}
	
	//Program:{ body:2 },
	proto.Program = function(node){
		var body = node.body
		for(var i = 0; i < body.length; i++){
			var statement = body[i]
			this[statement.type](statement, node)
		}
	}

	//BlockStatement:{body:2},
	proto.newLine = function(){
		this.turtle.sx = this.indent * this.indentSize
		this.fastText('\n', this.styles)
	}

	proto.BlockStatement = function(node){
		this.fastText('{', this.styles.Curly.BlockStatement)
		// lets indent
		var turtle = this.turtle
		this.indent++
		this.newLine()

		var body = node.body
		var bodylen = body.length - 1
		for(var i = 0; i <= bodylen; i++){
			var statement = body[i]
			this[statement.type](statement, node)
			if(i < bodylen) this.newLine()
		}
		this.indent --
		this.newLine()
		this.fastText('}', this.styles.Curly.BlockStatement)
		// lets draw a block with this information

	}

	//EmptyStatement:{}
	proto.EmptyStatement = function(node){
		console.log(node)
	}

	//ExpressionStatement:{expression:1},
	proto.ExpressionStatement = function(node){
		var exp = node.expression
		this[exp.type](exp, node)
	}

	//SequenceExpression:{expressions:2}
	proto.SequenceExpression = function(node){
		logNonexisting(node)
	}

	//ParenthesizedExpression:{expression:1}
	proto.ParenthesizedExpression = function(node){
		logNonexisting(node)
	}

	//Literal:{raw:0, value:0},
	proto.Literal = function(node){
		this.fastText(node.raw, this.style.Literal[node.kind])
	}

	//Identifier:{name:0},
	proto.Identifier = function(node){
		this.fastText(node.name, this.style.Identifier)
	}

	//ThisExpression:{},
	proto.ThisExpression = function(node){
		this.fastText('this', this.style.ThisExpression)
	}

	//MemberExpression:{object:1, property:1, computed:0},
	proto.MemberExpression = function(node){
		var obj = node.object
		this[obj.type](obj, node)
		var prop = node.property
		if(node.computed){
			this.fastText('[', this.style.Bracket.MemberExpression)
			this[prop.type](prop, node)
			this.fastText(']', this.style.Bracket.MemberExpression)
		}
		else{
			this.fastText('.', this.style.Dot.MemberExpression)
			this[prop.type](prop, node)
		}
	}

	//CallExpression:{callee:1, arguments:2},
	proto.CallExpression = function(node){
		var callee = node.callee
		var args = node.arguments
		this[callee.type](callee, node)
		this.fastText('(', this.style.Paren.CallExpression)
		for(var i = 0; i < args.length;i++){
			var arg = args[i]
			if(i) this.fastText(',', this.style.Comma.CallExpression)
			this[arg.type](arg, node)
		}
		this.fastText(')', this.style.Paren.CallExpression)
	}

	//ReturnStatement:{argument:1},
	proto.ReturnStatement = function(node){
		var arg = node.argument
		if(arg){
			this.fastText('return ', this.styles.ReturnStatement)
			this[arg.type](arg, node)
		}
		else{
			this.fastText('return', this.styles.ReturnStatement)
		}
	}

	//FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	proto.FunctionExpression = function(node){
		this.FunctionDeclaration(node)
	}

	//FunctionDeclaration: {id:1, params:2, expression:0, body:1},
	proto.FunctionDeclaration = function(node){
		var id = node.id

		if(id){
			this.fastText('function ', this.styles.FunctionDeclaration)
			this.fastText(id.name, this.styles.Identifier.FunctionDeclaration)
		}
		else{
			this.fastText('function', this.styles.FunctionDeclaration)
		}

		this.fastText('(', this.styles.Paren.FunctionDeclaration)
		var params = node.params
		for(var i =0 ; i < params.length; i++){
			var param = params[i]
			if(i) this.fastText(',', this.styles.Comma.FunctionDeclaration)
			this[param.type](param, node)

		}
		this.fastText(')', this.styles.Paren.FunctionDeclaration)

		var body = node.body
		this[body.type](body, node)
	}

	//VariableDeclaration:{declarations:2, kind:0},
	proto.VariableDeclaration = function(node){
		logNonexisting(node)
	}

	//VariableDeclarator:{id:1, init:1},
	proto.VariableDeclarator = function(node){
		logNonexisting(node)
	}

	//LogicalExpression:{left:1, right:1, operator:0},
	proto.LogicalExpression = function(node){
		logNonexisting(node)
	}

	//BinaryExpression:{left:1, right:1, operator:0},
	proto.BinaryExpression = function(node){
		logNonexisting(node)
	}

	//AssignmentExpression: {left:1, operator:0, right:1},
	proto.AssignmentExpression = function(node){
		var left = node.left
		var right = node.right
		this[left.type](left, node)
		var opstyle = 
		this.fastText('=', this.style.AssignmentExpression[node.operator] || this.style.AssignmentExpression)
		this[right.type](right, node)
	}

	//ConditionalExpression:{test:1, consequent:1, alternate:1},
	proto.ConditionalExpression = function(node){
		logNonexisting(node)
	}

	//UpdateExpression:{operator:0, prefix:0, argument:1},
	proto.UpdateExpression = function(node){
		logNonexisting(node)
 	}

	//UnaryExpression:{operator:0, prefix:0, argument:1},
	proto.UnaryExpression = function(node){
		logNonexisting(node)
 	}

	//IfStatement:{test:1, consequent:1, alternate:1},
	proto.IfStatement = function(node){
		logNonexisting(node)
	}

	//ForStatement:{init:1, test:1, update:1, body:1},
	proto.ForStatement = function(node){
		logNonexisting(node)
	}

	//BreakStatement:{label:1},
	proto.BreakStatement = function(node){
		logNonexisting(node)
	}

	//ContinueStatement:{label:1},
	proto.ContinueStatement = function(node){
		logNonexisting(node)
	}

	//ArrayExpression:{elements:2},
	proto.ArrayExpression = function(node){
		this.fastText('[', this.styles.Bracket.ArrayExpression)
		// lets indent
		var turtle = this.turtle
		this.indent++
		this.newLine()

		var elems = node.elements
		for(var i = 0; i < elems.length; i++){
			var elem = elems[i]
			if(i) this.fastText(',', this.styles.Comma.ArrayExpression)
			this[elem.type](elem, node)
		}

		this.indent --
		this.newLine()
		this.fastText(']', this.styles.Bracket.ArrayExpression)
	}

	//ObjectExpression:{properties:3},
	proto.ObjectExpression = function(node){
		this.fastText('{', this.styles.Curly.ObjectExpression)
		// lets indent
		var turtle = this.turtle
		this.indent++
		this.newLine()

		var props = node.properties
		var propslen= props.length - 1
		for(var i = 0; i <= propslen; i++){
			var prop = props[i]
			this.fastText(prop.key.name, this.styles.Identifier.ObjectExpression)
			this.fastText(':', this.styles.Colon.ObjectExpression)
			var value = prop.value
			this[value.type](value, node)
			if(i !== propslen){
				this.fastText(',', this.styles.Comma.ObjectExpression)
				this.newLine()
			}
		}

		this.indent --
		this.newLine()
		this.fastText('}', this.styles.Curly.ObjectExpression)
	}

	//YieldExpression:{argument:1, delegate:0}
	proto.YieldExpression = function(node){
		logNonexisting(node)
	}
	
	//ThrowStatement:{argument:1},
	proto.ThrowStatement = function(node){
		logNonexisting(node)
	}

	//TryStatement:{block:1, handler:1, finalizer:1},
	proto.TryStatement = function(node){
		logNonexisting(node)
	}

	//CatchClause:{param:1, body:1},
	proto.CatchClause = function(node){
		logNonexisting(node)
	}

	//Super:{},
	proto.Super = function(node){
		logNonexisting(node)
	}

	//AwaitExpression:{argument:1},
	proto.AwaitExpression = function(node){
		logNonexisting(node)
	}

	//MetaProperty:{meta:1, property:1},
	proto.MetaProperty = function(node){
		logNonexisting(node)
	}

	//NewExpression:{callee:1, arguments:2},
	proto.NewExpression = function(node){
		logNonexisting(node)
	}

	//ObjectPattern:{properties:3},
	proto.ObjectPattern = function(node){
		logNonexisting(node)
	}

	//ArrowFunctionExpression:{params:2, expression:0, body:1},
	proto.ArrowFunctionExpression = function(node){
		logNonexisting(node)
	}

	//ForInStatement:{left:1, right:1, body:1},
	proto.ForInStatement = function(node){
		logNonexisting(node)
	}

	//ForOfStatement:{left:1, right:1, body:1},
	proto.ForOfStatement = function(node){
		logNonexisting(node)
	}

	//WhileStatement:{body:1, test:1},
	proto.WhileStatement = function(node){
		logNonexisting(node)
	}

	//DoWhileStatement:{body:1, test:1},
	proto.DoWhileStatement = function(node){
		logNonexisting(node)
	}

	//SwitchStatement:{discriminant:1, cases:2},
	proto.SwitchStatement = function(node){
		logNonexisting(node)
	}

	//SwitchCase:{test:1, consequent:1},
	proto.SwitchCase = function(node){
		logNonexisting(node)
	}

	//TaggedTemplateExpression:{tag:1, quasi:1},
	proto.TaggedTemplateExpression = function(node){
		logNonexisting(node)
	}

	//TemplateElement:{tail:0, value:0},
	proto.TemplateElement = function(node){
		logNonexisting(node)
	}

	//TemplateLiteral:{expressions:2, quasis:2},
	proto.TemplateLiteral = function(node){
		logNonexisting(node)
	}

	//ClassDeclaration:{id:1,superClass:1},
	proto.ClassDeclaration = function(node){
		logNonexisting(node)
	}

	//ClassExpression:{id:1,superClass:1},
	proto.ClassExpression = function(node){
		logNonexisting(node)
	}

	//ClassBody:{body:2},
	proto.ClassBody = function(node){
		logNonexisting(node)
	}

	//MethodDefinition:{value:1, kind:0, static:0},
	proto.MethodDefinition = function(node){
		logNonexisting(node)
	}

	//ExportAllDeclaration:{source:1},
	proto.ExportAllDeclaration = function(node){
		logNonexisting(node)
	}

	//ExportDefaultDeclaration:{declaration:1},
	proto.ExportDefaultDeclaration = function(node){
		logNonexisting(node)
	}
	//ExportNamedDeclaration:{declaration:1, source:1, specifiers:2},
	proto.ExportNamedDeclaration = function(node){
		logNonexisting(node)
	}
	//ExportSpecifier:{local:1, exported:1},
	proto.ExportSpecifier = function(node){
		logNonexisting(node)
	}
	//ImportDeclaration:{specifiers:2, source:1},
	proto.ImportDeclaration = function(node){
		logNonexisting(node)
	}
	//ImportDefaultSpecifier:{local:1},
	proto.ImportDefaultSpecifier = function(node){
		logNonexisting(node)
	}
	//ImportNamespaceSpecifier:{local:1},
	proto.ImportNamespaceSpecifier = function(node){
		logNonexisting(node)
	}
	//ImportSpecifier:{imported:1, local:1},
	proto.ImportSpecifier = function(node){
		logNonexisting(node)
	}
	//DebuggerStatement:{},
	proto.DebuggerStatement = function(node){
		logNonexisting(node)
	}
	//LabeledStatement:{label:1, body:1},
	proto.LabeledStatement = function(node){
		logNonexisting(node)
	}
	// WithStatement:{object:1, body:1}
	proto.WithStatement = function(node){
		logNonexisting(node)
	}


	// creates a prototypical inheritance overload from an object
	function protoInherit(oldobj, newobj){
		// copy oldobj
		var outobj = oldobj?Object.create(oldobj):{}
		// copy old object subobjects
		for(var key in oldobj){
			var item = oldobj[key]
			if(item && item.constructor === Object){
				outobj[key] = protoInherit(item, newobj[key])
			}
		}
		// overwrite new object
		for(var key in newobj){
			var item = newobj[key]
			if(item && item.constructor === Object){
				outobj[key] = protoInherit(oldobj && oldobj[key], newobj[key])
			}
			else{
				if(typeof item === 'string'){
					item = proto.parseColor(item)
				}
				outobj[key] = item
			}
		}
		return outobj
	}

	// copys all properties down the chain
	function protoFlatten(outobj, inobj, parent){
		var subobjs
		// copy parent props
		for(var key in parent){
			var item = parent[key]
			if(!item || item.constructor !== Object){
				if(!inobj || inobj[key] === undefined) outobj[key] = item
			}
		}

		// copy inobj props
		for(var key in inobj){
			var item = inobj[key]
			if(!item || item.constructor !== Object){
				outobj[key] = item
			}
		}

		// copy inobj objs
		for(var key in inobj){
			var item = inobj[key]
			if(item && item.constructor === Object){
				protoFlatten(outobj[key] = {}, item, outobj)
			}
		}		
		return outobj
	}

})