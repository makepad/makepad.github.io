module.exports=require('base/view').extend({
	name:'Splitter',
	props:{
		vertical:true,
		pos:NaN,
		mode:NaN,
		locked:1,
		unlocked:10,
		isLocked:true,
		color:'red'
	},
	padDrawing:true,
	padding:[0,0,0,0],
	safety:2,
	tools:{
		Split:require('tools/split').extend({
		})
	},
	onMode:function(e){
		var pos
		if(isNaN(e.old) || e.old === this.mode) return
		if(e.old === 1){
			pos = this.pos
		}
		else if(e.old === 2){
			pos  =  (this.vertical?this.$wInside:this.$hInside) - this.pos
		}
		else{
			pos  =  this.pos * (this.vertical?this.$wInside:this.$hInside)
		}
		console.log(pos, this.$wInside)
		this.onSplitMove({xSplit:pos, ySplit:pos})
	},
	onSplitMove:function(e){
		//if(this.isLocked) return
		var size = this.unlocked
		if(this.vertical){
			if(this.mode == 1){ // pixel left align
				this.pos = clamp(e.xSplit,size, this.$wInside - this.safety*size)
			}
			else if(this.mode == 2){ // pixel right align
				this.pos = this.$wInside - clamp(e.xSplit,size, this.$wInside - this.safety*size)
			}
			else{ // horizontal percentage
				this.pos = clamp(e.xSplit / this.$wInside, size / this.$wInside,1 - this.safety*size / this.$wInside)
			}
		}
		else{
			if(this.mode == 1){ // pixel top
				this.pos = clamp(e.ySplit,size, this.$hInside - this.safety*size)
			}
			else if(this.mode == 2){ // pixel bottom
				this.pos = this.$hInside - clamp(e.ySplit,size, this.$hInside - this.safety*size) 
			}
			else{ // vertical percentage
				this.pos = clamp(e.ySplit / this.$hInside, size / this.$hInside,1 - this.safety*size / this.$hInside)
			}
		}
	},
	onDraw:function(){
		if(this.vertical){
			var pos = this.mode==1?this.pos:this.mode==2?this.$wInside-this.pos:this.pos * this.$wInside
			this.drawSplit({
				offset:this.padding[3],
				x:''+pos,
				y:'0',
				w:this.isLocked?this.locked:this.unlocked,
				h:'100%',//this.$h
				cursor: 'ew-resize'
			})
		}
		else{
			var pos = this.mode==1?this.pos:this.mode==2?this.$hInside-this.pos:this.pos * this.$hInside
			this.drawSplit({
				offset:this.padding[0],
				x:'0',
				y:''+pos,
				w:'100%',
				h:this.isLocked?this.locked:this.unlocked,
				cursor: 'ns-resize'
			})
		}
	},
	onAfterCompose:function(){
		var c0 = this.children[0]
		var c1 = this.children[1]
		if(this.vertical){
			c0.x = '0'
			c0.y = '0'
			c0.w = '(this.parent.mode==1?this.parent.pos:this.parent.mode==2?this.parent.$wInside-this.parent.pos:this.parent.pos*this.parent.$wInside)'
			c0.h = '100%'
			c1.x = '(this.parent.mode==1?this.parent.pos:this.parent.mode==2?this.parent.$wInside-this.parent.pos:this.parent.pos*this.parent.$wInside)+(this.parent.isLocked?this.parent.locked:this.parent.unlocked)'
			c1.y = '0'
			c1.w = '100%-(this.parent.mode==1?this.parent.pos:this.parent.mode==2?this.parent.$wInside-this.parent.pos:this.parent.pos*this.parent.$wInside)-(this.parent.isLocked?this.parent.locked:this.parent.unlocked)'
			c1.h = '100%'
		}
		else{
			c0.x = '0'
			c0.y = '0'
			c0.w = '100%'
			c0.h = '(this.parent.mode==1?this.parent.pos:this.parent.mode==2?this.parent.$hInside-this.parent.pos:this.parent.pos*this.parent.$hInside)'
			c1.x = '0'
			c1.y = '(this.parent.mode==1?this.parent.pos:this.parent.mode==2?this.parent.$hInside-this.parent.pos:this.parent.pos*this.parent.$hInside)+(this.parent.isLocked?this.parent.locked:this.parent.unlocked)'
			c1.w = '100%'
			c1.h = '100%-(this.parent.mode==1?this.parent.pos:this.parent.mode==2?this.parent.$hInside-this.parent.pos:this.parent.pos*this.parent.$hInside)-(this.parent.isLocked?this.parent.locked:this.parent.unlocked)'
		}
	}
})