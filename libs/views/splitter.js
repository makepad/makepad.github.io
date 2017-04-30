
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

		this.states = {
			default:{
				duration:.3,
				time:{fn:'ease',begin:0,end:10},
				to:{
					Bar:{color:colors.bgNormal,glowColor:'#0000'},
				}
			},
			focus:{
				to:{
					Bar:{color:'#b',glowColor:'#0000'},
				}
			},
			over:{
				duration:.1,
				time:{fn:'ease',begin:0,end:10},
				to:{
					Bar:{color:'#9',glowColor:'#30f'},
				}
			},
			focusOver:{
				duration:.1,
				time:{fn:'ease',begin:0,end:10},
				to:{
					Bar:{color:'#b',glowColor:'#30f'},
				}
			}
		}

		this.tools = {
			Bar:require('shaders/quad').extend({
				vertical:0,
				order:2,
				vertexStyle(){
					if(this.vertical<0.5){
						//this.y -=4.
						this.h +=10.
					}
					else{
						//this.x -=4.
						this.w +=10.
					}
				},
				pickAlpha:0.,
				pixel(){
					this.viewport()
					if(this.vertical>0.5){
						this.rect(0.,0.,2.,this.h)
					}
					else{
						this.rect(0.,0.,this.w,2.)
					}
					this.fillKeep(this.color)
					this.blur = 4.
					return this.glow(this.glowColor, 2.,0.)
				},
				queue:false,
				glowColor:'#30f',
				color:'#7'
			}),
			Lock:require('base/view').extend({
				heavy:false,
				cursor:'default',
				order:3,
				w:16,
				h:16,
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
				cursor:'default',
				order:3,
				w:16,
				h:16,
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

	onFingerDown(){
		this.setFocus()
		this.start = this.getCoord()
	}

	onFingerMove(e){
		var delta = this.vertical?e.xDown-e.x:e.yDown-e.y
		this.setCoord(this.start - delta)
		this.redraw()
	}

	onFingerOver(e){
		this.over = true
		if(this.vertical){
			this.cursor = 'ew-resize'
		}
		else{
			this.cursor = 'ns-resize'
		}
		this.redraw()
	}

	onFingerOut(e){
		this.over = false
		this.cursor = undefined
		this.redraw()
	}

	onFingerUp(e){
		this.redraw()
	}
	
	onSetFocus(who){
		this.focus = true
		this.redraw()
	}

	onClearFocus(){
		this.focus = false
		this.redraw()
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

		if(this.over){
			if(this.focus) this.state = 'focusOver'
			else this.state = 'over'
		}
		else{
			if(this.focus) this.state = 'focus'
			else this.state = 'default'
		}
		
		if(this.vertical){
			this.panes[0].draw(this, {
				order:1,
				down:0,
				w:pos - this.barSize*.5,
				h:'100%'
			})

			this.drawBar({
				id:0,
				order:2,
				vertical:1,
				w:this.barSize,
				h:'100%'
			})

			// lets draw a few buttons
			if(this.focus){
				this.drawLock({
					order:3,
					state:this.locked?'locked':'unlocked',
					x:this.turtle.wx-8,
					y:'25%',
					id:'lock'
				})
				this.drawFlip({
					order:3,
					x:this.turtle.wx-8,
					y:'25%-16',
					id:'flip'
				})
			}

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
			this.drawBar({
				id:0,
				down:1,
				vertical:0,
				cursor:'ns-resize',
				h:this.barSize,
				w:'100%'
			})			
			
			if(this.focus){
				this.drawLock({
					y:this.turtle.wy-8,
					state:this.locked?'locked':'unlocked',
					x:'25%',
					id:'lock'
				})
				this.drawFlip({
					y:this.turtle.wy-8,
					x:'25%-16',
					id:'flip'
				})
			}

			this.panes[1].draw(this, {
				order:1,
				down:1,
				h:this.$splitHeight - pos - this.barSize*.5,
				w:'100%'
			})
		}
	}
}