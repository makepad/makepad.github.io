var parser = require('parsers/js') 
var storage = require('services/storage') 

module.exports = class Code extends require('views/edit'){ 

	// mixin the formatter
	prototype() { 
		this.mixin(require('parsers/jsastformat')) 
		this.mixin(require('parsers/jstokenformat')) 
		
		this.allowOperatorSpaces = 0
		this.overflow = 'scroll'
		this.padding = [0, 0, 0, 4]
		this.$fastTextFontSize = 12
		this.$fastTextIndent = 0
		this._onText |= 32
		this.serializeIndent = '\t'
		this.props = {
			errors:undefined
		}
		
		let colors = module.style.colors

		this.tools = {
			Bg:require('shaders/quad').extend({
				moveScroll:0,
				padding:[0,0,0,4],
				w:'100%',
				h:'100%',
				color:colors.codeBg
			}),
			Text: require('shaders/codetext').extend({
				font: require('fonts/ubuntu_monospace_256.font'),
				order:3,
			}), 
			Block: require('shaders/codeblock').extend({
				pickAlpha: 0.,
				blockHighlightPickId:{kind:'uniform', value:0},
				vertexStyle: function() {$
					this.x -= (6. / 12.) * this.fontSize
					this.w += 3.
					this.w += 10.
					this.h2 += 2.
					var pos = vec2()
					
					if(this.isFingerOver(pos) > 0) {
						this.color.rgb += vec3(0.2)
					}
					else {
						this.color.a *= .25
					} 
					if(this.pickId == this.blockHighlightPickId){
						this.color.a *= 2.5// = 'red'
					}
					// lets figure out a hover anim here?
					this.color.rgb += vec3(this.indent * 0.05)
					this.borderColor = this.color
				} 
			}), 
			Marker: require('shaders/codemarker').extend({
				vertexStyle: function() {$
					this.opColor = this.bgColor * 1.1
					this.borderColor = this.bgColor
					this.x -= 2.
					this.x2 += 2.
					this.x3 += 2.
					this.w += 4.
					this.y += this.level * 1.
					this.h -= this.level * 2.
					this.borderRadius -= this.level
				}
			}), 			
			ErrorMarker: require('shaders/codemarker').extend({
				vertexStyle: function() {$
					//this.errorTime = max(0., .1 - this.errorTime) 
					//if(this.errorAnim.z < this.errorAnim.w) this.errorTime = 1. 
					this.x2 -= 2. 
					this.x3 += 2. 
					this.opColor = this.bgColor * 2.3 
					this.borderColor = this.bgColor * 1.4 
				} 
			})
		} 
		
		this.styles = {
			$boldness: 0.,
			$color: '#fff',
			$italic: 0,
			$head: 0,
			$tail: 0,
			NewText: {
				$color: '#ccc'
			},
			whitespace:{},
			curly:{},
			block:{
				$borderWidth: 1,
				$borderRadius: 3.75, 
				open:{open:1},
				close:{open:0}
			},
			Tokenized:{
				paren:{
					$color:"#ccc"
				},
				curly:{
					$color:"#ccc"
				},
				bracket:{
					$color:"#ccc"
				}
			},
			Class:{
				$color:colors.codeClass,
				class:{},
				extends:{},
				super:{},
				new:{},
				this:{},
				curly$curly:{},
				method:{},
				static:{},
				getset:{},
				block$block:{}
			},
			Object:{
				$color:colors.codeObject,
				curly:{},
				colon:{},
				key:{alignLeft:0,alignRight:1.},
				block$block:{},
				commaOpen:{$tail:0.},
				commaClose:{$tail:1},
				dot:{},
				bracket:{},
				member:{}
			},
			Array:{
				$color:colors.codeObject,
				commaOpen:{$tail:0.},
				commaClose:{$tail:1},
				block$block:{},
				bracket:{}
			},
			Function:{
				$color:colors.codeFunction,
				function:{},
				curly:{},
				block$block:{},
				comma:{$tail:1},
				return:{},
				yield:{},
				parenLeft:{},
				parenRight:{$tail:1},
				arrow:{}
			},
			Call:{
				$color:colors.codeCall,
				paren:{},
				commaOpen:{},
				commaClosed:{$tail:1}
			},
			If:{
				$color:colors.codeIf,
				if:{},
				else:{},
				parenLeft:{},
				parenRight:{$tail:1},
				curly:{},
				block$block:{},
				switch:{},
				case:{},
				caseColon:{}
			},
			For:{
				$color:colors.codeLoop,
				for:{},
				in:{},
				of:{},
				do:{},
				while:{},
				semi:{},
				parenLeft:{},
				parenRight:{},
				curly:{},
				block$block:{},
				break:{},
				continue:{}
			},
			Exception:{
				$color:colors.codeException,
				throw:{},
				try:{},
				catch:{},
				parenLeft:{},
				parenRight:{},
				finally:{},
				curly:{},
				block$block:{}
			},
			Value:{
				regexp: {
					$color:colors.codeString
				}, 
				object: {
					$color:colors.codeObject
				},
				num:{
					$color:colors.codeNumber
				},
				boolean:{
					$color:colors.codeBoolean
				},
				string:{
					$color:colors.codeString
				},
			},
			Comment: {
				$boldness: 0.1,
				$color: colors.codeComment,
				$isComment: 1, 
				side: {$head: 1},
				above: {},
				top: {$head: 1},
				bottom: {$head: 0.},
				around: {}
			}, 
			Operator:{
				$color:colors.codeOperator,
				default:{$head:1, $tail:1},
				'=':{$head:1, $tail:1},
				'?:':{},
				'@':{},
				'#':{},
				'...':{}
			},
			Template:{
				$color:colors.codeString,
				template:{},
				expression:{$color:colors.codeOperator}
			},
			OperatorNL$Operator:{},
			Parens:{
				$color:colors.codeParen,
				left:{},
				right:{},
				comma:{}
			},
			Keyword:{
				varComma:{$color:colors.codeVar, $tail:1},
				var:{$color:colors.codeVar, $boldness:0.4},
				const:{$color:colors.codeConst, $boldness:0.2},
				let:{$color:colors.codeLet, $boldness:0.2}
			},
			Id:{
				arg:{$color:colors.codeFunction, closure:{}},
				var:{$color:colors.codeVar, closure:{}},
				const:{$color:colors.codeConst, closure:{}},
				let:{$color:colors.codeLet, closure:{}},
				glsl$const:{},
				magic$const:{},
				fn$const:{},
				class$const:{},
				unknown:{$color:colors.codeUnknown},
				tokException:{$color:colors.codeTokException},
				global:{$color:colors.codeGlobal, $boldness:0.2, closure:{}}
			}
		} 

		this.defaultScope = { 
			console: 'global', 
			eval: 'global', 
			Infinity: 'global', 
			NaN: 'global', 
			undefined: 'global', 
			null: 'global', 
			isFinite: 'global', 
			isNaN: 'global', 
			parseFloat: 'global', 
			parseInt: 'global', 
			Symbol: 'global', 
			Error: 'global', 
			EvalError: 'global', 
			InternalError: 'global', 
			RangeError: 'global', 
			ReferenceError: 'global', 
			TypeError: 'global', 
			URIError: 'global', 
			Map: 'global', 
			Set: 'global', 
			WeakMap: 'global', 
			WeakSet: 'global', 
			SIMD: 'global', 
			JSON: 'global', 
			Generator: 'global', 
			GeneratorFunction: 'global', 
			Intl: 'global', 
			SyntaxError: 'global', 
			Function: 'global', 
			RegExp: 'global', 
			Math: 'global', 
			Object: 'global', 
			String: 'global', 
			Number: 'global', 
			Boolean: 'global', 
			Date: 'global', 
			Array: 'global', 
			Int8Array: 'global', 
			Uint8Array: 'global', 
			Uint8ClampedArray: 'global', 
			Int16Array: 'global', 
			Uint16Array: 'global', 
			Int32Array: 'global', 
			Uint32Array: 'global', 
			Float32Array: 'global', 
			Float64Array: 'global', 
			DataView: 'global', 
			ArrayBuffer: 'global', 
			require: 'global', 
			exports: 'global', 
			module: 'global', 
			E: 'global', 
			LN10: 'global', 
			LN2: 'global', 
			LOG10E: 'global', 
			LOG10: 'global', 
			PI: 'global', 
			SQRT2: 'global', 
			SQRT1_2: 'global', 
			random: 'global', 
			radians: 'global', 
			degrees: 'global', 
			sin: 'global', 
			cos: 'global', 
			tan: 'global', 
			asin: 'global', 
			acos: 'global', 
			atan: 'global', 
			pow: 'global', 
			exp: 'global', 
			log: 'global', 
			exp2: 'global', 
			log2: 'global', 
			sqrt: 'global', 
			inversesqrt: 'global', 
			abs: 'global', 
			sign: 'global', 
			floor: 'global', 
			ceil: 'global', 
			fract: 'global', 
			mod: 'global', 
			min: 'global', 
			max: 'global', 
			clamp: 'global', 
			step: 'global', 
			smoothstep: 'global', 
			mix: 'global', 
			arguments: 'const' 
		} 


	} 
	
	constructor(...args) { 
		super(...args) 

		//this.oldText = '' 
		this.$textClean = false 
		this.indentSize = this.Text.prototype.font.fontmap.glyphs[32].advance * 3 
		this.$fastTextWhitespace = this.styles.whitespace
	} 
	
	parseText() { 
		this.ast = undefined 
		this.parseError = undefined 
		this.onClearErrors()
		try{ 
			this.ast = parser.parse(this._text, { 
				storeComments: [] 
			}) 
		} 
		catch(e) { 
			this.parseError = e
			//this.store.act("addParseError",store=>{
			//	this.resource.parseErrors.length = 0
			//	this.resource.parseErrors.push(e)
			//	console.log(this.resource.parseErrors)
			//})
		} 
	} 
	// serialize all selections, lazily
	cursorChanged(){
		super.cursorChanged()
		// lets take the last cursor and figure out the highlight
		// range
		let cursor = this.cs.cursors[0]
		let pos = cursor.start
		let blocks = this.$blockRanges
		let minsize = Infinity
		let found
		for(let i = 0, l = blocks.length; i < l; i++){
			let block = blocks[i]
			if(pos >= block.start && pos < block.end){
				let size = block.end - block.start
				if(size <= minsize) minsize = size, found = block
			}
		}
		this.blockHighlightPickId = found?found.id:0
		
		// scan for paren ranges
		let parens = this.$parenRanges
		minsize = Infinity
		found = undefined
		for(let i = 0, l = parens.length; i < l; i++){
			let paren = parens[i]
			if(pos >= paren.start && pos < paren.end){
				let size = paren.end - paren.start
				if(size <= minsize) minsize = size, found = paren
			}
		}
		this.groupHighlightId = found?found.id:0
	}

	onClearErrors(){
	}

	onDraw() { 
		if(!this._text)this._text = ''
		this.beginBg() 
		// ok lets parse the code
		if(this.$textClean) { 
			this.reuseDrawSize()
			this.reuseBlock()
			this.reuseMarker()
			this.reuseText()
		}
		else {
			this.$fastTextDelay = 0 

			this.parseText()
			
			this.pickIdCounter = 1 
			this.pickIds = [0] 
			this.$textClean = true 
			
			if(this.ast) {
				this.reuseErrorMarker()
	
				// first we format the code
				if(this.onBeginFormatAST) this.onBeginFormatAST()

				this.jsASTFormat(this.indentSize, this.ast)

				var oldtext = this._text 
				this._text = this.$fastTextChunks.join('')

				if(this.onEndFormatAST) this.onEndFormatAST()

				//console.log(JSON.stringify(this.$fastTextChunks))
				// deal with the autoformatter 
				var newtext = this._text
				var oldlen = oldtext.length
				var newlen = newtext.length
				for(var start = 0; start < oldlen && start < newlen; start++) {
					if(oldtext.charCodeAt(start) !== newtext.charCodeAt(start)) break
				} 
				for(var oldend = oldlen - 1, newend = newlen - 1; oldend > start && newend > start; oldend--, newend--) { 
					if(oldtext.charCodeAt(oldend) !== newtext.charCodeAt(newend)) { 
						break
					} 
				}
				
				this.wasNoopChange = false 
				
				if(start !== newlen) {
					// this gets tacked onto the undo with the same group
					this.addUndoInsert(start, oldlen, this.$undoStack, oldtext) 
					this.addUndoDelete(start, newlen) 
					// lets check what we did
					var oldrem = oldtext.slice(start, oldend) 
					var newins = newtext.slice(start, newend) 
				}
				
				this.cs.scanChange(oldtext, newtext) 
				this.cs.clampCursor(0, newlen) 
				
				if(this.onParsed) setImmediate(this.onParsed.bind(this))
			}
			else {

				//var ann = this.ann
				this.reuseBlock(null, 0)
				this.reuseMarker()
				this.jsTokenFormat(this._text)

			} 
			//require('base/perf')

			//require.perf()
			this.$fastTextDelta = 0 
		} 

		var errors = this.errors
		if(errors){
			for(let i = errors.length - 1; i >= 0; --i){
				var error = errors[i]
				var epos = clamp(error, 0, this.$lengthText() - 1) 
				var rd = this.$readOffsetText(epos) 			
				if(!rd) continue
					
				//console.log(out)
				//rd.x,rd.y,rd.w,rd.fontSize*rd.lineSpacing,-1,-1,-1,-1)
				var marker = { 
					x1: 0, 
					x2: rd.x, 
					x3: rd.x + rd.w, 
					x4: 100000, 
					y: rd.y, 
					h: rd.fontSize * rd.lineSpacing, 
					closed: 0 

				}
				this.drawErrorMarker(marker)
				if(i==0 && !this.hasFocus) this.scrollIntoView(marker.x, marker.y, marker.w, marker.h)
			}
		}

		if(this.hasFocus) {

			var cursors = this.cs.cursors 
			for(var i = 0; i < cursors.length; i++) {
				var cursor = cursors[i] 
				var t = this.cursorRect(cursor.end)
				if(cursor.max < 0) cursor.max = t.x 
				
				var boxes = this.$boundRectsText(cursor.lo(), cursor.hi()) 

				for(var j = 0; j < boxes.length; j++) { 
					var box = boxes[j] 
					var pbox = boxes[j - 1] 
					var nbox = boxes[j + 1] 
					this.fastSelection( 
						box.x, 
						box.y, 
						box.w, 
						box.h, 
						pbox? pbox.x: -1, 
						pbox? pbox.w: -1, 
						nbox? nbox.x: -1, 
						nbox? nbox.w: -1 
					) 
				} 
				this.drawCursor({ 
					x: this.turtle.$xAbs + t.x - 1, 
					y: this.turtle.$yAbs + t.y, 
					w: 2, 
					h: t.h 
				}) 
				//this.showLastCursor()
			} 
		} 
		
		this.endBg(true) 
	} 
	
	scanChange(pos, oldText, newText){
		//return
		// only do this when at token boundary
		// attempt #5002
		//let dx = 0
		var p0 = oldText.charCodeAt(pos-1)
		if(p0 === 10 || p0 === 13 || p0 === 9) p0 = undefined
		// we cant hold onto a space
		//if(p0 === 32) p0 = oldText.charCodeAt(pos - 2), dx = -1
		var p1 = oldText.charCodeAt(pos)
		if(p1 === 32) p1 = undefined
		var p2 = oldText.charCodeAt(pos+1)

		for(var i = pos+1; i >= 0; i--){
			if(newText.charCodeAt(i) === p1 && newText.charCodeAt(i+1) === p2){
				break
			}
		}
		for(var j = pos-1; j < newText.length+1; j++){
			if(newText.charCodeAt(j) === p1 && newText.charCodeAt(j+1)=== p2){
				break
			}
		}
		for(var k = pos+1; k >= 0; k--){
			if(newText.charCodeAt(k) === p0){
				k++
				break
			}
		}
		for(var l = pos-1; l < newText.length+1; l++){
			if(newText.charCodeAt(l) === p0){
				l++
				break
			}
		}
		for(var m = pos+1; m >= 0; m--){
			if(newText.charCodeAt(m) === p1){
				break
			}
		}
		for(var n = pos-1; n < newText.length+1; n++){
			if(newText.charCodeAt(n) === p1){
				break
			}
		}
		function minAbs(a,b){
			if(abs(a)<abs(b)) return a
			return b
		}

		/*
		console.log(
			oldText.slice(0,pos-1) + '#A#' +
			oldText.slice(pos-1, pos) + '#B#' +
			oldText.slice(pos, pos+1) + '#C#' +
			oldText.slice(pos+1, pos+2) + '##' +
			oldText.slice(pos+2),
			pos
			//newText.length,
			//p0,p1,p2,
			//i,j,k,l,m,n,
			//pos-minAbs(minAbs(minAbs(minAbs(minAbs(pos-i,pos-j), pos-k), pos-l), pos-m), pos-n)
		)*/
		let newpos = pos-minAbs(minAbs(minAbs(minAbs(minAbs(pos-i,pos-j), pos-k), pos-l), pos-m), pos-n)
		if(!this.isTokenBoundary(newpos)) return pos

		return newpos
	}

	isTokenBoundary(start){
		// alright. what do we do.
		var chunks = this.$fastTextChunks 
		var styles = this.$fastTextStyles
		var pos = 0 
		for(var i = 0, len = chunks.length; i < len; i ++) { 
			var txt = chunks[i] 
			pos += txt.length
			if(start < pos) {
				var idx = start - (pos - txt.length)
				if(idx === 0){ // we are at the beginning
					return true
				}
				return false
			}
		}
	}

	scanBackSpaceRange(start, delta){

		let seek = start - delta

		// alright. what do we do.										
		var chunks = this.$fastTextChunks 
		var styles = this.$fastTextStyles
		var pos = 0 
		for(var i = 0, len = chunks.length; i < len; i ++) { 
			var txt = chunks[i] 
			pos += txt.length
			if(seek < pos) {
				var idx = seek - (pos - txt.length)
				if(idx === 0){ // we are at the beginning
					// scan forwards through spaces
					// scan backwards through 
					i--
					if(this.ast && chunks[i] === ' ') i--, seek --
					if(chunks[i] === '\t'){ // lets scan indentation 
						let delta = 1
						for(;i>0 && styles[i] === this.$fastTextWhitespace;i--){
							delta += chunks[i].length
						}
						return {
							start:start - delta,
							end:start
						}
					}
					// otherwise we scan formatting whitespace
					if(this.ast && chunks[i].length === 1){
						let end = start
						if(chunks[i-1] === ' ') start -= 1
						if(chunks[i+1] === ' ') end += 1
						return {
							start:start - 1,
							end: end
						}
					}
				}
				break
			} 
		}
		return {
			start:start - 1,
			end:start
		}
	}

	onFlag32() { 
		this.$textClean = false 
		this.redraw() 
	} 
	
	indentFindParenErrorPos() {
		return -1
		/*
		var ann = this.ann
		var stack = []
		var close = {
			'{': '}',
			'(': ')',
			'[': ']'
		}
		var pos = 0
		for(var i = 0,l = ann.length,step = ann.step; i < l; i += step) {
			var txt = ann[i]
			var sx = ann[i + 5]
			if(txt === '{' || txt === '[' || txt === '(') stack.push(txt, sx, pos)
			if(txt === '}' || txt === ']' || txt === ')') {
				var opos = stack.pop()
				var osx = stack.pop()
				var otxt = stack.pop()
				if(sx !== osx) { // indent change
					if(sx > osx) {
						return pos + 1
					}
					else {
						return opos + 1
					}
				}
				if(close[otxt] !== txt) {
					return opos + 1
				}
			}
			pos += txt.length
		}
		return -1*/ 
	} 
	
	onKeySingleQuote(k) {
		if(!k.meta) return true
		storage.save("/debug.json", JSON.stringify({step: this.ann.step, ann: this.ann}))
	}
	
	onKeySemiColon(k) {
		if(!k.meta) return true
		storage.load("/debug.json").then(result=>{
			this.parseError = {}
			var res = JSON.parse(result)
			this.ann = res.ann
			this.ann.step = res.step
			this.$textClean = false
			this.ast = undefined
			this.debugShow = true
			this.redraw()
		}) 
	} 
	
	onFingerDown(f) { 
		// check if we are a doubleclick on a block
		var node = this.pickIds[f.pickId] 
		if(node) { 
			// toggle all inner nodes
			var redraw = false 
			if(f.ctrl || f.alt) { 
				super.onFingerDown(f) 
				if(node.type === 'BlockStatement') { 
					toggleASTNode(node, 13) 
					toggleBlockStatement(node) 
				}
				else if(node.type === 'ObjectExpression') { 
					toggleASTNode(node, 13) 
					toggleObjectExpression(node) 
				}
				else if(node.type === 'ArrayExpression') { 
					toggleASTNode(node, 13) 
					toggleArrayExpression(node) 
				} 
				redraw = true 
			}
			else if(f.tapCount > 0) { 
				toggleASTNode(node) 
				redraw = true 
			} 
			if(redraw) { 
				this.$fastTextStart = 
				this.$fastTextOffset = 0 
				// we need to toggle folding but not make it slow.
				this.$textClean = null 
				this.redraw() 
				return 
			} 
		} 
		return super.onFingerDown(f) 
	} 
	
	currentIndent(offset){
		let prev = 0
		let text = this._text
		for(let i = offset; i >=0; i--){
			let char = text.charCodeAt(i)
			if(i !== offset && (char === 10 || char === 13)) break
			if(char === 9) prev ++
			else prev = 0 
		}
		let seek = false
		let next = 0
		for(let i = offset; i < text.length; i++){
			let char = text.charCodeAt(i)
			if(seek){
				if(char === 9) next ++
				else break
			}
			if(char === 10 || char === 13) seek = true
		}
		return max(prev, next)
	}

	insertText(offset, text, isUndo) { 
		
		var char = this._text.charAt(offset)
		var move = 0
		var prev = this._text.charAt(offset - 1)
		
		if(!isUndo) { 
			if(text === "'" && char === "'") return 0 
			if(text === '"' && char === '"') return 0 
			if(text === '}' && char === '}') return 0 
			if(text === ']' && char === ']') return 0 
			if(text === ')' && char === ')') return 0 
			if(text === '\n' && (prev === '{' && char === '}'||prev==='[' && char === ']'||prev==='('&&char===')')){
				text = '\n'
				let depth = this.currentIndent(offset)
				text += Array(depth+2).join('\t')
				move += depth + 1
				text += '\n'
				text += Array(depth+1).join('\t')
			}
			if(text === '{' && (!this.parseError || this.parseError.message !== 'Matching ({[ error') && (char === '\n' || char === ',' || char === ')' || char === ']') && (!this.error || char !== '}')) text = '{}' 
			if(text === '[' && (!this.parseError || this.parseError.message !== 'Matching ({[ error') && (char === '\n' || char === ',') && char !== ']') text = '[]' 
			if(text === '(' && (!this.parseError || this.parseError.message !== 'Matching ({[ error') && (char === '\n' || char === ',') && char !== ')') text = '()' 
			
			if(text === '"' && (!this.parseError || this.parseError.message !== 'Unterminated string constant') && char !== '"' && prev !== '"') text = '""' 
			if(text === "'" && (!this.parseError || this.parseError.message !== 'Unterminated string constant') && char !== "'" && prev !== "'") text = "''" 
		} 

		if(text === '\n'){
			text = '\n'
			//TODO figure out if(x){<\n>\n}
			let depth = this.currentIndent(offset)
			text += Array(depth+1).join('\t')
			move += depth
			this.wasNewlineChange = 1
		}
		else this.wasNewlineChange = 0

		if(this.wasNewlineChange && this._text.charAt(offset) !== '\n' && this._text.charAt(offset + 1) !== '\n') { 
			this.wasFirstNewlineChange = 1 
		}
		else this.wasFirstNewlineChange = 0 
		
		this.$textClean = false 
		this.inputDirty = true
		this._text = this._text.slice(0, offset) + text + this._text.slice(offset) 

		this.redraw() 
		return {
			len:text.length,
			move:move
		}
	} 

	dump(){
		var chunks = this.$fastTextChunks 
		var styles = this.$fastTextStyles
		let i = 0
		let str = ''
		for(let i = 0; i < chunks.length; i++){
			str += JSON.stringify(chunks[i])+' ' + (styles[i]?styles[i].name:'0')+'\n'
		}
		console.log(str)
	}
	
	removeText(start, end, isUndo) { 
		this.inputDirty = true
		this.$textClean = false 
		var delta = 0 
		this.wasNewlineChange = 0 
		var text = this._text 
		//console.log("REMOVE", isUndo, start, end)
		if(!isUndo) {
			if(end === start + 1) {  // its a single character
				var delchar = text.slice(start, end) 
				if(delchar === '\n') { 
					// check if we removed a singleton newline
					if(text.charAt(start - 1) !== '\n' && 
						text.charAt(end) !== '\n') {
						this.wasFirstNewlineChange = true 
					}
					else this.wasFirstNewlineChange = false
					this.wasNewlineChange = true
					if(text.charAt(start - 1) === '{' && text.charAt(end) === '\n' && text.charAt(end + 1) === '}') end++
					else if(text.charAt(start - 1) === ',' && (text.charAt(start + 1) === ',' || text.charAt(start + 1) !== '\n')) { 
						start--
						delta = -1
					}
				}
				else if(delchar === '{' && text.charAt(end) === '}') end++
				else if(delchar === '[' && text.charAt(end) === ']') end++
				else if(delchar === '(' && text.charAt(end) === ')') end++
				else if(delchar === "'" && text.charAt(end) === "'") end++
				else if(delchar === '"' && text.charAt(end) === '"') end++ 
			} 
		} 
		
		this._text = text.slice(0, start) + text.slice(end)
		
	
		this.redraw() 
		return delta 
	} 
	
	serializeSlice(start, end, arg) { 
		if(arg) return arg.slice(start, end) 
		return this._text.slice(start, end) 
	} 
} 

function toggleASTNode(node, override) { 
	if(!node) return 
	if(node.type === 'IfStatement') { 
		override = toggleASTNode(node.consequent, override) || override 
		override = toggleASTNode(node.alternate, override) || override 
		return override 
	} 
	var top = node.top 
	
	// special handling of our {$ shader code
	if(node.type === 'BlockStatement' && 
		node.body.length > 0 && 
		node.body[0].type === 'ExpressionStatement' && 
		node.body[0].expression.type === 'Identifier' && 
		node.body[0].expression.name === '$') { 
		node = node.body[0] 
		var side = node.side 
		var charCode = override || side.charCodeAt(side.length - 1) 
		if(charCode === 10) { 
			node.side = side.slice(0, -1) + '\r' 
			return 10 
		}
		else { 
			node.side = side.slice(0, -1) + '\n' 
			return 13 
		} 
	} 
	
	if(!top) return 
	
	var charCode = override || top.charCodeAt(top.length - 1) 
	if(charCode === 10) { 
		node.top = top.slice(0, -1) + '\r' 
		return 10 
	}
	else { 
		node.top = top.slice(0, -1) + '\n' 
		return 13 
	} 
} 

function toggleBlockStatement(node) { 
	var body = node.body 
	var bodylen = body.length - 1 
	var first = 0 
	for(var i = 0; i <= bodylen; i++) { 
		var statement = body[i] 
		if(statement.type === 'ExpressionStatement') statement = statement.expression 
		if(statement.type === 'AssignmentExpression') { 
			if(statement.right.type === 'FunctionExpression') { 
				first = toggleASTNode(statement.right.body, first) || first 
			}
			else if(statement.right.type === 'ObjectExpression' || statement.right.type === 'ArrayExpression') { 
				first = toggleASTNode(statement.right, first) || first 
			} 
		}
		else if(statement.type === 'FunctionDeclaration') { 
			first = toggleASTNode(statement.body, first) || first 
		}
		else if(statement.type === 'CallExpression') { 
			var args = statement.arguments 
			var argslen = args.length - 1 
			for(var j = 0; j <= argslen; j++) { 
				var arg = args[j] 
				if(arg.type === 'FunctionExpression') { 
					first = toggleASTNode(arg.body, first) || first 
				}
				else if(arg.type === 'ObjectExpression' || arg.type === 'ArrayExpression') { 
					first = toggleASTNode(arg, first) || first 
				} 
			} 
		}
		else if(statement.type === 'VariableDeclaration') { 
			var decls = statement.declarations 
			var declslen = decls.length - 1 
			for(var j = 0; j <= declslen; j++) { 
				var decl = decls[j] 
				var init = decl.init 
				if(!init) continue 
				if(init.type === 'FunctionExpression') { 
					first = toggleASTNode(init.body, first) || first 
				}
				else if(init.type === 'ObjectExpression' || init.type === 'ArrayExpression') { 
					first = toggleASTNode(init, first) || first 
				} 
			} 
		}
		else if(statement.type === 'IfStatement') { 
			first = toggleASTNode(statement.consequent, first) || first 
			first = toggleASTNode(statement.alternate, first) || first 
		}
		else if(statement.type === 'ForStatement' || statement.type === 'ForInStatement') { 
			first = toggleASTNode(statement.body, first) || first 
		} 
	} 
} 

function toggleObjectExpression(node) { 
	var props = node.properties 
	var propslen = props.length - 1 
	var first = 0 
	for(var i = 0; i <= propslen; i++) { 
		var prop = props[i] 
		var value = prop.value 
		if(value.type === 'CallExpression') { 
			var args = value.arguments 
			var argslen = args.length - 1 
			for(var j = 0; j <= argslen; j++) { 
				var arg = args[j] 
				if(arg.type === 'FunctionExpression') { 
					first = toggleASTNode(arg.body, first) || first 
				}
				else if(arg.type === 'ObjectExpression' || arg.type === 'ArrayExpression') { 
					first = toggleASTNode(arg, first) || first 
				} 
			} 
		}
		else if(value.type === 'FunctionExpression') { 
			first = toggleASTNode(value.body, first) || first 
		}
		else if(value.type === 'ObjectExpression' || value.type === 'ArrayExpression') { 
			first = toggleASTNode(value, first) || first 
		} 
	} 
} 

function toggleArrayExpression(node) { 
	var elems = node.elements 
	var elemslen = elems.length - 1 
	for(var i = 0; i <= elemslen; i++) { 
		var elem = elems[i] 
		if(!elem) continue 
		if(elem.type === 'FunctionExpression') { 
			toggleASTNode(elem.body) 
		}
		else if(elem.type === 'ObjectExpression' || elem.type === 'ArrayExpression') { 
			toggleASTNode(elem) 
		} 
	} 
} 

