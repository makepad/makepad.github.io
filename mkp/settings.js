module.exports = class Settings extends require('views/draw'){
	prototype(){
		this.mixin(require('./styles').Settings,{
			name:'Settings',
			Bg:{
				color:'#3'
			}
		})
	}
	
	onDraw(){
		this.beginBg(this.viewGeom)
		this.drawText({
			text:'...'
		})
		this.draw
		this.endBg()
	}

	onTabShow(){
		var dock = this.app.find('Dock')
		dock.toggleSplitterSettings(true)
		dock.toggleTabSettings(true)
	}

	onTabHide(){
		var dock = this.app.find('Dock')
		dock.toggleSplitterSettings(false)
		dock.toggleTabSettings(false)
	}
}