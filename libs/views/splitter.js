module.exports=require('base/view').extend({
	name:'Splitter',
	props:{
		split:'vertical',
		pos:100,
		size:5,
		color:'red'
	},
	padDrawing:true,
	padding:[0,0,0,0],
	safety:2,
	tools:{
		Split:require('tools/split').extend({
		})
	},
	onSplitMove:function(e){
		if(this.split === 'vertical'){
			if(this.pos>1){ // pixel left align
				this.pos = clamp(e.xSplit,this.size, this.$wInside - this.safety*this.size)
			}
			else if(this.pos < 0){ // pixel right align
				this.pos = clamp(e.xSplit,this.size, this.$wInside - this.safety*this.size) - this.$wInside
			}
			else{ // horizontal percentage
				this.pos = clamp(e.xSplit / this.$wInside, this.size / this.$wInside,1 - this.safety*this.size / this.$wInside)
			}
		}
		else{
			if(this.pos>1){ // pixel top
				this.pos = clamp(e.ySplit,this.size, this.$hInside - this.safety*this.size)
			}
			else if(this.pos < 0){ // pixel bottom
				this.pos = clamp(e.ySplit,this.size, this.$hInside - this.safety*this.size) - this.$hInside
			}
			else{ // vertical percentage
				this.pos = clamp(e.ySplit / this.$hInside, this.size / this.$hInside,1 - this.safety*this.size / this.$hInside)
			}
		}
	},
	onDraw:function(){
		if(this.split === 'vertical'){
			var pos = this.pos>1.?this.pos:this.pos<0.?this.$wInside+this.pos:this.pos * this.$wInside
			this.drawSplit({
				offset:this.padding[3],
				x:''+pos,
				y:'0',
				w:this.size,
				h:'100%'//this.$h
			}).cursor =  'ew-resize'
		}
		else{
			var pos = this.pos>1.?this.pos:this.pos<0.?this.$hInside+this.pos:this.pos * this.$hInside
			this.drawSplit({
				offset:this.padding[0],
				x:'0',
				y:''+pos,
				w:'100%',
				h:this.size
			}).cursor =  'ns-resize'
		}
	},
	onAfterCompose:function(){
		var c0 = this.children[0]
		var c1 = this.children[1]
		if(this.split === 'vertical'){
			c0.x = '0'
			c0.y = '0'
			c0.w = '(this.parent.pos>1.?this.parent.pos:this.parent.pos<0.?this.parent.$wInside+this.parent.pos:this.parent.pos*this.parent.$wInside)'
			c0.h = '100%'
			c1.x = '(this.parent.pos>1.?this.parent.pos:this.parent.pos<0.?this.parent.$wInside+this.parent.pos:this.parent.pos*this.parent.$wInside)+this.parent.size'
			c1.y = '0'
			c1.w = '100%-(this.parent.pos>1.?this.parent.pos:this.parent.pos<0.?this.parent.$wInside+this.parent.pos:this.parent.pos*this.parent.$wInside)-this.parent.size'
			c1.h = '100%'
		}
		else{
			c0.x = '0'
			c0.y = '0'
			c0.w = '100%'
			c0.h = '(this.parent.pos>1.?this.parent.pos:this.parent.pos<0.?this.parent.$hInside+this.parent.pos:this.parent.pos*this.parent.$hInside)'
			c1.x = '0'
			c1.y = '(this.parent.pos>1.?this.parent.pos:this.parent.pos<0.?this.parent.$hInside+this.parent.pos:this.parent.pos*this.parent.$hInside)+this.parent.size'
			c1.w = '100%'
			c1.h = '100%-(this.parent.pos>1.?this.parent.pos:this.parent.pos<0.?this.parent.$hInside+this.parent.pos:this.parent.pos*this.parent.$hInside)-this.parent.size'
		}
	}
})