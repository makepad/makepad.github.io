var parser = require('parsers/js') 
var storage = require('services/storage') 
var types = require('base/types')
module.exports = class Code extends require('views/edit'){ 

	// mixin the formatter
	prototype() {
		this.mixin(require('parsers/jsastformat'))
		this.mixin(require('parsers/jstokenformat'))
		this.lazyUniforms = {
			groupHighlightId: true,
			blockHighlightPickId: true
		}

		this.props = {
			errors:undefined,
			allowOperatorSpaces:0,
			overflow:'scroll',
			padding:[0, 0, 0, 4],
			$fastTextFontSize:12,
			$fastTextIndent:0,
			serializeIndent:'\t'
		}
		var colors = module.style.colors

		this.tools = {
			Bg:require('shaders/quad').extend({
				moveScroll:0,
				padding:[0,0,0,4],
				w:'100%',
				h:'100%',
				color:colors.codeBg
			}),
			Text: require('shaders/codetext').extend({
				font: module.style.fonts.mono,
				order:3,
				groupHighlightId:{kind:'uniform', value:0},
				vertexStyle:function(){$
					if(this.group == this.groupHighlightId){
						this.boldness += 0.5
						this.color *= 1.5
					}
				}
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
			Marker: require('shaders/bg').extend({
				borderRadius:4,
			}), 			
			ErrorMarker: require('shaders/codemarker').extend({
				order:4
			}),
			ErrorMessage: require('base/view').extend({
				heavy:false,
				order:8,
				margin:[6,0,0,0],
				states:{
					default:{
						to:{Text:{opacity:1.},Bg:{opacity:1}},
						duration:0.
					},
					create:{
						0:{Text:{opacity:0.},Bg:{opacity:0}},
						99:{Text:{opacity:0.},Bg:{opacity:0}},
						to:{Text:{opacity:1.},Bg:{opacity:1}},
						duration:0.5
					}
				},
				props:{
					errorPos:0,
					text:'error'
				},
				tools:{
					Text:require('shaders/text').extend({
						color:'black',
						font:module.style.fonts.regular,
						fontSize:module.style.fonts.size*0.8
					}),
					Bg:require('shaders/bg').extend({
						padding:2,
						borderRadius:2,
						color:'#ccc'
					})
				},
				onDraw(){
					this.beginBg({})
					this.drawText({text:this.text})
					this.endBg()
					if(this.errorPos>this.turtle._w){
						this.turtle.displace(this.errorPos - this.turtle._w,0)
					}
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
				default:{},
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
				around: {},
				between:{}
			}, 
			Operator:{
				$color:colors.codeOperator,
				default:{$head:1, $tail:1},
				'=':{$head:1, $tail:1},
				'?:':{},
				'@':{},
				'#':{},
				'...':{},
				':':{}
			},
			Log:{
				$color:colors.codeLog
			},
			LabeledStatement:{
				$color:colors.codeOperator,
				label:{},
				colon:{}
			},
			UnaryExpression:{
				$color:colors.codeOperator,
				prefix:{$head:0, $tail:0},
				postfix:{$head:0, $tail:0},
			},
			UpdateExpression:{
				$color:colors.codeOperator,
				prefix:{$head:0, $tail:0},
				postfix:{$head:0, $tail:0},
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
				let:{$color:colors.codeLet, $boldness:0.2},
				debugger:{$color:colors.codeFunction, $boldness:0.2}
			},
			Id:{
				arg:{$color:colors.codeFunction, closure:{}},
				var:{$color:colors.codeVar, closure:{}},
				const:{$color:colors.codeConst, closure:{}},
				let:{$color:colors.codeLet, closure:{}},
				label:{$color:colors.codeVar, closure:{}},
				glsl$const:{},
				magic$const:{},
				fn$const:{},
				class$const:{},
				unknown:{$color:colors.codeUnknown},
				tokException:{$color:colors.codeTokException},
				global:{$color:colors.codeGlobal, $boldness:0.2, closure:{}}
			}
		} 

		this._defaultScope ={ 
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
		this.defaultScope = Object.create(null)
		for(var key in this._defaultScope){
			this.defaultScope[key] = this._defaultScope[key]
		} 
	}
	
	constructor(...args) { 
		super(...args) 
		//this.oldText = '' 
		this.runtimeErrors = []
		this.parseErrors = []
		this.$textClean = false 
		this.indentSize = this.Text.prototype.font.fontmap.glyphs[32].advance * 3 
		this.$fastTextWhitespace = this.styles.whitespace
	} 
	
	parseText() {
		this.ast = undefined 
		try{
			this.runtimeErrors.length = 0
			this.parseErrors.length = 0
			this.ast = parser.parse(this.text, { 
				storeComments: [] 
			})
		}
		catch(e) {
			console.log(e)
			this.parseErrors.push(e)
		} 
	} 
	// serialize all selections, lazily
	cursorChanged(){
		super.cursorChanged()
		// trigger some kind of signal for our editor to redraw
		var visualEditor = this.app.find('VisualEdit')
		if(visualEditor){
			visualEditor.onCursorMove(this)
		}
	}
	
	

	drawStackMarker(start, end, color){
		var rds = this.$readOffsetText(clamp(start, 0, this.lengthText() - 1) ) 			
		var rde = this.$readOffsetText(clamp(end, 0, this.lengthText() - 1) ) 			
		if(!rde) return
		this.drawMarker({
			x:rds.x,
			y:rds.y,
			w:rde.x-rds.x,
			h:rds.fontSize * rds.lineSpacing,
			color:color
		})
	}

	drawError(error, id){
		var epos = clamp(error.pos, 0, this.lengthText() - 1)
		
		var rd = this.$readOffsetText(epos)
		if(!rd) return
		
		//if(!this.hasErrorMarker) this.hasErrorMarker = {}

		// ok so when do we want to animate
		// 
		var marker = {
			x1: 0, 
			x2: rd.x, 
			x3: rd.x + abs(rd.w), 
			x4: 100000, 
			y: rd.y, 
			h: rd.fontSize * rd.lineSpacing, 
			id:id
			//state: ((this.hasErrorMarker[id]||0) < this._frameId-2)?'fadein' :'default'
		}

		//console.log(marker.state, (this.hasErrorMarker[id]||0), this._frameId)
		//this.hasErrorMarker[id] = this._frameId

		this.drawErrorMarker(marker)
		// if cursor is at same epos (or mouse hovers over dot?..)
		// draw ErrorMessage
		
		// lets check if the epos is a cursor end
		var cursors = this.cs.cursors 
		for(var i = 0; i < cursors.length; i++) {
			var cursor = cursors[i] 
			if(cursor.end === epos){
				this.drawErrorMessage({
					id:id,
					errorPos:rd.x+rd.w,
					x:0,
					y:marker.y+marker.h,
					text:error.message
				})
				break
			}
		}
		//if(i==0 && !this.hasFocus) this.scrollIntoView(marker.x, marker.y, marker.w, marker.h)
	}

	onDraw() { 
		
		if(!this.text)this.text = ''
		this.beginBg() 
		// ok lets parse the code
		if(this.$textClean) { 
			this.reuseDrawSize()
			this.reuseBlock()
			//this.reuseMarker()
			this.reuseText()
		}
		else {
			this.$fastTextDelay = 0 
			this.parseErrors = []
			var dontMove = false
			if(this.$textClean !== null){
				this.parseText()
			}
			else dontMove = true
			this.pickIdCounter = 1 
			this.pickIds = [0] 
			this.$textClean = true 
			
			if(this.ast) {
					// first we format the code
				if(this.onBeginFormatAST) this.onBeginFormatAST()

				this.jsASTFormat(this.indentSize, this.ast)

				var oldtext = this.text 
				this.text = this.$fastTextChunks.join('')

				if(this.onEndFormatAST) this.onEndFormatAST()

				//console.log(JSON.stringify(this.$fastTextChunks))
				// deal with the autoformatter 
				var newtext = this.text
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
					this.addUndoInsert(start, oldend+1, this.$undoStack, oldtext, "format") 
					this.addUndoDelete(start, newend+1, undefined, "format") 
				}
				
				if(!dontMove) this.cs.scanChange(oldtext, newtext) 
				this.cs.clampCursor(0, newlen) 
				
				if(this.onParsed) setImmediate(this.onParsed.bind(this))
			}
			else {

				//var ann = this.ann
				//this.reuseBlock()
				//this.reuseMarker()
				this.jsTokenFormat(this.text)

			} 
			//require('base/perf')

			//require.perf()
			this.$fastTextDelta = 0
		} 

		if(this.runtimeErrors){
			for(var i = this.runtimeErrors.length - 1; i >= 0; --i){
				var err = this.runtimeErrors[i]
				var text = this.text
				var line = err.line - 1
				var col = err.column
				var j = 0, tl = text.length;
				for(; j < tl; j++){
					if(text.charCodeAt(j) === 10) line--
					if(line<=0) break
				}
				this.drawError({
					pos:j+col,
					message:err.message
				}, 'rt'+i)
			}
		}

		if(this.parseErrors){
			for(var i = this.parseErrors.length - 1; i >= 0; --i){
				this.drawError(this.parseErrors[i], 'parse'+i)
			}
		}


		if(this.stackMarkers){
			var stack = this.stackMarkers.__unwrap__
			for(var i = stack.length-1; i >= 0; i--){
				var item = stack[i]

				if(this.resource.path !== item.path) continue

				var text = this.text
				var line = item.line - 1
				var col = item.column
				var j = 0, tl = text.length;
				for(; j < tl; j++){
					if(text.charCodeAt(j) === 10) line--
					if(line<=0) break
				}
				var start = j+col
				var end = start+1
				for(;end<text.length;end++){
					if(!text.charAt(end).match(/\w/))break
				}
				var col = i/(stack.length-1)

				this.drawStackMarker(start, end, [1-col,col,0.,1])
			}
		}
		// draw code markers
		// we have a bunch of line/row/size markers
		// lets draw em


		if(this.hasFocus) { // draw cursors

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
					x: t.x - 1, 
					y: t.y, 
					w: 2, 
					h: t.h 
				}) 
				//this.showLastCursor()
			} 

			// lets take the last cursor and figure out the highlight
			// range
			var cursor = this.cs.cursors[0]
			var pos = cursor.start
			var blocks = this.$blockRanges
			if(!blocks) return
			var minsize = Infinity
			var found
			for(var i = 0, l = blocks.length; i < l; i++){
				var block = blocks[i]
				if(pos >= block.start && pos < block.end){
					var size = block.end - block.start
					if(size <= minsize) minsize = size, found = block
				}
			}
			this.blockHighlightPickId = found?found.id:0
			
			// scan for paren ranges
			var parens = this.$parenRanges
			minsize = Infinity
			found = undefined
			for(var i = 0, l = parens.length; i < l; i++){
				var paren = parens[i]
				if(pos >= paren.start && pos < paren.end){
					var size = paren.end - paren.start
					if(size <= minsize) minsize = size, found = paren
				}
			}
			this.groupHighlightId = found?found.id:0
			// k so this is a problem.
			// how do we fix it.


		} 
		this.endBg(true) 
	} 
	
	findNearest(pos, oldText, newText, char){
		function minAbs(a,b){
			if(abs(a)<abs(b)) return a
			return b
		}
		// now find our true offset
		var oldOff = 0
		for(var i = 0; i < pos; i++){
			var code = oldText.charCodeAt(i)
			if(code !== 32 && code !== 9 && code !== 10 && code !== 13) oldOff++
		}
		// ok now lets find that trueOff in the new one
		var newOff = 0
		for(var newPos = 0;newPos < newText.length; newPos++){
			var code = newText.charCodeAt(newPos)
			if(code !== 32 && code !== 9 && code !== 10 && code !== 13) newOff++
			if(newOff == oldOff) break
		}
		// ok so we have a newOff and a oldOff
		// now we have to just find our character near newOff
		for(var a = newPos; a < newText.length; a++){
			if(newText.charCodeAt(a) === char){
				a++
				break
			}
		}
		for(var b = newPos; b >= 0; b--){
			if(newText.charCodeAt(b) === char){
				b++
				break
			}
		}
		// what if we are next to a space in the old one,
		// and next to a tab in the new one? well we skip back one.
		var newpos = pos - minAbs(pos-a,pos-b)
		return newpos
	}

	// #attempt 5004
	scanChange(pos, oldText, newText){
		var c1 = oldText.charCodeAt(pos-1)
		var c2 = oldText.charCodeAt(pos)
		if(c1 !== 32 && c1 !== 9 && c1 !== 10 && c1 !== 13){
			return this.findNearest(pos, oldText, newText, c1)
		}
		if(c2 !== 32 && c2 !== 9 && c2 !== 10 && c2 !== 13){
			return this.findNearest(pos+1, oldText, newText, c2)-1
		}
		var c3 = newText.charCodeAt(pos)
		// if at the end of the line and pressing space, dont skip to first
		if((c1 === 32 || c1 === 9) && c2 === 10 && c3 === 9) return pos -1

		return pos
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

		var seek = start - delta

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
					if(this.ast && chunks[i] === ' ') i--, start--, seek --
					if(chunks[i] === '\t'){ // lets scan indentation 
						var delta = 1
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
						var end = start
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

	//onFlag32() { 
	//	this.$textClean = false 
	//	this.redraw() 
	//} 
	
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
		//if(!k.meta) return true
		//storage.save("/debug.json", JSON.stringify({step: this.ann.step, ann: this.ann}))
	}
	
	onKeySemiColon(k) {
		//if(!k.meta) return true
		/*
		storage.load("/debug.json").then(result=>{
			this.parseError = {}
			var res = JSON.parse(result)
			this.ann = res.ann
			this.ann.step = res.step
			this.$textClean = false
			this.ast = undefined
			this.debugShow = true
			this.redraw()
		})*/ 
	} 
	
	onFingerDown(f) { 
		// check if we are a doubleclick on a block
		var node = this.pickIds[f.pickId] 
		/*
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
		} */
		return super.onFingerDown(f) 
	} 
	
	currentIndent(offset){
		var prev = 0
		var text = this.text
		for(var i = offset; i >=0; i--){
			var char = text.charCodeAt(i)
			if(i !== offset && (char === 10 || char === 13)) break
			if(char === 9) prev ++
			else prev = 0 
		}
		var seek = false
		var next = 0
		for(var i = offset; i < text.length; i++){
			var char = text.charCodeAt(i)
			if(seek){
				if(char === 9) next ++
				else break
			}
			if(char === 10 || char === 13) seek = true
		}
		return max(prev, next)
	}

	insertText(offset, text, isUndo) { 
		
		var char = this.text.charAt(offset)
		var move = 0
		var prev = this.text.charAt(offset - 1)
		var next = this.text.charAt(offset+1)
		if(!isUndo) { 
			if(text === "'" && char === "'") return 0 
			if(text === '"' && char === '"') return 0 
			if(text === '}' && char === '}') return 0 
			if(text === ']' && char === ']') return 0 
			if(text === ')' && char === ')') return 0 
			if(text === '\n' && (prev === '{' ||prev==='[' ||prev==='(')){
				text = '\n'
				var depth = this.currentIndent(offset)
				text += Array(depth+2).join('\t')
				move += depth +1
				if(char === '}' || char === ']' || char===')'){
					text += '\n'
					text += Array(depth+1).join('\t')
				}
			}
			if(text === '{' && (!this.parseError || this.parseError.message !== 'Matching ({[ error') && (char === '\n' || char === ',' || char === ')' || char === ']') && (!this.error || char !== '}')) text = '{}' 
			if(text === '[' && (!this.parseError || this.parseError.message !== 'Matching ({[ error') && (char === '\n' || char === ',') && char !== ']') text = '[]' 
			if(text === '(' && (!this.parseError || this.parseError.message !== 'Matching ({[ error') && (char === '\n' || char === ',') && char !== ')') text = '()' 
			
			if(text === '"' && (!this.parseError || this.parseError.message !== 'Unterminated string constant') && char !== '"' && prev !== '"') text = '""' 
			if(text === "'" && (!this.parseError || this.parseError.message !== 'Unterminated string constant') && char !== "'" && prev !== "'") text = "''" 

			if(text === '\n'){
				text = '\n'
				//TODO figure out if(x){<\n>\n}
				var depth = this.currentIndent(offset)
				text += Array(depth+1).join('\t')
				move += depth
				this.wasNewlineChange = 1
			}
			else this.wasNewlineChange = 0
		}

		if(this.wasNewlineChange && this.text.charAt(offset) !== '\n' && this.text.charAt(offset + 1) !== '\n') { 
			this.wasFirstNewlineChange = 1 
		}
		else this.wasFirstNewlineChange = 0 
		
		this.$textClean = false 
		this.inputDirty = true
		this.text = this.text.slice(0, offset) + text + this.text.slice(offset) 

		this.redraw() 
		return {
			len:text.length,
			move:move
		}
	} 

	dump(){
		var chunks = this.$fastTextChunks 
		var styles = this.$fastTextStyles
		var i = 0
		var str = ''
		for(var i = 0; i < chunks.length; i++){
			str += JSON.stringify(chunks[i])+' ' + (styles[i]?styles[i].name:'0')+'\n'
		}
		console.log(str)
	}
	
	removeText(start, end, isUndo) { 
		this.inputDirty = true
		this.$textClean = false 
		var delta = 0 
		this.wasNewlineChange = 0 
		var text = this.text 
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
		
		this.text = text.slice(0, start) + text.slice(end)
	
		this.redraw() 
		return delta 
	} 
	
	serializeSlice(start, end, arg) { 
		if(arg) return arg.slice(start, end) 
		return this.text.slice(start, end) 
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

