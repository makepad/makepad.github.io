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
				id:'test',
				c :[
					{id:'a'},
					{id:'b'},
					{
						id:'c',
						c :[
							{id:'x'},
							{id:'y', c:[
								{id:'1'},
								{id:'2'},
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
		this.turtle.wy = st + 0.5 * ht
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
			text    :node.id
		})
		
		let c = node.c
		let ex = this.turtle.wx + 5 * scale
		let ey = this.turtle.wy
		let nx = ex + 50
		let ly = 9 * scale2
		if(c) for(var i = 0;i < c.length;i++){
			let step = ht / c.length
			let ny = st + step * i
			this.drawLine({
				sx       :ex,
				sy       :ey + ly,
				x        :nx - 2 * scale,
				y        :ny + 0.5 * step + ly,
				lineWidth:1 * scale,
			})
			this.drawNode(c[i], nx, ny, step, d + 1)
		}
	}
	
	onDraw() {
		this.drawNode(this.data[0], 20, 0, this.turtle.height * .8, 0)
	}
}