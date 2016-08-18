var Div = require('views/drawview').extend({
	props:{
		bgColor:[1,0,0,1]
	},
	onDraw:function(){
		this.drawRect({
			w:this.$w,
			h:this.$h,
			color:this.bgColor
		})
	}
})

var Text = require('views/drawview').extend({
	padding:10,
	onDraw:function(){
		this.beginRect(this.viewGeom)
		this.drawText({
			color:'white',
			text:this.text
		})
		this.endRect()
	}
})

var Scrollbars = require('views/drawview').extend({
	tools:{
		Button:require('stamps/buttonstamp').extend({
			Bg:{
				borderWidth:1,
			}
		}),
		Rect:require('shaders/backgroundshader').extend({
			borderRadius:8,
		})
	},
	Text:{
		fontSize:148,

		pal:function (t, a, b, c, d) {
			return a + b * cos(6.28318 * (c * t + d));
		},

		rainbow:function(t){
			return vec4(this.pal(t, vec3(.5),vec3(.5),vec3(1),vec3(0,0.33,0.67)),1.)
		},

		kali2d:function(pos, steps, space){$
			var v = pos
			for(var i = 0; i < 130; i ++){
				if(i > int(steps)) break
				v = abs(v)

				v = v / (v.x * v.x + v.y * v.y) + space
			}			
			return v
		},
		fractzoom:function(pos, time, zoom){$
			var dt = sin((80./60.)*time*PI)
			var mypos = pos.xy*.01*sin(0.04*time+0.05*dt)
			var dx = 0.01*sin(0.01*time)
			var dy = -0.01*sin(0.01*time)
			//mypos = math.rotate2d(mypos,0.1*time)
			var kali1 = this.kali2d(mypos+vec2(0.0001*time), 30, vec2(-0.8280193310201044,-0.858019331020104-dx))
			return kali1
			//var kali2 =  kali2d(mypos+vec2(0.0001*time), 40, vec2(-0.8280193310201044,-0.858019331020104-dy))
			//var c1 =vec4(d.y, 0. ,sin(0.1*time)*6*kali2.y, 1.)
			//var c1 = pal.pal2(kali1.y+dt)
			//var c2 = pal.pal2(kali2.y+dt)
			//return mix(c1,c2,sin(length(pos-.5)+time))
			//var mp = highdefblirpy(pos.xy*0.05*sin(0.1*time), time,1.)
			//return  mix(pal.pal4(mp.r+0.1*time),c1,c1.b)		
		},
		pixelStyle:function(){
			var pos = vec2()
			var fract = this.fractzoom(this.mesh.xy*0.02, this.time, 1.)
			this.field -= fract.y*10.
			//this.color = this.rainbow(this.field*0.1)
			//this.color = mix('red','green',fract.y)
		//	this.field += 6.*sin(this.x+this.mesh.x*4.+this.time*8.)
			//this.color = mix('blue','red',-0.1*this.field)
			//if(this.isFingerOver(pos)>0){
				//var dist = length(pos - vec2(this.x, this.y))*0.1
				//this.field += dist// + sin(dist)
			//this.color = mix('black','white',-0.2*this.field)
			//}
		}
	},
	padding:10,
	drawDiscard:'y',
	onDraw:function(){
		require.perf()
		this.beginRect(this.viewBgProps)
		
		for(var i = 0; i < 1500; i++){
			if(i%20 === 0){
				this.drawText({
					color:[random(),random(),random(),1],
					text:'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n'
				})
			}
			this.drawButton({
				fontSize:20,
				outlineWidth:1,
				outlineColor:'black',
				color:'white',
				text:(random()+'').slice(3,5)
			})	
		}
		//this.drawRect({w:100,h:4000})
		this.endRect()
		require.perf()
	}
})

var App = require('app').extend({
	onCompose:function(){
		return [
			/*Text({
				margin:10,
				text:'TextNode'
			}),*/
			Scrollbars({
				margin:10,
				padding:10,
				w:'100%',
				h:'100%'
			})/*,
			Div({
				surface:true,
				margin:10,
				bgColor:'gray'},
				Div({
					margin:10,
					bgColor:'orange',
					padding:20,
					onFingerDown:function(){
						this.w = 40
						this.margin = 40
						this.bgColor = 'blue'
					}},
					Div({
						x:'0',
						w:10,
						h:10
					})
				)
			)*/
		]
	}
})()