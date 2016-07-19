
var App = require('view').extend(function(proto){

	proto.nested = {
		//Text: require('shaders/arcfontshader').extend(function(proto){
		//	proto.font = require('fonts/ubuntu_regular_256.arcfont')
		//})
		Text: require('shaders/sdffontshader').extend(function(proto){
			proto.font = require('fonts/ubuntu_medium_256.sdffont')
		})
	}

	proto.ondraw = function(){
		for(var i = 0 ; i< 5000;i++){
			this.drawText({
				text:''+i,
				boldness:1,
				outlineWidth:1,
				fontSize:25,
				shadowOffset:[2,2],
				color:[Math.random(),Math.random(),Math.random(),1.],
				outlineColor:'black',
				x:Math.random()*1000,
				y:Math.random()*1000
			})
		}
	}
})
App().runApp()