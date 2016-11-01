module.exports = class Tab extends require('base/stamp'){

	prototype(){
		this.props = {
			text:'',
			icon:'',
			id:'',
			index:0,
			h:26,
			canDrag:false,
			canClose:false
		}

		this.verbs = {
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

		this.inPlace = 0	
		this.tools = {
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
		
		this.styles = {
			base:{
				default:{
					Bg:{
						//borderRadius:[20,20,20,20]
					},
					Text:{},
					Icon:{}
				},
				slide$default:{
					$tween:2,
					$ease:[0,10,0,0],
					$duration:0.3,
				},
				default_over$default:{
					Bg:{
						color:'#4'
					},
					Text:{
						color:'#c'
					},
					Icon:{}
				},
				selected$default:{
					Bg:{
						color:'#5'
					},
					Text:{
						color:'#e'
					},
					Icon:{}
				},
				selected_slide$selected:{
					$tween:2,
					$ease:[0,10,0,0],
					$duration:0.3,
				},	
				selected_over$selected:{
					Bg:{
						color:'#c'
					},
					Text:{
						color:'#f'
					},
					Icon:{}
				},
				selected_slide_over$selected_over:{
					$tween:2,
					$ease:[0,10,0,0],
					$duration:0.3,
				},
				dragging$selected_over:{
				}
			}
		}
	}

	onFingerDown(e){
		if(this.onTabSelected) this.onTabSelected(e)
		this.state = this.states.dragging
		if(this.onTabSlide) this.onTabSlide(e)
	}

	onFingerMove(e){
		if(this.onTabSlide) this.onTabSlide(e)
	}

	onFingerUp(e){
		if(this.onTabReleased) this.onTabReleased()
		this.state = this.states.selected_over
	}

	onFingerOver(){
		if(this.state === this.states.selected || this.state === this.states.selected_over){
			this.state = this.states.selected_over
		}
		else this.state = this.states.default_over
	}

	onFingerOut(){
		this.stateExt = ''
		this.state = this.states.default
	}

	onDraw(){
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

	stampGeom(){
		return this.$readOffsetBg(this.$propsLenBg)
	}	
}