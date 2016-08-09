
var App = require('app').extend(function(proto){

	proto.tools = {
		Rect: require('shaders/rectshader').extend({
			random: 0,
			shadowSpread:1,
			shadowBlur:10,
			shadowoffset:[4,4],
			borderColor:'black',
			borderWidth:[10,1,1,1],
			
			pixelStyle: function(){$
				//this.borderColor = mix('red','green',this.mesh.x)
				var m = this.mesh
				this.borderWidth.x = 10.+5.*sin(m.x*15.*this.random+this.time*10.)*cos(m.x*5.*this.random)
				var meshh = m.y*this.h
				var propsh = this.borderWidth.x+1.
				if(meshh <propsh ) this.borderColor = mix('white','gray',meshh/propsh)
				this.color = mix(this.color,'white',this.mesh.y)
			}
		})
	}

	proto.onDraw = function(){
		//var dt = performance.now()
		for(var i = 0 ; i < 2000;i++){
			this.drawRect({
				random:Math.random()+0.1,
				color:[random(),random(),random(),1],
				borderRadius:[10,1000,1000,10+random()*10], // LT RT RB LB
				x:1700*Math.random(),
				y:1700*Math.random(),
				w:30+30*Math.random(),
				h:30+30*Math.random()
			})
		}
		//console.log(performance.now()-dt)
	}
})()