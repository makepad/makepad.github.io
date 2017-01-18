new require('styles/dark')
var cameras = require('services/cameras')
var painter = require('services/painter')
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.tools = {
			Cam:require('shaders/quad').extend({
				dead :0,
				cam  :{kind:'sampler', sampler:painter.SAMPLER2DNEAREST},
				pixel:function() {$
					return 'red'
					return texture2D(this.cam, this.mesh.xy)
				},
			})
		}
		
		this.debug = 1
	}
	
	constructor() {
		super()
		let cam = this.cam = new cameras.Camera()

		cam.onFrame2 = msg=>{
		}
		cam.start(640, 480, 60)
	}
	onDraw() {
		this.drawCam({
			cam:this.cam,
			w  :'100%',
			h  :'this.w*1.85'
		})
	}
}