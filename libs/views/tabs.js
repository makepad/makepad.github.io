module.exports=class Tabs extends require('base/view'){
	prototype(){
		let colors = module.style.colors
		this.name = 'Tabs'
		this.xOverflow = 'none'
		this.yOverflow = 'none'
		this.selected = 0
		this.wrap = false
		this.tools = {
			Tab:require('stamps/tab').extend({
			}),
			Bg:require('shaders/bg').extend({
				color:colors.bgTop,
				w:'100%'
			})
		}
	}

	onTabSelect(tabStamp){
		this.tabs[this.selected].$tabStamp.dx = 0
		this.selected = tabStamp.index
		this.redraw()
	}

	onTabSlide(tabStamp, dy, e){ 
		var tabs = this.tabs
		for(let i = 0; i <tabs.length;i++){
			tabs[i].$tabStamp.from_dx = 0
		}
		var index = tabStamp.index
		// lets see if we are over 'half' the next one
		let next = tabs[index+1]
		let prev = tabs[index-1]
		if(next && tabStamp.dx > next.$tabStamp.$w*0.5 && index < tabs.length - 1){
			let old = tabs.splice(index, 1)[0]
			let dx = (old.$tabStamp.$x+old.$tabStamp.$w)-(next.$tabStamp.$x+next.$tabStamp.$w)//old.$tabStamp.$x - prev.$x
			old.$tabStamp.xStart -= dx
			old.$tabStamp.dx += dx
			next.$tabStamp.from_dx = -dx
			tabs.splice(index+1,0,old)
			this.selected = index+1
			this.redraw()
		}
		else if(prev && tabStamp.dx < -prev.$tabStamp.$w*0.5 && index > 0){
			let old = tabs.splice(index, 1)[0]
			let dx = old.$tabStamp.$x - prev.$tabStamp.$x
			old.$tabStamp.xStart -= dx
			old.$tabStamp.dx += dx
			prev.$tabStamp.from_dx = -dx
			tabs.splice(index-1,0,old)
			this.selected = index-1
			this.redraw()
		}

		if(tabStamp.$x + tabStamp.dx < -tabStamp.$w*.5 || 
			tabStamp.$x + tabStamp.dx > this.$w - tabStamp.$w*.5 ||
			dy > tabStamp.$h || dy <-tabStamp.$h){
			// rip the tab off
			if(this.onTabRip) this.onTabRip(e)
		}
	}

	onDraw(){
		this.beginBg({})
		let sel = this.selected
		// for(let j = 0;j < this.tabs.length;j++){
		//  	let tab = this.tabs[j]
		//  	console.log(tab.tabTitle, tab.$tabStamp && tab.$tabStamp.text)
		// }
		for(let tabs = this.tabs, i = 0 ; i < this.tabs.length; i++){
			let tab = tabs[i]
			// console.log(sel === i?'selected':'default')
			let stamp = tab.$tabStamp = this.drawTab({
				id:tab.id, // utilize some kind of unique id
				order:sel === i?2:1,
				state:sel === i?'selected':'default',
				lineL:sel !== i-1,
				lineR:sel !== i+1,
				text:tab.tabTitle,
				index:i
			})
			let move = this.transferMove
			if(move && i === move.index){

				this.transferMove = undefined
				// move our finger move to this one
				stamp.xStart = move.xStart
				stamp.yStart = move.yStart
				stamp.start = stamp.toLocal({x:move.xStart,y:move.yStart})
				stamp.dx = 0
				stamp.dxStart = 0
				this.transferFingerMove(move.digit, stamp.$pickId)
			}
			this.turtle.wx -=5
		}
		this.endBg()
		this.lineBreak()
		var tab = this.tabs[sel]
		if(tab) tab.draw(this,{w:'100%',h:'100#'})
	}
}