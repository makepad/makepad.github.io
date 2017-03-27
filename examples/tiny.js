new require('styles/dark')

module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.tools = {
			ColorPicker:require('views/colorpicker')
		}
	}
	
	constructor(...args) {
		
		super(...args)
	}
	
	onDraw() {
		this.drawColorPicker({
			
		})
	}
}