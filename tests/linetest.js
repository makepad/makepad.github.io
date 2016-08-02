var App = require('app').extend(function(proto){

	proto.tools = {
		Rect:require('shaders/rectshader'),
		Line:require('shaders/lineshader').extend({

			liney:function(pt){$
				return cos(pt*0.11)*200.+200.
			},
			linex:function(pt){$
				return sin(pt*0.04+this.time)*200.+200.
			},
			vertexStyle2:function(){$
				var p = this.point
				//this.color = vec4(sin(p*0.1), cos(p*0.02), sin(p),1.)
				//this.lineWidth = 4.+4.*sin(p*10.+5.*this.time)
				this.ax = this.linex(p-1.)
				this.ay = this.liney(p-1.)
				this.bx = this.linex(p)
				this.by = this.liney(p)
				this.cx = this.linex(p+1.)
				this.cy = this.liney(p+1.)
				this.dx = this.linex(p+2.)
				this.dy = this.liney(p+2.)
			},
			lineWidth:1.,
			color:[1,1,0,1],
			outlineColor:[0,0,0,1],
			outlineWidth:0

		})
	}

	proto.onDraw = function(){
		//this.drawBg({w:100*Math.sin(this.time),h:100})
		//require.perf()
		for(var j = 0; j < 1; j++){
			//var px = random()*500, py = random()*500
			//var pz = random()
			this.drawRect({
				borderRadius:0,
				borderWidth:1,
				borderColor:'white',
				color:[0,0,0,0],
				x:0,y:200,w:300,h:200
			})
			for(var i = 0; i < 1000; i++){
				var t = i/1000

				var f = this.Line.prototype.tweenTime(4, t, 0.8, 4, 8,4)
				this.drawLine({
					//shadowOffset:[10,10],
					first:i===0,
					x:(i/1000)*300,
					y:200-f*200+200//this.Line.prototype.tweenBezier(pz,0,pz,1,i/10)*200
				})
			}
		}
		//require.perf()
	}
})()