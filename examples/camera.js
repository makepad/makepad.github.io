new require('styles/dark')
var cameras = require('services/cameras')
var painter = require('services/painter')
module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.nest = {
			Cam:require('shaders/quad').extend({
				dead :0,
				col  :'red',
				cam  :{kind:'sampler', sampler:painter.SAMPLER2DNEAREST},
				pixel:function() {$
					//return 'red'
					return texture2D(this.cam, this.mesh.xy) * this.col * 2.
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
		for(let i = 0;i < 100;i++)
		this.drawCam({
			col:'random',
			cam:this.cam,
			w  :'10%',
			h  :'10%'
		})
	}
}