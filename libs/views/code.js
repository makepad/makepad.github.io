var parser = require('parsers/js') 
var storage = require('services/storage') 

module.exports = class Code extends require('views/edit'){ 
	
	// mixin the formatter
	prototype() { 
		this.mixin(require('parsers/jsformatter')) 
		
		this.allowOperatorSpaces = 0 
		this.overflow = 'scroll' 
		this.padding = [0, 0, 0, 4] 
		this.$fastTextFontSize = 12 
		this._onText |= 32 

		this.props = {
			errors:undefined
		}

		this.tools = { 
			
			Text: require('tools/codetext').extend({ 
				font: require('fonts/ubuntu_monospace_256.font'), 
				tween: 2., 
				ease: [0, 10, 1.0, 1.0], 
				duration: 0.
			}), 
			Block: require('tools/codeblock').extend({ 
				borderRadius: 2.5, 
				tween: 2., 
				ease: [0, 10, 1.0, 1.0], 
				duration: 0., 
				pickAlpha: 0., 
				vertexStyle: function() {$ 
					this.x -= (6. / 12.) * this.fontSize 
					this.w += 3. 
					this.w += 10. 
					this.h2 += 2. 
					var pos = vec2() 
					if(this.isFingerOver(pos) > 0) { 
						this.bgColor.rgb += vec3(0.2) 
					}
					else { 
						this.bgColor.a *= .25 
					} 
					// lets figure out a hover anim here?
					this.bgColor.rgb += vec3(this.indent * 0.05) 
					this.borderColor = this.bgColor 
				} 
			}), 
			Marker: require('tools/codemarker').extend({ 
				tween: 2., 
				ease: [0, 10, 1.0, 1.0], 
				duration: 0., 
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
			
			ErrorMarker: require('tools/codemarker').extend({ 
				bgColor: '#522', 
				opMargin: 1, 
				duration: 0., 
				tween: 2, 
				ease: [0, 10, 0, 0], 
				closed: 0, 
				vertexStyle: function() {$ 
					//this.errorTime = max(0., .1 - this.errorTime) 
					//if(this.errorAnim.z < this.errorAnim.w) this.errorTime = 1. 
					this.x2 -= 2. 
					this.x3 += 2. 
					this.opColor = this.bgColor * 2.3 
					this.borderColor = this.bgColor * 1.4 
				} 
			}), 
			ErrorText: require('tools/text').extend({ 
				font: require('fonts/ubuntu_medium_256.font'), 
				color: '#cbb', 
				boldness: -.5, 
				moveScroll: 0., 
				fontSize: 16, 
				y: 2, 
				x: '@15' 
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
			Block: { 
				$borderColor: '#fff', 
				$bgColor: 'red', 
				$borderWidth: 1, 
				$borderRadius: 3.75, 
				FunctionDeclaration: { 
					$bgColor: '#363b', 
					open: {$open: 1}, 
					close: {$open: 0}, 
				}, 
				IfStatement: { 
					$bgColor: '#335b', 
					if: { 
						open: {$open: 1}, 
						close: {$open: 0}, 
					}, 
					else: { 
						$bgColor: '#535b', 
						open: {$open: 1}, 
						close: {$open: 0}, 
					} 
				}, 
				ForStatement: { 
					$bgColor: '#550b', 
					open: {$open: 1}, 
					close: {$open: 0}, 
				}, 
				BlockStatement: { 
					$bgColor: '#533b', 
					open: {$open: 1}, 
					close: {$open: 0}, 
				}, 
				ArrayExpression: { 
					$bgColor: '#353b', 
					open: {$open: 1}, 
					close: {$open: 0}, 
				}, 
				ObjectExpression: { 
					$bgColor: '#537b', 
					open: {$open: 1}, 
					close: {$open: 0} 
				}, 
				ClassBody: { 
					$bgColor: '#533b', 
					$open: 1 
				}, 
			}, 
			Marker: { 
				$borderRadius: 3.5, 
				$opColor: '#7', 
				$borderColor: '#7', 
				$bgColor: '#7778', 
				$borderWidth: 1., 
				'+': { 
					$bgColor: '#3739' 
				}, 
				'-': { 
					$bgColor: '#0779' 
				}, 
				'/': { 
					$bgColor: '#7379' 
				}, 
				'*': { 
					$bgColor: '#3379' 
				} 
			}, 
			Comment: { 
				$boldness: 0.1, 
				$color: '#0083f8', 
				$isComment: 1, 
				side: { 
					$head: 0.5 
				}, 
				above: {}, 
				top: {$head: 0.5}, 
				bottom: {$head: 0.}, 
				around: {} 
			}, 
			Paren: { 
				$boldness: 0., 
				FunctionDeclaration: { 
					left: {}, 
					right: {$tail: 0.5} 
				}, 
				CallExpression: { 
					$color: '#f70', 
					$boldness: 0.3, 
				}, 
				NewExpression: {}, 
				ParenthesizedExpression: {}, 
				IfStatement: { 
					left: {}, 
					right: {$tail: 0.5} 
				}, 
				ForStatement: { 
					left: {}, 
					right: {$tail: 0.5} 
				}, 
				SwitchStatement: { 
					left: {}, 
					right: {$tail: 0.5} 
				}, 
				CatchClause: { 
					left: {}, 
					right: {$tail: 0.5} 
				}, 
				DoWhileStatement: { 
					left: {}, 
					right: {} 
				}, 
				WhileStatement: { 
					left: {}, 
					right: {} 
				}, 
				ArrowFunctionExpression: { 
					left: {}, 
					right: {} 
				} 
			}, 
			Comma: { 
				$color: '#777', 
				FunctionDeclaration: {$tail: 0.5}, 
				CallExpression: { 
					open: {$tail: 0.}, 
					close: {$tail: 0.5} 
				}, 
				ArrayExpression: { 
					open: {$tail: 0.}, 
					close: {$tail: 0.5}, 
				}, 
				ObjectExpression: { 
					open: {$tail: 0.}, 
					close: {$tail: 0.5}, 
				}, 
				VariableDeclaration: {
					$tail:.5
				}, 
				SequenceExpression: {$tail: 0.5}, 
				NewExpression: {$tail: 0.5}, 
				ArrowFunctionExpression: {$tail: 0.5} 
			}, 
			Curly: { 
				BlockStatement: {}, 
				ObjectExpression: {$color: '#bac'}, 
				SwitchStatement: {} 
			}, 
			Dot: { 
				MemberExpression: {} 
			}, 
			SemiColon: { 
				ForStatement: {$tail: 0.5} 
			}, 
			Bracket: { 
				MemberExpression: {}, 
				ArrayExpression: { 
					$boldness: 0. 
				} 
			}, 
			QuestionMark: { 
				$tail: 0.5 
			}, 
			Colon: { 
				ObjectExpression: { 
					$boldness: 0., 
					$tail: 0.5, 
					$color: '#fff' 
				}, 
				ConditionalExpression: { 
					$tail: 0.5 
				}, 
				SwitchCase: {} 
			}, 
			Program: {}, 
			EmptyStatement: {}, 
			ExpressionStatement: {}, 
			BlockStatement: {}, 
			SequenceExpression: {}, 
			ParenthesizedExpression: {}, 
			ReturnStatement: {}, 
			YieldExpression: {}, 
			ThrowStatement: {}, 
			TryStatement: {}, 
			CatchClause: {}, 
			// simple bits
			Identifier: { 
				$color: '#eee', 
				glsl: { 
					$color: '#3c9' 
				}, 
				local: { 
					$color: '#ccc' 
				}, 
				closure: { 
					$boldness: 0.3, 
					$color: '#ff9' 
				}, 
				localArg: { 
					$color: '#beb' 
				}, 
				iterator: { 
					$color: '#bb0' 
				}, 
				closureArg: { 
					boldness: 0.3, 
					$color: '#f70' 
				}, 
				unknown: { 
					//boldness:0.3,
					$color: '#f99' 
				}, 
				ObjectExpression: { 
					$color: '#f77' 
				}, 
				FunctionDeclaration: { 
					$color: "#bbb" 
				} 
			}, 
			Literal: { 
				string: { 
					$color: '#0d0' 
				}, 
				num: { 
					boldness: 0.1, 
					$color: '#bbf' 
				}, 
				boolean: { 
					$color: '#f33' 
				}, 
				regexp: {}, 
				object: {} 
			}, 
			ThisExpression: { 
				$boldness: 0.1, 
				$color: '#797' 
			}, 
			RestElement: {}, 
			Super: {}, 
			// await
			AwaitExpression: {}, 
			
			// new and call
			MetaProperty: {}, 
			NewExpression: { 
				$boldness: 0.1, 
				$color: '#ffdf00' 
			}, 
			CallExpression: {}, 
			
			// Objects and arrays
			ArrayExpression: {}, 
			ObjectExpression: { 
				key: { 
					$alignLeft: 0., 
					$alignRight: 0.5, 
					$boldness: 0.1, 
					$color: '#bac' 
				} 
			}, 
			ObjectPattern: {}, 
			MemberExpression: { 
				$color: '#eeb' 
			}, 
			
			// functions
			FunctionExpression: {}, 
			ArrowFunctionExpression: {}, 
			FunctionDeclaration: { 
				$boldness: 0.1, 
				$color: '#797' 
				//	color:'#ffdf00'
			}, 
			
			// variable declarations
			VariableDeclaration: { 
				$boldness: 0.1, 
				$color: '#ffdf00' 
			}, 
			VariableDeclarator: {}, 
			
			// a+b
			LogicalExpression: { 
				$head: 0.5, 
				$tail: 0.5, 
				$color: '#ff9f00' 
			}, 
			BinaryExpression: { 
				$head: 0.5, 
				$tail: 0.5, 
				$color: '#ff9f00', 
				in: {$head: 0., $tail: 0.} 
			}, 
			BinaryExpressionNL: { 
				$head: 0., 
				$tail: 0., 
				$color: '#ff9f00' 
			}, 
			AssignmentExpression: { 
				$boldness: 0.1, 
				$head: 0.5, 
				$tail: 0.5, 
				$color: '#ff9f00' 
			}, 
			ConditionalExpression: { 
				$head: 0.5, 
				$tail: 0.5 
			}, 
			UpdateExpression: { 
				$color: '#ff9f00' 
			}, 
			UnaryExpression: { 
				$color: '#ff9f00' 
			}, 
			
			// if and for
			IfStatement: { 
				if: {$color: '#779'}, 
				else: {$color: '#979'} 
			}, 
			ForStatement: { 
				$color: '#bb0', 
				in: {} 
			}, 
			ForInStatement: {}, 
			ForOfStatement: {}, 
			WhileStatement: { 
				$color: '#bb0', 
			}, 
			DoWhileStatement: { 
				$color: '#bb0', 
				do: {$tail: 0.5}, 
				while: {$head: 0.5} 
			}, 
			WhileStatement: { 
				while: {} 
			}, 
			BreakStatement: {}, 
			ContinueStatement: {}, 
			
			// switch
			SwitchStatement: {}, 
			SwitchCase: {}, 
			
			// templates
			TaggedTemplateExpression: {}, 
			TemplateElement: {}, 
			TemplateLiteral: {}, 
			
			// classes
			ClassDeclaration: { 
				class: {}, 
				extends: {} 
			}, 
			ClassExpression: { 
				class: {}, 
				extends: {} 
			}, 
			ClassBody: {}, 
			MethodDefinition: { 
				static: {} 
			}, 
			
			// modules
			ExportAllDeclaration: {}, 
			ExportDefaultDeclaration: {}, 
			ExportNamedDeclaration: {}, 
			ExportSpecifier: {}, 
			ImportDeclaration: {}, 
			ImportDefaultSpecifier: {}, 
			ImportNamespaceSpecifier: {}, 
			ImportSpecifier: {}, 
			
			// other
			DebuggerStatement: {}, 
			LabeledStatement: {}, 
			WithStatement: {} 
		} 
		
		this.defaultScope = { 
			console: 1, 
			eval: 1, 
			Infinity: 1, 
			NaN: 1, 
			undefined: 1, 
			null: 1, 
			isFinite: 1, 
			isNaN: 1, 
			parseFloat: 1, 
			parseInt: 1, 
			Symbol: 1, 
			Error: 1, 
			EvalError: 1, 
			InternalError: 1, 
			RangeError: 1, 
			ReferenceError: 1, 
			TypeError: 1, 
			URIError: 1, 
			Map: 1, 
			Set: 1, 
			WeakMap: 1, 
			WeakSet: 1, 
			SIMD: 1, 
			JSON: 1, 
			Generator: 1, 
			GeneratorFunction: 1, 
			Intl: 1, 
			SyntaxError: 1, 
			Function: 1, 
			RegExp: 1, 
			Math: 1, 
			Object: 1, 
			String: 1, 
			Number: 1, 
			Boolean: 1, 
			Date: 1, 
			Array: 1, 
			Int8Array: 1, 
			Uint8Array: 1, 
			Uint8ClampedArray: 1, 
			Int16Array: 1, 
			Uint16Array: 1, 
			Int32Array: 1, 
			Uint32Array: 1, 
			Float32Array: 1, 
			Float64Array: 1, 
			DataView: 1, 
			ArrayBuffer: 1, 
			require: 1, 
			exports: 1, 
			module: 1, 
			E: 1, 
			E: 1, 
			LN10: 1, 
			LN2: 1, 
			LOG10E: 1, 
			LOG10: 1, 
			PI: 1, 
			SQRT2: 1, 
			SQRT1_2: 1, 
			random: 1, 
			radians: 1, 
			degrees: 1, 
			sin: 1, 
			cos: 1, 
			tan: 1, 
			asin: 1, 
			acos: 1, 
			atan: 1, 
			pow: 1, 
			exp: 1, 
			log: 1, 
			exp2: 1, 
			log2: 1, 
			sqrt: 1, 
			inversesqrt: 1, 
			abs: 1, 
			sign: 1, 
			floor: 1, 
			ceil: 1, 
			fract: 1, 
			mod: 1, 
			min: 1, 
			max: 1, 
			clamp: 1, 
			step: 1, 
			smoothstep: 1, 
			mix: 1, 
			arguments: 2 
		} 
	} 
	
	constructor(...args) { 
		super(...args) 
		this.$fastTextOutput = this 
		this.ann = [] 
		this.ann.step = 6 
		this.oldText = '' 
		this.$textClean = false 
		this.indentSize = this.Text.prototype.font.fontmap.glyphs[32].advance * 3 
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

	onDraw() { 
		if(!this._text)this._text = ''
		this.beginBg(this.viewGeom) 
		// ok lets parse the code
		if(this.$textClean) { 
			this.reuseDrawSize() 
			this.reuseBlock() 
			this.reuseMarker() 
			this.orderErrorMarker() 
			this.orderSelection() 
			this.reuseText() 
		}
		else { 
			//require.perf()
			this.$fastTextDelay = 0 
			if(this.debugShow) { 
				this.debugShow = false 
				//this.error = {} 
			}
			else if(this.$textClean === false) { 
				this.parseText() 
			} 
			
			this.pickIdCounter = 1 
			this.pickIds = [0] 
			this.$textClean = true 
			
			if(this.ast) { 
				/*
				if(!this.errorAnim || this.errorAnim[1] === .5) { 
					if(!this.errorAnim || this._time - this.errorAnim[0] < .5) { 
						this.errorAnim = [ 
							this._time, 
							0., 
							1., 
							1. 
						] 
					}
					else { 
						this.errorAnim = [ 
							this._time, 
							0.2, 
							0., 
							1. 
						] 
					} 
				} */
				this.orderBlock() 
				this.orderMarker() 
				this.reuseErrorMarker() 
				this.orderSelection() 
				this.orderText() 
				
				var oldtext = this._text 
				this.oldText = oldtext 
				// first we format the code
				if(this.onBeginFormatAST) this.onBeginFormatAST() 
				
				this.formatJS(this.indentSize, this.ast) 

				if(this.onEndFormatAST) this.onEndFormatAST() 
				//for(let ann = this.ann, i = 0, len = ann.length, step = ann.step; i < len; i+=step){
				//	console.log("STARTX", ann[i+5], ann[i])
				//}
				
				// make undo operation for reformat
				var newtext = this._text
				var oldlen = oldtext.length 
				var newlen = newtext.length 
				for(var start = 0; start < oldlen && start < newlen; start++) { 
					if(oldtext.charCodeAt(start) !== newtext.charCodeAt(start)) break 
				} 
				for(var oldend = oldlen - 1,newend = newlen - 1; oldend > start && newend > start; oldend--, newend--) { 
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
					
					if((oldrem === ' ' || oldrem === ';') && newins === '') { 
						var lengthText = this.lengthText() 
						this.wasNoopChange = true 
						for(var i = 0; i < lengthText; i++) this.$setTweenStartText(i, 0) 
					} 
				} 
				
				this.cs.scanChange(start, oldtext, newtext) 
				this.cs.clampCursor(0, newlen) 
				
				// overwrite tweenstarts when blocks are different
				// so we dont get jarring blocks
				var lengthBlock = this.lengthBlock() 
				if(this.$lengthBlock !== lengthBlock) { 
					this.$lengthBlock = lengthBlock 
					for(var i = 0; i < lengthBlock; i++) { 
						this.$setTweenStartBlock(i, 0) 
					} 
				} 
				var lengthMarker = this.lengthMarker() 
				if(this.$lengthMarker !== lengthMarker) { 
					this.$lengthMarker = lengthMarker 
					for(var i = 0; i < lengthMarker; i++) { 
						this.$setTweenStartMarker(i, 0) 
					} 
				} 
				//if(this.onText) setImmediate(this.onText.bind(this))
				if(this.onParsed) setImmediate(this.onParsed.bind(this)) 
			}
			else { 
				var ann = this.ann 
				/*
				if(!this.errorAnim || this.errorAnim[3] === 1) { 
					this.errorAnim = [ 
						this._time + .7, 
						.5, 
						1., 
						0. 
					] 
				} */
				
				this.reuseBlock() 
				this.reuseMarker() 
				this.orderSelection() 
				this.orderErrorMarker() 
				
				this.$fastTextAnnotate = false 
				
				if(!ann.length && this._text) { 
					var txt = this._text 
					this._text = '' 
					this.fastText(txt, this.styles.Identifier.unknown, 0) 
				}
				else { 
					this._text = '' 
					for(var i = 0,len = ann.length,step = ann.step; i < len; i += step) { 
						this.$fastTextFontSize = ann[i + 4] 
						var dx = ann[i + 5] 
						this.turtle.sx = abs(dx) 
						var text = ann[i] 
						this.fastText(text, ann[i + 1], ann[i + 2], ann[i + 3]) 
						var last = text.charCodeAt(text.length - 1) 
						if(dx < 0 && (last === 10 || last === 13)) { 
							this.turtle.wx = this.turtle.sx = abs(ann[i + 11]) 
						} 
					} 
					// lets do a paren match analysis using indent and make a nicer error
					if(this.parseError.message === 'Unexpected token') { 
						var pos = this.indentFindParenErrorPos() 
						if(pos >= 0) { 
							this.parseError.message = 'Matching ({[ error' 
							var lines = this._text.slice(0,pos).split('\n')
							var line = 0, column = 0
							if(lines.length){
								line = lines.length - 1
								column = lines[lines.length - 1].length -1
							}
							this._text.split('\n')
							this.parseError.line = line
							this.parseError.column = column 
						} 
					}
					if(this.onParseError) this.onParseError(this.parseError) 
				}
				// lets draw the error
				//this.drawErrorText({ 
				//	errorAnim: this.errorAnim, 
				//	text: this.error.msg 
				//}) 
			} 
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
					x: t.x - 1, 
					y: t.y, 
					w: 2, 
					h: t.h 
				}) 
				//this.showLastCursor()
			} 
		} 
		
		this.endBg(true) 
	} 
	
	onFlag32() { 
		this.$textClean = false 
		this.redraw() 
	} 
	

	indentFindParenErrorPos() { 
		var ann = this.ann 
		var stack = [] 
		var close = {'{': '}', '(': ')', '[': ']'} 
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
		return -1 
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
				base.onFingerDown.call(this, f) 
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
	
	insertText(offset, text, isUndo) { 
		
		var char = this._text.charAt(offset) 
		
		var prev = this._text.charAt(offset - 1) 
		
		if(!isUndo) { 
			if(text === "'" && char === "'") return 0 
			if(text === '"' && char === '"') return 0 
			if(text === '}' && char === '}') return 0 
			if(text === ']' && char === ']') return 0 
			if(text === ')' && char === ')') return 0 
			if(text === '\n' && prev === '{' && char === '}') text = '\n\n' 
			if(text === '{' && (!this.parseError || this.parseError.message !== 'Matching ({[ error') && (char === '\n' || char === ',' || char === ')' || char === ']') && (!this.error || char !== '}')) text = '{}' 
			if(text === '[' && (!this.parseError || this.parseError.message !== 'Matching ({[ error') && (char === '\n' || char === ',') && char !== ']') text = '[]' 
			if(text === '(' && (!this.parseError || this.parseError.message !== 'Matching ({[ error') && (char === '\n' || char === ',') && char !== ')') text = '()' 
			
			if(text === '"' && (!this.parseError || this.parseError.message !== 'Unterminated string constant') && char !== '"' && prev !== '"') text = '""' 
			if(text === "'" && (!this.parseError || this.parseError.message !== 'Unterminated string constant') && char !== "'" && prev !== "'") text = "''" 
		} 
		
		this.$fastTextDelta += text.length 
		this.$fastTextOffset = offset 
		this.$fastTextStart = offset + text.length 
		
		if(text === '\n') this.wasNewlineChange = 1
		else this.wasNewlineChange = 0 
		
		if(this.wasNewlineChange && this._text.charAt(offset) !== '\n' && this._text.charAt(offset + 1) !== '\n') { 
			this.wasFirstNewlineChange = 1 
		}
		else this.wasFirstNewlineChange = 0 
		
		this.$textClean = false 
		this.inputDirty = true
		this._text = this._text.slice(0, offset) + text + this._text.slice(offset) 
		
		// alright lets find the insertion spot in ann
		var ann = this.ann 
		// process insert into annotated array
		var pos = 0 
		for(var i = 0,len = ann.length,step = ann.step; i < len; i += step) { 
			var txt = ann[i] 
			pos += txt.length 
			if(offset <= pos) { 
				var idx = offset - (pos - txt.length) 
				if(ann[i + 1] === this.styles.Identifier.unknown) { 
					ann[i] = txt.slice(0, idx) + text + txt.slice(idx) 
				}
				else { 
					ann[i] = txt.slice(0, idx) 
					// lets choose a style
					ann.splice(i + step, 0, text, this.styles.Identifier.unknown, ann[i + 2], ann[i + 3], ann[i + 4], ann[i + 5], txt.slice(idx), ann[i + 1], ann[i + 2], ann[i + 3], ann[i + 4], ann[i + 5]) 
				} 
				break 
			} 
		} 
		this.redraw() 
		return text.length 
	} 
	
	serializeWithFormatting() { 
		var ann = this.ann 
		var s = '' 
		var fs = this.$fastTextFontSize 
		var padLeft = this.drawPadding && this.drawPadding[3] || this.padding[3] 
		var sx = 0 
		for(var i = 0,len = ann.length,step = ann.step; i < len; i += step) { 
			var txt = ann[i] 
			var style = ann[i + 1] 
			var dx = ann[i + 5] 
			var sx = abs(dx) 
			if(style.head > 0.) s += ' ' 
			if(txt.indexOf('\n') !== -1) { 
				var last = txt.charCodeAt(txt.length - 1) 
				if(dx < 0 && (last === 10 || last === 13)) { 
					sx = abs(ann[i + 11]) 
				} 
				var indent = Array(1 + Math.ceil((sx - padLeft) / (this.indentSize * fs))).join('\t') 
				var out = txt.split('\n') 
				for(var j = 0; j < out.length - 1; j++) { 
					s += out[j] + '\n' + indent 
				} 
				s += out[j] 
			}
			else s += txt 
			if(style.tail > 0.) s += ' ' 
		} 
		return s 
	} 
	
	removeText(start, end, isUndo) { 
		this.inputDirty = true
		this.$textClean = false 
		var delta = 0 
		this.wasNewlineChange = 0 
		var text = this._text 
		
		if(!isUndo) { 
			if(end === start + 1) { 
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
		
		this.$fastTextDelta -= (end - start) 
		this.$fastTextStart = 
		this.$fastTextOffset = start 
		
		// process a remove from the annotated array
		var ann = this.ann 
		var pos = 0 
		for(var i = 0,len = ann.length,step = ann.step; i < len; i += step) { 
			var txt = ann[i] 
			pos += txt.length 
			if(start < pos) { 
				var idx = start - (pos - txt.length) 
				ann[i] = txt.slice(0, idx) 
				if(end <= pos) { 
					var idx = end - (pos - txt.length) 
					ann[i] += txt.slice(idx) 
				}
				else { // end is in the next one
					for(i += step; i < len; i += step) { 
						var txt = ann[i] 
						pos += txt.length 
						if(end < pos) { 
							var idx = end - (pos - txt.length) 
							ann[i] = txt.slice(idx) 
							break 
						}
						else { 
							ann[i] = '' 
						} 
						
					} 
				} 
				break 
			} 
		} 
		
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

