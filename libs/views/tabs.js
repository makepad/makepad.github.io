module.exports=require('base/view').extend({
	name:'Tabs',
	data:[],
	padding:[23,0,0,0],
	tools:{
		Tab:require('tools/tab').extend({
		}),
		Background:require('tools/bg').extend({
			color:'#2',
			wrap:false,
		}),
	},
	fontSize:11,
	onTabStampSelected:function(index){
		// deselect the other tab
		this.selectTab(index)
	},
	onTabStampClose:function(index){
		if(this.onCloseTab(index)){
			return
		}
		this.removeChild(index)			
	
		this.data.splice(index, 1)
		// lets select another tab
		var next = clamp(index, 0, this.data.length -1)
		this.selectedIndex = -1
		this.selectTab(next)
	},
	selectTab:function(index){
		if(this.selectedIndex !== index){
			this.selectedIndex = index
			for(var i = 0; i < this.data.length; i++){
				var child = this.children[i]
				if(child) child.visible = i === index?true:false
			}
			this.redraw()
		}
	},
	onSelectTab:function(index){
		
	},
	onCloseTab:function(index){
	},
	onDraw:function(){
		// leave off the view padding
		this.beginBackground({
			padding:[2,0,0,0],
			w:this.$w,
			h:this.$h
		})

		var tabs=this.data

		for(var i=0,len=tabs.length-1;i<=len;i++){
			var tab=tabs[i]
			this.drawTab({
				index:i,
				state:i === this.selectedIndex?'selected':'default',
				icon:tab.icon,
				canClose:tab.canClose,
				text:tab.name
			})
			if(tab === this.selectedIndex) this.selectedStamp = t
		}
		this.endBackground()
	}
})