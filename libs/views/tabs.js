module.exports=class Tabs extends require('base/view'){
	prototype(){
		this.name = 'Tabs'
		this.xOverflow = 'none'
		this.yOverflow = 'none'
		this.tools = {
			Tab:require('base/stamp').extend({
				props:{
					selected:false
				},
				tools:{
					Bg:require('shaders/quad').extend({
						borderRadius:4,
						color:'#4',
						padding:[10,12,6,12],
						selected:0.,
						pixel(){$
							this.viewport()
							if(this.selected>0.5){
								this.box(6., 5., this.w-12., this.h, this.borderRadius)
								this.rectangle(-10., 20., this.w+20., this.h)
								this.box(-8., -10.5, 14., this.h+10., this.borderRadius)
								this.subtract()
								this.box(this.w-6., -10.5, 15., this.h+10., this.borderRadius)
								this.subtract()
								return this.fill(this.color)
							}
						}
					}),
					Text:require('shaders/text').extend({
					})
				},
				onDraw(){
					this.beginBg({selected:this.selected})
					this.drawText({text:'myfile.js'})
					this.endBg()
				}
			}),
		}

		this.styles = {
		}
	}

	onDraw(){
		// ok we have a tab. lets have more tabs
		// with a line right

		this.drawTab({id:1,selected:1.,text:'HI'})
		this.lineBreak()

		this.tabs[0].draw(this,{w:'100%',h:'100%'})
	}
}