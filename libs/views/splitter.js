module.exports=require('base/view').extend({
	name:'Splitter',
	props:{
		split:'vertical',
		pos:100,
		size:5,
		color:'red'
	},
	padDrawing:true,
	padding:[10,10,10,10],
	tools:{
		Split:require('tools/split').extend({
		})
	},
	onSplitMove:function(e){
		this.pos = e.xSplit
	},
	onDraw:function(){
		//this.turtle._padding = this.padding
		//this.beginTurtle()
		this.drawSplit({
			x:''+this.pos,
			y:'0',
			w:this.size,
			h:'100%'//this.$h
		})
		//this.endTurtle()
	},
	onAfterCompose:function(){
		var c0 = this.children[0]
		var c1 = this.children[1]
		// write vertical layout
		if(this.split === 'vertical'){
			c0.x = '0'
			c0.y = '0'
			c0.w = 'this.parent.pos'
			c0.h = '100%'
			c1.x = 'this.parent.pos+this.parent.size'
			c1.y = '0'
			c1.w = '100%-this.parent.size-this.parent.pos'
			c1.h = '100%'
		}
	}
})