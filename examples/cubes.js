var a = require('services/audio')

// we can use property setters
a.Gain({gain:1.0, to:'context'})
a.Osc({to:'Gain', start:0})

module.exports=require('base/drawapp').extend({
	props:{},
	tools:{
		Cube:require('tools/shader').extend(function(proto){
			props:{
				x:0,
				y:0,
				x:0,
				w:0,
				h:0,
				d:0
			},
			mesh:require('painter').Mesh(require('types').vec4).push(
				-1,  1, 1, 0, // front
				 1,  1, 1, 0,
				-1, -1, 1, 0,
				 1, -1, 1, 0,

				-1,  1, -1, 1, // back
				 1,  1, -1, 1,
				-1, -1, -1, 1,
				 1, -1, -1, 1
			),
			indices:require('painter').Mesh(require('types').uint16).push(
				0, 1, 2, // front
				1, 3, 2,
				6, 5, 4, // back
				6, 7, 5
			),
			vertexStyle:function(){
			},
			vertex:function(){
				this.vertexStyle()
				return vec4(mesh.xyz, 1.) * this.viewPosition * this.camPosition * this.camProjection
			},
			pixel:function(){
				// lighting?
				return mix('red', 'green', this.mesh.w / 6.)
			}
		})
	},
	onFingerDown:function(){
	},
	onFingerUp:function(){
	},
	onDraw:function (){
	}
})
