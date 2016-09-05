module.exports=require('base/view').extend({
	name:'Dock',
	overflow:'none',
	tools:{
		Rect:require('tools/rect'),
		Tab:require('tools/tab').extend({
			Bg:{
				color:'#8',
				pickAlpha:2.
			},
			Text:{
				color:'#f',
				pickAlpha:2.
			}
		}),
		Drop:require('tools/button').extend({
			Bg:{
				align:[.5,.5],
				shadowBlur:4,
				shadowOffset:[4,4]
			}
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
			}
		}),
		Splitter:require('views/splitter'),
		Fill:require('views/fill'),
		Empty:require('base/view').extend({
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
						//else if(this.click.radio !== undefined){
						//	this.click.splitter.mode = this.click.radio
						//}
						//else if(this.click.flags !== undefined){
						//	this.click.splitter.isLocked = this.click.flags?true:false
						//}
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
			/*
			onAfterCompose:function(){
				// figure out which splitters border us
				var splitters = this.splitters = {}
				var node = this.parent.parent // start at first splitter
				var last = this.parent
				var dock = this.dock
				while(node && node !== dock){
					var isFirst = node.children[0] === last
					var listen = false
					if(node.vertical){
						if(isFirst){
							if(!splitters.right) splitters.right = node, listen = true
						}
						else{
							if(!splitters.left) splitters.left = node, listen = true
						}
					}
					else{
						if(isFirst){
							if(!splitters.bottom) splitters.bottom = node, listen = true
						}
						else{
							if(!splitters.top) splitters.top = node, listen = true
						}
					}
					if(listen){
						node.on('isLocked', function(){
							this.redraw()
						}.bind(this))
						node.on('pos', this.redraw.bind(this))
					}

					last = node
					node = node.parent
				}
			},
			styles:{
				buttons:{
					b1:{index:1},
					b2:{index:0,Bg:{borderRadius:0}},
					b3:{index:2,Bg:{borderRadius:0}},
					b4:{icon:'lock',index:0},
				},
				left$buttons:{
					layout:{align:[0.,.5],wrap:2},
					b1:{icon:'caret-left',Bg:{borderRadius:[0,6,0,0]},h:30},
					b2:{text:'%',h:30},
					b3:{icon:'caret-right',h:30},
					b4:{Bg:{borderRadius:[0,0,6,0]},h:30},
				},
				right$buttons:{
					layout:{align:[1.,.5],wrap:2},
					b1:{icon:'caret-left',Bg:{borderRadius:[6,0,0,0]},h:30},
					b2:{text:'%',h:30},
					b3:{icon:'caret-right',h:30},
					b4:{Bg:{borderRadius:[0,0,0,6]},h:30},
				},
				top$buttons:{
					layout:{align:[.5,0.],wrap:0},
					b1:{icon:'caret-up',Bg:{borderRadius:[0,0,0,6]},w:30},
					b2:{text:'%',w:30},
					b3:{icon:'caret-down',w:30},
					b4:{Bg:{borderRadius:[0,0,6,0]},w:30},
				},
				bottom$buttons:{
					layout:{align:[.5,1.],wrap:0},
					b1:{icon:'caret-up',Bg:{borderRadius:[6,0,0,0]},w:30},
					b2:{text:'%',w:30},
					b3:{icon:'caret-down',w:30},
					b4:{Bg:{borderRadius:[0,6,0,0]},w:30},
				}
			},
			drawButtons:function(sideName){
				var splitter = this.splitters[sideName]
				var mode = this.sideMode[sideName] = {splitter:splitter,radio:splitter.mode}
				var lock = this.sideLock[sideName] = {splitter:splitter,flags:splitter.isLocked?1:0}
				var style = this.styles[sideName]

				this.beginLayout(style.layout)
				this.drawButton(style.b1, mode)
				this.drawButton(style.b2, mode)
				this.drawButton(style.b3, mode)
				this.drawButton(style.b4, lock)
				this.endLayout()
			},*/
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
						this.drawButton({icon:'close'},{tab:i,close:true})
					}
				}
				this.endLayout()
				//this.sideMode = {}
				//this.sideLock = {}
				//var splitters = this.splitters
				//if(splitters.left) this.drawButtons('left')
				//if(splitters.right) this.drawButtons('right')
				//if(splitters.top) this.drawButtons('top')
				//if(splitters.bottom) this.drawButtons('bottom')
			}
		})
	},
	data:{
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
	},
	composeFromData:function(node){
		if(Array.isArray(node)){
			var args = [{
					dock:this
				},
				this.Empty({
					dock:this,
					canDragTab:false,
					tabText:'',
					tabIcon:'angle-up',
					color:'red'
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
				tabs.selectTab(selIndex)
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
			return this.Fill({
				dock:this,
				tabIcon: '',
				tabText: node.text,
				canDragTab: true,
				canCloseTab: true,
				color: node.fill
			})
		}
	},
	onTabRip:function(tab, e){
		// lets transfer the mouse capture to us
		this.transferFingerMove(e.digit,0)
		this.tabDragFinger = e
		tab.tabGeom = tab.tabStamp.stampGeom()
		// lets draw all drop options
		this.dragTab = tab
		this.redraw() 
	},
	findTabs:function(node, tabs){
		// we need all the tabs objects in our tree
		if(!node)return
		if(node.name === 'Splitter'){
			this.findTabs(node.children[0], tabs)
			this.findTabs(node.children[1], tabs)
		}
		else if(node.name === 'Tabs'){
			tabs.push(node)
		}
	},
	onOverlay:function(){
		// draw the tab drop options
		if(!this.dragTab) return
		var dragTab = this.dragTab

		var tabs = []
		this.findTabs(this.children[0], tabs)

		for(var i = 0; i < tabs.length; i++){
			// ok lets draw a center drop in each tab
			var tab = tabs[i]
			var cx = tab.$xAbs+tab.$w
			var cy = tab.$yAbs+tab.$h
			var xs = 35
			var ys = 35
			this.drawDrop({
				x:cx*.5-1.5*xs,
				y:cy*.5-.5*ys,
				w:xs,
				h:ys,
				icon:'arrow-circle-left'
			})			
			this.drawDrop({
				x:cx*.5-.5*xs,
				y:cy*.5-1.5*ys,
				w:xs,
				h:ys,
				icon:'arrow-circle-up'
			})
			this.drawDrop({
				x:cx*.5-.5*xs,
				y:cy*.5-.5*ys,
				w:xs,
				h:ys,
				icon:'plus-square'
			})
			this.drawDrop({
				x:cx*.5-.5*xs,
				y:cy*.5+.5*ys,
				w:xs,
				h:ys,
				icon:'arrow-circle-down'
			})
			this.drawDrop({
				x:cx*.5+.5*xs,
				y:cy*.5-.5*ys,
				w:xs,
				h:ys,
				icon:'arrow-circle-right'
			})					

		}

		var e = this.tabDragFinger
		this.drawTab({
			x:e.xAbs - dragTab.tabGeom.w*.5,
			y:e.yAbs - dragTab.tabGeom.h*.5,
			text:dragTab.tabText
		})
		// ok where can we drop.
		// the tab strip
		// 1. the main rectangle
		// the split rectangle
		// lets draw the split rectangle
	},
	onFingerMove:function(e){
		if(!this.dragTab)return
		this.tabDragFinger = e
		this.redraw()
	},
	onFingerUp:function(e){
		if(!this.dragTab)return
		this.dragTab = false
		this.redraw()
	},
	onCompose:function(){
		// ok we have to generate stuff
		return this.composeFromData(this.data)
	}
})