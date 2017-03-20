var LOG = 0
// GRAMMAR
var defQL = {
	Start   :o=>o.Form,
	ws      :o=>o.fold(o=>o.any(o=>o.eat(' ') || o.eat('\t'))),
	Form    :o=>o('form') && o.many(o=>o.eat(' ')) && o.Id && o.ws && o.Body,
	Body    :o=>o.ws && o('{') && o.ws && o.eat('\n') && 
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
	Logic   :o=>o.fold(o=>o.Or),
	Or      :o=>o.fold(o=>o.And && o.any(o=>o.ws && o('||') && o.ws && o.And)),
	And     :o=>o.fold(o=>o.Cmp && o.any(o=>o.ws && o('&&') && o.ws && o.Cmp)),
	Cmp     :o=>o.fold(o=>o.LogicS && o.zeroOrOne(o=>o.ws && (o('<=') || o('<') || o('>=') || o('>') || o('!=')) && o.ws && o.LogicS)),
	LogicS  :o=>o.fold(o=>o.NotId || o.Number || o('(') && o.Logic && o(')')),
	NotId   :o=>o.empty(o=>o.zeroOrOne(o=>o('!')) && o.ws && o.Id, 1),
	Expr    :o=>o.fold(o=>o.Sum),
	Sum     :o=>o.fold(o=>o.Prod && o.any(o=>o.ws && (o('+') || o('-')) && o.ws && o.Prod)),
	Prod    :o=>o.fold(o=>o.ExprS && o.any(o=>o.ws && (o('*') || o('/')) && o.ws && o.ExprS)),
	ExprS   :o=>o.fold(o=>o.Id || o.Number || o('(') && o.Expr && o(')'))
}

var defQLS = {
	Start     :o=>o.Stylesheet,
	Stylesheet:o=>o('stylesheet') && o.many(o=>o.eat(' ')) && o.Id && o.ws && o('{') && o.eat('\n') && o.any(o=>o.Page) && o.ws && o('}') && o.ws && o.many(o=>o.eat('\n')),
	Page      :o=>o.ws && o('page') && o.ws && o.Id && o.ws && o('{') && o.ws && o.eat('\n') && o.any(o=>o.Section) && o.ws && o('}') && o.ws && o.many(o=>o.eat('\n')),
	Body      :o=>o.ws && o('{') && o.ws && o.eat('\n') && o.any(o=>o.Section || o.Question || o.Default) && o.ws && o('}') && o.ws && o.many(o=>o.eat('\n')),
	Props     :o=>o.ws && o('{') && o.ws && o.eat('\n') && o.any(o=>o.ws && (o.StrProp || o.NumProp || o.ColProp || o.WidgetProp)) && o.ws && o('}') && o.ws && o.many(o=>o.eat('\n')),
	StrProp   :o=>o.Id && o.ws && o.eat(':') && o.ws && o.String && o.ws && o.eat('\n'),
	NumProp   :o=>o.Id && o.ws && o.eat(':') && o.ws && o.Number && o.ws && o.eat('\n'),
	ColProp   :o=>o.Id && o.ws && o.eat(':') && o.ws && o.Color && o.ws && o.eat('\n'),
	WidgetProp:o=>o('widget') && o.ws && o.Id && o.ws && o.eat('\n'),
	String    :o=>o('"') && o.any(o=>o.inv('"')) && o('"'),
	Id        :o=>(o('a', 'z') || o('A', 'Z')) && o.any(o=>o('a', 'z') || o('A', 'Z') || o('0', '9')),
	Number    :o=>(o.zeroOrOne(o=>o('-')) && o.many(o=>o('0', '9')) && o.zeroOrOne(o=>o('.') && o.many(o=>o('0', '9')))),
	Color     :o=>o('#') && o.many(o=>o('0', '9') || o('a', 'f') || o('A', 'F')),
	Section   :o=>o.ws && o('section') && o.ws && o.String && o.ws && o.Body,
	Question  :o=>o.ws && o('question') && o.ws && o.Id && o.ws && o.eat('\n') && o.zeroOrOne(o=>o.Widget),
	Widget    :o=>o.ws && o('widget') && o.ws && o.Id && o.zeroOrOne(o=>o.ws && o('(') && o.ws && 
			o.any(o=>o.String && o.zeroOrOne(o=>o.ws && o.eat(',') && o.ws)) && o.ws && o(')') && o.ws) && o.ws && o.eat('\n'),
	Default   :o=>o.ws && o('default') && o.ws && o.Id && o.Props
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
		
		this.style = 
		'stylesheet MainForm{\n' + 
			' page Selling { \n' + 
			'  section "Selling" { \n' + 
			'   question hasSoldHouse \n' + 
			'    widget radio("Yes", "No") \n' + 
			'  section "You sold a house" { \n' + 
			'   question sellingPrice \n' + 
			'    widget spinbox \n' + 
			'   question privateDebt \n' + 
			'    widget spinbox  \n' + 
			'   question valueResidue \n' + 
			'    default money { \n' + 
			'     width: 400 \n' + 
			'     font: "Arial"  \n' + 
			'     fontsize: 14 \n' + 
			'     color: #999999 \n' + 
			'     widget spinbox \n' + 
			'    } \n' + 
			'   } \n' + 
			'  } \n' + 
			' }\n' + 
			'}\n'
		
		this.parserQL = makeParser(defQL)
		this.astQL = this.parserQL.parse(this.form)
		this.parserQLS = makeParser(defQLS)
		this.astQLS = this.parserQLS.parse(this.style)
		
		this.wrap = false
	}
	onDraw() {
		var p = this.parserQL
		if(!this.astQL) {
			this.drawText({
				fontSize:20,
				text    :"Parse error in " + p.fail[0] + "\nat: ..." + p.input.slice(p.last - 10, p.last) + '^' + p.input.slice(p.last, p.last + 10) + '...'
			})
			return
		}
		
		// Process 
		
		var opTable = (table, one) =>{
			return (node, path) =>{
				var n0 = node.n[0]
				var L = processQL[n0.type](n0, path + '[0]')
				var steps = one?[node.value]:node.value.split('')
				for(let i = 0;i < steps.length;i++){
					var j = i + 1
					var nX = node.n[j]
					var R = processQL[nX.type](nX, path + '[' + j + ']')
					var op = steps[i]
					for(var key in table){
						if(op === key) {
							L = table[key](L, R)
							break
						}
					}
				}
				return L
			}
		}
		
		var processQL = {
			Form    :(node) =>{
				this.drawText({
					fontSize:15,
					margin  :[0, 0, 8, 0],
					text    :node.Id.value
				})
				this.lineBreak()
				processQL.Body(node.Body, '')
			},
			Body    :(node, path) =>{
				for(let i = 0;i < node.n.length;i++){
					var n = node.n[i]
					processQL[n.type](n, path + '.' + n.type + '[' + i + ']')
				}
			},
			Question:(node, path, qls) =>{
				this.drawText({
					fontSize:12,
					text    :'Q: ' + node.String.value.slice(1, -1)
				})
				this.lineBreak()
				// check type
				var id = node.Id.value
				var type = 'radio', args = ['yes', 'no']
				if(node.Type.value === 'boolean') type = 'radio'
				if(node.Type.value === 'money') type = 'spinbox'
				if(qls) {
					type = qls.Id.value
					args = []
					for(var i = 1;i < qls.n.length;i++){args.push(qls.n[i].value.slice(1, -1))}
				}
				if(type === 'radio') {
					
					this.drawButton({
						id     :path + 'Y',
						text   :args[0],
						onClick:c=>{
							this.vars[id] = true
							this.redraw()
						}
					})
					this.drawButton({
						id     :path + 'N',
						text   :args[1],
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
				else if(type === 'spinbox') {
					
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
				var val = processQL[nExpr.type](nExpr, path + '.Expr')
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
			If      :(node, path) =>{
				var nLogic = node.n[0]
				var ret = processQL[nLogic.type](nLogic, path + '.Logic')
				if(ret) {
					processQL.Body(node.Body, path + '.Body')
				}
				else {
					
				}
			},
			Number  :(node, path) =>{
				return parseFloat(node.value)
			},
			NotId   :(node, path) =>{
				var n0 = node.n[0]
				return !processQL[n0.type](n0, path + '!')
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
			},
			Sum     :opTable({
				'+':(L, R) =>L + R,
				'-':(L, R) =>L - R,
			}),
			Prod    :opTable({
				'*':(L, R) =>L * R,
				'/':(L, R) =>L / R,
			}),
			And     :opTable({
				'&&':(L, R) =>L && R
			}, 1),
			Or      :opTable({
				'||':(L, R) =>L || R
			}, 1),
			Cmp     :opTable({
				'<':(L, R) =>L < R,
				'<=':(L, R) =>L <= R,
				'>':(L, R) =>L < R,
				'>=':(L, R) =>L >= R,
				'!=':(L, R) =>L != R
			}, 1),
		}
		
		function findQuestion(id, node) {
			if(node.type === 'If') {
				var nLogic = node.n[0]
				var ret = processQL[nLogic.type](nLogic, 'Logic')
				if(!ret) return
			}
			if(node.type === 'Question' || node.type === 'Answer') {
				if(node.Id.value === id) return node
			}
			for(var i = 0;i < node.n.length;i++){
				var ret = findQuestion(id, node.n[i])
				if(ret) return ret
			}
		}
		
		var processQLS = {
			Stylesheet:(node) =>{
				for(var i = 1;i < node.n.length;i++){
					var n = node.n[i]
					processQLS[n.type](n, '[' + i + ']', 0)
				}
			},
			Page      :(node, path, depth) =>{
				for(var i = 1;i < node.n.length;i++){
					var n = node.n[i]
					processQLS[n.type](n, path + '[' + i + ']', depth + 1)
				}
			},
			Question  :(node, path, depth) =>{
				var q = findQuestion(node.Id.value, this.astQL)
				if(q) processQL[q.type](q, path, node.Widget)
			},
			Default   :(node, path, depth) =>{
			},
			Section   :(node, path, depth) =>{
				var nodes = node.Body.n
				var quest = 0
				for(var i = 0;i < nodes.length;i++){
					var n = nodes[i]
					if(n.type === 'Question' && findQuestion(n.Id.value, this.astQL)) {
						quest++
					}
				}
				if(!quest) return
				this.beginBg({
					color  :[depth / 4, depth / 4, depth / 4, 1],
					padding:6
				})
				this.drawText({
					fontSize:20 - depth * 3,
					text    :node.String.value.slice(1, -1),
					margin  :[0, 0, 10, -0]
				})
				this.lineBreak()
				for(var i = 0;i < nodes.length;i++){
					var n = nodes[i]
					processQLS[n.type](n, path + '[' + i + ']', depth + 1)
				}
				this.endBg()
			}
		}
		
		this.beginBg({
			color  :'#5',
			padding:16
		})
		processQLS.Stylesheet(this.astQLS.n[0])
		//processQL.Form(this.astQL.n[0])
		this.endBg()
		this.turtle.mh = 0
		//this.lineBreak()
		var px = this.turtle.wx + 5
		var dumpAst = (node, d) =>{
			this.turtle.wx = px + d * 10
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
		dumpAst(this.astQL.n[0], 0)
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
	
	p.empty = function(fn) {
		if(fn(p)) {
			if(p.ast.value.length == 0) return 0
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

