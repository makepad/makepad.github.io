new require('styles/dark')
let socket = require('services/socket')
let http = require('services/http')
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.tools = {
			Quad:{
				depth:0,
				pixel:function() {$
					this.viewport()
					this.circle(this.w * .5, this.h * .5, this.w * .5)
					this.circle(this.w * .5, this.h * .5, this.w * .4)
					this.subtract()
					this.fill(this.color)
					return this.result
				}
			}
		}
		this.props = {
			data:[{
				name:'test',
				c   :[
					{name:'a'},
					{name:'b', c:[
						{name:'n'},
						{name:'m'},
						{name:'p', c:[
							{name:'q'},
							{name:'r'},
						]},
					]},
					{
						name:'c',
						c   :[
							{name:'x'},
							{name:'x'},
							{name:'y', c:[
								{name:'1'},
								{name:'2'},
							]},
						]
					}
				]
			}]
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
	}
	
	drawNode(node, x, st, ht, d) {
		this.turtle.wx = x
		this.turtle.wy = node.x * 20 + 10
		var scale = 1 // 4 / (d + 1)
		var scale2 = 1 // 4 / (d + 2)
		
		this.drawQuad({
			depth :d,
			dy    :-2,
			w     :20 * scale,
			h     :20 * scale,
			margin:[0, 5 * scale, 0, 0],
			color :[1, d / 3, d / 6, 1]
		})
		
		this.drawText({
			fontSize:12 * scale,
			text    :node.name
		})
		
		let c = node.c
		let ex = this.turtle.wx + 5 * scale
		let ey = this.turtle.wy
		let nx = ex + 50
		let ly = 9 * scale2
		if(c) for(var i = 0;i < c.length;i++){
			let step = ht / c.length
			let ny = c[i].x * 20 + 20
			this.drawLine({
				sx       :ex,
				sy       :ey + ly,
				x        :nx - 2 * scale,
				y        :ny,
				lineWidth:1 * scale,
			})
			this.drawNode(c[i], nx, ny, step, d + 1)
		}
	}
	
	onDraw() {
		var setup = (node, depth, nexts, offset) =>{
			if(!nexts) nexts = {}
			if(!offset) offset = {}
			if(nexts[depth] === undefined) nexts[depth] = 0
			if(offset[depth] === undefined) offset[depth] = 0
			var c = node.c
			if(c) for(var i = 0;i < c.length;i++){
				setup(c[i], depth + 1, nexts, offset)
			}
			node.y = depth
			var place
			if(!c || !c.length) {
				place = nexts[depth]
				node.x = place
			}
			else if(c.length === 1) {
				place = c[0].x - 1
			}
			else {
				place = (c[0].x + c[1].x) / 2
			}
			offset[depth] = max(offset[depth], nexts[depth] - place)
			if(c && c.length) {
				node.x = place + offset[depth]
			}
			nexts[depth] += 2
			node.mod = offset[depth]
		}
		setup(this.data[0], 0)
		var addMods = (node, modsum) =>{
			node.x = node.x + modsum
			modsum += node.mod
			var c = node.c
			if(c) for(var i = 0;i < c.length;i++){
				addMods(c[i], modsum)
			}
		}
		addMods(this.data[0], 0)
		_=this.data[0]
		this.drawNode(this.data[0], 20, 0, this.turtle.height * .8, 0)
	}
}