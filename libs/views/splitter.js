module.exports=class Splitter extends require('base/view'){
	prototype(){
		this.name = 'Splitter'
		//this.padding=15
		this.barSize = 2
		this.locked = false
		this.pos = 0.25
		this.tools = {
			Split:require('base/stamp').extend({
				props:{
					vertical:0,
				},
				states:{
					default:{
						duration:.3,
						time:{fn:'ease',begin:0,end:10},
						to:{
							Bar:{color:'#2'},
							GripBg:{color:'#2'},
							Grip:{color:'#7'},
						}
					},
					focus:{
						to:{
							Bar:{color:'#7'},
							GripBg:{color:'#7'},
							Grip:{color:'#4'},
						}
					}
				},
				tools:{
					Bar:require('shaders/quad').extend({
						color:'#7'
					}),
					GripBg:require('shaders/rounded').extend({
						color:'#7'
					}),
					Lock:require('base/stamp').extend({
						states:{
							locked:{
								duration:0.3,
								time:{fn:'ease',begin:0,end:10},
								to:{
									Lock:{
										isOpen:0.
									}
								}
							},
							unlocked:{
								duration:0.3,
								time:{fn:'ease',begin:0,end:10},
								to:{
									Lock:{
										isOpen:1.
									}
								}
							}
						},
						tools:{
							Bg:require('shaders/rounded').extend({
								color:'#7'
							}),
							Lock:require('shaders/quad').extend({
								isOpen:0,
								color:'#4',
								pixel(){$
									this.viewport()
									var dx = (this.isOpen)*2.
									this.rect(3.5+dx*0.5,6.,9.,7.)
									this.shape+=.5
									this.fill(this.color)
									this.circle(8.-dx*1.5,6.5,3.5)
									this.circle(8.-dx*1.5,6.5,1.5)
									this.subtract()
									this.rect(2.,7.5,8.,6.)
									this.subtract()
									this.fill(this.color)
									return this.result
								}
							})
						},
						onFingerDown(){
							this.setState(this.state==='locked'?'unlocked':'locked')
							this.view.onLock(this.state==='locked')
						},
						onDraw(){
							this.beginBg({w:'100%',h:'100%'})
							this.drawLock({color:'#4',w:100,h:100})
							this.endBg()
						}
					}),
					Grip:require('shaders/quad').extend({
						isLock:0,
						color:'#4',
						pixel(){$
							this.viewport()
							this.moveTo(6.25,5)
							this.lineTo(6.25,11)
							this.moveTo(9.75,5)
							this.lineTo(9.75,11)
							this.stroke(this.color,1.)
							return this.result
						}
					})
				},	
				onFingerDown(){
					this.view.onStartDrag()
				},
				onFingerMove(e){
					this.view.onMoveDrag(this.vertical?e.xDown-e.xAbs:e.yDown-e.yAbs)						
				},
				onFingerUp(){

				},
				onDraw(){
					this.drawBar({x:'0',y:'0',w:'100%',h:'100%'})
					// the nub
					if(this.vertical){
						this.beginGripBg({x:'(turtle._w-turtle.width)*-.5',y:'75%', w:16, h:16})
						this.drawGrip({color:'#4',w:'100%',h:'100%'})
						this.endGripBg()
						if(this.state === 'focus'){
							console.log(this.view.locked?'locked':'unlocked')
							this.drawLock({id:1,state:this.view.locked?'locked':'unlocked',x:'(turtle._w-turtle.width)*-.5',y:'25%', w:16, h:16})
						}
					}
					else{
						var turtle = this.turtle
						this.beginGripBg({y:'(turtle._h-turtle.height)*-.5',x:'75%', w:16, h:16})
						this.drawGrip({color:'#4',vertical:1,w:'100%',h:'100%'})
						this.endGripBg()
						if(this.state === 'focus'){
							this.drawLock({id:1,state:this.view.locked?'locked':'unlocked',y:'(turtle._h-turtle.height)*-.5',x:'25%', w:16, h:16})
						}
					}
				}
			})
		}
	}
	
	onLock(locked){
		// switch between percentage and pixel mode
		// pixel mode needs to pick a side
	}

	onStartDrag(){
		this.setFocus()
		this.start = this.pos
	}

	onMoveDrag(delta){
		var total = this.vertical?this.$w:this.$h
		if(!this.locked){
			this.pos = (this.start*total-delta)/total
		}
		else{
			this.pos = start - delta
		}
		this.redraw()
	}

	onDraw(){
		this.vertical = true
		if(this.vertical){
			let pos = (!this.locked)?this.turtle.width*this.pos:this.pos<0?this.turtle.width - this.pos:this.pos

			this.panes[0].draw(this, {
				order:1,
				w:pos - this.barSize*.5,
				h:'100%'
			})

			this.drawSplit({
				id:0,
				order:2,
				cursor:'ew-resize',
				state:this.hasFocus?'focus':'default',
				vertical:1,
				w:this.barSize,
				h:'100%'
			})			
			
			this.panes[1].draw(this, {
				order:1,
				w:this.turtle.width - pos - this.barSize*.5,
				h:'100%'
			})
		}
		else{
			let pos = (!this.locked)?this.turtle.height*this.pos:this.pos<0?this.turtle.height - this.pos:this.pos
			this.panes[0].draw(this, {
				order:1,
				down:1,
				h:pos - this.barSize*.5,
				w:'100%'
			})

			this.drawSplit({
				id:0,
				down:1,
				order:2,
				vertical:0,
				state:this.hasFocus?'focus':'default',
				cursor:'ns-resize',
				h:barSize,
				w:'100%'
			})			
			
			this.panes[1].draw(this, {
				order:1,
				down:1,
				h:pos - this.barSize*.5,
				w:'100%'
			})
		}
	}
}