var LOG = 0
// GRAMMAR
var def = {
	Start   :o=>o.Form,
	ws      :o=>o.fold(o=>o.any(o=>o.eat(' ') || o.eat('\t'))),
	Form    :o=>o('form') && o.many(o=>o.eat(' ')) && o.Id && o.ws && o.Body,
	Body    :o=>o.ws && o('{') && o.eat('\n') && 
		o.any(o=>o.Answer || o.Question || o.Message || o.If) && 
		o.ws && o('}') && o.ws && o.many(o=>o.eat('\n')),
	Question:o=>o.ws && o.String && o.ws && o.eat('\n') && 
		o.ws && o.Id && o.eat(':') && o.ws && o.Type && o.eat('\n'),
	Answer  :o=>o.ws && o.String && o.ws && o.eat('\n') && 
		o.ws && o.Id && o.eat(':') && o.ws && o.Type && o.ws && o.eat('=') && o.ws && o.eat('\n') && 
		o.ws && o.Expr && o.eat('\n'),
	Message :o=>o.ws && o.String && o.ws && o.eat('\n'),
	If      :o=>o.ws && o('if') && o.ws && o('(') && o.ws && o.Logic && o.ws && o(')') && o.Body,
	String  :o=>o('"') && o.any(o=>o.inv('"')) && o('"'),
	Type    :o=>(o('boolean') || o('money')),
	Id      :o=>(o('a', 'z') || o('A', 'Z')) && o.any(o=>o('a', 'z') || o('A', 'Z') || o('0', '9')),
	Number  :o=>(o.zeroOrOne(o=>o('-')) && o.many(o=>o('0', '9')) && o.zeroOrOne(o=>o('.') && o.many(o=>o('0', '9')))),
	Logic   :o=>o.fold(o=>o.Cmp),
	Cmp     :o=>o.fold(o=>o.Or && o.zeroOrOne(o=>o.ws && (o('<=') || o('<') || o('>=') || o('>') || o('!=')) && o.ws && o.Or)),
	Or      :o=>o.fold(o=>o.And && o.any(o=>o.ws && o('||') && o.ws && o.And)),
	And     :o=>o.fold(o=>o.LogicS && o.any(o=>o.ws && o('&&') && o.ws && o.LogicS)),
	LogicS  :o=>o.fold(o=>o.Id || o.Number || o('(') && o.Logic && o(')')),
	Expr    :o=>o.fold(o=>o.Sum),
	Sum     :o=>o.fold(o=>o.Prod && o.any(o=>o.ws && (o('+') || o('-')) && o.ws && o.Prod)),
	Prod    :o=>o.fold(o=>o.ExprS && o.any(o=>o.ws && (o('*') || o('/')) && o.ws && o.ExprS)),
	ExprS   :o=>o.fold(o=>o.Id || o.Number || o('(') && o.Expr && o(')'))
}

new require('styles/dark')
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.tools = {
			Slider:require('stamps/slider.js')
		}
	}
	constructor() {
		super()
		// default vars
		this.vars = {
			hasSoldHouse:true,
			sellingPrice:150000,
			privateDebt :100000
		}
		// Input form
		this.form = 
		'form MainForm {\n' + 
			'  "Did you sell your house?"\n' + 
			'    hasSoldHouse: boolean\n' + 
			'  if(hasSoldHouse) {\n' + 
			'    "What was the selling price?"\n' + 
			'      sellingPrice: money\n' + 
			'    "Private debts for the sold house:"\n' + 
			'      privateDebt: money\n' + 
			'    "Value residue:"\n' + 
			'      valueResidue: money = \n' + 
			'        (sellingPrice - privateDebt)\n' + 
			'    if(valueResidue < 0) {\n' + 
			'         "You lost money!"\n' + 
			'      }\n' + 
			'  }\n' + 
			'}\n'
		this.parser = makeParser(def)
		this.ast = this.parser.parse(this.form)
	}
	onDraw() {
		var p = this.parser
		if(!this.ast) {
			this.drawText({
				fontSize:20,
				text    :"Parse error in " + p.fail[0] + "\nat: ..." + this.form.slice(p.last - 10, p.last) + '^' + this.form.slice(p.last, p.last + 10) + '...'
			})
			return
		}
		
		// Process 
		
		var process = {
			Form    :(node) =>{
				this.drawText({
					fontSize:15,
					margin  :[4, 0, 4, 0],
					text    :node.Id.value
				})
				this.lineBreak()
				process.Body(node.Body, '')
			},
			Body    :(node, path) =>{
				for(let i = 0;i < node.n.length;i++){
					var n = node.n[i]
					process[n.type](n, path + '.' + n.type + '[' + i + ']')
				}
			},
			Question:(node, path) =>{
				this.drawText({
					fontSize:12,
					text    :'Q: ' + node.String.value.slice(1, -1)
				})
				this.lineBreak()
				// check type
				var id = node.Id.value
				if(node.Type.value === 'boolean') {
					
					this.drawButton({
						id     :path + 'Y',
						text   :'Yes',
						onClick:c=>{
							this.vars[id] = true
							this.redraw()
						}
					})
					this.drawButton({
						id     :path + 'N',
						text   :'No',
						onClick:c=>{
							this.vars[id] = false
							this.redraw()
						}
					})
					this.drawText({
						margin:[7, 0, 0, 0],
						text  :this.vars[id]?'Yes!':'No!'
					})
					this.lineBreak()
				}
				else if(node.Type.value === 'money') {
					
					this.drawSlider({
						margin :[4, 0, 7, 0],
						range  :[10000, 500000],
						id     :path + 'M',
						w      :100,
						h      :20,
						value  :this.vars[id],
						onSlide:v=>{
							this.vars[id] = v.value | 0
							this.redraw()
						}
					})
					this.drawText({
						margin:[5, 0, 0, 5],
						color :'yellow',
						text  :'$' + this.vars[id]
					})
					this.lineBreak()
				}
			},
			Answer  :(node, path) =>{
				this.drawText({
					fontSize:12,
					margin  :[0, 0, 0, 0],
					text    :'A: ' + node.String.value.slice(1, -1) + ' '
				})
				var nExpr = node.n[3]
				var val = process[nExpr.type](nExpr, path + '.Expr')
				this.vars[node.Id.value] = val
				this.drawText({
					margin:[0, 0, 0, 0],
					color :val > 0?'#0f0':'#f00',
					text  :'$' + parseInt(val)
				})
				this.lineBreak()
			},
			Message :(node, path) =>{
				this.drawText({
					fontSize:12,
					margin  :[4, 0, 0, 0],
					text    :'Message: ' + node.String.value.slice(1, -1)
				})
			},
			Sum     :(node, path) =>{
				var nA = node.n[0]
				var vA = process[nA.type](nA, path + '.A')
				var steps = node.value.split('')
				for(let i = 0;i < steps.length;i++){
					var nB = node.n[i + 1]
					var vB = process[nB.type](nB, path + '.B' + i)
					var op = steps[i]
					if(op === '-') vA = vA - vB
					if(op === '+') vA = vA + vB
				}
				return vA
			},
			Prod    :(node, path) =>{
				var nA = node.n[0]
				var vA = process[nA.type](nA, path + '.A')
				var steps = node.value.split('')
				for(let i = 0;i < steps.length;i++){
					var nB = node.n[i + 1]
					var vB = process[nB.type](nB, path + '.B' + i)
					var op = steps[i]
					if(op === '*') vA = vA * vB
					if(op === '/') vA = vA / vB
				}
				return vA
			},
			Cmp     :(node, path) =>{
				var nA = node.n[0]
				var nB = node.n[1]
				var vA = process[nA.type](nA, path + '.A')
				var vB = process[nB.type](nB, path + '.B')
				var op = node.value
				if(op === '<') return vA < vB
				if(op === '<=') return vA <= vB
				if(op === '>') return vA > vB
				if(op === '>=') return vA >= vB
				if(op === '!=') return vA != vB
				return vA
			},
			If      :(node, path) =>{
				var nLogic = node.n[0]
				var ret = process[nLogic.type](nLogic, path + '.Logic')
				if(ret) {
					process.Body(node.Body, path + '.Body')
				}
				else {
					
				}
			},
			Number  :(node, path) =>{
				return parseFloat(node.value)
			},
			Id      :(node, path) =>{
				if(this.vars[node.value] === undefined) {
					this.drawText({
						margin:[4, 0, 0, 0],
						color :'red',
						text  :'Error, undefined variable ' + node.value
					})
				}
				return this.vars[node.value]
			}
		}
		
		this.beginBg({
			color  :'#5',
			padding:6
		})
		process.Form(this.ast.n[0])
		this.endBg()
		
		this.lineBreak()
		this.turtle.wy += 10
		var dumpAst = (node, d) =>{
			this.turtle.wx = d * 10
			this.drawText({
				color   :'#a',
				fontSize:8,
				text    :node.type + ': '
			})
			this.drawText({
				color   :'#e',
				fontSize:8,
				text    :node.value
			})
			this.lineBreak()
			for(let i = 0;i < node.n.length;i++){
				dumpAst(node.n[i], d + 1)
			}
		}
		dumpAst(this.ast.n[0], 0)
	}
}

function makeParser(rules) {
	
	function p(a, b, eat, inv) {
		var input = p.input
		if(p.pos > input.length) return false
		if(typeof b === 'string') { // range
			var c = input.charCodeAt(p.pos)
			var cin = c >= a.charCodeAt(0) && c <= b.charCodeAt(0)
			if(inv && !cin || !inv && cin) {
				if(!eat) p.ast.value += input.charAt(p.pos)
				if(LOG) _='[' + input.charAt(p.pos) + ']' + input.slice(p.pos + 1)
				p.pos++
				return true
			}
			if(LOG) _='!' + input.charAt(p.pos) + '!' + input.slice(p.pos + 1)
			return false
		}
		var s = ''
		for(var i = 0, pos = p.pos;i < a.length;i++,pos++){ // string match
			s += input.charAt(pos)
			var cin = input.charCodeAt(pos) !== a.charCodeAt(i)
			if(inv && !cin || !inv && cin) {
				if(LOG) _='!' + s + '!' + input.slice(p.pos + s.length)
				return false
			}
		}
		if(LOG) _='[' + s + ']' + input.slice(p.pos + s.length)
		
		if(!eat) p.ast.value += s
		if(pos > p.last) p.last = pos
		p.pos = pos
		return true
	}
	
	p.eat = function(a, b) {
		return p(a, b, true)
	}
	
	p.inv = function(a, b) {
		return p(a, b, false, true)
	}
	
	p.parse = function(input) {
		p.input = input
		p.pos = 0
		p.last = 0
		var ast = p.ast = {n:[]}
		p.fail = []
		p.stack = []
		p.Start
		return ast.n[0]
	}
	
	p.fold = function(fn) {
		if(fn(p)) {
			if(p.ast.n.length < 2) return 0
			return true
		}
		return false
	}
	
	p.__defineGetter__('ws', function() {
		var input = p.input
		while(p.pos < input.length && (input.charCodeAt(p.pos) === 32 || input.charCodeAt(p.pos) === 9)){
			p.pos++
		}
		return true
	})
	
	p.any = function(fn) { //zero or more
		while(fn(p)){}
		return true
	}
	
	p.many = function(fn) { //one or more
		var c = 0
		while(fn(p)){c++}
		return c !== 0
	}
	
	p.zeroOrOne = function(fn) { //one or more
		fn(p)
		return true
	}
	
	p.not = function(fn, b) {
		var pos = p.pos, ret = fn(p)
		p.pos = pos
		return !ret
	}
	
	p.and = function(fn, b) {
		var pos = p.pos, ret = fn(p)
		p.pos = pos
		return ret
	}
	
	p.group = function(fn) {
		var pos = p.pos, ret = fn(p)
		if(!ret) p.pos = pos
		return ret
	}
	
	for(var key in rules){
		p.__defineGetter__(key, function(key) {
			var rule = rules[key]
			var parent = p.ast
			var mine = p.ast = {type:key, n:[], value:'', start:pos}
			var pos = p.pos
			p.stack.push(key)
			var ret = rule(p)
			p.ast = parent
			if(ret === true) {
				mine.end = pos
				parent.n.push(mine)
				parent[key] = mine
				p.stack.pop()
				return true
			}
			else if(ret === 0) {
				var sub = mine.n[0]
				if(sub) parent.n.push(mine.n[0])
				p.stack.pop()
				return true
			}
			p.fail.push(p.stack.join('/'))
			p.stack.pop()
			p.pos = pos
			return false
		}.bind(this, key))
	}
	
	return p
}

