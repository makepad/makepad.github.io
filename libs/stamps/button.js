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
				borderRadius:6.4,
				borderWidth:1,
				borderColor:c.textLo,
				color:c.bgTop,
			},
			states:{ // animation!
				default:{
					to:{
						Bg:{
							color:c.bgTop,
							glowSize:0,
							borderColor:c.textLo
						},
						Icon:{
							color:c.textMed
						}
					},
					duration:0.8,
					interrupt:false
				},
				over:{
					to:{
						Bg:{
							color:c.bgTop,
							borderColor:'white',
							glowSize:1
						},
						Icon:{
							color:'#c'
						}
					},
					duration:0.05
				},
				down:{
					0:{
						Bg:{
							borderColor:'white',
							color:'#f',
							glowSize:1
						},
						Icon:{
							color:'#0'
						}
					},
					to:{
						Bg:{
							borderColor:'white',
							color:'#6',
							glowSize:1
						},
						Icon:{
							color:'#f'
						}
					},
					duration:0.2
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
				
		this.tools = {
			Bg: require('shaders/quad').extend({
				borderRadius:4.,
				borderWidth:1.,
				borderColor:'red',
				glowColor:'#30f',
				glowSize:0,
				pixel(){$
					this.viewport(this.mesh.xy * vec2(this.w, this.h))
					this.box(0., 0., this.w, this.h, this.borderRadius)
					this.shape += 3.
					this.fillKeep(this.color)
					this.strokeKeep(this.borderColor, this.borderWidth, this.borderWidth)
					this.blur = 2.
					return this.glow(this.glowColor, this.glowSize*4.,this.borderWidth)
				}
			}),
			Text: require('shaders/text').extend({
				font:require('fonts/ubuntu_monospace_256.font')
			}),
			Icon: require('shaders/icon').extend({
				//font:require('fonts/fontawesome_low.font'),
			})
		}
	}

	onFingerOver(){
		this.setState('over')
	}

	onFingerOut(){
		this.setState('default', true)
	}
	
	onFingerDown(){
		this.setState('down')
	}

	onFingerUp(e){
		this.setState(e.samePick?'over':'default',true)
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