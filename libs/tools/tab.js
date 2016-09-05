module.exports = require('base/stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'',
		icon:'',
		index:0,
		h:26,
		canDrag:false,
		canClose:false
	}

	proto.inPlace = 0	
	proto.tools = {
		Text:require('tools/text').extend({
			font:require('fonts/ubuntu_monospace_256.font'),
			shadowOffset:[1,1],
			fontSize:11,
			shadowColor:'#0005',
			shadowBlur:1,
			duration:0.2,
			margin:[0,4,0,0],
			color:'#9'
		}),
		Icon:require('tools/icon').extend({
			shadowOffset:[1,1],
			shadowColor:'#0005',
			shadowBlur:1,
			ease:[0,10,0,0],
			color:'#a',
			margin:[0,4,0,0]
		}),
		Bg:require('tools/rect').extend({
			borderRadius:[1,1,6,6],
			padding:[6,1,3,4],
			color:'#3'
		})
	}

	proto.states = {
		default:{
			Bg:{
				
			},
			Text:{
				
			}
		},
		slide:{
			tween:2,
			ease:[0,10,0,0],
			duration:0.3,
			Bg:{
				color:'#3'
			},
			Text:{
				color:'#9'
			}
		},
		defaultOver:{
			Bg:{
				color:'#4'
			},
			Text:{
				color:'#c'
			}
		},
		selected:{
			Bg:{
				color:'#5'
			},
			Text:{
				color:'#e'
			}
		},
		selectedSlide:{
			tween:2,
			ease:[0,10,0,0],
			duration:0.3,
			Bg:{
				color:'#8'
			},
			Text:{
				color:'#f'
			}
		},		
		selectedOver:{
			Bg:{
				color:'#8'
			},
			Text:{
				color:'#f'
			}
		}
	}

	proto.onFingerDown = function(e){
		if(this.onTabSelected) this.onTabSelected(e)
		this.state = this.states.selectedOver
		this.stateExt = 'Over'
		// lets start dragging it
	}

	proto.onFingerMove = function(e){
		// we have to choose an injection point
		if(this.onTabSlide) this.onTabSlide(e)
		//this.x = e.xView
	}

	proto.onFingerUp = function(e){
		if(this.onTabReleased) this.onTabReleased()
		//this.x = undefined
		this.stateExt = ''
		this.state = this.states.selected
	}

	proto.onFingerOver = function(){
		if(this.state === this.states.selected || this.state === this.states.selectedOver){
			this.state = this.states.selectedOver
		}
		else this.state = this.states.defaultOver
		this.stateExt = 'Over'
	}

	proto.onFingerOut = function(){
		this.stateExt = ''
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
		this.endBg()
	}

	proto.stampGeom = function(){
		return this.$readOffsetBg(this.$propsLenBg)
	}

	proto.toolMacros = {
		order:function(overload){
			this.$STYLESTAMP(overload)
			$stamp.orderBg()
			$stamp.orderIcon()
			$stamp.orderText()
		},
		draw:function(overload){
			this.$STYLESTAMP(overload)
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})