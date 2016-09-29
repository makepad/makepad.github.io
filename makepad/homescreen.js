
module.exports = class HomeScreen extends require('views/draw'){
	prototype(){
		this.mixin(require('./styles').HomeScreen,{
			name:'HomeScreen',
			overflow:'scroll'
		})
	}

	onDraw(){
		this.beginBg(this.viewGeom)
		this.drawText({
			text:this.name==='SourceHome'?
			'Welcome to MakePad! Makepad is a live code editor.\n'+
			'The Goal of makepad is make programming enjoyable and learn through play.\n\n'+
			'Try opening an example on the left and clicking Play. Updates to these files will be Live'
			:''
		})
		this.endBg(true)
	}

	onCompose(){
		
	}
}