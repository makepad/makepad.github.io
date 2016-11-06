module.exports = class extends require('base/drawapp'){ //top
	
	prototype() {
		this.tools = {
			Grid:require('tools/grid'),
			Quad:{
				pixel:function() {$
					this.canvas2D(this.mesh.xy * vec2(this.w, this.h), vec2(0.))
					this.source = 'red'
					this.clear()
					this.lineWidth = 1.
					this.circle(50., 50., 30.)
					this.fill()
					
					return this.blit()
				}
			}
		}
	}
	
	onDraw() {
		this.drawQuad(this.viewGeom)
	}
}