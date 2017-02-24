
var def = {
	Root   :p=>p.Expr,
	Expr   :p=>p.Sum,
	Sum    :p=>p.Product && p.any(p=>(p('+') || p('-')) && p.Product),
	Product:p=>p.Value && p.any(p=>(p('*') || p('/')) && p.Value),
	Value  :p=>p.many(p=>p('0', '9')) || p('(') && p.Expr && p(')')
}

new require('styles/dark')
module.exports = class extends require('base/drawapp'){ //top
	onDraw() {
		var p = makeParser(def)
		var ast = p.parse('1+2*3-(4*5)')
		var recur = (node, d) =>{
			this.drawText({
				x   :d * 10,
				text:node.type + ':' + node.value
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
		if(b !== undefined) { // range
			var c = input.charCodeAt(p.pos)
			if(c >= a.charCodeAt(0) && c <= b.charCodeAt(0)) {
				p.ast.value += input.charAt(p.pos)
				p.pos++
				return true
			}
			return false
		}
		for(var i = 0, pos = p.pos;i < a.length;i++,pos++){ // string match
			if(input.charCodeAt(pos) !== a.charCodeAt(i)) return false
		}
		p.ast.value += a
		p.pos = pos
		return true
	}
	
	p.parse = function(input) {
		p.input = input
		p.pos = 0
		p.value = ''
		var ast = p.ast = {n:[]}
		p.Root
		return ast.n[0]
	}
	
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

