module.exports=require('base/drawapp').extend({
	props:{},
	tools:{
		Cube:require('tools/shader').extend(function(proto){
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
			vertex:function(){
				
			},
			pixel:function(){
				
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
