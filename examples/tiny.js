var p = require('services/painter')
module.exports = class extends require('base/drawapp'){ //top
	
	prototype() {
		this.tools = {
			Grid:require('shaders/grid'),
			Quad:{
				pixel:function() {$
					
					this.viewport(this.mesh.xy * vec2(this.w, this.h))
					this.circle(50., 50., 20.)
					this.circle(50. + 20, 80., 30.)
					this.gloop(30.)
					this.fillKeep('orange')
					this.stroke('blue', 4.)
					
					//this.rectangle(0.,0.,100.,100.)
					//this.fill('blue')
					
					//this.circle(70.,60.,30.)
					//this.fill('#f0fc')
					
					//this.box(50.,50.,50.,50.,10.)
					//this.fill('#f')
					//this.rotate(this.time,50,75)
					//this.moveTo(100,100)
					//this.lineTo(50,50)
					//this.lineTo(50,150)
					//this.closePath()
					//this.strokeKeep('#f00',5.)
					//this.blur=18.
					//this.glow('#f00',15.)
					
					return this.result
				}
			}
		}
	}
	
	onDraw() {
		this.drawQuad(this.viewGeom)
	}
}