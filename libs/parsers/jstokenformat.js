let parser = require('parsers/js')
module.exports = class JSFormatter extends require('base/class'){

	jsTokenFormat(text){
		//console.log(this._text)
		let tok = parser.tokenize(text, {
			storeComments: []
		})
		
		this.$fastTextChunks = []
		this.$fastTextStyles = []

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
			tok.nextTokenWs()
		}
	}

	prototype(){
		this["string"] = function(tok){
			this.writeText(tok.input.slice(tok.start, tok.end), this.styles.Value.string)
		}

		this["name"] = function(tok){
			if(this.lastTok === this.tt.dot){
				return this.writeText(tok.value, this.styles.Object.key)
			}
			this.writeText(tok.value, this.styles.Id.var)
		}
		
		this["num"] = function(tok){
			this.writeText(tok.input.slice(tok.start, tok.end), this.styles.Value.num)
		}

		this["if"] = function(tok){
			this.writeText("if", this.styles.If.if)
		}
		
		this["else"] = function(tok){
			this.writeText("if", this.styles.If.else)
		}

		this["for"] = function(tok){
			this.writeText("for", this.styles.For.for)
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

		this["typeof"] = function(tok){
			this.writeText("typeof", this.styles.Operator.default)
		}

		this["break"] = function(tok){
			this.writeText("for", this.styles.For.break)
		}

		this["continue"] = function(tok){
			this.writeText("for", this.styles.For.continue)
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
			this.writeText("(", this.styles.Tokenized.paren)
			this.parenStack.push(
				this.tokArray.length
			)
		}

		this[")"] = function(tok){
			this.writeText(")", this.styles.Tokenized.paren)
			let s = this.openParenStart = this.parenStack.pop()
			console.log('here',this.tokArray[s])
			if(!s || this.tokArray[s] !== this.tt.parenL){
				this.parseErrors.push({
					pos:tok.pos,
					message:'mismatched )'
				})
			}
		}

		this["{"] = function(tok){
			// lets check if we are after a ), ifso
			// lets check what the ( was after
			this.writeText("{", this.styles.Tokenized.curly)
			this.parenStack.push(
				this.tokArray.length
			)
		}

		this["}"] = function(tok){
			this.writeText("}", this.styles.Tokenized.curly)
			let s = this.parenStack.pop()
			if(!s || this.tokArray[s] !== this.tt.braceL){
				this.parseErrors.push({
					pos:tok.pos,
					message:'mismatched }'
				})
			}
		}

		this["["] = function(tok){
			this.writeText("[", this.styles.Tokenized.bracket)
			this.parenStack.push(
				this.tokArray.length
			)
		}

		this["]"] = function(tok){
			this.writeText("]", this.styles.Tokenized.bracket)
			let s = this.parenStack.pop()
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
		
		this["?"] = function(tok){
			this.writeText('?', this.styles.Operator.default)
		}

		this[":"] = function(tok){
			this.writeText(':', this.styles.Operator.default)
		}

		this["..."] = function(tok){
			this.writeText("...", this.styles.Operator.default)
		}

		this["=>"] = function(tok){
			this.writeText("=>", this.styles.Operator.default)
		}

		this["template"] = function(tok){
			//this.writeText("", this.styles.Operator.default)
		}
		
		this["${"] = function(tok){
			this.writeText("${", this.styles.Operator.default)
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
			this.writeText('.', this.styles.Operator.default)
		}

		this["`"] = function(tok){
			this.writeText('`', this.styles.Operator.default)
		}
		
		this[";"] = function(tok){
			this.writeText(';', this.styles.Operator.default)
		}
		
		this[":"] = function(tok){
			this.writeText(':', this.styles.Operator.default)
		}

		this[","] = function(tok){
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