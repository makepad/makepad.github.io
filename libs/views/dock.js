let painter = require('services/painter')
module.exports=class Dock extends require('base/view'){
	prototype(){
		this.tools = {
			Splitter:require('views/splitter').extend({
				w:'100%',
				h:'100%'
			}),
			Tabs:require('views/tabs').extend({
				w:'100%',
				h:'100%',
				onTabRip(e){
					this.owner.onTabRip(this, e)
				}
			}),
			Tab:require('stamps/tab').extend({

			}),
			Drop:require('shaders/bg').extend({
				color:'#4A148C7f'
			})
		}
	}

	// lets spawn all things
	constructor(...args){
		super(...args)
		let dock = this
		this.splitterId = 1
		this.tabsId = 1
		this.child = this.deserialize(this.data)
	}

	deserialize(){
		let dock = this
		function deserialize(node){
			if(node.pane1){ // splitter
				return new dock.Splitter(dock, {
					id:'Splitter'+(dock.splitterId++),
					position:node.position,
					vertical:node.vertical,
					locked:node.locked,
					debug:node.debug,
					panes:[
						deserialize(node.pane1),
						deserialize(node.pane2)
					]
				})
			}
			else if(node.tabs){ // tabs
				let tabs = node.tabs
				let out = []
				for(let i = 0; i < tabs.length; i++){
					out.push(deserialize(tabs[i]))
				}
				return new dock.Tabs(dock, {
					id:'Tabs'+(dock.tabsId++),
					debug:node.debug,
					selected:node.selected,
					tabs:out
				})
			}
			else {
				return dock.deserializeView(node)
			}
		}
		return deserialize(this.data)
	}

	serialize(){
		// lets serialize the state
		let dock = this
		function serialize(view){
			if(view instanceof dock.Splitter){
				return {
					vertical:view.vertical,
					locked:view.locked,
					pos:view.pos,
					pane1:serialize(view.panes[0]),
					pane2:serialize(view.panes[1])
				}
			}
			else if(view instanceof dock.Tabs){
				let out = []
				let tabs = view.tabs
				for(let i = 0; i < tabs.length; i++){
					out.push(serialize(tabs[i]))
				}
				return {
					selected:view.selected,
					tabs:out
				}
			}
			return dock.serializeView(view)
		}
		return serialize(this.child)
	}

	onTabRip(tab, e){
		if(this.drag) return

		var drag = tab.tabs.splice(tab.selected, 1)[0]

		var stamp = drag.$tabStamp
		this.tabHeight = stamp.$h
		this.start = stamp.start
		this.xStart = stamp.xStart
		this.yStart = stamp.yStart
		tab.selected = min(tab.tabs.length-1,tab.selected)

		this.dragDigit = e.digit
		this.transferFingerMove(e.digit,0)
		tab.redraw()
		this.drag = drag
		// this is not correct. this is a move event in the coordinate space of
		// the tab bar, not the main bar
		this.onFingerMove(e)
		// tore off last tab. lets remove it and its splitter
		if(tab.tabs.length === 0){
			let splitter = tab.parent
			let parent = splitter.parent
			let other = splitter.panes[0] === tab?splitter.panes[1]:splitter.panes[0]

			if(parent === this) parent.child = other
			else if(parent.panes[0] === splitter)parent.panes[0] = other
			else parent.panes[1] = other
			this.redraw()
			delete this.$views[tab.id]
			delete this.$views[splitter.id]
			tab.destroy()
			splitter.destroy()
		}
	}

	onTabInsert(tabs){
		// where do we insert? ideally the right spot
		tabs.transferMove = {
			index:tabs.selected = tabs.tabs.push(this.drag) - 1,
			xStart: this.xStart,
			yStart: this.yStart,
			digit:this.dragDigit
		}

		this.drag = undefined
		tabs.redraw()
	}

	onFingerMove(e){
		// lets draw a tab as we drag it
		if(this.drag){
			this.xDrag = e.x - this.start.x
			this.yDrag = e.y - this.start.y
			this.redraw()
		}
	}

	onFingerUp(){
		this.redraw() 
		if(!this.drag) return
		let drag = this.drag
		this.drag = undefined
		if(!this.dropInfo) return
		let info = this.dropInfo
		this.dropinfo = undefined
		// lets do stuff
		// lets make a new tabs widget
		let parent = info.tabs.parent
		let isRoot = parent === this
		let last
		let lastIdx
		if(isRoot){
			last = this.child
		}
		else{
			lastIdx = parent.panes[0] !== info.tabs?1:0
			last = parent.panes[lastIdx]
		}

		let tabs = new this.Tabs(this,{
			id:'Tabs'+(this.tabsId++),
			tabs:[drag]
		})

		// alright lets do what exactly?
		let splitter
		if(info.part === 0){
			splitter = new this.Splitter(this, {
				id:'Splitter'+(this.splitterId++),
				vertical:true,
				locked:false,
				position:info.isParent?0.25:0.5,
				panes:[tabs,last]
			})
		}
		else if(info.part === 1){
			splitter = new this.Splitter(this, {
				id:'Splitter'+(this.splitterId++),
				vertical:true,
				locked:false,
				position:info.isParent?0.75:0.5,
				panes:[last,tabs]
			})
		}
		else if(info.part === 2){
			splitter = new this.Splitter(this, {
				id:'Splitter'+(this.splitterId++),
				vertical:false,
				locked:false,
				position:info.isParent?0.25:0.5,
				panes:[tabs,last]
			})
		}
		else if(info.part === 3){
			splitter = new this.Splitter(this, {
				id:'Splitter'+(this.splitterId++),
				vertical:false,
				locked:false,
				position:info.isParent?0.75:0.5,
				panes:[last,tabs]
			})
		}
		// write it
		if(!isRoot){
			parent.panes[lastIdx] = splitter
			parent.redraw()
		}
		else{
			this.child = splitter
		}
	}

	onDraw(){
		this.child.draw(this,{order:1,w:'100%',h:'100%'})

		if(this.drag){
			this.dropInfo = undefined
			// draw drop overlays
			for(var key in this.$views){
				let tabs = this.$views[key]
				if(!(tabs instanceof this.Tabs)) continue
				// check if we are over the dropzone
				let x = clamp(this.xDrag+this.start.x,0,painter.w)
				let y = clamp(this.yDrag+this.start.y,0,painter.h)
				let tx = tabs.$x
				let ty = tabs.$y
				let tw = tabs.$w
				let th = tabs.$h
				let px = tabs.parent.$x
				let py = tabs.parent.$y
				let pw = tabs.parent.$w
				let ph = tabs.parent.$h
				let tth = this.tabHeight

				if(x>=tx  && x <= tx+tw && y>=ty && y <= ty + th){

					// check if we are tab dropzone
					if(y < ty+tth){
						// we could insert the tab and move back to tabdragging
						//this.drawDrop({x:tx, y:ty, w:tw, h:tth })
						this.onTabInsert(tabs)
						break
						//continue
					}

					var l = (x - tx)/tw
					var r = 1-(x - tx)/tw 
					var t = (y - ty)/th
					var b = 1-(y-ty)/th 
					var m = min(l, r, t, b)
					let pdock = 30
					if(m === l){
						if(tx === px && x < tx+pdock && !(tabs.parent instanceof this.constructor)){
							this.dropInfo = {tabs:tabs.parent,part:0,isParent:1}
							this.drawDrop({order:2,x:px, y:py, w:pw*0.25, h:ph})
							break
						}
						else{
							this.dropInfo = {tabs:tabs,part:0}
							this.drawDrop({order:2,x:tx, y:ty, w:tw*.5, h:th})
							break
						}
					}
					else if(m === r){
						if(tx+tw === px+pw && x > tx+tw-pdock && !(tabs.parent instanceof this.constructor)){
							this.dropInfo = {tabs:tabs.parent,part:1,isParent:1}
							this.drawDrop({order:2,x:px+pw*0.75, y:py, w:pw*0.25, h:ph})
							break
						}
						else{
							this.dropInfo = {tabs:tabs,part:1}
							this.drawDrop({order:2,x:tx+tw*.5, y:ty, w:tw*.5, h:th})
							break
						}
					}
					else if(m === t){
						if(ty === py && x < ty+pdock && !(tabs.parent instanceof this.constructor)){
							this.dropInfo = {tabs:tabs.parent,part:2,isParent:1}
							this.drawDrop({order:2,x:px, y:py, w:pw, h:ph*0.25})
							break
						}
						else{
							this.dropInfo = {tabs:tabs,part:2}
							this.drawDrop({order:2,x:tx, y:ty, w:tw, h:th*.5})
							break
						}
					}
					else if(m ===b){
						if(ty+th === py+ph && y > ty+th+pdock && !(tabs.parent instanceof this.constructor)){
							this.dropInfo = {tabs:tabs.parent,part:3,isParent:1}
							this.drawDrop({order:2,x:px, y:py+ph*0.75, w:pw, h:ph*0.25})
						}
						else{
							this.dropInfo = {tabs:tabs,part:3}
							this.drawDrop({order:2,x:tx, y:ty+th*.5, w:tw, h:th*.5})
							break
						}
					}
				}
			}
			if(this.drag){
				this.drawTab({id:0, order:3,state:'selected', x:this.xDrag, y:this.yDrag, text:this.drag.tabTitle})
			}
		}

	}
}