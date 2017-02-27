var LOG = true
var def = {
	Start   :o=>o.Form,
	//ws      :o=>o.fold(o=>o.any(o=>o.eat(' ') || o.eat('\t'))),
	Form    :o=>o('form') && o.many(o=>o.eat(' ')) && o.Id && o.ws && o.Body,
	Body    :o=>o.ws && o('{') && o.eat('\n') && 
		o.any(o=>o.Answer || o.Question || o.If) && 
		o.ws && o('}') && o.ws && o.many(o=>o.eat('\n')),
	Question:o=>o.ws && o.String && o.ws && o.eat('\n') && 
		o.ws && o.Id && o.eat(':') && o.ws && o.Type && o.eat('\n'),
	Answer  :o=>o.ws && o.String && o.ws && o.eat('\n') && 
		o.ws && o.Id && o.eat(':') && o.ws && o.Type && o.ws && o.eat('=') && o.ws && o.eat('\n') && 
		o.ws && o.Expr && o.eat('\n'),
	If      :o=>o.ws && o('if') && o.ws && o('(') && o.ws && o.Logic && o.ws && o(')') && o.Body,
	String  :o=>o('"') && o.any(o=>o.inv('"')) && o('"'),
	Type    :o=>(o('boolean') || o('money')),
	Id      :o=>(o('a', 'z') || o('A', 'Z')) && o.any(o=>o('a', 'z') || o('A', 'Z') || o('0', '9')),
	Logic   :o=>o.fold(o=>o.Or),
	Or      :o=>o.fold(o=>o.And && o.any(o=>o.ws && o('||') && o.ws && o.And)),
	And     :o=>o.fold(o=>o.LogicS && o.any(o=>o.ws && o('&&') && o.ws && o.LogicS)),
	LogicS  :o=>o.fold(o=>o.Id || o('(') && o.Logic && o(')')),
	Expr    :o=>o.fold(o=>o.Sum),
	Sum     :o=>o.fold(o=>o.Prod && o.any(o=>o.ws && (o('+') || o('-')) && o.ws && o.Prod)),
	Prod    :o=>o.fold(o=>o.ExprS && o.any(o=>o.ws && (o('*') || o('/')) && o.ws && o.ExprS)),
	ExprS   :o=>o.fold(o=>o.Id || o('(') && o.Expr && o(')'))
}

new require('styles/dark')
module.exports = class extends require('base/drawapp'){ //top
	constructor() {
		super()
		this.form = 
		'form taxOfficeExample {\n' + 
			'  "Did you sell a house in 2010?"\n' + 
			'    hasSoldHouse: boolean\n' + 
			'  if(hasSoldHouse) {\n' + 
			'    "What was the selling price?"\n' + 
			'      sellingPrice: money\n' + 
			'    "Private debts for the sold house:"\n' + 
			'      privateDebt: money\n' + 
			'    "Value residue:"\n' + 
			'      valueResidue: money = \n' + 
			'        (sellingPrice - privateDebt)\n' + 
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
		var recur = (node, d) =>{
			this.drawText({
				fontSize:8,
				x       :d * 10,
				text    :node.type + ':' + node.value
			})
			this.lineBreak()
			for(let i = 0;i < node.n.length;i++){
				recur(node.n[i], d + 1)
			}
		}
		recur(this.ast, 0)
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

