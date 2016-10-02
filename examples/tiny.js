module.exports = class extends require('base/drawapp'){ //top
	
	prototype() {
		this.tools = {
			Grid: require('tools/grid'),
			Quad: {
				pixel: function() {$
					return mix('white', 'black', 2 * length(this.mesh.xy - .5))
				}
			}
		}
	}
	
	onDraw() {
		this.drawQuad(this.viewGeom)
	}
}