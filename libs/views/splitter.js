module.exports=class Splitter extends require('base/view'){
	prototype(){
		this.name = 'Splitter'
		this.props = {
			vertical:true,
			pos:.5,
			mode:0,
			lockedWidth:1,
			unlockedWidth:3,
			isLocked:false,
			color:'red'
		}
		this.padDrawing = true,
		this.padding = [0,0,0,0],
		this.safety1 = 20,
		this.safety2 = 24,
		this.refSettings = 0,
		this.doAnim = true,
		this.tools = {
			Split:require('tools/split').extend({
			})
		}
	}

	toggleSplitterSettings(show){
		this.refSettings = show?1:0
		this.doAnim = true
		this.redraw()
	}

	onMode(e){
		var pos
		if(this.$wInside === undefined || this.$hInside === undefined) return
		if(e.old === 1){
			pos = this.pos
		}
		else if(e.old === 2){
			pos  =  (this.vertical?this.$wInside:this.$hInside) - this.pos
		}
		else{
			pos  =  this.pos * (this.vertical?this.$wInside:this.$hInside)
		}
		this.onSplitMove({xSplit:pos, ySplit:pos, fromMode:1})
	}

	onSplitMove(e){
		//if(this.isLocked) return
		var size = this.unlockedWidth
		if(this.vertical){
			if(this.mode == 1){ // pixel left align
				this.pos = clamp(e.xSplit,this.safety1, this.$wInside - this.safety2)
			}
			else if(this.mode == 2){ // pixel right align
				this.pos = this.$wInside - clamp(e.xSplit,this.safety1, this.$wInside - this.safety2)
			}
			else{ // horizontal percentage
				this.pos = clamp(e.xSplit / this.$wInside, this.safety1 / this.$wInside,1 - this.safety2 / this.$wInside)
			}
		}
		else{
			if(this.mode == 1){ // pixel top
				this.pos = clamp(e.ySplit,this.safety1, this.$hInside - this.safety2)
			}
			else if(this.mode == 2){ // pixel bottom
				this.pos = this.$hInside - clamp(e.ySplit,this.safety1, this.$hInside - this.safety2) 
			}
			else{ // vertical percentage
				this.pos = clamp(e.ySplit / this.$hInside, this.safety1 / this.$hInside,1 - this.safety2 / this.$hInside)
			}
		}
		if(!e.fromMode && this.refSettings && this.mode){
			this.mode = this.modeFromPos()
		}
		this.relayout()
	}

	modeFromPos(){
		var pos = this.getPos()
		if(this.vertical){
			if(pos<this.$hInside*.5) return 1
			return 2
		}
		if(pos<this.$wInside*.5) return 1
		return 2
	}

	getPos(){
		if(this.vertical){
			return this.mode==1?this.pos:this.mode==2?this.$wInside-this.pos:this.pos * this.$wInside
		}
		else{
			return this.mode==1?this.pos:this.mode==2?this.$hInside-this.pos:this.pos * this.$hInside
		}
	}

	getSize(){
		return this.isLocked?this.lockedWidth:this.unlockedWidth		
	}

	onSplitButtonClick(){
		// lets check our state.
		if(this.buttonClick.toggle&1){ // percentage
			this.mode = 0
		}
		else{
			this.mode = this.modeFromPos()
		}
		if(this.buttonClick.toggle&2){
			this.isLocked = 1
		}
		else{
			this.isLocked = 0
		}
	}

	onOverlay(){
		var pos = this.getPos()
		var size = this.getSize()
		this.buttonClick = {toggle:(this.isLocked?2:0)|(this.mode?0:1)}

		if(this.vertical){
			this.drawSplit({
				vertical:1.,
				state:(this.refSettings?'settings':'default')+(this.doAnim?'':'_noAnim'),
				offset:this.padding[3],
				x:''+pos-.5*size,
				y:'0',
				w:size,
				h:'100%',
				cursor: 'ew-resize',
				buttonClick:this.buttonClick
			})
		}
		else{
			this.drawSplit({
				vertical:0.,
				state:(this.refSettings?'settings':'default')+(this.doAnim?'':'_noAnim'),
				offset:this.padding[3],
				x:'0',
				y:''+pos-.5*size,
				w:'100%',
				h:size,
				cursor: 'ns-resize',
				buttonClick:this.buttonClick
			})
		}
		this.doAnim = false
	}

	onAfterCompose(){
		var c0 = this.children[0]
		var c1 = this.children[1]
		if(this.vertical){
			c0.x = '0'
			c0.y = '0'
			c0.w = 'this.parent.getPos()-0.5*this.parent.getSize()'
			c0.h = '100%'
			c1.x = 'this.parent.getPos()+0.5*this.parent.getSize()'
			c1.y = '0'
			c1.w = '100%-this.parent.getPos()-0.5*this.parent.getSize()'
			c1.h = '100%'
		}
		else{
			c0.x = '0'
			c0.y = '0'
			c0.w = '100%'
			c0.h = 'this.parent.getPos()-0.5*this.parent.getSize()'
			c1.x = '0'
			c1.y = 'this.parent.getPos()+.5*this.parent.getSize()'
			c1.w = '100%'
			c1.h = '100%-this.parent.getPos()-.5*this.parent.getSize()'
		}
	}
}