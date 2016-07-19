
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
				padding:[20,0,0,0],
				borderWidth:[20,0,0,0],
				color:[rnd(),rnd(),rnd(),1],
				align:[0.5,0.5]
			})

			this.beginBg({w:'50%',h:'50%',align:[1.0,0.5],padding:[0,0,0,0],color:'orange'})
				this.drawBg({w:30,h:30})
			this.endBg()
			this.endBg()
		}
		//console.log(Date.now()-dt)

	}
})
App().runApp()