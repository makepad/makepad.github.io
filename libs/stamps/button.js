module.exports = class Button extends require('base/stamp'){
	
	baseStyle(style){
		var c = style.colors
		style.to = {
			Text:{
				color:c.textMed
			},
			Icon:{
				color:c.textMed
			},
			Bg:{
				padding:[5,15,5,15],
				borderRadius:6,
				borderWidth:1,
				borderColor:c.textLo,
				color:c.bgTop
			},
			states:{ // animation!
				default:{
					time:{fn:'ease', begin:10, end:10},
					to:{
						Bg:{
							dx:{value:0, time:{fn:'bounce', dampen:0.3}},
							color:'blue'
						}
					},
					duration:0.3
				},
				over:{
					to:{
						Bg:{
							dx:{value:10, time:{fn:'bounce', dampen:0.9}},
							color:'red'
						}
					},
					duration:0.6
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
					return this.stroke(this.borderColor, this.borderWidth)
				}
			}),
			Text: require('shaders/text').extend({
				font:require('fonts/ubuntu_monospace_256.font')
			}),
			Icon: require('shaders/icon').extend({
				font:require('fonts/fontawesome_low.font'),
			})
		}
	}

	onFingerOver(){
		this.state = 'over'
	}

	onFingerOut(){
		this.state = 'default'
	}

	onDraw() {
		this.beginBg({
			state:'default',
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