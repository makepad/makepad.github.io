
var def = {
	Root    :p=>p.Form,
	Form    :p=>p('form') && p.many(p=>p.space) && p.Id && p.ws && p.Body,
	Body    :p=>p.ws && p('{') && p.newline && p.any(p=>p.Answer || p.Question || p.If) && p.ws && p('}') && p.ws && p.many(p=>p.newline),
	Question:p=>p.ws && p.String && p.ws && p.newline && 
		p.ws && p.Id && p(':') && p.ws && p.Type && p.newline,
	Answer  :p=>p.ws && p.String && p.ws && p.newline && 
		p.ws && p.Id && p(':') && p.ws && p.Type && p.ws && p('=') && p.ws && p.newline && 
		p.ws && p.Expr && p.newline,
	If      :p=>p.ws && p('if') && p.ws && p('(') && p.ws && p.Logic && p.ws && p(')') && p.Body,
	String  :p=>p('"') && p.any(p=>p('"', false)) && p('"'),
	Type    :p=>(p('boolean') || p('money')),
	Id      :p=>(p('a', 'z') || p('A', 'Z')) && p.any(p=>p('a', 'z') || p('A', 'Z') || p('0', '9')),
	Logic   :p=>p.And,
	Or      :p=>p.And && p.any(p=>p('||') && p.And),
	And     :p=>p.LPart && p.any(p=>p('&&') && p.LPart),
	LPart   :p=>p.Id || p('(') && p.Logic && p(')'),
	Expr    :p=>p.Sum,
	Sum     :p=>p.Product && p.any(p=>p.ws && (p('+') || p('-')) && p.ws && p.Product),
	Product :p=>p.EPart && p.any(p=>p.ws && (p('*') || p('/')) && p.ws && p.EPart),
	EPart   :p=>p.Id || p('(') && p.Expr && p(')')
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
	}
	onDraw() {
		var p = makeParser(def)
		var ast = p.parse(this.form)
		if(!ast) {
			this.drawText({
				fontSize:20,
				text    :"Parse error at: ..." + this.form.slice(p.max - 10, p.max) + '^' + this.form.slice(p.max, p.max + 10) + '...'
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
		recur(ast, 0)
	}
}

function makeParser(rules) {
	
	function p(a, b) {
		var input = p.input
		if(typeof b === 'string') { // range
			var c = input.charCodeAt(p.pos)
			if(c >= a.charCodeAt(0) && c <= b.charCodeAt(0)) {
				p.ast.value += input.charAt(p.pos)
				p.pos++
				return true
			}
			return false
		}
		if(b === false) {
			var s = ''
			for(var i = 0, pos = p.pos;i < a.length;i++,pos++){ // string match
				s += input.charAt(pos)
				if(input.charCodeAt(pos) === a.charCodeAt(i)) return false
			}
			p.ast.value += s
		}
		else {
			for(var i = 0, pos = p.pos;i < a.length;i++,pos++){ // string match
				if(input.charCodeAt(pos) !== a.charCodeAt(i)) return false
			}
			p.ast.value += a
		}
		if(pos > p.max) p.max = pos
		p.pos = pos
		return true
	}
	
	p.parse = function(input) {
		p.input = input
		p.pos = 0
		p.max = 0
		var ast = p.ast = {n:[]}
		p.Root
		return ast.n[0]
	}
	
	p.__defineGetter__('space', function() {
		if(p.input.charCodeAt(p.pos) === 32) {
			p.pos++
			return true
		}
		return false
	})
	
	p.__defineGetter__('ws', function() {
		while(p.input.charCodeAt(p.pos) === 32 || p.input.charCodeAt(p.pos) === 9){
			p.pos++
		}
		return true
	})
	
	p.__defineGetter__('newline', function() {
		if(p.input.charCodeAt(p.pos) === 10) {
			p.pos++
			return true
		}
		return false
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
	
	p.not = function(fn) {
		var pos = p.pos, ret = fn(p)
		p.pos = pos
		return !ret
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
			var ret = rule(p)
			if(ret) {
				mine.end = pos
				parent.n.push(mine)
			}
			else {
				p.pos = pos
			}
			p.ast = parent
			return ret
		}.bind(this, key))
	}
	
	return p
}

