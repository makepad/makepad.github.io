module.exports=class Tabs extends require('base/view'){
	prototype(){
		this.name = 'Tabs'
		this.xOverflow = 'none'
		this.yOverflow = 'none'
		this.selected = 0
		this.tools = {
			Tab:require('base/stamp').extend({
				props:{
					selected:false,
					lineL:true,
					lineR:true,
					dx:0,
					text:'tab',
					index:0
				},
				states:{
					default:{
						duration:0.,
						to:{
							Text:{
								dx:null,
							},
							Bg:{
								dx:null,
								color:'#3',
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
							Bg:{
								dx:null,
								color:'#3',
								selected:0
							}
						},
						to:{
							Text:{
								dx:null,
							},
							Bg:{
								dx:null,
								color:'#3',
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
							Bg:{
								color:'#4',
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
							Bg:{
								color:'#4',
								dx:null,
								selected:1
							}
						}
					}					
				},
				tools:{
					Bg:require('shaders/quad').extend({
						borderRadius:4,
						color:'#4',
						padding:[10,12,6,12],
						selected:0.,
						lineL:1.,
						lineR:1,
						pixel(){$
							this.viewport()
							if(this.selected>.5){
								this.box(6., 5., this.w-12., this.h, this.borderRadius)
								this.rectangle(-10., 20., this.w+20., this.h)
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
									this.box(0, 0., 2., this.h+2,1.)
								}
								if(this.lineR>.5){
									this.box(this.w-2., 0., 2., this.h+2,1.)
								}
								this.fill('#7')
							}
							return this.result
						}
					}),
					Text:require('shaders/text').extend({
					})
				},
				onFingerDown(e){
					this.view.onTabSelect(this)
					this.xStart = e.x
					this.dxStart = this.dx
				},
				onFingerUp(){
					this.from_dx = undefined
					this.xStart = -1
					this.redraw()
				},
				onFingerMove(e){
					this.dx = this.dxStart + (e.x - this.xStart)
					this.setState('selectedDrag', false, {dx:this.dx})
					this.view.onTabSlide(this)
				},
				onDraw(){
					if(this.from_dx) this.state = 'sliding'
					if(this.xStart>=0) this.state = 'selectedDrag'
					this.beginBg({from_dx:this.from_dx,dx:this.dx,lineL:this.lineL,lineR:this.lineR})
					this.drawText({from_dx:this.from_dx,dx:this.dx, text:this.text})
					this.endBg()
				}
			}),
		}

		this.styles = {
		}
	}

	onTabSelect(tabStamp){
		this.tabs[this.selected].stamp.dx = 0
		this.selected = tabStamp.index
		this.redraw()
	}

	onTabSlide(tabStamp){ 
		var tabs = this.tabs
		for(let i = 0; i <tabs.length;i++){
			tabs[i].stamp.from_dx = 0
		}
		var index = tabStamp.index
		if(tabStamp.dx > tabStamp.$w*0.5 && index < tabs.length - 1){
			let old = tabs.splice(index, 1)[0]
			let prev = tabs[index].stamp
			let dx = old.stamp.$x - prev.$x
			old.stamp.dx += dx
			prev.from_dx = -dx
			tabs.splice(tabStamp.index+1,0,old)
			this.selected = index+1
			this.redraw()
		}
		else if(tabStamp.dx < -tabStamp.$w*0.5 && index > 0){
			let old = tabs.splice(index, 1)[0]
			let prev = tabs[index-1].stamp
			let dx = old.stamp.$x - prev.$x
			old.stamp.dx += dx
			prev.from_dx = -dx
			tabs.splice(index-1,0,old)
			this.selected = index-1
			this.redraw()
		}
	}

	onDraw(){
		let sel = this.selected
		for(let tabs = this.tabs, i = 0 ; i < this.tabs.length; i++){
			let tab = tabs[i]
			tab.stamp = this.drawTab({
				id:tab.tabName, // utilize some kind of unique id
				order:sel === i?1:0,
				state:sel === i?'selected':'default',
				lineL:sel !== i-1,
				lineR:sel !== i+1,
				text:tab.tabName,
				index:i
			})
			this.turtle.wx -=5
		}

		this.lineBreak()
		this.tabs[sel].draw(this,{w:'100%',h:'100%'})
	}
}