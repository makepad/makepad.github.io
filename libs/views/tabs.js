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
					line:true,
					dx:0,
					text:'tab',
					index:0
				},
				tools:{
					Bg:require('shaders/quad').extend({
						borderRadius:4,
						color:'#4',
						padding:[10,12,6,12],
						selected:0.,
						line:1.,
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
								this.clear('#3')
								if(this.line>.5){
									this.box(0, 0., 2., this.h+2,1.)
									this.box(this.w-2., 0., 2., this.h+2,1.)
									this.fill('#7')
								}
							}
							return this.result
						}
					}),
					Text:require('shaders/text').extend({
					})
				},
				onFingerDown(e){
					this.view.onTabSelect(this)
					this.drag = true
					this.xStart = e.x
					this.dxStart = this.dx
				},
				onFingerUp(){
					this.drag = false
				},
				onFingerMove(e){
					this.dx = this.dxStart + (e.x - this.xStart)
					this.view.onTabSlide(this)
					// how do we detect if we are > halfway
					// the next tab?
					this.redraw()
				},
				onDraw(){
					this.beginBg({dx:this.dx, selected:this.selected,line:this.line})
					this.drawText({dx:this.dx, text:this.text})
					this.endBg()
				}
			}),
		}

		this.styles = {
		}
	}

	onTabSelect(tabStamp){
		this.selected = tabStamp.index
		this.redraw()
	}

	onTabSlide(tabStamp){ 
		var tabs = this.tabs
		if(tabStamp.dx > tabStamp.$w*0.5 && tabStamp.index < tabs.length - 1){
			let old = tabs.splice(tabStamp.index, 1)[0]
			tabs.splice(tabStamp.index+1,0,old)
			this.selected = tabStamp.index+1
		}
		else if(tabStamp.dx < -tabStamp.$w*0.5 && tabStamp.index > 0){
			let old = tabs.splice(tabStamp.index, 1)[0]
			tabs.splice(tabStamp.index-1,0,old)
			this.selected = tabStamp.index-1
		}
		this.redraw()
	}

	onDraw(){
		let sel = this.selected
		for(let tabs = this.tabs, i = 0 ; i < this.tabs.length; i++){
			let tab = tabs[i]
			this.drawTab({
				id:tab.tabName, // utilize some kind of unique id
				order:sel === i?1:0,
				selected:sel === i,
				line:sel !== i+1,
				text:tab.tabName,
				index:i
			})
			this.turtle.wx -=5
		}

		this.lineBreak()

		this.tabs[sel].draw(this,{w:'100%',h:'100%'})
	}
}