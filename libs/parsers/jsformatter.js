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
		this.$fastTextWritten = 0
		this.$fastTextLines = [0]
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
			let above = statement.above
			if(above) this.fastText(above, this.styles.Comment.above), this.trace += above
			this[statement.type](statement, node)
			let side = statement.side
			if(side) this.fastText(side, this.styles.Comment.side), this.trace += side
		}
		let bottom = node.bottom
		if(bottom) this.fastText(node.bottom, this.styles.Comment), this.trace += bottom
	}

	//BlockStatement:{body:2},
	indentIn(){
		this.indent++
		this.currentIndent += this.indentSize * this.$fastTextFontSize 

		this.turtle.sx = this.currentIndent//this.indent * this.indentSize + this.padding[3]
		// check if our last newline needs reindenting
		if(this.lastIsNewline()){
			this.ann[this.ann.length - 1] = -this.ann[this.ann.length - 1]
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
			this.ann[this.ann.length - 1] = -this.ann[this.ann.length - 1]
			this.turtle.wx = this.turtle.sx
		}
	}

	BlockStatement(node, colorScheme, parent){
		// store the startx/y position
		let turtle = this.turtle

		let startx = turtle.sx, starty = turtle.wy
		
		this.trace += '{'
		let traceHandler = false
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
		if(!colorScheme) colorScheme = this.styles.DefaultBlock
		//colorScheme = this.styles.
		this.fastText('{', colorScheme.curly)

		let endx = turtle.wx, lineh = turtle.mh
		// lets indent
		this.indentIn()
		//this.newLine()
		let top = node.top

		let body = node.body
		let bodylen = body.length - 1

		if(top){
			this.trace += top
			this.fastText(top, this.styles.Comment.top)

			var isFolded = top.charCodeAt(top.length - 1) === 13?this.$fastTextFontSize:0
			if(isFolded) this.$fastTextFontSize = 1
		}

		let foldAfterFirst = false
		for(let i = 0; i <= bodylen; i++){
			let statement = body[i]
			// Support the $ right after function { to mark shaders
			if(i == 0 && statement.type === 'ExpressionStatement' && statement.expression.type === 'Identifier' && statement.expression.name === '$'){
				this.scope.$ = 'magic'
				var expside = statement.side
				isFolded = expside && expside.charCodeAt(expside.length - 1) === 13?this.$fastTextFontSize:0
				if(isFolded) foldAfterFirst = true
			}
			if(statement.type === 'FunctionDeclaration'){
				this.scope[statement.id.name] = 'fn'
			}
		}

		for(let i = 0; i <= bodylen; i++){
			let statement = body[i]
			// the above
			let above = statement.above
			if(above) this.fastText(statement.above, this.styles.Comment.above), this.trace += above
			this[statement.type](statement)
			let side = statement.side
			if(side) this.fastText(statement.side, this.styles.Comment.side), this.trace += side
			else if(i < bodylen) this.fastText('\n', this.styles.Comment.side), this.trace += '\n'
			// support $
			if(foldAfterFirst) this.$fastTextFontSize = 1, foldAfterFirst = false
		}
		let bottom = node.bottom
		if(bottom) this.fastText(bottom, this.styles.Comment.bottom), this.trace += bottom

		if(isFolded) this.$fastTextFontSize = isFolded

		this.indentOut()
		// store endx endy
		let blockh = turtle.wy
		
		if(traceHandler){
			this.trace += '}catch($e){$T(-'+traceHandler+',$e);throw $e}finally{$T(-'+traceHandler+',this)}'
		}
		else this.trace += '}'
		this.fastText('}', colorScheme.curly)
	
		let pickId = this.pickIdCounter++
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
				(colorScheme||this.styles.Block.BlockStatement).block.open:
				(colorScheme||this.styles.Block.BlockStatement).block.close
		)
	}

	//ArrayExpression:{elements:2},
	ArrayExpression(node){
		let turtle = this.turtle

		let startx = turtle.sx, starty = turtle.wy
		this.fastText('[', this.styles.Array.bracket)
		this.trace += '['
		let elems = node.elements
		let elemslen = elems.length - 1

		//var dy = 0
		if(this.$lengthText() === this.$fastTextOffset && this.wasNewlineChange){
		//	dy = this.$fastTextDelta
			this.$fastTextDelta += (elemslen+1)*this.$fastTextDelta
		}
		let insCommas = node.insCommas
		if(insCommas) this.$fastTextDelta += insCommas

		var endx = turtle.wx, lineh = turtle.mh
		// lets indent
		let top = node.top
		if(top){
			this.trace += top
			this.fastText(top, this.styles.Comment.top)
			this.indentIn()

			var isFolded = top.charCodeAt(top.length - 1) === 13?this.$fastTextFontSize:0
			if(isFolded) this.$fastTextFontSize = 1
		}
		let commaStyle = top?this.styles.Array.commaOpen:this.styles.Array.commaClose

		for(let i = 0; i <= elemslen; i++){
			let elem = elems[i]

			if(elem){
				if(top && elem.above) this.fastText(elem.above, this.styles.Comment.above)
				this[elem.type](elem)
			}
			if(node.trail || i < elemslen){
				this.fastText(',', commaStyle)
				this.trace += ','
			}
			if(elem && top){
				var side = elem.side
				if(side) this.fastText(side, this.styles.Comment.side), this.trace += side
				else if(i !== elemslen)this.fastText('\n', this.styles.Comment.side), this.trace += '\n'
			}
		}

		if(top){
			var bottom = node.bottom
			if(bottom)this.fastText(bottom, this.styles.Comment.bottom), this.trace += bottom
			else{
				if(!this.lastIsNewline()){//this.text.charCodeAt(this.text.length -1) !== 10){
					this.fastText('\n', this.styles.Comment.bottom)
					this.trace += '\n'
				}
			}
			if(isFolded) this.$fastTextFontSize = isFolded
			this.indentOut()
		}

		let blockh = turtle.wy

		//this.$fastTextDelta += dy
		this.trace += ']'
		this.fastText(']', this.styles.Array.bracket)

		let pickId = this.pickIdCounter++
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
				this.styles.Array.block.open:
				this.styles.Array.block.close
			)
	}

	//ObjectExpression:{properties:3},
	ObjectExpression(node){
		let turtle = this.turtle
		let keyStyle = this.styles.Object.key

		let startx = turtle.sx, starty = turtle.wy
		
		this.fastText('{', this.styles.Object.curly)
		this.trace += '{'
		let endx = turtle.wx, lineh = turtle.mh

		// lets indent
		let props = node.properties
		let propslen = props.length - 1

		// make space for our expanded or collapsed view
		if(this.$lengthText() === this.$fastTextOffset && this.wasFirstNewlineChange){
			this.$fastTextDelta += (propslen + 1) * this.$fastTextDelta
		}
		// make room for inserted commas
		let insCommas = node.insCommas
		if(insCommas) this.$fastTextDelta += insCommas
		let top = node.top
		//this.newLine()
		if(top){
			var maxlen = 0
			this.fastText(top, this.styles.Comment.top)
			this.trace += top
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
		
		var commaStyle = top?this.styles.Object.commaOpen:this.styles.Object.commaClose
		for(let i = 0; i <= propslen; i++){

			let prop = props[i]
			let above = prop.above
			if(top && above) this.fastText(above, this.styles.Comment.above), this.trace += above
			let key = prop.key

			let keypos = undefined
			if(key.type === 'Identifier'){
				if(top) keypos = key.name.length
				this.trace += key.name
				this.fastText(key.name, keyStyle,keypos?(maxlen - keypos)*keyStyle.alignLeft:0)
			}
			else this[key.type](key)

			if(!prop.shorthand){
				this.trace += ':'
				this.fastText(':', this.styles.Object.colon,keypos?(maxlen - keypos)*keyStyle.alignRight:0)
				var value = prop.value
				this[value.type](value, key)
			}

			if(node.trail || i < propslen){
				this.trace += ','
				this.fastText(',', commaStyle)
			}

			if(top){
				let side = prop.side
				if(side) this.fastText(side, this.styles.Comment.side), this.trace += side
				else if(i !== propslen)this.fastText('\n', this.styles.Comment.side)
			}

		}

		if(top){
			let bottom = node.bottom
			if(bottom) this.fastText(bottom, this.styles.Comment.bottom), this.trace += bottom
			else{
				if(!this.lastIsNewline()){
					this.trace += '\n'
					this.fastText('\n', this.styles.Comment.bottom)
				}
			}
			if(isFolded) this.$fastTextFontSize = isFolded

			this.indentOut()
		}

		//this.$fastTextDelta += dy
		this.trace += '}'
		this.fastText('}', this.styles.Object.curly)

		let blockh = turtle.wy

		let pickId = this.pickIdCounter++
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
				this.styles.Object.block.open:
				this.styles.Object.block.close
			)
	}

	//ClassBody:{body:2},
	ClassBody(node){
		let turtle = this.turtle
		let startx = turtle.sx, starty = turtle.wy

		this.fastText('{', this.styles.Class.curly)
		this.trace += '{'
		
		let endx = turtle.wx, lineh = turtle.mh

		this.indentIn()
		var top = node.top
		if(top) this.fastText(top, this.styles.Comment.top), this.trace += top
		var body = node.body
		var bodylen = body.length - 1
		for(let i = 0; i <= bodylen; i++){
			var method = body[i]
			let above = method.above
			if(above) this.fastText(above, this.styles.Comment.above), this.trace += above
			this[method.type](method)
			let side = method.side
			if(side) this.fastText(side, this.styles.Comment.side), this.trace += side
			else if(i < bodylen) this.fastText('\n', this.styles.Comment.side), this.trace += '\n'
		}
		let bottom = node.bottom
        if(bottom) this.fastText(bottom, this.styles.Comment.bottom), this.trace += bottom
		this.indentOut()
		this.trace += '}'
		this.fastText('}', this.styles.Class.curly)
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
			this.styles.Class.block.open
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
				this.fastText(',', this.styles.Parens.comma)
			}
		}
	}

	//ParenthesizedExpression:{expression:1}
	ParenthesizedExpression(node, level){
		if(!level) level = 0
		this.trace += '('
		this.fastText('(', this.styles.Parens.left)
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
			this.fastText(')'+rs, this.styles.Parens.right)
		}
		else this.fastText(')', this.styles.Parens.right)

	}

	//Literal:{raw:0, value:0},
	Literal(node){
		this.trace += node.raw
		this.fastText(node.raw, this.styles.Value[node.kind])
	}

	//Identifier:{name:0},
	Identifier(node){
		var style
		var name = node.name
		var where
		if(where = this.scope[name]){
			if(this.scope.hasOwnProperty(name)){
				style = this.styles.Id[where]
			}
			else{
				style = this.styles.Id[where].closure
			}
		}
		else if(this.scope.$ && this.glslGlobals[name]){
			style = this.styles.Id.glsl
		}
		else style = this.styles.Id.unknown

		if(this.traceMap) this.trace += 'T$('+this.traceMap.push(node)+','+name+')'
		else this.trace += name

		this.fastText(name, style)
	}

	//ThisExpression:{},
	ThisExpression(node){
		this.trace += 'this'
		this.fastText('this', this.styles.Class.this)
	}

	//MemberExpression:{object:1, property:1, computed:0},
	MemberExpression(node){
		var obj = node.object
		this[obj.type](obj)
		var prop = node.property

		if(node.computed){
			this.trace += '['
			this.fastText('[', this.styles.Object.bracket)

			this[prop.type](prop, node)
			this.trace += ']'
			this.fastText(']', this.styles.Object.bracket)
		}
		else{
			if(node.around1){
				this.fastText(node.around1, this.styles.Comment.around)
			}
			this.indentIn()
			this.trace += '.'
			this.fastText('.', this.styles.Object.dot)
			if(node.around2){
				this.fastText(node.around2, this.styles.Comment.around)
			}
			if(prop.type !== 'Identifier') this[prop.type](prop, node)
			else{
				var name = prop.name
				this.trace += name
				this.fastText(name, this.styles.Object.member)
			}
			this.indentOut()
		}
	}

	//CallExpression:{callee:1, arguments:2},
	CallExpression(node, lhs){
		var callee = node.callee

		if(callee.type === 'MemberExpression' && callee.object.name === 'module' && node.arguments && node.arguments.length === 2){
			if(callee.property.name === 'log'){
				// lets store our log in the annotator
				this.onProbeExpression('log',  node.arguments[1], lhs)
				return
			}
			else if(callee.property.name === 'probe'){
				this.onProbeExpression('probe',  node.arguments[1], lhs)
				return
			}
		}

		var args = node.arguments

		if(this.traceMap) this.trace += '$T(' + this.traceMap.push(node)+','

		this[callee.type](callee, node)

		this.trace += '('
		this.fastText('(', this.styles.Call.paren)

		var argslen = args.length - 1

		var dy = 0
		if(this.$lengthText() === this.$fastTextOffset && this.wasFirstNewlineChange){
			dy = this.$fastTextDelta
			this.$fastTextDelta += argslen * dy
		}
		let top = node.top
		if(top){
			this.fastText(node.top, this.styles.Comment.top)
			this.trace += top
			this.indentIn()
		}
		
		for(let i = 0; i <= argslen;i++){
			var arg = args[i]
			let above = arg.above
			if(top && above) this.fastText(above, this.styles.Comment.above), this.trace += above
			this[arg.type](arg)
			if(i < argslen) {
				this.trace += ','
				this.fastText(',', node.top?this.styles.Call.commaOpen:this.styles.Call.commaClosed)
			}
			if(top){
				var side = arg.side
				if(side) this.fastText(arg.side, this.styles.Comment.side), this.trace += side
				else if(i < argslen)this.fastText('\n', this.styles.Comment.side), this.trace += '\n'
			}
		}

		if(top){
			let bottom = node.bottom
			if(bottom) this.fastText(node.bottom, this.styles.Comment.bottom)
			else{
				if(!this.lastIsNewline()){
					this.fastText('\n', this.styles.Comment.bottom), this.trace += '\n'
				}
			}
			
			this.indentOut()
		}
		this.$fastTextDelta += dy
		this.trace += ')'
		if(this.traceMap) this.trace += ')'
		
		if(this.allowOperatorSpaces && node.rightSpace){
			for(let i = node.rightSpace, rs = ''; i > 0; --i) rs += ' '
			this.fastText(')'+rs, this.styles.Call.paren)
		}
		else this.fastText(')', this.styles.Call.paren)
	}

	//NewExpression:{callee:1, arguments:2},
	NewExpression(node){
		var callee = node.callee
		var args = node.arguments
		this.trace += 'new '
		this.fastText('new ', this.styles.Class.new)
		// check newline/whitespace
		let around2 = node.around2
		if(around2) this.fastText(around2, this.styles.Comment.around), this.trace += around2
		this.CallExpression(node)

	}

	//ReturnStatement:{argument:1},
	ReturnStatement(node){
		var arg = node.argument
		if(arg){
			this.trace += 'return '
			this.fastText('return ', this.styles.Function.return)
			this[arg.type](arg, node)
		}
		else{
			this.trace += 'return'
			this.fastText('return'+node.space, this.styles.Function.return)
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
			this.scope[name] = 'fn'
			this.trace += 'function '+id.name
			this.fastText('function ', this.styles.Function.function)
			this.fastText(id.name, this.styles.Id.fn)
		}
		else{
            if(!method){
				this.trace += 'function'
				this.fastText('function' + (node.space?node.space:''), this.styles.Function.function)
            }
            else{
				this.trace += method
				this.fastText(method, this.styles.Class.method)
            }
		}
		this.trace += '('
		this.fastText('(', this.styles.Function.parenLeft)

		let top = node.top
		if(top) this.fastText(top, this.styles.Comment.top), this.trace += top
		this.indentIn()

		var oldscope = this.scope
		this.scope = Object.create(this.scope)
		var params = node.params
		var paramslen = params.length - 1
		for(let i = 0; i <= paramslen; i++){
			var param = params[i]
			let above = param.above
			if(top && above) this.fastText(above, this.styles.Comment.above), this.trace += above
	
			if(param.type === 'Identifier'){
				var name = param.name
				this.scope[name] = 'arg'
				this.trace += name
				this.fastText(name, this.styles.Id.arg)
			}
			else {
                if(param.type === 'RestElement'){
                    this.scope[param.argument.name] = 'arg'
                }
				this[param.type](param)
			}
			if(i < paramslen){
				this.trace += ','
				this.fastText(',', this.styles.Function.comma)
			}
			if(top){
				let side = param.side
				if(side) this.fastText(param.side, this.styles.Comment.side), this.trace += side
				else if(i !== paramslen)this.fastText('\n', this.styles.Comment.side), this.trace += '\n'
			}
		}

		if(top){
			let bottom = node.bottom
			if(bottom) this.fastText(node.bottom, this.styles.Comment.bottom)
			else{
				if(!this.lastIsNewline()){
					this.fastText('\n', this.styles.Comment.bottom), this.trace += '\n'
				}
			}
		}

		this.indentOut()
		this.trace += ')'
		this.fastText(')', this.styles.Function.parenRight)

		var body = node.body
		this[body.type](body, this.styles.Function, node)

		this.scope = oldscope
	}

	//VariableDeclaration:{declarations:2, kind:0},
	VariableDeclaration(node, level){
		var kind = node.kind
		if(node.space !== undefined) this.fastText(kind+node.space, this.styles.VariableDeclaration)
		else this.fastText(kind+' ', this.styles.Keyword[kind])
		this.trace += kind+' '
		let mid = node.mid
		if(mid){
			this.fastText(mid, this.styles.Comment.above), this.trace += mid
		}

		var decls = node.declarations
		var declslen = decls.length - 1
		for(let i = 0; i <= declslen; i++){
			var decl = decls[i]
			this[decl.type](decl, kind)
			if(i !== declslen){
				this.fastText(',', this.styles.Keyword.varComma)
				this.trace += ','
			}
		}
	}

	//VariableDeclarator:{id:1, init:1},
	VariableDeclarator(node, kind){
		var id = node.id

		if(node.probe){
			this.fastText('@', this.styles.Operator['@'])
		}
		if(id.type === 'Identifier'){
			this.scope[id.name] = kind//scopeId || 1
			this.fastText(id.name, this.styles.Id[kind])
			this.trace += id.name
		}
		else this[id.type](id, node)
		
		var init = node.init
		if(init){
			let around1 = node.around1
			if(around1) this.fastText(around1, this.styles.Comment.around), this.trace += around1

			this.trace += '='
			this.fastText('=', this.styles.Operator['='] || this.styles.Operator.default)
			let around2 = node.around2
			if(around2) this.fastText(around2, this.styles.Comment.around), this.trace += around2
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

		let around1 = node.around1
		if(around1) this.fastText(around1, this.styles.Comment.around), this.trace += around1
		this.indentIn()

		this.trace += node.operator
		this.fastText(node.operator, this.styles.Operator[node.operator] || this.styles.Operator.default)
		let around2 = node.around2
		if(around2) this.fastText(around2, this.styles.Comment.around), this.trace += around2

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
		let around1 = node.around1
		if(around1){
			this.fastText(around1, this.styles.Comment.around), this.trace += around1
		}
		if(doIndent) this.indentIn()
		var x2 = turtle.wx 
		this.trace += op
		if(this.allowOperatorSpaces){
			for(let ls = '', i = node.leftSpace||0; i > 0; --i) ls += ' '
			for(let rs = '', i = node.rightSpace||0; i > 0; --i) rs += ' '
			this.fastText(ls+op+rs, this.styles.Operator[node.operator] || this.styles.Operator.default, 0, 0)
		}
		else {
			var style
			if(doIndent) style = this.styles.Operator[node.operator] || this.styles.Operator.default
			else style = this.styles.OperatorNL[node.operator] || this.styles.OperatorNL.default
			if(op === 'in') op = ' ' + op + ' '
			this.fastText(op, style)
		}
		var x3 = turtle.wx 
		let around2 = node.around2
		if(around2) this.fastText(around2, this.styles.Comment.around), this.trace += around2

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
		let around1 = node.around1
		if(around1) this.fastText(around1, this.styles.Comment.around), this.trace += around1
		this.trace += node.operator
		this.fastText(node.operator, this.styles.Operator[node.operator] || this.styles.Operator.default)
		let around2 = node.around2
		if(around2) this.fastText(around2, this.styles.Comment.around), this.trace += around2

		this[right.type](right, left)
	}

	//ConditionalExpression:{test:1, consequent:1, alternate:1},
	ConditionalExpression(node){
		var test = node.test
		this[test.type](test)
		this.trace += '?'
		this.fastText('?', this.styles.Operator['?:'])
		this.indentIn()
		var afterq = node.afterq
		if(afterq) this.fastText(afterq, this.styles.Comment.above), this.trace += afterq
		var cq = node.consequent
		this[cq.type](cq)
		this.trace += ':'
		this.fastText(':', this.styles.Operator['?:'])
		var afterc = node.afterc
		if(afterc) this.fastText(afterc, this.styles.Comment.above), this.trace += afterc
		var alt = node.alternate
		this[alt.type](alt)
		this.indentOut()

	}

	//UpdateExpression:{operator:0, prefix:0, argument:1},
	UpdateExpression(node){
		if(node.prefix){
			var op = node.operator
			this.trace += op
			this.fastText(op, this.styles.Operator[op] || this.styles.Operator.default)
			var arg = node.argument
			var argtype = arg.type
			this[argtype](arg)
		}
		else{
			var arg = node.argument
			var argtype = arg.type
			this[argtype](arg)
			var op = node.operator
			this.trace += op
			this.fastText(op, this.styles.Operator[op] || this.styles.Operator.default)
		}
 	}

 	onProbeExpression(op, arg, lhs){
		if(op === 'probe'){
			var id = this.onProbe(arg, lhs)
			this.trace += 'module.probe('+id+','
			var style = Object.create(this.styles.Operator['#'])
			style.probeId = id
			this.fastText('#', style)
			// store ID in fontsize
			this.ann[this.ann.length-2] = id
			// allright lets store in ann some metadata on our probe
			var argtype = arg.type
			this[argtype](arg)
			this.trace += ')'
			this.fastText('', style)
		}
		if(op === 'log'){
			var id = this.onLog(arg, lhs)
			this.trace += 'module.log('+id+','
			var style = Object.create(this.styles.Operator['@'])
			style.probeId = id
			this.fastText('@', style)
			var argtype = arg.type
			this[argtype](arg)
			this.trace += ')'
			this.fastText('', style)
		}
 	}

 	ProbeExpression(node, lhs){
		var op = node.operator
		this.onProbeExpression(op === '#'?'probe':'log', node.argument, lhs)
 	}

	//UnaryExpression:{operator:0, prefix:0, argument:1},
	UnaryExpression(node, lhs){
		if(node.prefix){
			var op = node.operator
			if(op.length > 1) op = op + ' '
			this.trace += op
			this.fastText(op, this.styles.Operator[op] || this.styles.Operator.default)
			var arg = node.argument
			var argtype = arg.type
			this[argtype](arg)
		}
		else{
			var arg = node.argument
			var argtype = arg.type
			this[argtype](arg)
			var op = node.operator
			this.fastText(op, this.styles.Operator[op] || this.styles.Operator.default)
		}
 	}

	//IfStatement:{test:1, consequent:1, alternate:1},
	IfStatement(node){
		if(this.traceMap) this.trace += 'if(T$('+this.traceMap.push(node)+','
		else this.trace += 'if('
		this.fastText('if', this.styles.If.if)
		this.fastText('(', this.styles.If.parenLeft)
		var test = node.test
		this[test.type](test,1)

		if(this.traceMap) this.trace += '))'
		else this.trace += ')'

		this.fastText(')', this.styles.If.parenRight)
		let after1 = node.after1
		if(after1) this.fastText(after1, this.styles.Comment.above), this.trace += after1
		var cq = node.consequent
		this[cq.type](cq, this.styles.If)
		var alt = node.alternate
		if(alt){
			this.trace += '\nelse '
			this.fastText('\nelse ', this.styles.If.else)
			let after2 = node.after2
			if(after2) this.fastText(after2, this.styles.Comment.above), this.trace += after2
			this[alt.type](alt, this.styles.If)
		}
	}

	//ForStatement:{init:1, test:1, update:1, body:1},
	ForStatement(node){
		this.trace += 'for('
		this.fastText('for', this.styles.For.for)
		this.fastText('(', this.styles.For.parenLeft)
		var init = node.init
		if(init)this[init.type](init, 1, 3)
		this.trace += ';'
		this.fastText(';', this.styles.For.semi)
		var test = node.test
		if(test)this[test.type](test, 1)
		this.trace += ';'
		this.fastText(';', this.styles.For.semi)
		var update = node.update
		if(update)this[update.type](update, 1)
		this.trace += ')'
		this.fastText(')', this.styles.For.parenRight)
		var body = node.body
		let after = node.after
		if(after) this.fastText(after, this.styles.Comment.above), this.trace += after
		this[body.type](body, this.styles.For)
	}

	//ForInStatement:{left:1, right:1, body:1},
	ForInStatement(node){
		this.trace += 'for('
		this.fastText('for', this.styles.For.for)
		this.fastText('(', this.styles.For.parenLeft)
		var left = node.left
		this[left.type](left)
		this.trace += ' in '
		this.fastText(' in ', this.styles.For.in)
		var right = node.right
		this[right.type](right)
		this.trace += ')'
		this.fastText(')', this.styles.For.parenRight)
		var body = node.body
		let after = node.after
		if(after) this.fastText(after, this.styles.Comment.above), this.trace += after
		this[body.type](body, this.styles.For)
	}

	//ForOfStatement:{left:1, right:1, body:1},
	ForOfStatement(node){
		this.trace += 'for('
		this.fastText('for', this.styles.For.for)
		this.fastText('(', this.styles.For.parenLeft)
		var left = node.left
		this[left.type](left)
		this.trace += ' of '
		this.fastText(' of ', this.styles.For.of)
		var right = node.right
		this[right.type](right)
		this.trace += ')'
		this.fastText(')', this.styles.For.parenRight)
		var body = node.body
		let after = node.after
		if(after) this.fastText(after, this.styles.Comment.above), this.trace += after
		this[body.type](body, this.styles.For)
	}

	//WhileStatement:{body:1, test:1},
	WhileStatement(node){
		this.fastText('while', this.styles.For.while)
		this.fastText('(', this.styles.For.parenLeft)
		this.trace += 'while('
		var test = node.test
		this[test.type](test)
		this.fastText(')', this.styles.For.parenRight)
		this.trace += ')'
		let after1 = node.after1
		if(after1) this.fastText(after1, this.styles.Comment.above), this.trace += after1
		var body = node.body
		this[body.type](body, this.styles.For)
	}

	//DoWhileStatement:{body:1, test:1},
	DoWhileStatement(node){
		this.trace += 'do'
		this.fastText('do', this.styles.For.do)
		var body = node.body
		this[body.type](body, this.styles.For)
		this.fastText('while', this.styles.For.while)
		this.fastText('(', this.styles.For.parenLeft)
		this.trace += 'while('
		var test = node.test
		this[test.type](test)
		this.fastText(')', this.styles.For.parenRight)
		this.trace += ')'
	}

	//BreakStatement:{label:1},
	BreakStatement(node){
		if(node.label){
			var label = node.label
			this.trace += 'break '
			this.fastText('break ', this.styles.For.break)
			this[label.type](label)
		}
		else{
			this.trace += 'break'
			this.fastText('break', this.styles.For.break)
		}
	}

	//ContinueStatement:{label:1},
	ContinueStatement(node){
		if(node.label){
			var label = node.label
			this.trace += 'continue '
			this.fastText('continue ', this.styles.For.continue)
			this[label.type](label)
		}
		else{
			this.trace += 'continue'
			this.fastText('continue', this.styles.For.continue)
		}
	}

	//YieldExpression:{argument:1, delegate:0}
	YieldExpression(node){
		var arg = node.argument
		if(arg){
			this.trace += 'yield '
			this.fastText('yield ', this.styles.Function.yield)
			this[arg.type](arg, node)
		}
		else{
			this.trace += 'yield'
			this.fastText('yield'+node.space, this.styles.Function.yield)
		}
	}
	
	//ThrowStatement:{argument:1},
	ThrowStatement(node){
		var arg = node.argument
		if(arg){
			this.trace += 'throw '
			this.fastText('throw ', this.styles.Exception.throw)
			this[arg.type](arg, node)
		}
		else{
			this.trace += 'throw'
			this.fastText('throw'+node.space, this.styles.Exception.throw)
		}
	}

	//TryStatement:{block:1, handler:1, finalizer:1},
	TryStatement(node){
		this.trace += 'try'
		this.fastText('try', this.styles.Exception.try)
		var block = node.block
		this[block.type](block, this.styles.Exception)
		var handler = node.handler
		if(handler){
			let above = handler.above
			if(above) this.fastText(above, this.styles.Comment.side), this.trace += above
			this[handler.type](handler, this.styles.Exception)
		}
		var finalizer = node.finalizer
		if(finalizer){
			let above = finalizer.above
			if(above) this.fastText(above, this.styles.Comment.side), this.trace += above
			this.trace += 'finally'
			this.fastText('finally', this.styles.Exception.finally)
			this[finalizer.type](finalizer, this.styles.Exception)
		}
	}

	//CatchClause:{param:1, body:1},
	CatchClause(node){
		this.trace += 'catch('
		this.fastText('catch', this.styles.Exception.catch)
		this.fastText('(', this.styles.Exception.parenLeft)
		var param = node.param
		this[param.type](param)
		this.fastText(')', this.styles.Exception.parenRight)
		this.trace += ')'
		var body = node.body
		this[body.type](body, this.styles.Exception)
	}

	//SpreadElement
	SpreadElement(node){
		this.fastText('...', this.styles.Operator['...'])
		this.trace += '...'
		var arg = node.argument
		this[arg.type](arg)
	}

	//RestElement:{argument:1}
	RestElement(node){
		this.fastText('...', this.styles.Operator['...'])
		this.trace += '...'
		var arg = node.argument
		this[arg.type](arg)
	}

	//Super:{},
	Super(node){
		this.fastText('super', this.styles.Class.super)
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
		this.trace += '('
		if(!node.noParens){
			this.fastText('(', this.styles.Function.parenLeft)
		}
		var params = node.params
		var paramslen = params.length - 1
		for(var i = 0; i <= paramslen; i++){
			var param = params[i]
			if(param.type === 'Identifier'){
				var name = param.name
				this.scope[name] = 'arg'
				this.trace += name
				this.fastText(name, this.styles.Id.arg)
			}
			else {
                if(param.type === 'RestElement'){
                    this.scope[param.argument.name] = 'arg'
                }
				this[param.type](param)
			}
			if(i < paramslen){
				this.trace += ','
				this.fastText(',', this.styles.Function.comma)
			}
		}
		this.trace += ')'
		if(!node.noParens){
			this.fastText(')', this.styles.Function.parenRight)	
		}
		this.trace += '=>'
		this.fastText('=>', this.styles.Function.arrow)
		var body = node.body
		this[body.type](body, this.styles.Function)
	}

	//SwitchStatement:{discriminant:1, cases:2},
	SwitchStatement(node){
		this.trace += 'switch('
		this.fastText('switch', this.styles.If.switch)
		this.fastText('(', this.styles.If.parentLeft)
		var disc = node.discriminant
		this[disc.type](disc)
		this.fastText(')', this.styles.If.parentLeft)
		this.fastText('{', this.styles.If.curly)
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
		
		this.fastText('}', this.styles.If.curly)
		this.trace += '}'
	}

	//SwitchCase:{test:1, consequent:2},
	SwitchCase(node){
		let above = node.above
		if(above) this.fastText(above, this.styles.Comment.above), this.trace += above
		var test = node.test
		if(!test){
			this.trace += 'default'
			this.fastText('default', this.styles.If.case)
		}
		else{
			this.trace += 'case '
			this.fastText('case ', this.styles.If.case)
			this[test.type](test)
		}
		this.trace += ':'
		this.fastText(':', this.styles.If.caseColon)
		let side = node.side
		if(side) this.fastText(side, this.styles.Comment.side), this.trace += side
		this.indentIn()
		var cqs = node.consequent
		var cqlen = cqs.length
		for(let i = 0; i < cqlen; i++){
			var cq = cqs[i]
			let above = cq.above
			if(above) this.fastText(above, this.styles.Comment.above), this.trace += above
			if(cq) this[cq.type](cq)
			let side = cq.side
			if(side) this.fastText(side, this.styles.Comment.side), this.trace += side
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
		this.fastText('class ', this.styles.Class.class)
		var id = node.id
		if(id){
            this.scope[id.name] = 'class'
			this[id.type](id)

			if(node.space){
				this.trace += ' '
				this.fastText(' ', this.styles.Class.class)
			}
		}
		var base = node.superClass
		if(base){
			this.trace += 'extends '
			this.fastText('extends ', this.styles.Class.extends)
			this[base.type](base)
		}
		var body = node.body
		this[body.type](body)
	}

	//ClassExpression:{id:1,superClass:1},
	ClassExpression(node){
		this.trace += 'class '
		this.fastText('class ', this.styles.Class.class)
		var id = node.id
		if(id){
			this.scope[id.name] = 'class'
			this[id.type](id)
			
			if(node.space){
				this.trace += ' '
				this.fastText(' ', this.styles.Class.class)
			}
		}	
		var base = node.superClass
		if(base){
			this.trace += 'extends '
			this.fastText('extends ', this.styles.Class.extends)
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
            this.fastText('static ', this.styles.Class.static)
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
		
		let after1 = node.after1
		if(after1) this.fastText(after1, this.styles.Comment.above), this.trace += after1

		// lets inject a newline
		var body = node.body
		this[body.type](body)
	}
	// WithStatement:{object:1, body:1}
	WithStatement(node){
		logNonexisting(node)
	}

}