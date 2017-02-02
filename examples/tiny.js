new require('styles/dark')
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.tools = {
			Quad:{
				pixel:function() {$
					this.viewport()
					this.circle(
						250. + 50. * sin(1.2 * this.time),
						150. + 50. * cos(1.3 * this.time),
						20.
					)
					this.circle(
						250. + 50. * sin(this.time),
						180. + 50. * cos(1.4 * this.time),
						20 + 20 * abs(sin(this.time))
					)
					this.gloop(30.)
					this.circle(
						150. + 50. * cos(this.time),
						180. + 50. * cos(1.1 * this.time),
						40.
					)
					this.gloop(10.)
					this.fillKeep('orange')
					this.strokeKeep('blue', 4.)
					this.glow('#500', 15.)
					return this.result
				}
			}
		}
	}
	
	onDraw() {
		//_=this
		this.drawQuad({w:'100%', h:'100%'})
	}
}