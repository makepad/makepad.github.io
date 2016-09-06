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
		SplitZone:require('tools/rect').extend({
			color:"#77f4",
			tween:2,
			ease:[0,10,0,0],
			duration:0.3
		}),
		DropTab:require('tools/button').extend({
			onFingerDragOver:function(e){
				this.state = this.styles.dragOver
				this.view.dragTabDrop = {split:0,tabs:this.tabs}
			},
			onFingerDragOut:function(){
				this.state = this.styles.default
				this.view.dragTabDrop = undefined
			},
			Bg:{
				pickAlpha:-1.
			},
			styles:{
				$tween:2,
				$ease:[0,10,0,0],
				default:{
					$duration:0.3,
					Bg:{
						color:'#77f2'
					},
					Icon:{}
				},
				dragOver:{
					$duration:0.1,
					Bg:{
						color:'#77f6'
					},
					Icon:{}
				}
			}
		}),
		DropSplit:require('tools/button').extend({
			inPlace:false,
			onFingerDragOver:function(){
				this.state = this.styles.dragOver
				this.view.dragTabDrop = {split:1,index:this.index, tabs:this.tabs}
			},
			onFingerDragOut:function(){
				this.state = this.styles.default
				this.view.dragTabDrop = undefined
			},
			Bg:{
				pickAlpha:-1,
				align:[.5,.5],
				shadowBlur:4,
				shadowOffset:[4,4],
				padding:[10,10,10,10]	
			},
			styles:{
				$tween:2,
				$ease:[0,10,0,0],
				default:{
					$duration:0.3,
					Bg:{
						color:'#777f'
					},
					Icon:{}
				},
				dragOver:{
					$duration:0.1,
					Bg:{
						color:'#77ff'
					},
					Icon:{}
				}
			},
		}),
		Tabs:require('views/tabs').extend({
			onSelectTab:function(idx){
				// signal the connected splitters to go into config mode
				var splitters = {}
				var node = this.parent
				var last = this
				var dock = this.dock
				while(node && node !== dock){
					var isFirst = node.children[0] === last
					if(node.vertical){
						if(isFirst){
							if(!splitters.right) splitters.right = node
						}
						else{
							if(!splitters.left) splitters.left = node
						}
					}
					else{
						if(isFirst){
							if(!splitters.bottom) splitters.bottom = node
						}
						else{
							if(!splitters.top) splitters.top = node
						}
					}
					last = node
					node = node.parent
				}

				for(var key in splitters){
					if(this.lastTabIdx !== 0 && idx === 0){
						splitters[key].showSettings()
					}
					else if(this.lastTabIdx === 0 && idx !== 0){
						splitters[key].hideSettings()
					}
				}
				this.lastTabIdx = idx
			},
			onTabRip:function(child, e){
				this.dock.onTabRip(child, e)
			},
			onCloseTab:function(index){
				if(index !== 0) return
				this.dock.onCloseFinalTab(this)
			}
		}),
		Splitter:require('views/splitter'),
		Config:require('base/view').extend({
			canDragTab:false,
			tabText:'',
			tabIcon:'angle-up',
			color:'red',
			dontReuseStamps:true,
			tools:{
				Rect:require('tools/rect'),
				Button:require('tools/button').extend({
					w:20,
					onClick:function(){
						if(!this.click){ 
							this.view.parent.isTop = !this.view.parent.isTop
						}
						else if(this.click.tab !== undefined){
							if(this.click.close){
								this.view.parent.closeTab(this.click.tab, true)
								this.view.redraw()
							}
							else this.view.parent.selectTab(this.click.tab)
						}
					},
					states:{
						default:{Bg:{color:'#7'}},
						defaultOver:{Bg:{color:'#9'}},
						clicked:{Bg:{color:'#0a0'}},
						clickedOver:{Bg:{color:'#7f7'}}
					},
					Bg:{
						align:[0.5, 0.5],
						borderRadius:3,
						padding:[3, 1, 2, 1]
					}
				})
			},
			onDraw:function(){
				this.beginLayout({align:[1.,this.parent.isTop?0:1]})
				this.drawButton({icon:this.parent.isTop?'arrow-down':'arrow-up'})
				this.endLayout()
				this.beginLayout({padding:22,wrap:0})
				var children = this.parent.children
				for(var i = 0; i < children.length;i ++){
					var child = children[i]
					if(child.tabText){
						this.drawButton({Bg:{align:[0,0]},text:child.tabText,w:'100%-20'},{tab:i})
						if(!child.noCloseTab) this.drawButton({icon:'close'},{tab:i,close:true})
					}
				}
				this.endLayout()
			}
		})
	},
	onConstruct:function(){
		this.ids = {}
	},
/*	data:{
		left:[
			{text:'TLA',open:1,fill:'#f0f'},
			{text:'TL2',fill:'#ff0'}
		],
		mode:1,
		locked:false,
		pos:100,
		right:{
			top:[
				{text:'T1',fill:'#3'},
				{text:'T12',fill:'#3'},
				{text:'T123',fill:'#3'},
				{text:'T1234',fill:'#3'},
				{text:'T12345',fill:'#3'},
				{text:'T123456',fill:'#3'}
			],
			pos:100,
			mode:2,
			locked:false,
			bottom:[
				{text:'TR1',open:1,fill:'#0ff'},
				{text:'TR2',fill:'#00f'}
			]
		}
	},*/
	composeFromData:function(node){
		if(Array.isArray(node)){
			var args = [{
					dock:this
				},
				this.Config({
					noDragTab: true,
					noCloseTab: true,
					dock:this
				})
			]
			var selIndex = 0
			for(var i = 0; i < node.length; i++){
				var page = node[i]
				if(page.open) selIndex = i+1
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
		
		// start finger drag so we get onFingerDragOver and onFingerDragOut events
		this.app.startFingerDrag(e.digit)

		this.tabDragFinger = e
		tab.tabGeom = tab.tabStamp.stampGeom()
		// lets draw all drop options
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
	onOverlay:function(){
		// draw the tab drop options
		if(!this.dragTab) return
		var dragTab = this.dragTab

		var allTabs = []
		this.findTabs(this.children[0], allTabs)

		for(var i = 0; i < allTabs.length; i++){
			// ok lets draw a center drop in each tab
			var tabs = allTabs[i]

			this.drawDropTab({
				x:tabs.$xAbs,
				y:tabs.$yAbs,
				w:tabs.$w,
				h:tabs.$h
			}).tabs = tabs
		}

		var dtd = this.dragTabDrop
		if(dtd){
			var tabs = dtd.tabs
			var dock = tabs.dock
			if(dtd.split){
				var zone = dtd.index
				if(zone === 0){
					this.drawSplitZone({
						x:tabs.$xAbs,
						y:tabs.$yAbs,
						w:tabs.$w*.5,
						h:tabs.$h
					})
				}
				else if (zone === 1){
					this.drawSplitZone({
						x:tabs.$xAbs,
						y:tabs.$yAbs,
						w:tabs.$w,
						h:tabs.$h*.5
					})
				}else if(zone === 2){
					this.drawSplitZone({
						x:tabs.$xAbs,
						y:tabs.$yAbs+tabs.$h*.5,
						w:tabs.$w,
						h:tabs.$h*.5
					})
				}else if(zone ===3){
					this.drawSplitZone({
						x:tabs.$xAbs+tabs.$w*.5,
						y:tabs.$yAbs,
						w:tabs.$w*.5,
						h:tabs.$h
					})
				}
				else if(zone === 4){
					this.drawSplitZone({
						x:dock.$xAbs,
						y:dock.$yAbs,
						w:dock.$w*.5,
						h:dock.$h
					})
				}
				else if (zone === 5){
					this.drawSplitZone({
						x:dock.$xAbs,
						y:dock.$yAbs,
						w:dock.$w,
						h:dock.$h*.5
					})
				}else if(zone === 6){
					this.drawSplitZone({
						x:dock.$xAbs,
						y:dock.$yAbs+dock.$h*.5,
						w:dock.$w,
						h:dock.$h*.5
					})
				}else if(zone ===7){
					this.drawSplitZone({
						x:dock.$xAbs+dock.$w*.5,
						y:dock.$yAbs,
						w:dock.$w*.5,
						h:dock.$h
					})
				}
			}

			var cx = tabs.$xAbs+tabs.$w*.5
			var cy = tabs.$yAbs+tabs.$h*.5
			var xs = 55
			var ys = 55

			this.drawDropSplit({
				x:cx-2.0*xs+1,
				y:cy-.5*ys,
				w:xs*.5,
				h:ys,
				index:4,
				icon:'arrow-left'
			}).tabs = tabs

			this.drawDropSplit({
				x:cx-1.5*xs,
				y:cy-.5*ys,
				w:xs,
				h:ys,
				index:0,
				icon:'arrow-circle-left'
			}).tabs = tabs

			this.drawDropSplit({
				x:cx-.5*xs,
				y:cy-2.0*ys+1,
				w:xs,
				h:ys*.5,
				index:5,
				icon:'arrow-up'
			}).tabs = tabs

			this.drawDropSplit({
				x:cx-.5*xs,
				y:cy-1.5*ys,
				w:xs,
				h:ys,
				index:1,
				icon:'arrow-circle-up'
			}).tabs = tabs

			this.drawDropSplit({
				x:cx-.5*xs,
				y:cy+.5*ys,
				w:xs,
				h:ys,
				index:2,
				icon:'arrow-circle-down'
			}).tabs = tabs
			
			this.drawDropSplit({
				x:cx-.5*xs,
				y:cy+1.5*ys-1,
				w:xs,
				h:ys*.5,
				index:6,
				icon:'arrow-down'
			}).tabs = tabs

			this.drawDropSplit({
				x:cx+.5*xs,
				y:cy-.5*ys,
				w:xs,
				h:ys,
				index:3,
				icon:'arrow-circle-right'
			}).tabs = tabs

			this.drawDropSplit({
				x:cx+1.5*xs-1,
				y:cy-.5*ys,
				w:xs*.5,
				h:ys,
				index:7,
				icon:'arrow-right'
			}).tabs = tabs
		}

		var e = this.tabDragFinger
		this.drawTab({
			x:e.xAbs - dragTab.tabGeom.w*.5,
			y:e.yAbs - dragTab.tabGeom.h*.5,
			text:dragTab.tabText
		})
	},
	onFingerMove:function(e){
		if(!this.dragTab)return
		this.tabDragFinger = e
		this.redraw()
	},
	onFingerUp:function(e){
		if(!this.dragTab)return
		// splitting?
		var dtd = this.dragTabDrop
		if(dtd && dtd.split){
			var oldTabs = dtd.tabs
			var splitter = oldTabs.parent

			if(dtd.index >= 4){ // we are splitting the dock
				dtd.index -=4
				splitter = this
				oldTabs = this.children[0]		
			}

			var idx = splitter.children[0] === oldTabs?0:1

			var newTabs = this.Tabs({
					dock:this
				},
				this.Config({
					dock:this
				}),
				this.dragTab
			)

			newTabs.onAfterCompose = function(){
				this.onAfterCompose = null
				this.selectTab(1)
			}
			
			var newSplitter
			if(dtd.index === 0){
				newSplitter = this.Splitter({
						dock:this,
						vertical:true,
					},
					newTabs,
					oldTabs
				)
			}
			else if(dtd.index === 1){
				newSplitter = this.Splitter({
						dock:this,
						vertical:false,
					},
					newTabs,
					oldTabs
				)
			}
			else if(dtd.index === 2){
				newSplitter = this.Splitter({
						dock:this,
						vertical:false,
					},
					oldTabs,
					newTabs
				)
			}
			else if(dtd.index === 3){
				newSplitter = this.Splitter({
						dock:this,
						vertical:true,
					},
					oldTabs,
					newTabs
				)
			}
			splitter.replaceNewChild(newSplitter, idx)
		}
		else{
			var tabs = dtd && dtd.tabs || this.dragTab.oldTabs
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