module.exports=require('base/view').extend({
	name:'Dock',
	overflow:'none',
	tools:{
		Rect:require('tools/rect'),
		Tab:require('tools/tab').extend({
			Bg:{
				color:'#8',
				borderRadius:2,
				pickAlpha:2.
			},
			Text:{
				color:'#f',
				pickAlpha:2.
			}
		}),
		SplitZone:require('tools/quad').extend({
			color:"#77f4",
			tween:2,
			ease:[0,10,0,0],
			duration:0.3
		}),
		Tabs:require('views/tabs').extend({
			onSelectTab:function(idx){
				var newSel = this.children[idx]
				var lastSel = this.lastSelectedTab
				if(lastSel !== newSel && lastSel && lastSel.onTabHide){
					lastSel.onTabHide()
				}
				if(lastSel !== newSel && newSel && newSel.onTabShow){
					newSel.onTabShow()
				}
				this.lastSelectedTab = newSel
			},
			onTabRip:function(child, e){
				if(this.children.length === 0) this.dock.onCloseFinalTab(this)
				this.dock.onTabRip(child, e)
			},
			onCloseTab:function(index){
				if(index !== 0) return
				this.dock.onCloseFinalTab(this)
			}
		}),
		Splitter:require('views/splitter')
	},
	onConstruct:function(){
		this.ids = {}
	},
	composeFromData:function(node){
		if(node.tabs){
			var args = [{
					isTop:node.top,
					dock:this
				}
			]
			var selIndex = 0
			for(var i = 0; i < node.tabs.length; i++){
				var page = node.tabs[i]
				if(page.open) selIndex = i
 				args.push(this.composeFromData(page))
			}
			var tabs = this.Tabs.apply(null,args)
			tabs.onAfterCompose = function(){
				this.selectTab(selIndex)
				this.onAfterCompose =null
			}
			return tabs
		}
		else if(node.left || node.top){ // splitter
			return this.Splitter({
					dock:this,
					vertical:node.left?true:false,
					isLocked:node.locked,
					pos:node.pos,
					mode:node.mode
				},
				this.composeFromData(node.left || node.top),
				this.composeFromData(node.right || node.bottom)
			)
		}
		else{ // other type
			var pane = this.classes[node.type](
				node,{
					dock:this
				}
			)
			if(node.id){
				this.ids[node.id] = pane
			}
			return pane
		}
	},
	onTabRip:function(tab, e){
		// lets transfer the mouse capture to us
		this.transferFingerMove(e.digit,0)
		this.tabDragFinger = e
		tab.tabGeom = tab.tabStamp.stampGeom()
		this.dragTab = tab
		this.redraw() 
	},
	onCloseFinalTab:function(tabs){
		// remove the splitter and replace with the right child
		var oldSplitter = tabs.parent
		var splitter = oldSplitter.parent
		var tgtIdx = splitter.children.indexOf(oldSplitter)
		var srcIdx = oldSplitter.children.indexOf(tabs)
		var otherSide = oldSplitter.children[srcIdx?0:1]
		// reset the coordinates
		otherSide.x = '0'
		otherSide.y = '0'
		otherSide.w = '100%'
		otherSide.h = '100%'
		// make sure our splitter counters are ok
		tabs.onSelectTab(1)
		splitter.replaceOldChild(otherSide, tgtIdx)
	},
	findTabs:function(node, tabs){
		// we need all the tabs objects in our tree
		if(!node)return
		if(node.name === 'Splitter'){
			this.findTabs(node.children[0], tabs)
			this.findTabs(node.children[1], tabs)
		}
		else if(node.name === 'Tabs'){
			//console.log(node.children[1].tabText, node.$yAbs, node.$h)
			tabs.push(node)
		}
	},
	findSplitters:function(node, splitters){
		if(!node)return
		if(node.name === 'Splitter'){
			splitters.push(node)
			this.findSplitters(node.children[0], splitters)
			this.findSplitters(node.children[1], splitters)
		}
	},
	toggleSplitterSettings:function(show){
		var splitters = []
		this.findSplitters(this.children[0], splitters)
		for(var i = 0; i < splitters.length; i++){
			splitters[i].toggleSplitterSettings(show)
		}
	},
	toggleTabSettings:function(show){
		var tabs = []
		this.findTabs(this.children[0], tabs)
		for(var i = 0; i < tabs.length; i++){
			tabs[i].toggleTabSettings(show)
		}
	},
	onOverlay:function(){
		// draw the tab drop options
		if(!this.dragTab) return
		var dragTab = this.dragTab

		var allTabs = []
		this.findTabs(this.children[0], allTabs)

		var e = this.tabDragFinger
		this.drawTab({
			x:e.xAbs - dragTab.tabGeom.w*.5,
			y:e.yAbs - dragTab.tabGeom.h*.5,
			text:dragTab.tabText,
			icon:dragTab.tabIcon
		})
		this.dragTabDrop = undefined
		// lets find out the drop area
		for(var i = 0; i < allTabs.length; i++){
			var tabs = allTabs[i]

			var fx = e.x
			var fy = e.y
			var px = tabs.parent.$xAbs
			var py = tabs.parent.$yAbs
			var pw = tabs.parent.$w
			var ph = tabs.parent.$h
			var tx = tabs.$xAbs
			var ty = tabs.$yAbs
			var tw = tabs.$w
			var th = tabs.$h

			var tabh = 40
			var pdock = 30

			if(fx < tx || fy < ty || fx > tx + tw || fy > ty + th){
				continue
			}

			// tab head

			if( tabs.isTop && fx >= tx && fx <= tx+tw && fy >= ty && fy <= ty+tabh){
				this.dragTabDrop = {tabs:tabs, part:-1}
				this.drawSplitZone({x:tx, y:ty, w:tw, h:th})
				continue	
			}
			if( !tabs.isTop && fx >= tx && fx <= tx+tw && fy >= ty + th - tabh && fy <= ty+th){
				this.dragTabDrop = {tabs:tabs, part:-1}
				this.drawSplitZone({x:tx, y:ty, w:tw, h:th})
				continue	
			}
			
			var l = fx - tx
			var r = (tx + tw) - fx 
			var t = fy - ty
			var b = (ty + th) - fy 

			var m = min(l, r, t, b)

			if(m === l){ // left
				if(fx < tx+pdock && tabs.parent.name !== 'Dock'){
					this.dragTabDrop = {tabs:tabs.parent,part:0,isParent:1}
					this.drawSplitZone({x:px, y:py, w:pw*.25, h:ph})
				}
				else{
					this.dragTabDrop = {tabs:tabs,part:0}
					this.drawSplitZone({x:tx, y:ty, w:tw*.5, h:th})
				}
			}
			else if(m === r){
				if(fx > tx+tw-pdock && tabs.parent.name !== 'Dock'){
					this.dragTabDrop = {tabs:tabs.parent,part:1,isParent:1}
					this.drawSplitZone({x:px+pw*.75, y:py, w:pw*.25, h:ph})
				}
				else{
					this.dragTabDrop = {tabs:tabs,part:1}
					this.drawSplitZone({x:tx+tw*.5, y:ty, w:tw*.5, h:th})
				}
			}
			else if(m === t){
				if(fy < ty+tabh+pdock && tabs.parent.name !== 'Dock'){
					this.dragTabDrop = {tabs:tabs.parent,part:2,isParent:1}
					this.drawSplitZone({x:px, y:py, w:pw, h:ph*.25})
				}
				else{
					this.dragTabDrop = {tabs:tabs,part:2}
					
					this.drawSplitZone({x:tx, y:ty, w:tw, h:(th-tabh)*.5})
				}
			}
			else if (m === b){
				if(fy > ty+th-pdock && tabs.parent.name !== 'Dock'){
					this.dragTabDrop = {tabs:tabs.parent,part:3,isParent:1}
					this.drawSplitZone({x:px, y:py+ph*.75, w:pw, h:ph*.25})
				}
				else{
					this.dragTabDrop = {tabs:tabs,part:3}
					this.drawSplitZone({x:tx, y:ty+th*.5, w:tw, h:th*.5})
				}
			}
		}

	},
	onFingerMove:function(e){
		if(!this.dragTab)return
		this.tabDragFinger = e
		this.redraw()
	},
	onFingerUp:function(e){
		if(!this.dragTab)return
		// splitting?

		if(this.dragTabDrop && this.dragTabDrop.part >= 0){

			var oldTabs = this.dragTabDrop.tabs
			var isParent = this.dragTabDrop.isParent
			var splitter = oldTabs.parent

			var idx = splitter.children[0] === oldTabs?0:1

			var newTabs = this.Tabs({
					dock:this
				},
				this.dragTab
			)

			newTabs.onAfterCompose = function(){
				this.onAfterCompose = null
				this.selectTab(0)
			}
			
			var newSplitter
			var part = this.dragTabDrop.part
			if(part === 0){
				newSplitter = this.Splitter({
						dock:this,
						vertical:true,
						pos:isParent?0.25:0.5
					},
					newTabs,
					oldTabs
				)
			}
			else if(part === 1){
				newSplitter = this.Splitter({
						dock:this,
						vertical:true,
						pos:isParent?0.75:0.5
					},
					oldTabs,
					newTabs
				)
			}
			else if(part === 2){
				newSplitter = this.Splitter({
						dock:this,
						vertical:false,
						pos:isParent?0.25:0.5
					},
					newTabs,
					oldTabs
				)
			}
			else if(part === 3){
				newSplitter = this.Splitter({
						dock:this,
						vertical:false,
						pos:isParent?0.75:0.5
					},
					oldTabs,
					newTabs
				)
			}
			splitter.replaceNewChild(newSplitter, idx)
		}
		else{
			var tabs = this.dragTabDrop && this.dragTabDrop.tabs || this.dragTab.oldTabs
			this.dragTab.parent = tabs
			var id = tabs.children.push(this.dragTab) - 1
			tabs.selectTab(id)
		}
		this.dragTab = undefined
		this.redraw()
	},
	onCompose:function(){
		// ok we have to generate stuff
		return this.composeFromData(this.data)
	}
})