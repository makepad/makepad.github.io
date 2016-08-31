module.exports=require('base/drawapp').extend({
	tools:{
		Quad:{
			pixel:function(){
				return mix(
					'white',
					'black',
					2*length(this.mesh.xy-.5))
			}
		}
	}
	onDraw:function(){
		this.drawQuad(this.viewGeom)
	}
})