new require('styles/dark')
module.exports = class extends require('base/drawapp'){
	prototype() {
		this.tools = {
			Circle:require('shaders/quad').extend({
				index      :0,
				radius     :7,
				vertexStyle:function() {$
					var w = this.radius
					var s = w * abs(sin(this.index + this.index * 3.5 * this.time))
					
					var f1 = this.fingerPos(0)
					s = s * abs(f1.x - this.x) * 0.003
					this.x -= .5 * s
					this.y -= .5 * s
					this.w = this.h = s
				},
				pixel      :function() {$
					this.viewport()
					this.circle(this.w * .5, this.h * .5, this.w * .5)
					var idx = this.index
					var col = mix('#ff8c00ff', this.color, abs(sin(idx + 1.1 * idx * this.time)))
					return this.fill(col)
				}
			})
		}
		
	}
	onDraw() {
		for(let i = 0;i < 50000;i++){
			
			this.drawCircle({
				index:random(),
				x    :random() * 500,
				y    :random() * 500,
				color:'random',
				w    :10,
				h    :10
			})
		}
	}
}