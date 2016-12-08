
module.exports = class extends require('/platform/service'){

	constructor(...args){
		super(...args)
		this.name = 'gamepad1'

		window.addEventListener("gamepadconnected", function(e) {
 			// gamepad connected?
 			//e.gamepad.index, e.gamepad.id,
			//e.gamepad.buttons.length, e.gamepad.axes.length);
		})

		window.addEventListener("gamepaddisconnected", function(e) {
			//console.log("Gamepad disconnected from index %d: %s",
			//e.gamepad.index, e.gamepad.id);
		});

	}



}
