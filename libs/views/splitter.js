
module.exports=class Splitter extends require('base/view'){
	prototype(){
		let colors = module.style.colors
		
		this.name = 'Splitter'
		
		this.props = {
			barSize: 2,
			locked: false,
			vertical: true,
			safety: 10,
			position: 0.5
		}

		this.tools = {
			Split:require('base/view').extend({
				heavy:false,
				props:{
					vertical:0,
					focus:0,
				},
				states:{
					default:{
						duration:.3,
						time:{fn:'ease',begin:0,end:10},
						to:{
							Bar:{color:colors.bgNormal,glowColor:'#0000'},
							GripBg:{color:colors.bgNormal},
							Grip:{color:colors.textNormal},
						}
					},
					focus:{
						to:{
							Bar:{color:'#b',glowColor:'#30f'},
							GripBg:{color:'#7'},
							Grip:{color:'#4'},
						}
					},
					hover:{
						duration:.3,
						time:{fn:'ease',begin:0,end:10},
						to:{
							Bar:{color:'#c',glowColor:'#30f'},
							GripBg:{color:'#7'},
							Grip:{color:'#4'},
						}
					}
				},
				tools:{
					Bar:require('shaders/quad').extend({
						vertical:0,
						vertexStyle(){
							if(this.vertical<0.5){
								this.y -=4.
								this.h +=8.
							}
							else{
								this.x -=4.
								this.w +=8.
							}
						},
						pickAlpha:0.25,
						pixel(){
							this.viewport()
							if(this.vertical>0.5){
								this.rect(4.,0.,2.,this.h)
							}
							else{
								this.rect(0.,4.,this.w,2.)
							}
							this.fillKeep(this.color)
							this.blur = 4.
							return this.glow(this.glowColor, 2.,0.)
						},
						queue:false,
						glowColor:'#30f',
						color:'#7'
					}),
					GripBg:require('shaders/rounded').extend({
						color:'#7',
						queue:false,
					}),
					Lock:require('base/view').extend({
						heavy:false,
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
							this.parent.onLock(this.state==='locked')
						},
						onDraw(){
							this.beginBg({w:'100%',h:'100%'})
							this.drawLock({color:'#4',w:100,h:100})
							this.endBg()
						}
					}),
					Flip:require('base/view').extend({
						heavy:false,
						tools:{
							Bg:require('shaders/rounded').extend({
								color:'#7'
							}),
							Flip:require('shaders/rounded').extend({
								color:'#4',
							})
						},
						onFingerDown(){
							this.parent.onFlip()
						},
						onDraw(){
							this.beginBg({w:'100%',h:'100%'})
							this.drawFlip({color:'#4',align:[.5,.5],w:8,h:8,borderRadius:16})
							this.endBg()
						}
					}),
					Grip:require('shaders/quad').extend({
						vertical:0,
						color:'#4',
						dx:2,
						dy:2,
						pixel(){$
							this.viewport()
							if(this.vertical<0.5){
								this.rotate(0.5*PI,7.8,8.)
							}
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
					
					this.parent.onStartDrag()
				},
				onFingerMove(e){
					this.parent.onMoveDrag(this.vertical?e.xDown-e.x:e.yDown-e.y)						
				},
				onFingerOver(e){
					this.setState('hover')
				},
				onFingerOut(e){
					this.setState(this.focus?'focus':'default')
				},
				onFingerUp(){
					this.setState(this.focus?'focus':'default')
				},
				onDraw(){
					// the nub
					if(this.vertical){
						this.drawBar({x:'0',y:'0',w:'100%',h:'100%',vertical:1})
						this.beginGripBg({x:'(turtle._w-turtle.width)*-.5',y:'75%', w:20, h:20})
						this.drawGrip({color:'#4',vertical:1,w:'100%',h:'100%'})
						this.endGripBg()
						if(this.state === 'focus'){
							this.drawLock({id:1,state:this.parent.locked?'locked':'unlocked',x:'(turtle._w-turtle.width)*-.5',y:'25%', w:16, h:16})
							this.drawFlip({id:2,x:'(turtle._w-turtle.width)*-.5',y:'25%+16', w:16, h:16})
						}
					}
					else{
						this.drawBar({x:'0',y:'0',w:'100%',h:'100%',vertical:0})
						this.beginGripBg({y:'(turtle._h-turtle.height)*-.5',x:'75%', w:20, h:20})
						this.drawGrip({color:'#4',vertical:0,w:'100%',h:'100%'})
						this.endGripBg()
						if(this.state === 'focus'){
							this.drawLock({id:1,state:this.parent.locked?'locked':'unlocked',y:'(turtle._h-turtle.height)*-.5',x:'25%', w:16, h:16})
							this.drawFlip({id:2,y:'(turtle._h-turtle.height)*-.5',x:'25%+16', w:16, h:16})
						}
					}
				}
			})
		}
	}
	
	setCoord(v){
		if(this.vertical){
			if(this.locked){
				if(v > 0.5*this.$splitWidth) this.position = clamp(v -  this.$splitWidth , -this.$splitWidth, -this.safety)
				else this.position = clamp(v, this.safety, this.$splitWidth)
			}
			else{
				this.position = clamp( v, this.safety, this.$splitWidth - this.safety) / this.$splitWidth
			}
		}
		else{
			if(this.locked){
				if(v > 0.5*this.$splitHeight) this.position =  clamp(v -  this.$splitHeight , -this.$splitHeight, -this.safety)
				else this.position = clamp(v, this.safety, this.$splitHeight - this.safety)
			}
			else this.position = clamp( v, this.safety, this.$splitHeight - this.safety) / this.$splitHeight
		}
	}

	getCoord(){
		if(this.vertical){
			if(this.locked) return this.position<0?this.$splitWidth + this.position:this.position
			return floor(this.$splitWidth * this.position)
		}
		else{
			if(this.locked) return this.position<0?this.$splitHeight + this.position:this.position
			return floor(this.$splitHeight * this.position)
		}
	}

	onFlip(){
		this.vertical = !this.vertical
		this.redraw()
	}
	
	onLock(locked){
		var v = this.getCoord()
		this.locked = locked
		this.setCoord(v)
	}

	onStartDrag(){
		this.setFocus()
		this.start = this.getCoord()
	}

	onMoveDrag(delta){
		this.setCoord(this.start - delta)
		this.redraw()
	}

	
	constructor(...args){
		super(...args)
		var panes = this.panes
		for(let i = 0; i < panes.length; i++){
			panes[i].parent = this
		}
	}

	onDraw(){
		this.$splitWidth = this.turtle.width
		this.$splitHeight = this.turtle.height
		let pos = this.getCoord()
		this.setCoord(pos)
		
		if(this.vertical){
			this.panes[0].draw(this, {
				order:1,
				down:0,
				w:pos - this.barSize*.5,
				h:'100%'
			})
			//console.log(this.panes[0].$todos[0].$vw)
			this.drawSplit({
				id:0,
				order:2,
				down:0,
				cursor:'ew-resize',
				focus:this.hasFocus,
				state:this.hasFocus?'focus':'default',
				vertical:1,
				w:this.barSize,
				h:'100%'
			})			
			this.panes[1].draw(this, {
				order:1,
				down:0,
				w:this.$splitWidth - pos - this.barSize*.5,
				h:'100%'
			})
		}
		else{
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
				focus:this.hasFocus,
				state:this.hasFocus?'focus':'default',
				cursor:'ns-resize',
				h:this.barSize,
				w:'100%'
			})			
			
			this.panes[1].draw(this, {
				order:1,
				down:1,
				h:this.$splitHeight - pos - this.barSize*.5,
				w:'100%'
			})
		}
	}
}