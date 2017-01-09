let colors = module.style.colors
let fonts = module.style.fonts
module.exports = require('base/stamp').extend({
	props:{
		selected:false,
		lineL:true,
		lineR:true,
		dx:0,
		text:'',
		icon:'',
		index:0
	},
	states:{
		default:{
			duration:0.,
			to:{
				Text:{
					dx:null,
				},
				Icon:{
					dx:null,
				},
				Bg:{
					dx:null,
					color:colors.bgTop,
					selected:0
				}
			}
		},
		sliding:{
			duration:0.3,
			time:{fn:'ease',begin:0,end:10},
			from:{
				Text:{
					dx:null,
				},
				Icon:{
					dx:null,
				},
				Bg:{
					dx:null,
					color:colors.bgTop,
					selected:0
				}
			},
			to:{
				Text:{
					dx:null,
				},
				Icon:{
					dx:null,
				},
				Bg:{
					dx:null,
					color:colors.bgTop,
					selected:0
				}
			}
		},
		selected:{
			duration:0.3,
			time:{fn:'ease',begin:0,end:10},
			to:{
				Text:{
					dx:0,
				},
				Icon:{
					dx:0,
				},
				Bg:{
					color:colors.bgNormal,
					dx:0,
					selected:1
				}
			}
		},
		selectedDrag:{
			duration:0.,
			to:{
				Text:{
					dx:null,
				},
				Icon:{
					dx:null,
				},
				Bg:{
					color:colors.bgNormal,
					dx:null,
					selected:1
				}
			}
		}					
	},
	tools:{
		Bg:require('shaders/quad').extend({
			borderRadius:4,
			color:colors.bgNormal,
			padding:[10,12,6,12],
			selected:0.,
			lineL:1.,
			lineR:1,
			pixel(){$
				this.viewport()
				if(this.selected>.5){
					this.box(6., 5., this.w-12., this.h, this.borderRadius)
					this.rect(-10., 20., this.w+20., this.h)
					this.box(-8., -10.5, 14., this.h+10., this.borderRadius)
					this.subtract()
					this.box(this.w-6., -10.5, 15., this.h+10., this.borderRadius)
					this.subtract()
					this.fill(this.color)
					if(this.result.a<0.5) discard;
				}
				else{
					this.clear(this.color)
					if(this.lineL>.5){
						this.box(0, 0., 3., this.h+2,1.)
					}
					if(this.lineR>.5){
						this.box(this.w-3., 0., 3., this.h+2,1.)
					}
					this.fill('#4')
				}
				return this.result
			}
		}),
		Text:require('shaders/text').extend({
			font:fonts.regular
		}),
		Icon:require('shaders/icon').extend({
			color:'#7'
		})
	},
	onFingerDown(e){
		this.view.onTabSelect(this)
		this.xStart = e.x
		this.yStart = e.y
		this.start = this.toLocal(e)
		this.dxStart = this.dx
	},
	onFingerUp(){
		this.from_dx = undefined
		this.dx = 0
		this.xStart = -1
		this.redraw()
	},
	onFingerMove(e){
		this.dx = this.dxStart + (e.x - this.xStart)
		this.setState('selectedDrag', false, {dx:this.dx})
		this.view.onTabSlide(this, e.y - this.yStart, e)
	},
	onDraw(){
		if(this.from_dx) this.state = 'sliding'
		if(this.xStart>=0) this.state = 'selectedDrag'
		this.beginBg({from_dx:this.from_dx, dx:this.dx, lineL:this.lineL,lineR:this.lineR})
		if(this.text){
			this.drawText({from_dx:this.from_dx, dx:this.dx, text:this.text})
		}
		if(this.icon){
			this.drawIcon({from_dx:this.from_dx, dx:this.dx, text:this.lookupIcon[this.icon]})
		}
		this.endBg()
	}
})