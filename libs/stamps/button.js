module.exports = class Button extends require('base/stamp'){
	
	prototype() {
		let colors = module.style.colors

		this.props = {
			text: '',
			icon: '',
			id:'',
			index: 0,
			onClick: undefined,
			margin:[2,0,2,0],
			onClickStamp: undefined,
			debug: 0
		}

		this.states = { // animation!
			default:{
				to:{
					Bg:{
						color:colors.bgTop,
						glowSize:0,
						borderColor:colors.textLo
					},
					Icon:{
						color:colors.textMed
					}
				},
				duration:0.8,
				interrupt:false
			},
			over:{
				to:{
					Bg:{
						color:colors.bgTop,
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

		this.wrapped = false

		this.tools = {
			Bg: require('shaders/quad').extend({
				padding:[6,14,6,14],
				borderRadius:6.5,
				borderWidth:1,
				borderColor:colors.textLo,
				color:colors.bgTop,
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
				color:colors.textMed,
				fontSize:10,
				font:require('fonts/ubuntu_monospace_256.font')
			}),
			Icon: require('shaders/icon').extend({
				color:colors.textMed,
				fontSize:10,
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
		if(e.samePick && this.onClick) this.onClick.call(this.view, e)
	}

	onDraw() {
		this.beginBg(this.wrap())
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