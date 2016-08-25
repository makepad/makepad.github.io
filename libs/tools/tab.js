module.exports = require('base/stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'',
		icon:'',
		index:0,
		canClose:false,
		selected:false
	}

	proto.inPlace = 0
	
	proto.tools = {
		Button:require('tools/button').extend({
			Bg:{
				borderRadius:8,
				padding:[0,2,0,2],
			},
			Icon:{
				fontSize:10,
				color:'#c'
			},
			states:{
				default:{
					Bg:{
						pickAlpha:-1,
						color:'#0000'
					}
				},
				over:{
					Bg:{
						color:'#c00'
					}
				},
				clicked:{
					Bg:{
						color:'#a00'
					}
				}
			},
			margin:[1,2,0,0],
			text:'',
			icon:'close',
			onClick:function(){
				this.view.onTabStampClose(this.index)
			}
		}),
		Text:require('tools/text').extend({
			font:require('fonts/ubuntu_monospace_256.font'),
			shadowOffset:[1,1],
			fontSize:11,
			shadowColor:'#0005',
			shadowBlur:1,
			duration:0.2,
			margin:[0,4,0,0],
			color:'white'
		}),
		Icon:require('tools/icon').extend({
			shadowOffset:[1,1],
			shadowColor:'#0005',
			shadowBlur:1,
			ease:[0,10,0,0],
			color:'#a',
			margin:[0,4,0,0]
		}),
		Bg:require('tools/shadowquad').extend({
			tween:2,
			padding:[4,1,3,5],
			margin:[0,1,0,0],
			pickAlpha:-1,
			shadowOffset:[2,2],
			borderRadius:3.,
			borderWidth:0,
			borderColor:{noTween:1,pack:'float12',value:'#f'},
			color:{noTween:1,pack:'float12',value:'#4'},
			pixel:function(){$
				var p=vec2(this.w,this.h)*this.mesh.xy
				var aa=this.antialias(p)
				var hh=this.h+4
				
				var f=0.
				
				var A=this.boxField(p,0,0.,this.w,this.h+8,this.borderRadius)
				f=A

				if(this.mesh.z<.5){
					return this.colorSolidField(aa,f, this.shadowColor)
				}
				var col=this.color
				var bor = this.borderColor
				return this.colorBorderField(aa,f,this.borderWidth, col, bor)
			}
		})
	}

	proto.states = {
		default:{
			Bg:{
				color:'#2'
			},
			Text:{
				color:'#9'
			}
		},
		defaultOver:{
			Bg:{
				color:'#3'
			},
			Text:{
				color:'#c'
			}
		},
		selected:{
			Bg:{
				color:'#4'
			},
			Text:{
				color:'#e'
			}
		},
		selectedOver:{
			Bg:{
				color:'#4'
			},
			Text:{
				color:'#f'
			}
		}
	}

	proto.onFingerDown = function(){
		if(this.view.onTabStampSelected) this.view.onTabStampSelected(this.index)
		this.state = this.states.selectedOver
	}

	proto.onFingerUp = function(e){
		//this.state = this.states.selected
	}

	proto.isSelected = function(){
		return this.state === this.states.selected || this.state === this.states.selectedOver
	}
	proto.onFingerOver = function(){
		this.stateExt = 'Over'
		this.state = this.isSelected()?this.states.selectedOver:this.states.defaultOver
	}

	proto.onFingerOut = function(){
		this.stateExt = ''
		this.state = this.isSelected()?this.states.selected:this.states.default
	}

	proto.deselect = function(){
		this.state = this.states.default
	}

	proto.onDraw = function(){
		this.beginBg(this)
		if(this.icon){
			this.drawIcon({
				text:this.lookupIcon[this.icon]
			})
		}
		if(this.text){
			this.drawText({
				text:this.text
			})
		}
		if(this.canClose){
			this.drawButton({
				icon:'close'
			}).index = this.index
		}
		this.endBg()
	}

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLESTAMP(overload)
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})