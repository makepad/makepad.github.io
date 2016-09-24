var logNonexisting = function(node){
	console.log(node.type)
}

module.exports = class JSFormatter extends require('base/class'){

	prototype(){
		this.glslGlobals = {$:1}
		for(let glslKey in require('base/infer').prototype.glsltypes) this.glslGlobals[glslKey] = 1
		for(let glslKey in require('base/infer').prototype.glslfunctions) this.glslGlobals[glslKey] = 1
	}

	formatJS(indentSize, ast){
		this.indent = 0
		this.currentIndent = this.drawPadding && this.drawPadding[3] || this.padding[3]
		this.indentSize = indentSize
		this._text = ''
		//this.trace = ''
		//this.traceMap = []//[]
		this.ann.length = 0
		this.$fastTextAnnotate = true
		this.scope = Object.create(this.defaultScope)

		// run the AST formatter
		this[this.ast.type](this.ast, null)
	}

	//Program:{ body:2 },	
	Program(node){
		var body = node.body
		for(let i = 0; i < body.length; i++){
			var statement = body[i]
			if(statement.above) this.fastText(statement.above, this.styles.Comment.above)
			this[statement.type](statement, node)
			if(statement.side) this.fastText(statement.side, this.styles.Comment.side)
			this.trace += '\n'
		}

		if(node.bottom) this.fastText(node.bottom, this.styles.Comment)
	}

	//BlockStatement:{body:2},
	indentIn(){
		this.indent++
		this.currentIndent += this.indentSize * this.$fastTextFontSize 

		this.turtle.sx = this.currentIndent//this.indent * this.indentSize + this.padding[3]
		// check if our last newline needs reindenting
		if(this.lastIsNewline()){
			//this.ann[this.ann.length - 1] = 
			this.turtle.wx = this.turtle.sx
		}
	}

	lastIsNewline(){
		var text = this.ann[this.ann.length - this.ann.step]
		var last = text.charCodeAt(text.length - 1)
		if(last === 10 || last === 13){
			return true
		}
		return false
	}

	indentOut(delta){
		this.indent--
		this.currentIndent -= this.indentSize * this.$fastTextFontSize
		this.turtle.sx = this.currentIndent//this.indent * this.indentSize + this.padding[3]
		// check if our last newline needs reindenting
		if(this.lastIsNewline()){
		//	var al = 
			//if(!this.ann[al - 5].isComment){
			this.ann[this.ann.length - 1] = -this.ann[this.ann.length - 1]
			this.turtle.wx = this.turtle.sx
			//}
		}
	}

	BlockStatement(node, colorScheme, parent){
		// store the startx/y position
		var turtle = this.turtle

		var startx = turtle.sx, starty = turtle.wy
		
		this.trace += '{'
		var traceHandler = false
		if(parent && this.traceMap && (parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression')){
			traceHandler = this.traceMap.push(parent)
			this.trace += '$T('+traceHandler+',this);'
			var params = parent.params
			var paramslen = params.length - 1
			for(let i =0 ; i <= paramslen; i++){
				var param = params[i]
				if(param.type === 'Identifier'){
					this.trace += '$T(' + this.traceMap.push(param)+');'
				}
			}
			this.trace += 'try{'
		}

		this.fastText('{', this.styles.Curly.BlockStatement)

		var endx = turtle.wx, lineh = turtle.mh
		// lets indent
		this.indentIn()
		//this.newLine()
		var top = node.top

		var body = node.body
		var bodylen = body.length - 1

		if(top){
			this.fastText(node.top, this.styles.Comment.top)

			var isFolded = top.charCodeAt(top.length - 1) === 13?this.$fastTextFontSize:0
			if(isFolded) this.$fastTextFontSize = 1
		}

		var foldAfterFirst = false
		for(let i = 0; i <= bodylen; i++){
			var statement = body[i]
			// Support the $ right after function { to mark shaders
			if(i == 0 && statement.type === 'ExpressionStatement' && statement.expression.type === 'Identifier' && statement.expression.name === '$'){
				this.scope.$ = 1
				var expside = statement.side
				isFolded = expside && expside.charCodeAt(expside.length - 1) === 13?this.$fastTextFontSize:0
				if(isFolded) foldAfterFirst = true
			}
			if(statement.type === 'FunctionDeclaration'){
				this.scope[statement.id.name] = 1
			}
		}

		for(let i = 0; i <= bodylen; i++){
			var statement = body[i]
			// the above

			if(statement.above) this.fastText(statement.above, this.styles.Comment.above)
			this[statement.type](statement)
			if(statement.side) this.fastText(statement.side, this.styles.Comment.side)
			else if(i < bodylen) this.fastText('\n', this.styles.Comment.side)
			this.trace += '\n'
			// support $
			if(foldAfterFirst) this.$fastTextFontSize = 1, foldAfterFirst = false
		}
		if(node.bottom) this.fastText(node.bottom, this.styles.Comment.bottom)

		if(isFolded) this.$fastTextFontSize = isFolded

		this.indentOut()
		// store endx endy
		var blockh = turtle.wy
		
		if(traceHandler){
			this.trace += '}catch($e){$T(-'+traceHandler+',$e);throw $e}finally{$T(-'+traceHandler+',this)}'
		}
		else this.trace += '}'
		this.fastText('}', this.styles.Curly.BlockStatement)
	
		var pickId = this.pickIdCounter++
		this.pickIds[pickId] = node 
		this.fastBlock(
			startx,
			starty,
			endx-startx, 
			lineh,
			this.indentSize* this.$fastTextFontSize,
			blockh - starty,
			this.indent,
			pickId,
			starty !== blockh?
				(colorScheme||this.styles.Block.BlockStatement).open:
				(colorScheme||this.styles.Block.BlockStatement).close
		)
	}

	//ArrayExpression:{elements:2},
	ArrayExpression(node){
		var turtle = this.turtle

		var startx = turtle.sx, starty = turtle.wy
		this.fastText('[', this.styles.Bracket.ArrayExpression)
		this.trace += '['
		var elems = node.elements
		var elemslen = elems.length - 1

		//var dy = 0
		if(this.$lengthText() === this.$fastTextOffset && this.wasNewlineChange){
		//	dy = this.$fastTextDelta
			this.$fastTextDelta += (elemslen+1)*this.$fastTextDelta
		}
		var insCommas = node.insCommas
		if(insCommas) this.$fastTextDelta += insCommas

		var endx = turtle.wx, lineh = turtle.mh
		// lets indent
		var top = node.top
		if(top){
			this.fastText(top, this.styles.Comment.top)
			this.indentIn()

			var isFolded = top.charCodeAt(top.length - 1) === 13?this.$fastTextFontSize:0
			if(isFolded) this.$fastTextFontSize = 1
		}
		var commaStyle = top?this.styles.Comma.ArrayExpression.open:this.styles.Comma.ArrayExpression.close

		for(let i = 0; i <= elemslen; i++){
			var elem = elems[i]

			if(elem){
				if(top && elem.above) this.fastText(elem.above, this.styles.Comment.above)
				this[elem.type](elem)
			}
			if(node.trail || i < elemslen){
				this.fastText(',', commaStyle)
				this.trace += ','
			}
			if(elem && top){
				if(elem.side) this.fastText(elem.side, this.styles.Comment.side)
				else if(i !== elemslen)this.fastText('\n', this.styles.Comment.side)
			}
		}

		if(top){
			if(!node.bottom){
				if(this.text.charCodeAt(this.text.length -1) !== 10){
					this.fastText('\n', this.styles.Comment.bottom)
				}
			}
			else this.fastText(node.bottom, this.styles.Comment.bottom)
			if(isFolded) this.$fastTextFontSize = isFolded
			this.indentOut()
		}

		var blockh = turtle.wy

		//this.$fastTextDelta += dy
		this.trace += ']'
		this.fastText(']', this.styles.Bracket.ArrayExpression)

		var pickId = this.pickIdCounter++
		this.pickIds[pickId] = node 
		// lets draw a block with this information
		this.fastBlock(
			startx,
			starty,
			endx-startx, 
			lineh,
			this.indentSize * this.$fastTextFontSize,
			blockh - starty,
			this.indent,
			pickId,
			top?
				this.styles.Block.ArrayExpression.open:
				this.styles.Block.ArrayExpression.close
			)
	}

	//ObjectExpression:{properties:3},
	ObjectExpression(node){
		var turtle = this.turtle
		var keyStyle = this.styles.ObjectExpression.key

		var startx = turtle.sx, starty = turtle.wy
		
		this.fastText('{', this.styles.Curly.ObjectExpression)
		this.trace += '{'
		var endx = turtle.wx, lineh = turtle.mh

		// lets indent
		var turtle = this.turtle
		var props = node.properties
		var propslen = props.length - 1

		// make space for our expanded or collapsed view
		if(this.$lengthText() === this.$fastTextOffset && this.wasFirstNewlineChange){
			this.$fastTextDelta += (propslen + 1) * this.$fastTextDelta
		}
		// make room for inserted commas
		var insCommas = node.insCommas
		if(insCommas) this.$fastTextDelta += insCommas
		var top = node.top
		//this.newLine()
		if(top){
			var maxlen = 0
			this.fastText(node.top, this.styles.Comment.top)

			this.indentIn()

			var isFolded = top.charCodeAt(top.length - 1) === 13?this.$fastTextFontSize:0
			if(isFolded) this.$fastTextFontSize = 1

			// compute the max key size
			for(let i = 0; i <= propslen; i++){
				var key = props[i].key
				if(key.type === 'Identifier'){
					var keylen = key.name.length
					if(keylen > maxlen) maxlen = keylen
				}
			}
		}		
		
		var commaStyle = top?this.styles.Comma.ObjectExpression.open:this.styles.Comma.ObjectExpression.close
		for(let i = 0; i <= propslen; i++){

			var prop = props[i]
			if(top && prop.above) this.fastText(prop.above, this.styles.Comment.above)
			var key = prop.key

			var keypos = undefined
			if(key.type === 'Identifier'){
				if(top) keypos = key.name.length
				this.trace += key.name
				this.fastText(key.name, keyStyle,keypos?(maxlen - keypos)*keyStyle.alignLeft:0)
			}
			else this[key.type](key)

			if(!prop.shorthand){
				this.trace += ':'
				this.fastText(':', this.styles.Colon.ObjectExpression,keypos?(maxlen - keypos)*keyStyle.alignRight:0)
				var value = prop.value
				this[value.type](value, key)
			}

			if(node.trail || i < propslen){
				this.trace += ','
				this.fastText(',', commaStyle)
				//if(prop.inserted){
				//	console.log("INSERTEZ")
				//	this.$fastTextDelta++
				//}
			}

			if(top){
				if(prop.side) this.fastText(prop.side, this.styles.Comment.side)
				else if(i !== propslen)this.fastText('\n', this.styles.Comment.side)
			}

		}

		if(top){
			if(!node.bottom){
				if(this.text.charCodeAt(this.text.length -1) !== 10){
					this.fastText('\n', this.styles.Comment.bottom)
				}
			}
			else this.fastText(node.bottom, this.styles.Comment.bottom)
			if(isFolded) this.$fastTextFontSize = isFolded

			this.indentOut()
		}

		//this.$fastTextDelta += dy
		this.trace += '}'
		this.fastText('}', this.styles.Curly.ObjectExpression)

		var blockh = turtle.wy

		var pickId = this.pickIdCounter++
		this.pickIds[pickId] = node 
		// lets draw a block with this information
		this.fastBlock(
			startx,
			starty,
			endx-startx, 
			lineh,
			this.indentSize * this.$fastTextFontSize,
			blockh - starty,
			this.indent,
			pickId,
			top?
				this.styles.Block.ObjectExpression.open:
				this.styles.Block.ObjectExpression.close
			)
	}

	//ClassBody:{body:2},
	ClassBody(node){
		var turtle = this.turtle
		var startx = turtle.sx, starty = turtle.wy

		this.fastText('{', this.styles.Curly.ObjectExpression)
		this.trace += '{\n'
		
		var endx = turtle.wx, lineh = turtle.mh

		this.indentIn()

		if(node.top) this.fastText(node.top, this.styles.Comment.top)
		var body = node.body
		var bodylen = body.length - 1
		for(let i = 0; i <= bodylen; i++){
			var method = body[i]
			if(method.above) this.fastText(method.above, this.styles.Comment.above)
			this[method.type](method)
			if(method.side) this.fastText(method.side, this.styles.Comment.side)
			else if(i < bodylen) this.fastText('\n', this.styles.Comment.side)
			this.trace += '\n'
		}
        if(node.bottom) this.fastText(node.bottom, this.styles.Comment.bottom)
		this.indentOut()
		this.trace += '}'
		this.fastText('}', this.styles.Curly.BlockStatement)
		// store endx endy
		var blockh = turtle.wy

		var pickId = this.pickIdCounter++

		this.pickIds[pickId] = node 

		this.fastBlock(
			startx,
			starty,
			endx-startx, 
			lineh,
			this.indentSize* this.$fastTextFontSize,
			blockh - starty,
			this.indent,
			pickId,
			this.styles.Block.ClassBody
		)
	}

	//EmptyStatement:{}
	EmptyStatement(node){
		console.log(node)
	}

	//ExpressionStatement:{expression:1},
	ExpressionStatement(node){
		var exp = node.expression
		this[exp.type](exp)
	}

	//SequenceExpression:{expressions:2}
	SequenceExpression(node){

		var exps = node.expressions
		var expslength = exps.length - 1
		for(let i = 0; i <= expslength; i++){
			var exp = exps[i]
			if(exp)this[exp.type](exp)
			if(i < expslength){
				this.trace += ','
				this.fastText(',', this.styles.Comma.SequenceExpression)
			}
		}
	}

	//ParenthesizedExpression:{expression:1}
	ParenthesizedExpression(node, level){
		if(!level) level = 0
		this.trace += '('
		this.fastText('(', this.styles.Paren.ParenthesizedExpression)
		// check if we need to indent
		if(node.top){
			this.fastText(node.top, this.styles.Comment.top)
			this.indentIn()
		}

		var exp = node.expression

		if(node.top && exp.above){
			this.fastText(exp.above, this.styles.Comment.above)
		}

		this[exp.type](exp, level+1)

		if(node.top){
			if(exp.side){
				this.fastText(exp.side, this.styles.Comment.side)
			}
			if(node.bottom) this.fastText(node.bottom, this.styles.Comment.bottom)
			if(!exp.side && !node.bottom) this.fastText('\n', this.styles.Comment.bottom)
			this.indentOut()
		}
		this.trace += ')'
		if(this.allowOperatorSpaces && node.rightSpace){
			for(let i = node.rightSpace, rs = ''; i > 0; --i) rs += ' '
			this.fastText(')'+rs, this.styles.Paren.ParenthesizedExpression)
		}
		else this.fastText(')', this.styles.Paren.ParenthesizedExpression)

	}

	//Literal:{raw:0, value:0},
	Literal(node){
		this.trace += node.raw
		this.fastText(node.raw, this.styles.Literal[node.kind])
	}

	//Identifier:{name:0},
	Identifier(node){
		var style
		var name = node.name
		var where
		if(where = this.scope[name]){
			if(this.scope.hasOwnProperty(name)){
				if(where === 1) style = this.styles.Identifier.local
				else if(where === 2) style = this.styles.Identifier.localArg
				else style = this.styles.Identifier.iterator
			}
			else{
				if(where === 1) style = this.styles.Identifier.closure
				else style = this.styles.Identifier.closureArg
			}
		}
		else if(this.scope.$ && this.glslGlobals[name]){
			style = this.styles.Identifier.glsl
		}
		else style = this.styles.Identifier.unknown

		if(this.traceMap) this.trace += 'T$('+this.traceMap.push(node)+','+name+')'
		else this.trace += name

		this.fastText(name, style)
	}

	//ThisExpression:{},
	ThisExpression(node){
		this.trace += 'this'
		this.fastText('this', this.styles.ThisExpression)
	}

	//MemberExpression:{object:1, property:1, computed:0},
	MemberExpression(node){
		var obj = node.object
		this[obj.type](obj)
		var prop = node.property

		if(node.computed){
			this.trace += '['
			this.fastText('[', this.styles.Bracket.MemberExpression)

			this[prop.type](prop, node)
			this.trace += ']'
			this.fastText(']', this.styles.Bracket.MemberExpression)
		}
		else{
			if(node.around1){
				this.fastText(node.around1, this.styles.Comment.around)
			}
			this.indentIn()
			this.trace += '.'
			this.fastText('.', this.styles.Dot.MemberExpression)
			if(node.around2){
				this.fastText(node.around2, this.styles.Comment.around)
			}
			if(prop.type !== 'Identifier') this[prop.type](prop, node)
			else{
				this.trace += prop.name
				this.fastText(prop.name, this.styles.MemberExpression)
			}
			this.indentOut()
		}
	}

	//CallExpression:{callee:1, arguments:2},
	CallExpression(node){
		var callee = node.callee
		var args = node.arguments

		if(this.traceMap) this.trace += '$T(' + this.traceMap.push(node)+','

		this[callee.type](callee, node)

		this.trace += '('
		this.fastText('(', this.styles.Paren.CallExpression)

		var argslen = args.length - 1

		var dy = 0
		if(this.$lengthText() === this.$fastTextOffset && this.wasFirstNewlineChange){
			dy = this.$fastTextDelta
			this.$fastTextDelta += argslen * dy
		}

		if(node.top){
			this.fastText(node.top, this.styles.Comment.top)
			this.indentIn()
		}
		
		for(let i = 0; i <= argslen;i++){
			var arg = args[i]
			if(node.top && arg.above) this.fastText(arg.above, this.styles.Comment.above)
			this[arg.type](arg)
			if(i < argslen) {
				this.trace += ','
				this.fastText(',', node.top?this.styles.Comma.CallExpression.open:this.styles.Comma.CallExpression.close)
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
			this.indentOut()
		}
		this.$fastTextDelta += dy
		this.trace += ')'
		if(this.traceMap) this.trace += ')'
		
		if(this.allowOperatorSpaces && node.rightSpace){
			for(let i = node.rightSpace, rs = ''; i > 0; --i) rs += ' '
			this.fastText(')'+rs, this.styles.Paren.CallExpression)
		}
		else this.fastText(')', this.styles.Paren.CallExpression)
	}

	//NewExpression:{callee:1, arguments:2},
	NewExpression(node){
		var callee = node.callee
		var args = node.arguments
		this.trace += 'new '
		this.fastText('new ', this.styles.NewExpression)
		// check newline/whitespace
		if(node.around2) this.fastText(node.around2, this.styles.Comment.around)
		this.CallExpression(node)

	}

	//ReturnStatement:{argument:1},
	ReturnStatement(node){
		var arg = node.argument
		if(arg){
			this.trace += 'return '
			this.fastText('return ', this.styles.ReturnStatement)
			this[arg.type](arg, node)
		}
		else{
			this.trace += 'return'
			this.fastText('return'+node.space, this.styles.ReturnStatement)
		}
	}

	//FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	FunctionExpression(node){
		this.FunctionDeclaration(node)
	}

	//FunctionDeclaration: {id:1, params:2, expression:0, body:1},
	FunctionDeclaration(node, method){
		var id = node.id
		if(id){
			this.scope[name] = 1
			this.trace += 'function '+id.name
			this.fastText('function ', this.styles.FunctionDeclaration)
			this.fastText(id.name, this.styles.Identifier.FunctionDeclaration)
		}
		else{
            if(!method) method = 'function'
			this.trace += method
			this.fastText(method + (node.space?node.space:''), this.styles.FunctionDeclaration)
		}
		this.trace += '('
		this.fastText('(', this.styles.Paren.FunctionDeclaration.left)

		if(node.top) this.fastText(node.top, this.styles.Comment.top)
		this.indentIn()

		var oldscope = this.scope
		this.scope = Object.create(this.scope)
		var params = node.params
		var paramslen = params.length - 1
		for(let i = 0; i <= paramslen; i++){
			var param = params[i]

			if(node.top && param.above) this.fastText(param.above, this.styles.Comment.above)
	
			if(param.type === 'Identifier'){
				var name = param.name
				this.scope[name] = 2
				this.trace += name
				this.fastText(name, this.styles.Identifier.localArg)
			}
			else {
                if(param.type === 'RestElement'){
                    this.scope[param.argument.name] = 2
                }
				this[param.type](param)
			}
			if(i < paramslen){
				this.trace += ','
				this.fastText(',', this.styles.Comma.FunctionDeclaration)
			}
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

		this.indentOut()
		this.trace += ')'
		this.fastText(')', this.styles.Paren.FunctionDeclaration.right)

		var body = node.body
		this[body.type](body, this.styles.Block.FunctionDeclaration, node)

		this.scope = oldscope
	}

	//VariableDeclaration:{declarations:2, kind:0},
	VariableDeclaration(node, level){
		if(node.space !== undefined) this.fastText('var'+node.space, this.styles.VariableDeclaration)
		else this.fastText('var ', this.styles.VariableDeclaration)
		this.trace += 'var '

		if(node.mid){
			this.fastText(node.mid, this.styles.Comment.above)
		}

		var decls = node.declarations
		var declslen = decls.length - 1
		for(let i = 0; i <= declslen; i++){
			var decl = decls[i]
			this[decl.type](decl)
			if(i !== declslen){
				this.fastText(',', this.styles.Comma.VariableDeclaration)
				this.trace += ','
			}
		}
	}

	//VariableDeclarator:{id:1, init:1},
	VariableDeclarator(node){
		var id = node.id

		if(node.probe){
			this.fastText('@', this.styles.Identifier.local)
		}
		if(id.type === 'Identifier'){
			this.scope[id.name] = 1//scopeId || 1
			this.fastText(id.name, this.styles.Identifier.local)
			this.trace += id.name
		}
		else this[id.type](id, node)
		
		var init = node.init
		if(init){
			if(node.around1) this.fastText(node.around1, this.styles.Comment.around)

			this.trace += '='
			this.fastText('=', this.styles.AssignmentExpression['='] || this.styles.AssignmentExpression)
		
			if(node.around2) this.fastText(node.around2, this.styles.Comment.around)
			if(node.probe){
				var id = this.onProbe(init, id)
				this.trace += '$P('+id+','
				this[init.type](init, id)
				this.trace += ')'
			}
			else{
				this[init.type](init, id)
			}
		}
	}

	//LogicalExpression:{left:1, right:1, operator:0},
	LogicalExpression(node, level){
		level = typeof level === 'number'?level:0
		var left = node.left
		var right = node.right
		if(this.traceMap) this.trace += '$T('+this.traceMap.push(node)+','
		this[left.type](left,level + 1)

		if(node.around1) this.fastText(node.around1, this.styles.Comment.around)
		this.indentIn()

		this.trace += node.operator
		this.fastText(node.operator, this.styles.LogicalExpression[node.operator] || this.styles.LogicalExpression)

		if(node.around2) this.fastText(node.around2, this.styles.Comment.around)

		this[right.type](right,level + 1)
		if(this.traceMap) this.trace += ')'
		this.indentOut()
	}

	//BinaryExpression:{left:1, right:1, operator:0},
	BinaryExpression(node, level){
		level = level || 0
		var left = node.left
		var right = node.right
		var turtle = this.turtle
		// draw a marker
		//var m = this.startMarker(turtle.wy, level, this.styles.Marker[node.operator] || this.styles.Marker)
		// we have to draw a backdrop 
		var x1 = turtle.wx 
		var ys = turtle.wy
		if(this.traceMap) this.trace += '$T('+this.traceMap.push(node)+','
		this[left.type](left, level+1)
		// ok so. if around1 exists, i dont want to indent. otherwise i do
		var op = node.operator
		var doIndent = !node.around1 || op !== '/'
		if(node.around1){
			this.fastText(node.around1, this.styles.Comment.around)
		}
		if(doIndent) this.indentIn()

		var x2 = turtle.wx 
		this.trace += op
		if(this.allowOperatorSpaces){
			for(let ls = '', i = node.leftSpace||0; i > 0; --i) ls += ' '
			for(let rs = '', i = node.rightSpace||0; i > 0; --i) rs += ' '
			this.fastText(ls+op+rs, this.styles.BinaryExpression[node.operator] || this.styles.BinaryExpression, 0, 0)
		}
		else {
			var style
			if(doIndent) style = this.styles.BinaryExpression[node.operator] || this.styles.BinaryExpression
			else style = this.styles.BinaryExpressionNL[node.operator] || this.styles.BinaryExpressionNL
			this.fastText(op, style)
		}
		var x3 = turtle.wx 

		if(node.around2) this.fastText(node.around2, this.styles.Comment.around)

		this[right.type](right, level+1)
	
		if(this.traceMap) this.trace + ')'

		if(doIndent) this.indentOut()
		//if(turtle.wy === ys) this.stopMarker(m, x1,x2,x3,turtle.wx, turtle.mh)
		//else this.stopMarker(m, 0,0,0,0,0)
	}

	//AssignmentExpression: {left:1, operator:0, right:1},
	AssignmentExpression(node){
		var left = node.left
		var right = node.right
		var leftype = left.type
		this[left.type](left)
		if(node.around1) this.fastText(node.around1, this.styles.Comment.around)
		this.trace += node.operator
		this.fastText(node.operator, this.styles.AssignmentExpression[node.operator] || this.styles.AssignmentExpression)

		if(node.around2) this.fastText(node.around2, this.styles.Comment.around)

		this[right.type](right, left)
	}

	//ConditionalExpression:{test:1, consequent:1, alternate:1},
	ConditionalExpression(node){
		var test = node.test
		this[test.type](test)
		this.trace += '?'
		this.fastText('?', this.styles.QuestionMark)
		this.indentIn()
		var afterq = node.afterq
		if(afterq) this.fastText(afterq, this.styles.Comment.above)
		var cq = node.consequent
		this[cq.type](cq)
		this.trace += ':'
		this.fastText(':', this.styles.Colon.ConditionalExpression)
		var afterc = node.afterc
		if(afterc) this.fastText(afterc, this.styles.Comment.above)
		var alt = node.alternate
		this[alt.type](alt)
		this.indentOut()

	}

	//UpdateExpression:{operator:0, prefix:0, argument:1},
	UpdateExpression(node){
		if(node.prefix){
			var op = node.operator
			this.trace += op
			this.fastText(op, this.styles.UpdateExpression[op] || this.styles.UpdateExpression)
			var arg = node.argument
			var argtype = arg.type
			//if(argtype === 'Identifier'){
			//	var name = arg.name
			//	this.trace += name
			//	this.fastText(name, this.styles.Identifier)
			//}
			//else 
			this[argtype](arg)
		}
		else{
			var arg = node.argument
			var argtype = arg.type
			//if(argtype === 'Identifier'){
			//	var name = arg.name
			//	this.trace += name
			//	this.fastText(name, this.styles.Identifier)
			//}
			//else 
			this[argtype](arg)
			var op = node.operator
			this.trace += op
			this.fastText(op, this.styles.UpdateExpression[op] || this.styles.UpdateExpression)
		}
 	}

	//UnaryExpression:{operator:0, prefix:0, argument:1},
	UnaryExpression(node, lhs){
		if(node.prefix){
			var op = node.operator
			if(node.operator === '@'){
				var id = this.onProbe(node, lhs)
				this.trace += '$P('+id+','
				this.fastText(op, this.styles.UnaryExpression[op] || this.styles.UnaryExpression)
				var arg = node.argument
				var argtype = arg.type
				this[argtype](arg)
				this.trace += ')'
			}
			else{
				if(op.length > 1) op = op + ' '
				this.trace += op
				this.fastText(op, this.styles.UnaryExpression[op] || this.styles.UnaryExpression)
				var arg = node.argument
				var argtype = arg.type
				this[argtype](arg)
			}
		}
		else{
			var arg = node.argument
			var argtype = arg.type
			this[argtype](arg)
			var op = node.operator
			this.fastText(op, this.styles.UnaryExpression[op] || this.styles.UnaryExpression)
		}
 	}

	//IfStatement:{test:1, consequent:1, alternate:1},
	IfStatement(node){
		if(this.traceMap) this.trace += 'if(T$('+this.traceMap.push(node)+','
		else this.trace += 'if('
		this.fastText('if', this.styles.IfStatement.if)
		this.fastText('(', this.styles.Paren.IfStatement.left)
		var test = node.test
		this[test.type](test,1)

		if(this.traceMap) this.trace += '))'
		else this.trace += ')'

		this.fastText(')', this.styles.Paren.IfStatement.right)
		if(node.after1) this.fastText(node.after1, this.styles.Comment.above)
		var cq = node.consequent
		this[cq.type](cq, this.styles.Block.IfStatement.if)
		var alt = node.alternate
		if(alt){
			this.trace += '\nelse '
			this.fastText('\nelse ', this.styles.IfStatement.else)
			if(node.after2) this.fastText(node.after2, this.styles.Comment.above)
			this[alt.type](alt, this.styles.Block.IfStatement.else)
		}
	}

	//ForStatement:{init:1, test:1, update:1, body:1},
	ForStatement(node){
		this.trace += 'for('
		this.fastText('for', this.styles.ForStatement)
		this.fastText('(', this.styles.Paren.ForStatement.left)
		var init = node.init
		if(init)this[init.type](init, 1, 3)
		this.trace += ';'
		this.fastText(';', this.styles.SemiColon.ForStatement)
		var test = node.test
		if(test)this[test.type](test, 1)
		this.trace += ';'
		this.fastText(';', this.styles.SemiColon.ForStatement)
		var update = node.update
		if(update)this[update.type](update, 1)
		this.trace += ')'
		this.fastText(')', this.styles.Paren.ForStatement.right)
		var body = node.body
		if(node.after) this.fastText(node.after, this.styles.Comment.above)
		this[body.type](body, this.styles.Block.ForStatement)
	}

	//ForInStatement:{left:1, right:1, body:1},
	ForInStatement(node){
		this.trace += 'for('
		this.fastText('for', this.styles.ForStatement)
		this.fastText('(', this.styles.Paren.ForStatement.left)
		var left = node.left
		this[left.type](left)
		this.trace += ' in '
		this.fastText(' in ', this.styles.ForStatement.in)
		var right = node.right
		this[right.type](right)
		this.trace += ')'
		this.fastText(')', this.styles.Paren.ForStatement.right)
		var body = node.body
		this[body.type](body, this.styles.Block.ForStatement)
	}

	//ForOfStatement:{left:1, right:1, body:1},
	ForOfStatement(node){
		this.trace += 'for('
		this.fastText('for', this.styles.ForStatement)
		this.fastText('(', this.styles.Paren.ForStatement.left)
		var left = node.left
		this[left.type](left)
		this.trace += ' of '
		this.fastText(' of ', this.styles.ForStatement.in)
		var right = node.right
		this[right.type](right)
		this.trace += ')'
		this.fastText(')', this.styles.Paren.ForStatement.right)
		var body = node.body
		this[body.type](body, this.styles.Block.ForStatement)
	}

	//WhileStatement:{body:1, test:1},
	WhileStatement(node){
		this.fastText('while', this.styles.WhileStatement.while)
		this.fastText('(', this.styles.Paren.WhileStatement.left)
		this.trace += 'while('
		var test = node.test
		this[test.type](test)
		this.fastText(')', this.styles.Paren.WhileStatement.right)
		this.trace += ')'
		if(node.after1) this.fastText(node.after1, this.styles.Comment.above)
		var body = node.body
		this[body.type](body)
	}

	//DoWhileStatement:{body:1, test:1},
	DoWhileStatement(node){
		this.trace += 'do'
		this.fastText('do', this.styles.DoWhileStatement.do)
		var body = node.body
		this[body.type](body)
		this.fastText('while', this.styles.DoWhileStatement.while)
		this.fastText('(', this.styles.Paren.DoWhileStatement.left)
		this.trace += 'while('
		var test = node.test
		this[test.type](test)
		this.fastText(')', this.styles.Paren.DoWhileStatement.right)
		this.trace += ')'
	}

	//BreakStatement:{label:1},
	BreakStatement(node){
		if(node.label){
			var label = node.label
			this.trace += 'break '
			this.fastText('break ', this.styles.BreakStatement)
			this[label.type](label)
		}
		else{
			this.trace += 'break'
			this.fastText('break', this.styles.BreakStatement)
		}
	}

	//ContinueStatement:{label:1},
	ContinueStatement(node){
		if(node.label){
			var label = node.label
			this.trace += 'continue '
			this.fastText('continue ', this.styles.ContinueStatement)
			this[label.type](label)
		}
		else{
			this.trace += 'continue'
			this.fastText('continue', this.styles.ContinueStatement)
		}
	}

	//YieldExpression:{argument:1, delegate:0}
	YieldExpression(node){
		var arg = node.argument
		if(arg){
			this.trace += 'yield '
			this.fastText('yield ', this.styles.YieldExpression)
			this[arg.type](arg, node)
		}
		else{
			this.trace += 'yield'
			this.fastText('yield'+node.space, this.styles.YieldExpression)
		}
	}
	
	//ThrowStatement:{argument:1},
	ThrowStatement(node){
		var arg = node.argument
		if(arg){
			this.trace += 'throw '
			this.fastText('throw ', this.styles.ThrowStatement)
			this[arg.type](arg, node)
		}
		else{
			this.trace += 'throw'
			this.fastText('throw'+node.space, this.styles.ThrowStatement)
		}
	}

	//TryStatement:{block:1, handler:1, finalizer:1},
	TryStatement(node){
		this.trace += 'try'
		this.fastText('try', this.styles.TryStatement)
		var block = node.block
		this[block.type](block)
		this.trace += 'handler'
		var handler = node.handler
		if(handler){
			var above = handler.above
			if(above) this.fastText(above, this.styles.Comment.side)
			this[handler.type](handler)
		}
		var finalizer = node.finalizer
		if(finalizer){
			var above = finalizer.above
			if(above) this.fastText(above, this.styles.Comment.side)
			this.trace += 'finally'
			this.fastText('finally', this.styles.TryStatement)
			this[finalizer.type](finalizer)
		}
	}

	//CatchClause:{param:1, body:1},
	CatchClause(node){
		this.trace += 'catch('
		this.fastText('catch', this.styles.CatchClause)
		this.fastText('(', this.styles.Paren.CatchClause.left)
		var param = node.param
		this[param.type](param)
		this.fastText(')', this.styles.Paren.CatchClause.right)
		this.trace += ')'
		var body = node.body
		this[body.type](body)
	}

	//SpreadElement
	SpreadElement(node){
		this.fastText('...', this.styles.RestElement)
		this.trace += '...'
		var arg = node.argument
		this[arg.type](arg)
	}

	//RestElement:{argument:1}
	RestElement(node){
		this.fastText('...', this.styles.RestElement)
		this.trace += '...'
		var arg = node.argument
		this[arg.type](arg)
	}

	//Super:{},
	Super(node){
		this.fastText('super', this.styles.Super)
		this.trace += 'super'
	}

	//AwaitExpression:{argument:1},
	AwaitExpression(node){
		logNonexisting(node)
	}

	//MetaProperty:{meta:1, property:1},
	MetaProperty(node){
		logNonexisting(node)
	}


	//ObjectPattern:{properties:3},
	ObjectPattern(node){
		logNonexisting(node)
	}

	//ArrowFunctionExpression:{params:2, expression:0, body:1},
	ArrowFunctionExpression(node){
		logNonexisting(node)
	}

	//SwitchStatement:{discriminant:1, cases:2},
	SwitchStatement(node){
		this.trace += 'switch('
		this.fastText('switch', this.styles.SwitchStatement)
		this.fastText('(', this.styles.Paren.SwitchStatement.left)
		var disc = node.discriminant
		this[disc.type](disc)
		this.fastText(')', this.styles.Paren.SwitchStatement.right)
		this.fastText('{', this.styles.Curly.SwitchStatement)
		this.trace += '){\n'
		
		var top = node.top
		if(top) this.fastText(top, this.styles.Comment.top)
		var cases = node.cases
		var caseslen = cases.length
		for(let i = 0; i < caseslen; i++){
			var cas = cases[i]
			this[cas.type](cas)
		}
		var bottom = node.bottom
		if(bottom) this.fastText(bottom, this.styles.Comment.bottom)
		
		this.fastText('}', this.styles.Curly.SwitchStatement)
		this.trace += '){\n'
	}

	//SwitchCase:{test:1, consequent:2},
	SwitchCase(node){
		var above = node.above
		if(above) this.fastText(above, this.styles.Comment.above)
		this.trace += 'case '
		this.fastText('case ', this.styles.SwitchCase)
		var test = node.test
		this[test.type](test)
		this.trace += ':'
		this.fastText(':', this.styles.Colon.SwitchCase)
		var side = node.side
		if(side) this.fastText(side, this.styles.Comment.side)
		this.indentIn()
		var cqs = node.consequent
		var cqlen = cqs.length
		for(let i = 0; i < cqlen; i++){
			var cq = cqs[i]
			var above = cq.above
			if(above) this.fastText(above, this.styles.Comment.above)
			if(cq) this[cq.type](cq)
			var side = cq.side
			if(side) this.fastText(side, this.styles.Comment.side)
			this.trace += '\n'
		}
		this.indentOut()
	}

	//TaggedTemplateExpression:{tag:1, quasi:1},
	TaggedTemplateExpression(node){
		logNonexisting(node)
	}

	//TemplateElement:{tail:0, value:0},
	TemplateElement(node){
		logNonexisting(node)
	}

	//TemplateLiteral:{expressions:2, quasis:2},
	TemplateLiteral(node){
		logNonexisting(node)
	}

	//ClassDeclaration:{id:1,superClass:1},
	ClassDeclaration(node){
		this.trace += 'class '
		this.fastText('class ', this.styles.ClassDeclaration.class)
		var id = node.id
		if(id){
            this.scope[id.name] = 1
			this[id.type](id)

			if(node.space){
				this.trace += ' '
				this.fastText(' ', this.styles.ClassDeclaration.class)
			}
		}
		var base = node.superClass
		if(base){
			this.trace += 'extends '
			this.fastText('extends ', this.styles.ClassDeclaration.extends)
			this[base.type](base)
		}
		var body = node.body
		this[body.type](body)
	}

	//ClassExpression:{id:1,superClass:1},
	ClassExpression(node){
		this.trace += 'class '
		this.fastText('class ', this.styles.ClassExpression.class)
		var id = node.id
		if(id){
			this.scope[id.name] = 1
			this[id.type](id)
			
			if(node.space){
				this.trace += ' '
				this.fastText(' ', this.styles.ClassExpression.class)
			}
		}	
		var base = node.superClass
		if(base){
			this.trace += 'extends '
			this.fastText('extends ', this.styles.ClassExpression.extends)
			this[base.type](base)
		}
		var body = node.body
		this[body.type](body)
	}

	//MethodDefinition:{value:1, kind:0, static:0},
	MethodDefinition(node){
		var value = node.value
        var name = node.key.name
        if(node.static){
            this.trace += 'static '
            this.fastText('static ', this.styles.MethodDefinition.static)
        }
        this.FunctionDeclaration(value, name)
	}

	//ExportAllDeclaration:{source:1},
	ExportAllDeclaration(node){
		logNonexisting(node)
	}

	//ExportDefaultDeclaration:{declaration:1},
	ExportDefaultDeclaration(node){
		logNonexisting(node)
	}
	//ExportNamedDeclaration:{declaration:1, source:1, specifiers:2},
	ExportNamedDeclaration(node){
		logNonexisting(node)
	}
	//ExportSpecifier:{local:1, exported:1},
	ExportSpecifier(node){
		logNonexisting(node)
	}
	//ImportDeclaration:{specifiers:2, source:1},
	ImportDeclaration(node){
		logNonexisting(node)
	}
	//ImportDefaultSpecifier:{local:1},
	ImportDefaultSpecifier(node){
		logNonexisting(node)
	}
	//ImportNamespaceSpecifier:{local:1},
	ImportNamespaceSpecifier(node){
		logNonexisting(node)
	}
	//ImportSpecifier:{imported:1, local:1},
	ImportSpecifier(node){
		logNonexisting(node)
	}
	//DebuggerStatement:{},
	DebuggerStatement(node){
		this.trace += 'debugger'
		this.fastText('debugger', this.styles.DebuggerStatement)
	}
	//LabeledStatement:{label:1, body:1},
	LabeledStatement(node){
		var label = node.label
		this[label.type](label)
		this.trace += ':'
		this.fastText(':', this.styles.LabeledStatement)
		
		var after1 = node.after1
		if(after1) this.fastText(after1, this.styles.Comment.above)

		// lets inject a newline
		var body = node.body
		this[body.type](body)
	}
	// WithStatement:{object:1, body:1}
	WithStatement(node){
		logNonexisting(node)
	}

}