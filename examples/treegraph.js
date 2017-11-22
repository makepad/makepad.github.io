new require('styles/dark')
let socket = require('services/socket')
let http = require('services/http')
var Random = require('base/random')
var gen = new Random(6)
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		
		var left_brother = (v) =>{
			if(!v.parent) return
			return v.parent.children[v.number - 1]
		}
		var left = (v) =>{
			return v.children && v.children[0] || v.thread
		}
		var right = (v) =>{
			return v.children && v.children[v.children.length - 1] || v.thread
		}
		var leftmost_sibling = (v) =>{
			return v.parent && v.parent.children[0]
		}
		var init = (v, parent, depth = 0, number = 0) =>{
			v.x = -1
			v.y = depth
			v.mod = 0
			v.parent = parent
			v.thread = null
			v.ancestor = v
			v.change = v.shift = 0
			v.number = number
			var c = v.children
			if(c) for(var i = 0;i < c.length;i++){
				init(c[i], v, depth + 1, i)
			}
		}
		
		var firstwalk = (v, distance = 1.) =>{
			var c = v.children
			if(!c || !c.length) {
				if(left_brother(v)) {
					v.x = left_brother(v).x + distance
				}
				else {
					v.x = 0
				}
			}
			else {
				var def_ancestor = c[0]
				for(var i = 0;i < c.length;i++){
					var child = c[i]
					firstwalk(child)
					def_ancestor = apportion(child, def_ancestor, distance)
				}
				execute_shifts(v)
				var ell = c[0]
				var arr = c[c.length - 1]
				var midpoint = (ell.x + arr.x) / 2
				var w = left_brother(v)
				if(w) {
					v.x = w.x + distance
					v.mod = v.x - midpoint
				}
				else {
					v.x = midpoint
				}
			}
			return v
		}
		
		var apportion = (v, def_ancestor, distance) =>{
			var w = left_brother(v)
			if(!w) return def_ancestor
			var vir = v
			var vor = v
			var vil = w
			var vol = leftmost_sibling(v)
			var sir = v.mod
			var sor = v.mod
			var sil = vil.mod
			var sol = vol.mod
			while(right(vil) && left(vir)){
				vil = right(vil)
				vir = left(vir)
				vol = left(vol)
				vor = right(vor)
				vor.ancestor = v
				var shift = (vil.x + sil) - (vir.x + sir) + distance
				if(shift > 0) {
					move_subtree(ancestor(vil, v, def_ancestor), v, shift)
					sir = sir + shift
					sor = sor + shift
				}
				sil += vil.mod
				sir += vir.mod
				sol += vol.mod
				sor += vor.mod
			}
			if(right(vil) && !right(vor)) {
				vor.thread = right(vil)
				vor.mod += sil - sor
			}
			if(left(vir) && !left(vol)) {
				vol.thread = left(vir)
				vol.mod += sir - sol
				def_ancestor = v
			}
			
			return def_ancestor
		}
		
		var move_subtree = (wl, wr, shift) =>{
			var subtrees = wr.number - wl.number
			//_=[wl.number, wr.number]
			wr.change -= shift / subtrees
			wr.shift += shift
			wl.change += shift / subtrees
			wr.x += shift
			wr.mod += shift
		}
		
		var execute_shifts = (v) =>{
			var shift = 0
			var change = 0
			var c = v.children
			if(c) for(var i = c.length - 1;i >= 0;i--){
				var w = c[i]
				w.x += shift
				
				w.mod += shift
				change += w.change
				shift += w.shift + change
			}
		}
		
		var ancestor = (vil, v, def_ancestor) =>{
			if(v.parent.children.indexOf(vil.ancestor) !== -1) {
				return vil.ancestor
			}
			return def_ancestor
		}
		
		var secondwalk = (v, m = 0, depth = 0, min = null) =>{
			v.x += m
			if(min === null || v.x < min) min = v.x
			var c = v.children
			if(c) for(var i = 0;i < c.length;i++){
				var w = c[i]
				min = secondwalk(w, m + v.mod, depth + 1, min)
			}
			return min
		}
		
		var thirdwalk = (v, n) =>{
			var c = v.children
			v.x += n
			if(c) for(var i = 0;i < c.length;i++){
				thirdwalk(c[i], n)
			}
		}
		
		this.layout = (v) =>{
			init(v)
			firstwalk(v)
			var shift = secondwalk(v)
			if(shift < 0) thirdwalk(v, -shift)
		}
		
		this.nest = {
			Quad:{
				depth:0,
				pixel:function() {$
					this.viewport()
					this.circle(this.w * .5, this.h * .5, this.w * .5)
					this.circle(this.w * .5, this.h * .5, this.w * .4 - this.depth)
					this.subtract()
					this.fill('#0054ffff')
					return this.result
				}
			}
		}
		this.wrap = false
		this.props = {
			data:[]
		}
	}
	
	constructor() {
		super()
		socket.postMessage({msg:"CONNECT"})
		socket.onMessage = msg=>{
			this.msg = JSON.stringify(msg)
			this.redraw()
		}
		http.get('https://localhost:2001/makepad.html').then(result=>{
		})
		var randomize = (depth = 0) =>{
			var node = {}
			node.name = parseInt(gen.random() * 10000) + ''
			var nchild = parseInt(gen.random() * 8)
			if(depth > 4) return node
			node.children = []
			for(var i = 0;i < nchild;i++){
				node.children.push(randomize(depth + 1))
			}
			return node
		}
		this.data = [randomize()]
	}
	
	drawNode(node, x, st, ht, d) {
		this.turtle.wx = x
		this.turtle.wy = node.x * 20 + 50
		var scale = 1 // 4 / (d + 1)
		var scale2 = 1 // 4 / (d + 2)
		
		this.drawQuad({
			depth :d,
			dy    :-2,
			w     :20 * scale,
			h     :20 * scale,
			margin:[0, 5 * scale, 0, 0],
			color :[1, d / 3, d / 16, 1]
		})
		var text = node.name
		if(text.length > 8) text = text.slice(0, 8) + '..'
		this.drawText({
			fontSize:12 * scale,
			text    :text
		})
		
		let c = node.children
		let ex = this.turtle.wx + 5 * scale
		let ey = this.turtle.wy
		let nx = ex + 50
		let ly = 9 * scale2
		if(c) for(var i = 0;i < c.length;i++){
			let step = ht / c.length
			let ny = c[i].x * 20 + 60
			nx = c[i].y * 120
			this.drawLine({
				sx       :ex,
				sy       :ey + ly,
				x        :nx - 2 * scale,
				y        :ny,
				lineWidth:1 * scale,
			})
			this.drawNode(c[i], c[i].y * 120, ny, step, d + 1)
		}
	}
	
	onDraw() {
		
		this.layout(this.data[0])
		this.drawNode(this.data[0], 20, 0, this.turtle.height * .8, 0)
		//this.redraw(true)
	}
}