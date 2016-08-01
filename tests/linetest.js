var App = require('app').extend(function(proto){

	proto.tools = {
		Line:require('shaders/lineshader').extend({

			liney:function(pt){$
				return cos(pt*0.11)*200.+200.
			},
			linex:function(pt){$
				return sin(pt*0.04+this.time)*200.+200.
			},
			vertexStyle:function(){$
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
			for(var i = 0; i < 1000; i++){
				this.drawLine({
					//shadowOffset:[10,10],
					first:i===0,
					x:i*20,
					y:100+sin(i*0.4)*50//this.Line.prototype.tweenBezier(pz,0,pz,1,i/10)*200
				})
			}
		}
		//require.perf()
	}
})()