module.exports=class Dock extends require('base/view'){
	prototype(){
		this.tools = {
			Splitter:require('views/splitter').extend({
			}),
			Tabs:require('views/tabs').extend({
				onTabRip(e){
					this.owner.onTabRip(this, e)
				}
			}),
			Tab:require('stamps/tab').extend({

			}),
			Drop:require('shaders/bg').extend({
				color:'#ff07'
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
					w:'100%',
					h:'100%',
					id:'Spliter'+(dock.splitterId++),
					position:node.position,
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
					selected:node.selected,
					w:'100%',
					h:'100%',
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
		this.xStart = stamp.xStart
		this.yStart = stamp.yStart
		tab.selected = min(tab.tabs.length-1,tab.selected)
		this.dragDigit = e.digit
		this.transferFingerMove(e.digit,0)
		tab.redraw()
		this.drag = drag
		this.onFingerMove(e)
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
			this.xDrag = e.x - this.xStart
			this.yDrag = e.y - this.yStart
			this.redraw()
		}
	}

	onFingerUp(){
		this.redraw() 
		if(!this.drag) return
		this.drag = undefined
		if(!this.dropInfo) return
		let info = this.dropInfo
		this.dropinfo = undefined

	}

	onDraw(){
		this.child.draw(this,{w:'100%',h:'100%'})

		if(this.drag){
			this.dropInfo = undefined
			// draw drop overlays
			for(var key in this.$views){
				let tabs = this.$views[key]
				if(!(tabs instanceof this.Tabs)) continue
				// check if we are over the dropzone
				let x = this.xDrag+this.xStart
				let y = this.yDrag+this.yStart
				let tx = tabs.$x
				let ty = tabs.$y
				let tw = tabs.$w
				let th = tabs.$h
				let px = tabs.parent.$x
				let py = tabs.parent.$y
				let pw = tabs.parent.$w
				let ph = tabs.parent.$h
				let tth = this.tabHeight
				if(x>tx && x < tx+tw && y>ty && y < ty + th){

					// check if we are tab dropzone
					if(y < ty+tth){
						// we could insert the tab and move back to tabdragging
						this.onTabInsert(tabs)
						break
						//this.drawDrop({x:tx, y:ty, w:tw, h:tth })
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
							this.drawDrop({x:px, y:py, w:pw*0.25, h:ph})
						}
						else{
							this.dropInfo = {tabs:tabs,part:0}
							this.drawDrop({x:tx, y:ty, w:tw*.5, h:th})
						}
					}
					else if(m === r){
						if(tx+tw === px+pw && x > tx+tw-pdock && !(tabs.parent instanceof this.constructor)){
							this.dropInfo = {tabs:tabs.parent,part:1,isParent:1}
							this.drawDrop({x:px+pw*0.75, y:py, w:pw*0.25, h:ph})
						}
						else{
							this.dropInfo = {tabs:tabs,part:0}
							this.drawDrop({x:tx+tw*.5, y:ty, w:tw*.5, h:th})
						}
					}
					else if(m === t){
						if(ty === py && x < ty+pdock && !(tabs.parent instanceof this.constructor)){
							this.dropInfo = {tabs:tabs.parent,part:2,isParent:1}
							this.drawDrop({x:px, y:py, w:pw, h:ph*0.25})
						}
						else{
							this.dropInfo = {tabs:tabs,part:2}
							this.drawDrop({x:tx, y:ty, w:tw, h:th*.5})
						}
					}
					else if(m ===b){
						if(ty+th === py+ph && y > ty+th+pdock && !(tabs.parent instanceof this.constructor)){
							this.dropInfo = {tabs:tabs.parent,part:3,isParent:1}
							this.drawDrop({x:px, y:py+ph*0.75, w:pw, h:ph*0.25})
						}
						else{
							this.dropInfo = {tabs:tabs,part:3}
							this.drawDrop({x:tx, y:ty+th*.5, w:tw, h:th*.5})
						}
					}
				}
			}
			if(this.drag){
				this.drawTab({id:0, state:'selected', x:this.xDrag, y:this.yDrag, text:this.drag.tabTitle})
			}
		}

	}
}