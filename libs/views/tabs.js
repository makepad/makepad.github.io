module.exports=class Tabs extends require('base/view'){
	prototype(){
		this.name = 'Tabs'
		this.xOverflow = 'none'
		this.yOverflow = 'none'
		this.tools = {
			Tab:require('base/stamp').extend({
				props:{
					selected:false,
					line:true,
					dx:0,
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
					this.drag = true
					this.xStart = e.x
					this.dxStart = this.dx
				},
				onFingerUp(){
					this.drag = false
				},
				onFingerMove(e){
					this.dx = this.dxStart + (e.x - this.xStart)
					this.redraw()
				},
				onDraw(){
					this.beginBg({dx:this.dx, selected:this.selected,line:this.line})
					this.drawText({dx:this.dx, text:'myfile.js'})
					this.endBg()
				}
			}),
		}

		this.styles = {
		}
	}

	onDraw(){
		this.drawTab({id:1,line:false,text:'HI'})
		this.turtle.wx -=15
		this.drawTab({group:1,id:3,selected:true,text:'HI'})
		this.turtle.wx -=15
		this.drawTab({id:2,text:'HI'})
		this.lineBreak()
		this.tabs[1].draw(this,{w:'100%',h:'100%'})
	}
}