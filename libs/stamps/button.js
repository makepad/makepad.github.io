module.exports = class Button extends require('base/stamp'){
	
	defaultStyle(style){
		var c = style.colors
		style.to = {
			styles:{
				base:{
					default: {
						//margin:[5,5,5,5],
						Icon:{
							color:c.textMed
						},
						Bg:{
							padding:[5,15,5,15],
							borderRadius:6,
							borderWidth:1,
							borderColor:c.textLo,
							color:c.bgTop
						}
					},
					clicked$default:{},
					defaultOver$default: {Bg: {color: c.accentNormal}},
					clickedOver$default: {Bg: {color: c.accentDown}}
				}
			}
		}
	}

	prototype() {
		this.props = {
			text: '',
			icon: '',
			id:'',
			index: 0,
			onClick: undefined,
			onClickStamp: undefined,
			debug: 0
		}
		
		this.inPlace = 1
		
		this.tools = {
			Bg: require('shaders/quad').extend({
				borderRadius:4.,
				borderWidth:1.,
				borderColor:'red',
				glowColor:'purple',
				pixel(){$
					this.viewport(this.mesh.xy * vec2(this.w, this.h))	

					this.box(0., 0., this.w, this.h, this.borderRadius)
					this.shape += 3.
					this.fillKeep(this.color)
					return this.stroke(this.borderColor,this.borderWidth)
				}
				//color: 'gray',
				//padding: [10, 10, 10, 10]
			}),
			Text: require('shaders/text').extend({
				//font: require('fonts/ubuntu_monospace_256.font')
			}),
			Icon: require('shaders/icon').extend({
			})
		}

		this.verbs = {
			draw: function(overload, click) {
				this.$STYLESTAMP(overload)
				// see if we need to set the state to clicked
				if(click) {
					if(click.radio !== undefined && click.radio === overload.index || 
						click.toggle !== undefined && click.toggle & (1 << overload.index)) {
						$stamp._state = $stamp.states.clicked
					}
					else {
						$stamp._state = $stamp.states.default
					}
					if(click.radio !== undefined) {
						click[overload.index] = $stamp
					}
				}
				$stamp.click = click
				if(overload.icon === 'trash') $stamp.marked = 1
				$stamp.$redrawStamp()
				return $stamp
			}
		}
	}
	
	setClicked(clk) {
		if(clk) this.state = this.states.clicked
		else this.state = this.states.default
	}
	
	isClicked() {
		return this.state === this.states.clicked || this.state === this.states.clickedOver
	}
	
	onFingerDown(e) {
		if(this.onDownStamp) this.onDownStamp(e)
		if(this.onDown) this.onDown.call(this.view, e)
		if(this.click && (this.click.radio !== undefined || this.click.toggle !== undefined)) {
			// lets check if there are other stamps in the radio group
			if(this.click.radio !== undefined) { // its a radio group
				this.state = this.states.clickedOver
				for(let i = 0; this.click[i]; i++) {
					var other = this.click[i]
					if(other !== this) {
						other.state = other.states.default
					}
				}
				this.click.radio = this.index
			}
			else if(this.click.toggle !== undefined) { // bitmask group
				if(this.isClicked()) {
					this.state = this.states.defaultOver
					this.click.toggle &= ~(1 << this.index)
				}
				else {
					this.state = this.states.clickedOver
					this.click.toggle |= 1 << this.index
				}
			}
			if(this.onClickStamp) this.onClickStamp(e)
			if(this.onClick) this.onClick.call(this.view, e)
		}
		else {
			this.state = this.states.clickedOver
		}
	}
	
	onFingerUp(e) {
		if(this.onUpStamp) this.onUpStamp(e)
		if(this.onUp) this.onUp.call(this.view, e)
		if(this.click && (this.click.radio !== undefined || this.click.toggle !== undefined)) {
			if(this.isClicked()) {
				if(e.samePick) this.state = this.states.clickedOver
				else this.state = this.states.clicked
			}
			else {
				if(e.samePick) this.state = this.states.clickedOver
				else this.state = this.states.clicked
				this.state = this.states.defaultOver
			}
		}
		else {
			if(e.samePick) {
				if(e.touch) {
					this.state = this.states.default
				}
				else {
					this.state = this.states.defaultOver
				}
				if(this.onClickStamp) this.onClickStamp(e)
				if(this.onClick) this.onClick.call(this.view, e)
			}
			else {
				this.state = this.states.default
			}
		}
	}
	
	onFingerOver() {
		this.state = this.isClicked()? this.states.clickedOver: this.states.defaultOver
	}
	
	onFingerOut() {
		this.state = this.isClicked()? this.states.clicked: this.states.default
	}
	
	onDraw() {
		this.beginBg({
			w:'100%',
			h:'100%'
		})
		if(this.icon) {
			this.drawIcon({
				text: this.lookupIcon[this.icon]
			})
		}
		if(this.text) {
			this.drawText({
				text: this.text
			})
		}
		this.endBg()
	}
}