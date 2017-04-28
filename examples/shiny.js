new require('styles/dark')
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.tools = {
			Rect:class extends require('shaders/quad'){
				prototype() {
					this.mixin(require('base/noise'))
					this.props = {
						v:{value:1.}
					}
				}
				
				pixel() {$
					var s = this.v
					var noise = this.noise3d(vec3(this.mesh.x * s, this.mesh.y * s, this.time))
					return mix('#1b3725ff', '#ffffffff', noise)
				}
			}
		}
	}
	
	onFingerDown() {
		this.redraw()
	}
	
	onDraw() {
		this.drawRect({
			color:'gray',
			w    :'100%',
			h    :'100%'
		})
		
	}
}