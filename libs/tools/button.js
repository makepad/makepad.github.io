module.exports = require('base/stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'',
		icon:'',
		index:0,
		debug:0
	}

	proto.inPlace = 1
	
	proto.tools = {
		Bg: require('tools/rect').extend({
			color:'gray',
			padding:[10,10,10,10]
		}),
		Text: require('tools/text').extend({
			font:require('fonts/ubuntu_monospace_256.font')
		}),
		Icon: require('tools/icon').extend({
		})
	}

	proto.states = {
		default:{},
		defaultOver:{Bg:{color:'#f77'}},
		clicked:{Bg:{color:'#f77'}},
		clickedOver:{Bg:{color:'red'}}
	}
	
	proto.setClicked = function(clk){
		if(clk) this.state = this.states.clicked
		else this.state = this.states.default
	}

	proto.isClicked = function(){
		return this.state === this.states.clicked || this.state === this.states.clickedOver
	}

	proto.onFingerDown = function(e){
		if(this.click && (this.click.radio !== undefined || this.click.flags !== undefined)){
			// lets check if there are other stamps in the radio group
			if(this.click.radio !== undefined){ // its a radio group
				this.state = this.states.clickedOver
				for(var i = 0; this.click[i]; i++){
					var other = this.click[i]
					if(other !== this){
						other.state = other.states.default
					}
				}
				this.click.radio = this.index
			}
			else if(this.click.flags !== undefined){ // bitmask group
				if(this.isClicked()){
					this.state = this.states.defaultOver
					this.click.flags &= ~(1 << this.index)
				}
				else{
					this.state = this.states.clickedOver
					this.click.flags |= 1 << this.index
				}
			}
			if(this.onClick) this.onClick(e)
		}
		else{
			 this.state = this.states.clickedOver
		}
	}

	proto.onFingerUp = function(e){
		if(this.click&& (this.click.radio !== undefined || this.click.flags !== undefined)){
			if(this.isClicked()){
				if(e.samePick) this.state = this.states.clickedOver
				else this.state = this.states.clicked
			}
			else{
				if(e.samePick) this.state = this.states.clickedOver
				else this.state = this.states.clicked				
				this.state = this.states.defaultOver
			}
		}
		else{
			if(e.samePick){
				if(e.touch){
					this.state = this.states.default
				}
				else{
					this.state = this.states.defaultOver
				}
				if(this.onClick) this.onClick(e)
			}
			else{
				this.state = this.states.default
			}
		}
	}

	proto.onFingerOver = function(){
		this.state = this.isClicked()?this.states.clickedOver:this.states.defaultOver
	}

	proto.onFingerOut = function(){
		this.state = this.isClicked()?this.states.clicked:this.states.default
	}

	proto.onDraw = function(){
		//console.log(this.turtle.dump())
		this.beginBg(this)
		if(this.icon){
			if(this.marked)console.log(this.icon)

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

	proto.toolMacros = {
		draw:function(overload, click){
			this.$STYLESTAMP(overload)
			// see if we need to set the state to clicked
			if(click){
				if(click.radio !== undefined && click.radio === overload.index ||
				   click.flags !== undefined && click.flags&(1<<overload.index)){
					$stamp._state = $stamp._states.clicked
				}
				else{
					$stamp._state = $stamp._states.default
				}
				if(click.radio !== undefined){
					click[overload.index] = $stamp
				}
			}
			$stamp.click = click
			if(overload.icon === 'trash') $stamp.marked = 1
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})