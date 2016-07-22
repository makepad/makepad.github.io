var App = require('view').extend(function(proto){

	proto.tools = {
		Line:require('shaders/lineshader').extend(function(proto){

			proto.liney = function(pt){$
				return cos(pt*0.1)*400.+400.
			}
			
			proto.linex = function(pt){$
				return sin(pt*0.190+this.time)*400.+400.
			}

			proto.vertexStyle = function(){$
				var p = this.point
				this.color = vec4(sin(p*0.1), cos(p*0.02), sin(p),1.)
				//this.lineWidth = 4.+4.*sin(p*10.+5.*this.time)
				this.ax = this.linex(p-1.)
				this.ay = this.liney(p-1.)
				this.bx = this.linex(p)
				this.by = this.liney(p)
				this.cx = this.linex(p+1.)
				this.cy = this.liney(p+1.)
				this.dx = this.linex(p+2.)
				this.dy = this.liney(p+2.)
			}

		})
	}

	proto.wrap = false
	proto.onDraw = function(){
		//this.drawBg({w:100*Math.sin(this.time),h:100})
		require.perf()
		for(var j = 0; j < 1; j++){
			//var px = random()*500, py = random()*500
			//var pz = random()
			for(var i = 0; i < 1000; i++){
				this.drawLine({
					//shadowOffset:[10,10],
					lineWidth:20,
					color:[0,0,0,0],
					outlineColor:[1,1,1,1],
					outlineWidth:0,
					first:i===0,
					x:i*20,
					y:100.//this.Line.prototype.tweenBezier(pz,0,pz,1,i/10)*200
				})
			}
		}
		require.perf()
	}
})
App().runApp()