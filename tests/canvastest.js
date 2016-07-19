
var App = require('view').extend(function(proto){

	proto.nested = {
		Background: require('shaders/rectshader').extend(function(proto){
		})
	}

	proto.ondraw = function(){
		// lets go make a turtle
		
	}
})
App().runApp()