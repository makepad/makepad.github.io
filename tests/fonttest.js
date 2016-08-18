
var App = require('app').extend(function(proto){

	proto.tools = {
		//Text: require('shaders/arcfontshader').extend(function(proto){
		//	proto.font = require('fonts/ubuntu_regular_256.arcfont')
		//})
		Text: require('shaders/sdffontshader').extend(function(proto){
			proto.font = require('fonts/ubuntu_medium_256.sdffont')
			proto.myprop = 10
			proto.tween = 3
			proto.duration = 2
			proto.ease = [0.4,0,0,0]
			//proto.pixelStyle = function(){
				//this.field += sin(this.mesh.x*8.)*this.myprop
			//}
		})
	}
	proto.onFingerDown = function(){
		this.redraw()
	}
	proto.onDraw = function(){
		for(var i = 0 ; i< 40000;i++){
			this.drawText({
				text:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(random()*26),
				myprop:random()*5.,
				boldness:1*random(),
				outlineWidth:1,
				fontSize:25*random(),
				shadowOffset:[2,2],
				color:[random(),random(),random(),1.],
				outlineColor:'black',
				x:random()*1000,
				y:random()*1000
			})
		}
	}
})()