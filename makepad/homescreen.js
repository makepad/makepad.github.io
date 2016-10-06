
module.exports = class HomeScreen extends require('views/draw'){
	prototype(){
		this.mixin(require('./styles').HomeScreen,{
			name:'HomeScreen',
			overflow:'scroll'
		})
		this.texts = {
			HomeSource:
			'Welcome to MakePad! Makepad is a live code editor.\n'+
			'The Goal of makepad is make programming enjoyable and learn through play.\n\n'+
			'Try opening an example on the left and clicking Play. Updates to these files will be Live\n'+
			'All new source files opened will appear where this tab is\n',
			HomeLogs:
			'Log output\n'+
			'All new logs opened will appear where this tab is\n',
			HomeProcess:
			'Running programs\n'+
			'All new programs started will appear where this tab is\n',
		}
	}

	onDraw(){
		this.beginBg(this.viewGeom)
		this.drawText({
			text:this.texts[this.name]
		})
		this.endBg(true)
	}

	onCompose(){
		
	}
}