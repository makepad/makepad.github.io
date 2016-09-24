const Worker = require('services/worker')

module.exports = class UserProcess extends require('views/draw'){

	prototype(){
		this.mixin(require('./styles').UserProcess,{
			name:'Probes',
			surface:true
		})
	}

	onRemove(){
		// we have to free all associated resources.
	}

	onDraw(){
		this.drawBg(this.viewGeom)
	}
}