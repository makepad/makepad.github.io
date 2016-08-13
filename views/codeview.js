module.exports = require('views/editview').extend(function CodeView(proto, base){
	
	var parser = require('jsparser/jsparser')

	proto.onInit = function(){
		base.onInit.call(this)

		this.$fastTextOutput = this
		this.ann = []
		this.oldText = ''
	}

	proto.tools = {
		Text:require('shaders/codefontshader').extend({
			tween:2.,
			ease: [0,10,1.0,1.0],
			duration:0.3,
			displace:{
				0:{x:0,y:0.08},
				42:{x:0,y:-0.08} // * 
			}
		}),
		Block:require('shaders/fastrectshader').extend({
			borderRadius:5,
			tween:2.,
			ease: [0,10,1.0,1.0],
			duration:0.3,
			vertexStyle2:function(){
				var dx = .5
				//this.x -= dx
				this.y -= dx
				//this.w += 2.*dx
				this.h += 2.*dx
			}
		}),
		Marker:require('shaders/codemarkershader').extend({
			tween:2.,
			ease: [0,10,1.0,1.0],			
			duration:0.3,
		}),
		ErrorMarker:require('shaders/codemarkershader').extend({
			bgColor:'#522',
			opMargin:1,
			colorStyles:function(){$
				this.x2 -= 2.
				this.x3 += 2.
				this.opColor = this.bgColor*2.3
				this.borderColor = this.bgColor*1.4
			}
		}),
		ErrorText:require('shaders/sdffontshader').extend({
			font:require('fonts/ubuntu_medium_256.sdffont'),
			color:'red',
			outlineColor:'black',
			outlineWidth:1,
			lockScroll:0.,
			fontSize:16,
			y:2,
			x:'$15'
		})
	}
	
	proto.parseText = function(){
		this.ast = undefined
		try{
			this.ast = parser.parse(this.text,{
				storeComments:[]
			})
		}
		catch(e){
			this.error = e
		}
		return this.ast
	}

	proto.onDraw = function(){

		this.beginBg(this.viewBgProps)
		// ok lets parse the code
		//require.perf()
		if(this.textClean){
			this.reuseDrawSize()
			this.reuseBlock()
			this.reuseMarker()
			this.reuseErrorMarker()
			this.orderSelect()
			this.reuseText()
			if(this.error) this.reuseErrorText()
		}
		else{
			this.textClean = true
			this.orderBlock()
			this.orderMarker()
			this.orderErrorMarker()
			this.orderSelect()
			this.error = undefined

			this.$fastTextDelay = 0

			var ast = this.parseText()
			if(ast){
				// first we format the code
				this.indent = 0
				// the indent size
				this.indentSize = this.Text.prototype.font.fontmap.glyphs[32].advance * this.style.fontSize * 3
				this.lineHeight = this.style.fontSize

				var oldtext = this.text
				this.text = ''
				this.ann.length = 0
				this.$fastTextWrite = true

				// run the AST formatter
				this[ast.type](ast, null)

				// make undo operation for reformat
				var newtext = this.text
				var oldlen = oldtext.length
				var newlen = newtext.length
				for(var start = 0; start < oldlen && start < newlen; start++){
					if(oldtext.charCodeAt(start) !== newtext.charCodeAt(start))break
				}
				for(var oldend = oldlen-1, newend = newlen-1; oldend > start && newend > start; oldend--, newend--){
					if(oldtext.charCodeAt(oldend) !== newtext.charCodeAt(newend)) break
				}
				if(start !== newlen){
					// if something changed before our cursor, we have to scan
					// forward for our old char
					this.cs.scanChange(start, oldtext, newtext)

					// this gets tacked onto the undo with the same group
					this.addUndoInsert(start, oldlen, this.$undoStack, oldtext)
					this.addUndoDelete(start, newlen)
				}
				this.cs.clampCursor(0, newlen)
				console.log				
			}
			else{
				var ann = this.ann

				this.$fastTextWrite = false
				this.text = ''
				for(var i = 0, len = ann.length; i < len; i+=4){
					this.turtle.sx = ann[i+2]
					this.fastText(ann[i], ann[i+1],ann[i+3])
				}
				// lets query the geometry for the error pos
				var epos = clamp(this.error.pos, 0, this.$readLengthText()-1)
				var rd = this.$readOffsetText(epos)

				this.drawErrorMarker({
					x1:0,
					x2:rd.x,
					x3:rd.x + rd.w,
					x4:100000,
					y:rd.y,
					h:rd.fontSize * rd.lineSpacing
				})
				// lets draw the error
				this.drawErrorText({
					text:this.error.msg
				})
			}
			this.$fastTextDelta = 0
		}

		if(this.hasFocus){
			var cursors = this.cs.cursors
			for(var i = 0; i < cursors.length; i++){
				var cursor = cursors[i]
				var t = this.cursorRect(cursor.end)
				if(cursor.max < 0) cursor.max = t.x

				var boxes = this.$boundRectsText(cursor.lo(), cursor.hi())

				for(var j = 0; j < boxes.length;j++){
					var box = boxes[j]
					this.drawSelect({
						x:box.x,
						y:box.y,
						w:box.w,
						h:box.h
					})
				}
				this.drawCursor({
					x:t.x-1,
					y:t.y,
					w:2,
					h:t.h
				})
			}
		}
		//require.perf()
		this.endBg()
	}



	Object.defineProperty(proto,'styles',{
		get:function(){ return this.style },
		set:function(inStyles){
			this._protoStyles = protoInherit(this._protoStyles, inStyles)
			this.style = protoFlatten({}, this._protoStyles)
		}
	})

	var indentBlockColor = {
		0:'#352b',
		1:'#463b',
		2:'#574b',
		3:'#685b',
		4:'#796b',
		5:'#8a7b',
		6:'#9b8b'
	}

	var arrayBlockColor = {
		0:'#335b',
		1:'#446b',
		2:'#557b',
		3:'#668b',
		4:'#779b',
		5:'#88ab',
		6:'#99bb'
	}

	var forBlockColor = {
		0:'#515b',
		1:'#626b',
		2:'#737b',
		3:'#848b',
		4:'#959b',
		5:'#a6ab',
		6:'#b7bb'
	}
	
	var ifBlockColor = {
		0:'#514b',
		1:'#612b',
		2:'#713b',
		3:'#814b',
		4:'#915b',
		5:'#a16b',
		6:'#bb7b'
	}

	var objectBlockColor = {
		0:'#532b',
		1:'#643b',
		2:'#754b',
		3:'#865b',
		4:'#976b',
		5:'#a87b',
		6:'#b98b',
	}
	// nice cascading high perf styles for the text
	proto.styles = {
		fontSize:12,
		boldness:0.2,
		color:'white',
		italic:0,
		head:0,
		tail:0,
		Marker:{
			borderRadius:3,
			opColor:'gray',
			bgColor:'gray',
			borderColor:'gray',
			borderWidth:1.,
			'+':{
				bgColor:'#373'
			},
			'-':{
				bgColor:'#077'
			},
			'/':{
				bgColor:'#737'
			},
			'*':{
				bgColor:'#333'
			}
		},
		Comment:{
			boldness:0.3,
			color:'#0083f8',
			side:{
				head:0.5
			},
			above:{},
			top:{head:0.5},
			bottom:{head:0.5},
			around:{}
		},
		Paren:{
			boldness:0.,
			FunctionDeclaration:{},
			CallExpression:{},
			NewExpression:{},
			ParenthesizedExpression:{},
			IfStatement:{
				left:{},
				right:{tail:0.5}
			},
			ForStatement:{
				left:{},
				right:{tail:0.5}
			}
		},
		Comma:{
			FunctionDeclaration:{tail:0.5},
			CallExpression:{tail:0.5},
			ArrayExpression:{},
			ObjectExpression:{tail:0.5},
			VariableDeclaration:{},
			SequenceExpression:{},
			NewExpression:{tail:0.5}
		},
		Curly:{
			BlockStatement:{},
			ObjectExpression:{}
		},
		Dot:{
			MemberExpression:{}
		},
		SemiColon:{
			ForStatement:{tail:0.5}
		},
		Bracket:{
			MemberExpression:{},
			ArrayExpression:{
				boldness:0.
			}
		},
		QuestionMark:{
		},
		Colon:{
			ObjectExpression:{
				boldness:0.,
				color:'#fff'
			},
			ConditionalExpression:{}
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
				color:'#bbf'
			},
			boolean:{},
			regexp:{},
			object:{}
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
		NewExpression:{
			boldness:0.2,
			color:'#ffdf00'
		},
		CallExpression:{},

		// Objects and arrays
		ArrayExpression:{},
		ObjectExpression:{
			key:{
				alignLeft:0.25,
				alignRight:0.25,
				boldness:0.2,
				color:'#eecc00'
			}
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
		VariableDeclaration:{
			boldness:0.2,
			color:'#ffdf00'
		},
		VariableDeclarator:{},

		// a+b
		LogicalExpression:{
			head:0.5,
			tail:0.5,
			color:'#ff9f00'
		},
		BinaryExpression:{
			head:0.5,
			tail:0.5,
			color:'#ff9f00'
		},
		AssignmentExpression:{
			boldness:0.3,
			head:0.5,
			tail:0.5,
			'=':{
				color:'#ff9f00'
			}
		},
		ConditionalExpression:{
			head:0.5,
			tail:0.5
		},
		UpdateExpression:{
		},
		UnaryExpression:{},

		// if and for
		IfStatement:{
			if:{},
			else:{}
		},
		ForStatement:{
			in:{}
		},
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
			if(statement.above) this.fastText(statement.above, this.styles.Comment.above)
			this[statement.type](statement, node)
			if(statement.side) this.fastText(statement.side, this.styles.Comment.side)
		}

		if(node.bottom) this.fastText(node.bottom, this.styles.Comment)
	}

	//BlockStatement:{body:2},
	proto.doIndent = function(delta){
		this.indent += delta
		this.turtle.sx = this.indent * this.indentSize
		// check if our last newline needs reindenting
		if(this.text.charCodeAt(this.text.length - 1) === 10){
			this.ann[this.ann.length - 2] = this.turtle.wx = this.turtle.sx
		}
	}

	proto.BlockStatement = function(node, colorScheme){
		// store the startx/y position
		var turtle = this.turtle
		if(!colorScheme) colorScheme = indentBlockColor
		var startx = turtle.sx, starty = turtle.wy
		this.fastText('{', this.styles.Curly.BlockStatement)
		var endx = turtle.wx, lineh = turtle.mh
		// lets indent
		this.doIndent(1)
		//this.newLine()
		if(node.top) this.fastText(node.top, this.styles.Comment.top)
		var body = node.body
		var bodylen = body.length - 1
		for(var i = 0; i <= bodylen; i++){
			var statement = body[i]
			// the above

			if(statement.above) this.fastText(statement.above, this.styles.Comment.above)
			this[statement.type](statement, node)
			if(statement.side) this.fastText(statement.side, this.styles.Comment.side)
			// lets output the 
			//if(i < bodylen) this.newLine()
		}
		if(node.bottom) this.fastText(node.bottom, this.styles.Comment.bottom)
		this.doIndent(-1)
		// store endx endy
		var blockh = turtle.wy
		this.fastText('}', this.styles.Curly.BlockStatement)

		// lets draw a block with this information
		this.drawBlock({
			color:colorScheme[this.indent],
			x:startx, y:starty,
			w:endx - startx, h:lineh
		})

		this.drawBlock({
			color:colorScheme[this.indent],
			x:startx, y:starty+lineh-1,
			w:this.indentSize, h:blockh - starty+1
		})
	}

	//EmptyStatement:{}
	proto.EmptyStatement = function(node){
		console.log(node)
	}

	//ExpressionStatement:{expression:1},
	proto.ExpressionStatement = function(node){
		var exp = node.expression
		this[exp.type](exp)
	}

	//SequenceExpression:{expressions:2}
	proto.SequenceExpression = function(node){

		var exps = node.expressions
		var expslength = exps.length - 1
		for(var i = 0; i <= expslength; i++){
			var exp = exps[i]
			if(exp)this[exp.type](exp)
			if(i < expslength) this.fastText(',', this.styles.Comma.SequenceExpression)
		}
	}

	//ParenthesizedExpression:{expression:1}
	proto.ParenthesizedExpression = function(node, level){
		if(!level) level = 0
		this.fastText('(', this.style.Paren.ParenthesizedExpression)
		// check if we need to indent
		if(node.top){
			this.fastText(node.top, this.style.Comment.top)
			this.doIndent(1)
		}

		var exp = node.expression
		this[exp.type](exp, level+1)
		if(node.top){
			if(node.bottom) this.fastText(node.bottom, this.style.Comment.bottom)
			else this.fastText('\n', this.style.Comment.bottom)
			this.doIndent(-1)
		}
		this.fastText(')', this.style.Paren.ParenthesizedExpression)
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
		this[obj.type](obj)
		var prop = node.property

		if(node.computed){
			this.fastText('[', this.style.Bracket.MemberExpression)

			this[prop.type](prop, node)

			this.fastText(']', this.style.Bracket.MemberExpression)
		}
		else{
			if(node.around1){
				this.fastText(node.around1, this.style.Comment.around)
			}
			this.doIndent(1)
			this.fastText('.', this.style.Dot.MemberExpression)
			if(node.around2){
				this.fastText(node.around2, this.style.Comment.around)
			}
			this[prop.type](prop, node)
			this.doIndent(-1)
		}
	}

	//CallExpression:{callee:1, arguments:2},
	proto.CallExpression = function(node){
		var callee = node.callee
		var args = node.arguments
		this[callee.type](callee, node)

		this.fastText('(', this.style.Paren.CallExpression)

		// someone typed at the top.
		// now the question is if it was inserting or removing the top node
		var argslen = args.length - 1

		var dy = 0
		if(this.$readLengthText() === this.$fastTextOffset){
			dy = this.$fastTextDelta
			this.$fastTextDelta += argslen * dy
		}

		if(node.top){
			this.fastText(node.top, this.styles.Comment.top)
			this.doIndent(1)
		}
		
		for(var i = 0; i <= argslen;i++){
			var arg = args[i]
			if(node.top && arg.above) this.fastText(arg.above, this.styles.Comment.above)
			this[arg.type](arg)
			if(i < argslen) {
				this.fastText(',', this.style.Comma.CallExpression)
			}
			if(node.top){
				if(arg.side) this.fastText(arg.side, this.styles.Comment.side)
				else if(i < argslen)this.fastText('\n', this.styles.Comment.side)
			}
		}
		if(node.top){
			if(!node.bottom){
				if(this.text.charCodeAt(this.text.length -1) !== 10){
					this.fastText('\n', this.styles.Comment.bottom)
				}
			}
			else this.fastText(node.bottom, this.styles.Comment.bottom)
			this.doIndent(-1)
		}
		this.$fastTextDelta += dy
		this.fastText(')', this.style.Paren.CallExpression)
	}

	//NewExpression:{callee:1, arguments:2},
	proto.NewExpression = function(node){
		var callee = node.callee
		var args = node.arguments
		this.fastText('new ', this.style.NewExpression)
		// check newline/whitespace
		if(node.around2) this.fastText(node.around2, this.styles.Comment.around)
		this.CallExpression(node)

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

		if(node.top) this.fastText(node.top, this.styles.Comment.top)
		this.doIndent(1)

		var params = node.params
		var paramslen = params.length - 1
		for(var i =0 ; i <= paramslen; i++){
			var param = params[i]

			if(node.top && param.above) this.fastText(param.above, this.styles.Comment.above)
			this[param.type](param)
			if(i < paramslen) this.fastText(',', this.styles.Comma.FunctionDeclaration)
			if(node.top){
				if(param.side) this.fastText(param.side, this.styles.Comment.side)
				else if(i !== paramslen)this.fastText('\n', this.styles.Comment.side)
			}
		}

		if(node.top){
			if(!node.bottom){
				if(this.text.charCodeAt(this.text.length -1) !== 10){
					this.fastText('\n', this.styles.Comment.bottom)
				}
			}
			else this.fastText(node.bottom, this.styles.Comment.bottom)
		}

		this.doIndent(-1)

		this.fastText(')', this.styles.Paren.FunctionDeclaration)

		var body = node.body
		this[body.type](body)
	}

	//VariableDeclaration:{declarations:2, kind:0},
	proto.VariableDeclaration = function(node){
		this.fastText('var ', this.styles.VariableDeclaration)
		var decls = node.declarations
		var declslen = decls.length - 1
		for(var i = 0; i <= declslen; i++){
			var decl = decls[i]
			this[decl.type](decl)
			if(i !== declslen) this.fastText(',', this.styles.Comma.VariableDeclaration)
		}
	}

	//VariableDeclarator:{id:1, init:1},
	proto.VariableDeclarator = function(node){
		var id = node.id
		this[id.type](id, node)
		var init = node.init
		if(init){
			if(node.around1) this.fastText(node.around1, this.style.Comment.around)

			this.fastText('=', this.styles.AssignmentExpression['='])
		
			if(node.around2) this.fastText(node.around2, this.style.Comment.around)

			this[init.type](init)
		}
	}

	//LogicalExpression:{left:1, right:1, operator:0},
	proto.LogicalExpression = function(node){
		var left = node.left
		var right = node.right

		this[left.type](left)

		if(node.around1) this.fastText(node.around1, this.style.Comment.around)
		this.doIndent(1)

		this.fastText(node.operator, this.style.LogicalExpression[node.operator] || this.style.LogicalExpression)

		if(node.around2) this.fastText(node.around2, this.style.Comment.around)

		this[right.type](right)

		this.doIndent(-1)
	}

	//BinaryExpression:{left:1, right:1, operator:0},
	proto.BinaryExpression = function(node, level){
		level = level || 0
		var left = node.left
		var right = node.right
		var turtle = this.turtle
		// draw a marker
		var m = this.startMarker(turtle.wy, level, this.style.Marker[node.operator] || this.style.Marker)
		// we have to draw a backdrop 
		var x1 = turtle.wx 
		var ys = turtle.wy
		this[left.type](left, level+1)

		if(node.around1) this.fastText(node.around1, this.style.Comment.around)
		this.doIndent(1)

		var x2 = turtle.wx 
		this.fastText(node.operator, this.style.BinaryExpression[node.operator] || this.style.BinaryExpression)
		var x3 = turtle.wx 

		if(node.around2) this.fastText(node.around2, this.style.Comment.around)

		this[right.type](right, level+1)
		this.doIndent(-1)

		if(turtle.wy === ys) this.stopMarker(m, x1,x2,x3,turtle.wx, turtle.mh)
		else this.stopMarker(m, 0,0,0,0,0)
	}

	//AssignmentExpression: {left:1, operator:0, right:1},
	proto.AssignmentExpression = function(node){
		var left = node.left
		var right = node.right
		this[left.type](left)
		if(node.around1) this.fastText(node.around1, this.style.Comment.around)

		this.fastText(node.operator, this.style.AssignmentExpression[node.operator] || this.style.AssignmentExpression)

		if(node.around2) this.fastText(node.around2, this.style.Comment.around)

		this[right.type](right)
	}

	//ConditionalExpression:{test:1, consequent:1, alternate:1},
	proto.ConditionalExpression = function(node){
		var test = node.test
		this[test.type](test)
		this.fastText('?', this.style.QuestionMark)
		var cq = node.consequent
		this[cq.type](cq)
		this.fastText(':', this.style.Colon.ConditionalExpression)
		var alt = node.alternate
		this[alt.type](alt)
	}

	//UpdateExpression:{operator:0, prefix:0, argument:1},
	proto.UpdateExpression = function(node){
		if(node.prefix){
			var op = node.operator
			this.fastText(op, this.style.UpdateExpression[op] || this.style.UpdateExpression)
			var arg = node.argument
			this[arg.type](arg)
		}
		else{
			var arg = node.argument
			this[arg.type](arg)
			var op = node.operator
			this.fastText(op, this.style.UpdateExpression[op] || this.style.UpdateExpression)
		}
 	}

	//UnaryExpression:{operator:0, prefix:0, argument:1},
	proto.UnaryExpression = function(node){
		if(node.prefix){
			var op = node.operator
			this.fastText(op, this.style.UnaryExpression[op] || this.style.UnaryExpression)
			var arg = node.argument
			this[arg.type](arg)
		}
		else{
			var arg = node.argument
			this[arg.type](arg)
			var op = node.operator
			this.fastText(op, this.style.UnaryExpression[op] || this.style.UnaryExpression)
		}
 	}

	//IfStatement:{test:1, consequent:1, alternate:1},
	proto.IfStatement = function(node){
		this.fastText('if', this.style.IfStatement.if)
		this.fastText('(', this.style.Paren.IfStatement.left)
		var test = node.test
		this[test.type](test)
		this.fastText(')', this.style.Paren.IfStatement.right)
		var cq = node.consequent
		this[cq.type](cq, ifBlockColor)
		var alt = node.alternate
		if(alt){
			this.fastText('\nelse ', this.style.IfStatement.else)
			this[alt.type](alt, ifBlockColor)
		}
	}

	//ForStatement:{init:1, test:1, update:1, body:1},
	proto.ForStatement = function(node){
		this.fastText('for', this.style.ForStatement)
		this.fastText('(', this.style.Paren.ForStatement.left)
		var init = node.init
		this[init.type](init, 1)
		this.fastText(';', this.style.SemiColon.ForStatement)
		var test = node.test
		this[test.type](test, 1)
		this.fastText(';', this.style.SemiColon.ForStatement)
		var update = node.update
		this[update.type](update, 1)
		this.fastText(')', this.style.Paren.ForStatement.right)
		var body = node.body
		this[body.type](body, forBlockColor)
	}

	//ForInStatement:{left:1, right:1, body:1},
	proto.ForInStatement = function(node){
		this.fastText('for', this.style.ForStatement)
		this.fastText('(', this.style.Paren.ForStatement.left)
		var left = node.left
		this[left.type](left)
		this.fastText(' in ', this.style.ForStatement.in)
		var right = node.right
		this[right.type](right)
		this.fastText(')', this.style.Paren.ForStatement.right)
		var body = node.body
		this[body.type](body, forBlockColor)
	}

	//ForOfStatement:{left:1, right:1, body:1},
	proto.ForOfStatement = function(node){
		logNonexisting(node)
	}

	//BreakStatement:{label:1},
	proto.BreakStatement = function(node){
		if(node.label){
			var label = node.label
			this.fastText('break ', this.style.BreakStatement)
			this[label.type](label)
		}
		else{
			this.fastText('break', this.style.BreakStatement)
		}
	}

	//ContinueStatement:{label:1},
	proto.ContinueStatement = function(node){
		if(node.label){
			var label = node.label
			this.fastText('continue ', this.style.ContinueStatement)
			this[label.type](label)
		}
		else{
			this.fastText('continue', this.style.ContinueStatement)
		}
	}

	//ArrayExpression:{elements:2},
	proto.ArrayExpression = function(node){
		var turtle = this.turtle

		var startx = turtle.sx, starty = turtle.wy
		this.fastText('[', this.styles.Bracket.ArrayExpression)

		var elems = node.elements
		var elemslen = elems.length - 1

		if(this.$readLengthText() === this.$fastTextOffset){
			this.$fastTextDelta += (elemslen+1)*this.$fastTextDelta
		}

		var endx = turtle.wx, lineh = turtle.mh
		// lets indent
		if(node.top){
			this.fastText(node.top, this.styles.Comment.top)
			this.doIndent(1)
		}

		for(var i = 0; i <= elemslen; i++){
			var elem = elems[i]

			if(elem){
				if(node.top && elem.above) this.fastText(elem.above, this.styles.Comment.above)
				this[elem.type](elem)
			}
			if(i < elemslen) this.fastText(',', this.styles.Comma.ArrayExpression)

			if(elem && node.top){
				if(elem.side) this.fastText(elem.side, this.styles.Comment.side)
				else if(i !== elemslen)this.fastText('\n', this.styles.Comment.side)
			}
		}

		if(node.top){
			if(!node.bottom){
				if(this.text.charCodeAt(this.text.length -1) !== 10){
					this.fastText('\n', this.styles.Comment.bottom)
				}
			}
			else this.fastText(node.bottom, this.styles.Comment.bottom)
			this.doIndent(-1)
		}

		var blockh = turtle.wy
		this.fastText(']', this.styles.Bracket.ArrayExpression)

		if(node.top){
			// lets draw a block with this information
			this.drawBlock({
				color:arrayBlockColor[this.indent],
				x:startx, y:starty,
				w:endx - startx, h:lineh
			})

			this.drawBlock({
				color:arrayBlockColor[this.indent],
				x:startx, y:starty+lineh-1,
				w:this.indentSize, h:blockh - starty+1
			})
		}
	}
	//ObjectExpression:{properties:3},
	proto.ObjectExpression = function(node){
		var turtle = this.turtle
		var keyStyle = this.styles.ObjectExpression.key

		var startx = turtle.sx, starty = turtle.wy

		this.fastText('{', this.styles.Curly.ObjectExpression)
		
		var endx = turtle.wx, lineh = turtle.mh

		// lets indent
		var turtle = this.turtle
		var props = node.properties
		var propslen = props.length - 1

		// make space for our expanded or collapsed view
		var dy = 0
		if(this.$readLengthText() === this.$fastTextOffset){
			dy = this.$fastTextDelta
			this.$fastTextDelta += dy * propslen
		}

		//this.newLine()
		if(node.top){
			var maxlen = 0
			this.fastText(node.top, this.styles.Comment.top)
			this.doIndent(1)
			// compute the max key size
			for(var i = 0; i <= propslen; i++){
				var key = props[i].key
				if(key.type === 'Identifier'){
					var keylen = key.name.length
					if(keylen > maxlen) maxlen = keylen
				}
			}
		}		

		for(var i = 0; i <= propslen; i++){

			var prop = props[i]
			if(node.top && prop.above) this.fastText(prop.above, this.styles.Comment.above)
			var key = prop.key

			var keypos = undefined
			if(key.type === 'Identifier'){
				if(node.top) keypos = key.name.length
				this.fastText(key.name, keyStyle,keypos?(maxlen - keypos)*keyStyle.alignLeft:0)
			}
			else this[key.type](key)

			if(!prop.shorthand){
				this.fastText(':', this.styles.Colon.ObjectExpression,keypos?(maxlen - keypos)*keyStyle.alignRight:0)
				var value = prop.value
				this[value.type](value)
			}

			if(node.tail || i < propslen){
				this.fastText(',', this.styles.Comma.ObjectExpression)
			}

			if(node.top){
				if(prop.side) this.fastText(prop.side, this.styles.Comment.side)
				else if(i !== propslen)this.fastText('\n', this.styles.Comment.side)
			}

		}

		if(node.top){
			if(!node.bottom){
				if(this.text.charCodeAt(this.text.length -1) !== 10){
					this.fastText('\n', this.styles.Comment.bottom)
				}
			}
			else this.fastText(node.bottom, this.styles.Comment.bottom)
			this.doIndent(-1)
		}
		this.$fastTextDelta += dy
		this.fastText('}', this.styles.Curly.ObjectExpression)

		var blockh = turtle.wy

		//if(node.top){
			// lets draw a block with this information
			this.drawBlock({
				color:objectBlockColor[this.indent],
				x:startx, y:starty,
				w:endx - startx, h:lineh
			})

			this.drawBlock({
				color:objectBlockColor[this.indent],
				x:startx, y:starty+lineh-1,
				w:this.indentSize, h:blockh - starty+1
			})
		//}
	}

	//YieldExpression:{argument:1, delegate:0}
	proto.YieldExpression = function(node){
		logNonexisting(node)
	}
	
	//ThrowStatement:{argument:1},
	proto.ThrowStatement = function(node){
		var arg = node.argument
		if(arg){
			this.fastText('throw ', this.styles.ThrowStatement)
			this[arg.type](arg, node)
		}
		else{
			this.fastText('throw', this.styles.ThrowStatement)
		}
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


	//ObjectPattern:{properties:3},
	proto.ObjectPattern = function(node){
		logNonexisting(node)
	}

	//ArrowFunctionExpression:{params:2, expression:0, body:1},
	proto.ArrowFunctionExpression = function(node){
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
		var label = node.label
		this[label.type](label)
		this.fastText(':', this.styles.LabeledStatement)
		var body = node.body
		this[body.type](body)
	}
	// WithStatement:{object:1, body:1}
	proto.WithStatement = function(node){
		logNonexisting(node)
	}

	//TryStatement:{block:1, handler:1, finalizer:1},
	proto.SpreadElement = function(node){
		logNonexisting(node)
	}

	proto.insertText = function(offset, text){

		this.$fastTextDelta += text.length
		this.$fastTextOffset = offset 
		this.$fastTextStart = offset + text.length 
		this.$fastTextAdd = text
		this.textClean = false
		this.text = this.text.slice(0, offset) + text + this.text.slice(offset)

		// alright lets find the insertion spot in ann
		var ann = this.ann
		// process insert into annotated array
		var pos = 0
		for(var i = 0, len = ann.length; i < len; i+=4){
			var txt = ann[i]
			pos += txt.length
			if(offset<=pos){
				var idx = offset - (pos - txt.length)
				ann[i] = txt.slice(0, idx) + text + txt.slice(idx) 
				break
			}
		}
		this.redraw()
	}

	proto.removeText = function(start, end){
		this.textClean = false
		this.text = this.text.slice(0, start) + this.text.slice(end)

		this.$fastTextAdd = ''
		this.$fastTextDelta -= (end - start)
		this.$fastTextStart = 
		this.$fastTextOffset = start

		// process a remove from the annotated array
		var ann = this.ann
		var pos = 0
		for(var i = 0, len = ann.length; i < len; i+=4){
			var txt = ann[i]
			pos += txt.length
			if(start<pos){
				var idx = start - (pos - txt.length)
				ann[i] = txt.slice(0, idx)
				if(end<=pos){
					var idx = end - (pos - txt.length)
					ann[i] += txt.slice(idx)
				}
				else{ // end is in the next one
					for(; i < len; i+=4){
						var txt = ann[i]
						pos += txt.length
						if(end<pos){
							var idx = end - (pos - txt.length)
							ann[i] = txt.slice(idx)
							break
						}
						else ann[i] = ''
					}
				}
				break
			}
		}
		this.redraw()
	}

	proto.serializeSlice = function(start, end, arg){
		if(arg) return arg.slice(start, end)
		return this.text.slice(start, end)
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
					item = proto.parseColor(item,1)
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