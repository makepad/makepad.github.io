
var App = require('view').extend(function(proto){

	proto.nested = {
		Bg: require('shaders/rectshader').extend(function(proto){
		})
	}

	proto.ondraw = function(){
		var rnd = Math.random
		// lets go make a turtle
		//var dt = Date.now()
		for(var i = 0 ; i < 1000; i++){
			this.beginBg({
				x:rnd()*1000,
				y:rnd()*1000,
				w:100,
				h:100,
				borderColor:[rnd()*.5,rnd()*.5,rnd()*.5,1],
				padding:[16,0,1,0],
				borderWidth:[15,0,0,0],
				color:[rnd(),rnd(),rnd(),1]
			})
			for(var j = 0 ;j < 10; j++){
				this.drawBg({w:20,h:20})
			}
				//this.beginBg({w:30,h:30,padding:[0,0,0,0],color:'red'})
				//	this.drawBg({w:20,h:20})
				//this.endBg()
			this.endBg()
		}
		//console.log(Date.now()-dt)

	}
})
App().runApp()