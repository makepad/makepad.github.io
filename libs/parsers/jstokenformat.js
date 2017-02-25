let parser = require('parsers/js')
module.exports = class JSFormatter extends require('base/class'){

	jsTokenFormat(text){
		//console.log(this._text)
		let tok = parser.tokenize(text, {
			storeComments: []
		})
		
		this.$fastTextChunks = []
		this.$fastTextStyles = []
		this.$blockRanges = []
		this.$parenRanges = []
		this.$parenGroupId = 2
		//this.writeText("HIIII", this.styles.Array.bracket)
		let tt = this.tt = parser.tokTypes
		let raised = false
		let raisedPos = null
		let raisedMessage = null
		let raisedId = null
		tok.raise = (pos, e, id)=>{
			raised = true
			this.parseErrors.push({
				pos:pos,
				message:e
			})
			raisedId = id
		}
		let last = tok.pos
		tok.nextTokenWs()
		let i =0
		this.tokArray = []
		this.parenStack = []
		while(tok.type !== tt.eof){
			if(raised){
				raised = false
				if(typeof this[raisedId] !== 'function') console.log("CANT FIND" + raisedId)
				this[raisedId](tok, last)
			}
			else{
				let label = tok.type.label
				if(typeof this[label] !== 'function') console.log("CANT FIND" + label)
				this[label](tok)
			}
			//ast = tok.pos
			//if(i++==28)debugger
			if(!tok.type.isWhitespace){
				this.tokArray.push(tok.type, tok.pos)
			}
			last = tok.pos
			tok.nextTokenWs()
		}
	}

	prototype(){
		this["string"] = function(tok){
			this.writeText(tok.input.slice(tok.start, tok.end), this.styles.Value.string)
		}

		this["name"] = function(tok){
			let value = tok.value
			let ps = this.parenStack
			let tokens = this.tokArray
			if(tokens[tokens.length - 2]  === this.tt.dot){
				return this.writeText(value, this.styles.Object.key)
			}
			if(this.defaultScope[value]){
				return this.writeText(tok.value, this.styles.Id.global)
			}
			let top = this.tokArray[ps[ps.length - 5]]
			if(top === this.tt.braceL){
				let style = ps[ps.length -4]
				
				if(style === this.styles.Class){
					return this.writeText(value, this.styles.Class.method)
				}
				if(style === this.styles.Object){
					return this.writeText(value, this.styles.Object.key)
				}
			}
			
			this.writeText(tok.value, this.styles.Id.var)
		}
		
		this["num"] = function(tok){
			this.writeText(tok.input.slice(tok.start, tok.end), this.styles.Value.num)
		}

		this["regexp"] = function(tok){
			this.writeText(tok.input.slice(tok.start, tok.end), this.styles.Value.regexp)
		}

		this["if"] = function(tok){
			this.writeText("if", this.styles.If.if)
		}
		
		this["else"] = function(tok){
			this.writeText("else", this.styles.If.else)
		}

		this["for"] = function(tok){
			this.writeText("for", this.styles.For.for)
		}

		this["do"] = function(tok){
			this.writeText("do", this.styles.For.do)
		}

		this["switch"] = function(tok){
			this.writeText("switch", this.styles.If.switch)
		}

		this["case"] = function(tok){
			this.writeText("case", this.styles.If.case)
		}

		this["default"] = function(tok){
			this.writeText("default", this.styles.If.default)
		}

		this["throw"] = function(tok){
			this.writeText("for", this.styles.Exception.throw)
		}

		this["try"] = function(tok){
			this.writeText("try", this.styles.Exception.try)
		}

		this["catch"] = function(tok){
			this.writeText("catch", this.styles.Exception.catch)
		}

		this["finally"] = function(tok){
			this.writeText("finally", this.styles.Exception.finally)
		}
	
		this["debugger"] = function(tok){
			this.writeText("debugger", this.styles.Keyword.debugger)
		}

		this["with"] = function(tok){
			this.writeText("with", this.styles.Keyword.debugger)
		} 

		this["typeof"] = function(tok){
			this.writeText("typeof", this.styles.Operator.default)
		}

		this["break"] = function(tok){
			this.writeText("break", this.styles.For.break)
		}

		this["default"] = function(tok){
			this.writeText("default", this.styles.If.default)
		}

		this["continue"] = function(tok){
			this.writeText("continue", this.styles.For.continue)
		}

		this["new"] = function(tok){
			this.writeText("new", this.styles.Class.new)
		}

		this["this"] = function(tok){
			this.writeText("this", this.styles.Class.this)
		}

		this["extends"] = function(tok){
			this.writeText("extends", this.styles.Class.extends)
		}

		this["class"] = function(tok){
			this.writeText("class", this.styles.Class.class)
		}

		this["super"] = function(tok){
			this.writeText("super", this.styles.Class.super)
		}

		this["while"] = function(tok){
			this.writeText("while", this.styles.For.for)
		}

		this["function"] = function(tok){
			this.writeText("function", this.styles.Function.function)
		}

		this["return"] = function(tok){
			this.writeText("return", this.styles.Function.return)
		}

		this["yield"] = function(tok){
			this.writeText("yield", this.styles.Function.yield)
		}

		this["true"] = function(tok){
			this.writeText("true", this.styles.Value.boolean)
		}

		this["false"] = function(tok){
			this.writeText("false", this.styles.Value.boolean)
		}

		this["null"] = function(tok){
			this.writeText("null", this.styles.Value.object)
		}

		this["var"] = function(tok){
			this.writeText("var", this.styles.Keyword.var)
		}

		this["const"] = function(tok){
			this.writeText("const", this.styles.Keyword.const)
		}

		this["let"] = function(tok){
			this.writeText("let", this.styles.Keyword.let)
		}

		this["("] = function(tok){
			let parenId = this.$parenGroupId++
			// if prev = name 
			let tokens = this.tokArray
			let style = this.styles.Parens.left
			let prev = tokens[tokens.length - 2]
			if(prev === this.tt.name || prev === this.tt._super){
				style = this.styles.Call.paren
			}
			else if(prev === this.tt._if){
				style = this.styles.If.parenLeft
			}
			else if(prev === this.tt._for){
				style = this.styles.For.parenLeft
			}
			else if(prev === this.tt._function){
				style = this.styles.Function.parenLeft
			}
			this.writeText("(", style, parenId)
			this.parenStack.push(
				this.tokArray.length,
				style,0,0,parenId
			)
		}

		this[")"] = function(tok){
			let ps = this.parenStack
			let parenId = ps.pop()
			let xPos = ps.pop()
			let yPos = ps.pop()
			let style = ps.pop()
			let s = this.openParenStart = ps.pop()

			let blStart = this.tokArray[s+1]
			let blEnd = tok.pos
			this.$parenRanges.push({start:blStart, end:blEnd, id:parenId})
			this.writeText(")", style || this.styles.Tokenized.paren, parenId)
			//console.log('here',this.tokArray[s])
			if(!s || this.tokArray[s] !== this.tt.parenL){
				this.parseErrors.push({
					pos:tok.pos,
					message:'mismatched )'
				})
			}
		}

		this["{"] = function(tok){
			// lets figure out what kind of { we are
			let tokens = this.tokArray
			let tlen = tokens.length
			// if we have a ) 
			let ptok = tokens[tlen - 2]
			let style = this.styles.Tokenized
			if(ptok === this.tt.parenR){
				
				// lets check openParenStart to see what goes before it
				let pre = this.tokArray[this.openParenStart-2]
				
				if(pre === this.tt._function){ // its a function
					style = this.styles.Function
				}
				else if(pre === this.tt.name){ // its a method
					let before = this.tokArray[this.openParenStart-4]
					//console.log(before === this.tt._extends)
					//console.log(before)
					if(before === this.tt._extends){ // its a class
						style = this.styles.Class
					}
					else style = this.styles.Function
				}
				else if(pre === this.tt._for){
					style = this.styles.For
				}
				else if(pre === this.tt._if){
					style = this.styles.If
				}
			}
			else if(ptok === this.tt.arrow){
				style = this.styles.Function
			}
			else if(ptok === this.tt.name){
				let pre = this.tokArray[tlen-4]
				if(pre === this.tt._extends || pre === this.tt._class){ // its a function
					style = this.styles.Class
				}
				else style = this.styles.Object
			}
			else{ // object
				style = this.styles.Object
			}

			let parenId = this.$parenGroupId++
			this.writeText("{", style.curly, parenId)

			this.parenStack.push(
				this.tokArray.length,
				style,
				this.turtle.wx,
				this.turtle.wy,
				parenId
			)
		}

		this["}"] = function(tok){
			let ps = this.parenStack
			let parenId = ps.pop()
			let yPos = ps.pop()
			let xPos = ps.pop()
			let style = ps.pop() 
			if(!style || !style.curly || !style.block) style = this.styles.Object
			let s = ps.pop()
			let blStart = this.tokArray[s+1]
			let blEnd = tok.pos
			//let endx = turtle.wx, lineh = turtle.mh
			let startx = this.turtle.wx 

			this.writeText("}", style.curly, parenId)
			let lineh = this.turtle.mh
			let blockh = this.turtle.wy
			let pickId = this.pickIdCounter++
			//this.pickIds[pickId] = node 
			this.$parenRanges.push({start:blStart, end:blEnd, id:parenId})
			if(yPos !== this.turtle.wy){
				this.$blockRanges.push({start:blStart, end:blEnd, id:pickId})
				// lets draw a block with this information
				this.fastBlock(
					startx,
					yPos,
					xPos-startx,
					lineh,
					this.indentSize * this.$fastTextFontSize,
					blockh - yPos,
					this.$fastTextIndent,
					pickId,
					style.block.open
				)
			}
			// lets write a block matching the style

			if(!s || (this.tokArray[s] !== this.tt.braceL &&  this.tokArray[s] !== this.tt.dollarBraceL)){
				this.parseErrors.push({
					pos:tok.pos,
					message:'mismatched }'
				})
			}
		}

		this["["] = function(tok){
			// lets figure out what kind of { we are
			let tokens = this.tokArray
			let tlen = tokens.length
			// if we have a ) 
			let ptok = tokens[tlen - 2]
			let style = this.styles.Array
			if(ptok === this.tt.parenR || ptok === this.tt.name){
				style = this.styles.Object
			}
			let parenId = this.$parenGroupId++
			this.writeText("[", style.bracket, parenId)

			this.parenStack.push(
				this.tokArray.length,
				style,
				this.turtle.wx,
				this.turtle.wy,
				parenId
			)
		}

		this["]"] = function(tok){
			let ps = this.parenStack
			let parenId = ps.pop()
			let yPos = ps.pop()
			let xPos = ps.pop()
			let style = ps.pop() 
			if(!style || !style.bracket || !style.block) style = this.styles.Object
			let s = ps.pop()
			let blStart = this.tokArray[s+1]
			let blEnd = tok.pos
			//let endx = turtle.wx, lineh = turtle.mh
			let startx = this.turtle.wx 

			this.writeText("]", style.bracket, parenId)
			let lineh = this.turtle.mh
			let blockh = this.turtle.wy
			//this.pickIds[pickId] = node 
			this.$parenRanges.push({start:blStart, end:blEnd, id:parenId})

			if(style === this.styles.Array && yPos !== this.turtle.wy){
				let pickId = this.pickIdCounter++
				this.$blockRanges.push({start:blStart, end:blEnd, id:pickId})
				// lets draw a block with this information
				this.fastBlock(
					startx,
					yPos,
					xPos-startx, 
					lineh,
					this.indentSize * this.$fastTextFontSize,
					blockh - yPos,
					this.$fastTextIndent,
					pickId,
					style.block.open
				)
				// lets write a block matching the style
			}

			if(!s || this.tokArray[s] !== this.tt.bracketL){
				this.parseErrors.push({
					pos:tok.pos,
					message:'mismatched ]'
				})
			}
		}

		this["+/-"] = function(tok){
			this.writeText(tok.value, this.styles.Operator.default)
		}

		this["%"] = function(tok){
			this.writeText('%', this.styles.Operator.default)
		}

		this["^"] = function(tok){
			this.writeText('^', this.styles.Operator.default)
		}
		
		this["?"] = function(tok){
			this.writeText('?', this.styles.Operator.default)
		}

		this["..."] = function(tok){
			this.writeText("...", this.styles.Operator.default)
		}

		this["=>"] = function(tok){
			this.writeText("=>", this.styles.Operator.default)
		}

		this["template"] = function(tok){
			this.writeText(tok.value, this.styles.Operator.default)
		}
		
		this["${"] = function(tok){
			// lets figure out what kind of { we are
			let tokens = this.tokArray
			let tlen = tokens.length
			let ptok = tokens[tlen - 2]
			let style = this.styles.Function

			let parenId = this.$parenGroupId++

			this.parenStack.push(
				this.tokArray.length,
				style,
				this.turtle.wx,
				this.turtle.wy,
				parenId
			)
			this.writeText("${", style.curly, parenId)
		}

		this["==/!="] = function(tok){
			this.writeText(tok.value, this.styles.Operator.default)
		}

		this["</>"] = function(tok){
			this.writeText(tok.value, this.styles.Operator.default)
		}

		this["in"] = function(tok){
			this.writeText('in', this.styles.Operator.default)
		}

		this["of"] = function(tok){
			this.writeText('of', this.styles.Operator.default)
		}

		this["<</>>"] = function(tok){
			this.writeText(tok.value, this.styles.Operator.default)
		}
		
		this["probe"] = function(tok){
			this.writeText(tok.value, this.styles.Operator.default)
		}
		
		this["prefix"] = function(tok){
			this.writeText(tok.value, this.styles.Operator.default)
		}

		this["*"] = function(tok){
			this.writeText('*', this.styles.Operator.default)
		}
	
		this["/"] = function(tok){
			this.writeText('/', this.styles.Operator.default)
		}
	
		this["&"] = function(tok){
			this.writeText('&', this.styles.Operator.default)
		}

		this["|"] = function(tok){
			this.writeText('|', this.styles.Operator.default)
		}
		
		this["."] = function(tok){
			this.writeText('.', this.styles.Object.dot)
		}

		this["`"] = function(tok){
			this.writeText('`', this.styles.Operator.default)
		}
		
		this[";"] = function(tok){
			this.writeText(';', this.styles.Operator.default)
		}
		
		this[":"] = function(tok){
			let ps = this.parenStack
			let top = this.tokArray[ps[ps.length - 5]]
			if(top === this.tt.braceL){
				let style = ps[ps.length - 4]
				if(style === this.styles.Object){
					return this.writeText(':', this.styles.Object.colon)
				}
			}
			this.writeText(':', this.styles.Operator.default)
		}

		this[","] = function(tok){
			let ps = this.parenStack
			let top = this.tokArray[ps[ps.length - 5]]
			if(top === this.tt.bracketL){
				let style = ps[ps.length - 4]
				if(style === this.styles.Array){
					return this.writeText(',', this.styles.Array.commaOpen)
				}
			}
			else if(top === this.tt.braceL){
				let style = ps[ps.length - 4]
				if(style === this.styles.Object){
					return this.writeText(',', this.styles.Object.commaOpen)
				}
			}
			this.writeText(',', this.styles.Operator.default)
		}
		
		this["++/--"] = function(tok){

			this.writeText(tok.value, this.styles.Operator.default)
		}

		this["&&"] = function(tok){
			this.writeText('&&', this.styles.Operator.default)
		}

		this["||"] = function(tok){
			this.writeText('||', this.styles.Operator.default)
		}

		this["="] = function(tok){
			this.writeText("=", this.styles.Operator.default)
		}

		this["_="] = function(tok){
			this.writeText(tok.value, this.styles.Operator.default)
		}

		this["\n"] = function(tok){
			this.writeText('\n', this.styles.Comment.above)
		}

		this[" "] = function(tok){
			this.writeText(' ', this.styles.whitespace)
		}

		this["\t"] = function(tok){
			this.writeText('\t', this.styles.whitespace)
		}

		this["/*"] = function(tok){
			this.writeText(tok.value, this.styles.Comment.above)
		}

		this["//"] = function(tok){
			this.writeText(tok.value, this.styles.Comment.above)
		}

		this["comment exception"] = function(tok, last){
			tok.pos = last + 2
			this.writeText("/*", this.styles.Id.tokException)
		}

		this["string exception"] = function(tok, last){
			tok.pos = last + 1
			this.writeText(tok.input.slice(last,last+1), this.styles.Id.tokException)
		}

		this["template exception"] = function(tok, last){
			tok.pos = last + 1
			this.writeText(tok.input.slice(last,last+1), this.styles.Id.tokException)
		}

		this["number exception"] = function(tok, last){
			tok.pos = last + 1
			this.writeText(tok.input.slice(last,last+1), this.styles.Id.tokException)
		}

		this["escape exception"] = function(tok, last){
			tok.pos = last + 1
			this.writeText(tok.input.slice(last,last+1), this.styles.Id.tokException)
		}

		this["codepoint exception"] = function(tok, last){
			tok.pos = last + 1
			this.writeText(tok.input.slice(last,last+1), this.styles.Id.tokException)
		}

		this["character exception"] = function(tok, last){
			tok.pos = last + 1
			this.writeText(tok.input.slice(last,last+1), this.styles.Id.tokException)
		}

		this["regexp exception"] = function(tok, last){
			tok.pos = last + 1
			this.writeText(tok.input.slice(last,last+1), this.styles.Id.tokException)
		}
	}

}