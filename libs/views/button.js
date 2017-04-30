module.exports = class Button extends require('base/view'){
	
	prototype() {
		let colors = module.style.colors
		
		this.props = {
			text   :'',
			heavy  :false,
			icon   :'',
			id     :'',
			index  :0,
			onClick:undefined,
			onTap  :undefined,
			toggle :false,
			toggled:false,
			//margin      :[2, 0, 2, 0],
			debug  :0
		}
		
		this.states = { // animation!
			default         :{
				to       :{
					Bg  :{
						color      :colors.bgNormal,
						glowSize   :0,
						borderColor:colors.textLo
					},
					Text:{
						color:colors.textMed
					},
					Icon:{
						color:colors.textMed
					}
				},
				duration :0.1,
				interrupt:false
			},
			toggled         :{
				to       :{
					Bg  :{
						color      :colors.textMed,
						glowSize   :0,
						borderColor:colors.textLo
					},
					Text:{
						color:'#0'
					},
					Icon:{
						color:'#0'
					}
				},
				duration :0.1,
				interrupt:false
			},
			over            :{
				to      :{
					Bg  :{
						color      :colors.bgTop,
						borderColor:'white',
						glowSize   :1
					},
					Icon:{
						color:'#c'
					}
				},
				duration:0.05
			},
			toggledOver$over:{
				to:{
					Bg:{
						color:colors.textMed,
					},
				}
			},
			down            :{
				0:{
					Bg  :{
						borderColor:'white',
						color      :'#f',
						glowSize   :1
					},
					Icon:{
						color:'#0'
					}
				},
				to      :{
					Bg  :{
						borderColor:'white',
						color      :'#6',
						glowSize   :1
					},
					Icon:{
						color:'#f'
					}
				},
				duration:0.2
			},
			toggledDown$down:{
				0:{
					Bg:{
						color:colors.textMed
					}
				},
				to:{
					Bg:{
						color:colors.textMed
					}
				}
			}
		}
		
		this.toggled = false
		
		this.tools = {
			Bg  :require('shaders/quad').extend({
				padding     :[6, 14, 6, 14],
				borderRadius:6.5,
				borderWidth :1,
				borderColor :colors.textLo,
				color       :colors.bgTop,
				glowColor   :'#30f',
				glowSize    :0,
				pixel       :function() {$
					this.viewport(this.mesh.xy * vec2(this.w, this.h))
					this.box(0., 0., this.w, this.h, this.borderRadius)
					this.shape += 3. //* sin(this.mesh.x + this.time)
					this.fillKeep(this.color)
					this.strokeKeep(this.borderColor, this.borderWidth, this.borderWidth)
					this.blur = 2.
					return this.glow(this.glowColor, this.glowSize * 4., this.borderWidth)
				}
			}),
			Text:require('shaders/text').extend({
				color   :colors.textMed,
				fontSize:10,
				font    :require('fonts/ubuntu_monospace_256.font')
			}),
			Icon:require('shaders/icon').extend({
				color   :colors.textMed,
				fontSize:10,
				//font:require('fonts/fontawesome_low.font'),
			})
		}
	}
	
	onFingerOver() {
		this.isOver = true
		this.setState(this.toggled?'toggledOver':'over')
	}
	
	onFingerOut() {
		this.isOver = false
		this.setState(this.toggled?'toggled':'default', true)
	}
	
	onFingerDown(e) {
		this.setFocus()
		//if(this.onTap) this.onTap.call(this.view, this, e)
		if(this.toggle) {
			this.toggled = !this.toggled
			if(this.onClick) {
				if(this.onClick(this, e) !== undefined) {
					this.redraw()
				}
			}
		}
		if(this.toggled) {
			this.setState('toggledDown')
		}
		else this.setState('down')
	}
	
	onFingerUp(e) {
		var state
		if(e.samePick) {
			if(this.toggled) state = 'toggledOver'
			else state = 'over'
			this.isOver = true
		}
		else {
			this.isOver = false
			if(this.toggled) state = 'toggled'
			else state = 'default'
		}
		this.setState(state, true)
		if(!this.toggle && e.samePick && this.onClick) {
			if(this.onClick(this, e) !== undefined) {
				this.redraw()
			}
		}
	}
	
	constructor(args) {
		super(args)
	}
	
	onStyle(args) {
		if(args) {
			if(this.toggle && 'toggled'  in  args) {
				if(args.toggled && !this.toggled) {
					if(this.isOver) this.state = 'toggledOver'
					else this.state = 'toggled'
				}
				else if(!args.toggled && this.toggled) {
					if(this.isOver) this.state = 'over'
					else this.state = 'default'
				}
				this.toggled = args.toggled
				this.queue = false
			}
			else this.queue = undefined
		}
	}
	
	onDraw() {
		
		this.beginBg(this.layout())
		
		if(this.icon) {
			this.drawIcon({
				text:this.lookupIcon[this.icon]
			})
			if(this.text) this.turtle.wx += 5
		}
		if(this.text) {
			this.drawText({
				text:this.text
			})
		}
		
		this.endBg()
	}
}