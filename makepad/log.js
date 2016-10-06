module.exports = class Wave extends require('views/draw'){ 
	
	prototype() { 
		this.props = { 
		} 
		this.tools = {
		} 
	} 
	
	constructor(...args) { 
		super(...args) 
	}
	
	onDestroy(){
	}

	onDraw() { 
		this.beginBg(this.viewGeom)
		
		// ok yes we need a virtual viewport log window.
		// hows that going to work.
		// lets draw the list!
		// ok so how does this look
		

		this.endBg(true)
	}
}