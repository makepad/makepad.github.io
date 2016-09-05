module.exports=require('base/view').extend({
	name:'Tabs',
	overflow:'none',
	props:{
		isTop:true,
	},
	onIsTop:function(){
		if(this.isTop){
			this.padding = [26,0,0,0]
		}
		else{
			this.padding = [0,0,26,0]
		}
	},
	isTop:false,
	tools:{
		Tab:require('tools/tab').extend({
			onTabSelected:function(e){
				this.view.onTabSelected(this.index, e)
			},
			onTabSlide:function(e){
				this.view.onTabSlide(this, e)
			},
			onTabReleased:function(e){
				this.view.onTabReleased()
			}
		}),
		Background:require('tools/bg').extend({
			color:'#2',
			wrap:false,
		}),
		CloseButton:require('tools/button').extend({
			Bg:{
				margin:[2,0,0,0],
				color:'#3',
				padding:[4,0,0,8]
			},
			w:26,
			h:23,
			onClick:function(e){
				this.view.closeTab(this.view.selectedIndex)
			}
		})
	},
	fontSize:11,
	onTabSelected:function(index, e){
		// deselect the other tab
		this.selectTab(index)
		this.slidePos = undefined
		this.defSliding = false
		this.selSliding = false
		this.slideDelta = e.x
		this.slideStartY = e.yAbs
	},
	onTabSlide:function(tabStamp, e){
		if(!this.children[tabStamp.index].canDragTab || this.slideStartY === undefined) return
		this.slidePos = e.xView - this.slideDelta
		this.defSliding = true
		// lets check if the y position is too far from the tab
		var dy = abs(this.slideStartY - e.yAbs)
		if(dy > 50 && this.onTabRip){
			this.slideStartY = undefined
			this.slidePos = NaN
			this.defSliding = true
			this.selSliding = true
			this.slidePos
			var index = tabStamp.index
			var child = this.children.splice(index, 1)[0]
			if(this.selectedIndex === index){
				var next = clamp(index, 0, this.children.length -1)
				this.selectedIndex = -1
				this.selectTab(next)
			}
			this.onTabRip(child, e)
			return
		}

		// lets see where we belong
		var set = this.children

		// remove old one
		item = set.splice(tabStamp.index, 1)[0]
		
		// find insertion point
		var ts = tabStamp.stampGeom()
		//console.log(ts.x)
		//var x = tabStamp.x
		var ins = tabStamp.index
		for(var i = 0; i < set.length; i++){
			var stamp = set[i].tabStamp
			var geom = stamp.stampGeom()
			if(ts.x > geom.x) ins = i + 1 // insertion point
		}

		// insert it again, switching our stampId
		if(ins > tabStamp.index){
			this.view.transferFingerMove(e.digit,set[ins-1].tabStamp.$stampId)
		}
		else if(ins < tabStamp.index){
			this.view.transferFingerMove(e.digit,set[ins].tabStamp.$stampId)
		}

		set.splice(ins, 0, item)
		
		this.selectedIndex = ins
		this.redraw()
	},
	onTabReleased:function(){
		this.slidePos = NaN
		this.defSliding = false
		this.selSliding = true
	},
	closeTab:function(index){
		if(this.onCloseTab(index)){
			return
		}
		this.removeChild(index)
	
		if(this.selectedIndex === index){
			var next = clamp(index, 0, this.children.length -1)
			this.selectedIndex = -1
			this.selectTab(next)
		}
	},
	selectTab:function(index){
		if(this.selectedIndex !== index){
			this.selectedIndex = index
			for(var i = 0; i < this.children.length; i++){
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
		if(this.isTop){
			this.beginBackground({
				align:[0.,0.],
				padding:[0,0,0,0],
				w:this.$w,
				y:0,
				h:26,
			})
		}
		else{
			this.beginBackground({
				align:[0.,1.],
				padding:[0,0,0,0],
				w:this.$w,
				y:this.$h-26,
				h:26,
			})
		}
		// make sure our normale tab happens first
		this.orderTab({})
		for(var i = 0, len = this.children.length; i < len; i++){
			var child = this.children[i]
			if(!child.tabText && !child.tabIcon) continue
			var isSel = i === this.selectedIndex
			child.tabStamp = this.drawTab({
				$layer:isSel?1:undefined,
				x:isSel?this.slidePos:NaN,
				Bg:{
					borderRadius:this.isTop?[6,6,1,1]:[1,1,6,6]
				},
				index:i,
				state:isSel?
					(this.selSliding?'selectedSlide':'selectedOver'):
					(this.defSliding?'slide':'default'),
				icon:child.tabIcon,
				canClose:false,//child.tabCanClose,
				text:child.tabText
			})
		}
		// lets draw the close button for the current tab
		var clen = this.children.length
		if(this.children[this.selectedIndex].canCloseTab || clen === 1){
			if(clen>1){
				this.drawCloseButton({
					x:'@1',
					icon:'close'
				})
			}
			else{
				this.drawCloseButton({
					x:NaN,
					icon:'trash'
				})
			}
		}
		this.endBackground()
		this.defSliding = false
		this.selSliding = false
	}
})