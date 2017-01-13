new require('styles/dark')
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.tools = {
			Bg  :require('shaders/quad').extend({
				dead :0,
				pixel:function() {$
					
					this.viewport()
					this.rect(0, 0, this.w, this.h)
					this.fillKeep('gray')
					//this.stroke(mix('black', 'red', this.dead), 4.)
					return this.result
				},
			}),
			Quad:{
				dead  :0,
				states:{
					defaul:{
						duration:0.1,
						//time    :{fn:'ease', begin:0, end:10},
						from    :{
							x:null,
							y:null
						},
						to      :{
							x:null,
							y:null
						}
					}
				},
				pixel :function() {$
					
					this.viewport()
					this.rect(0, 0, this.w, this.h)
					this.fillKeep('green')
					this.stroke(mix('black', 'red', this.dead), 1.)
					
					return this.result
				}
			}
		}
	}
	
	onKeyDown(e) {
		if(e.name === 'upArrow') {
			this.dir = [0, -1]
		}
		if(e.name === 'downArrow') {
			this.dir = [0, 1]
		}
		if(e.name === 'leftArrow') {
			this.dir = [-1, 0]
		}
		if(e.name === 'rightArrow') {
			this.dir = [1, 0]
		}
	}
	
	constructor() {
		super()
		this.start()
	}
	
	start() {
		this.snake = [[0, 0]]
		this.len = 50
		this.dir = [1, 0]
		this.border = [0, 0, 20, 20]
		this.dead = false
	}
	
	step() {
		if(this.dead) return
		let head = this.snake[0]
		let next = [
			head[0] + this.dir[0],
			head[1] + this.dir[1]
		]
		this.snake.unshift(next)
		if(next[0] < this.border[0]) this.dead = true
		if(next[1] < this.border[1]) this.dead = true
		if(next[0] >= this.border[2]) this.dead = true
		if(next[1] >= this.border[3]) this.dead = true
		
		if(this.snake.length > this.len) {
			this.snake.pop()
		}
		if(this.dead) {
			setTimeout(_=>this.start(), 200)
		}
	}
	
	onDraw() {
		
		this.step()
		this.drawBg({
			x:0,
			y:0,
			w:10 * this.border[2],
			h:10 * this.border[3],
		})
		for(var i = 0;i < this.snake.length;i++){
			let seg = this.snake[i]
			this.drawQuad({
				x    :seg[0] * 10,
				y    :seg[1] * 10,
				w    :10,
				h    :10,
				dead :this.dead,
				hello:2
			})
		}
		//this.drawQuad({w:'100%', h:'100%'})
		setTimeout(_=>this.redraw(), 100)
	}
}