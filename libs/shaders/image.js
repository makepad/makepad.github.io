var types = require('base/types')
var painter = require('services/painter')

module.exports = class Image extends require('shaders/quad'){

	prototype(){
		// special
		this.Atlas = require('base/atlas')
		this.props = {
			offset:[0,0],
			opacity:1,
			size:[0,0],
			imageSampler:{kind:'sampler', sampler:painter.SAMPLER2DLINEAR},
		}

		this.verbs = {
			draw:function(overload){ 
				var img = overload.image
				var index
				if(img.texId){
					overload.imageSampler = img
					index = img
				}
				else{
					var worker = this.app.module.worker
					var $atlasses = worker.$atlasses
					if(!$atlasses) $atlasses = worker.$atlasses = {}
					var $atlas = $atlasses[img.atlas || 0]
					if(!$atlas) $atlas = $atlasses[img.atlas || 0] = new this.NAME.prototype.Atlas()
					var index = $atlas.lookupImage(img)
					overload.imageSampler = $atlas.texture
				}

				if(!('w' in overload)) overload.w = index.w
				if(!('h' in overload)) overload.h = index.h
				this.STYLEPROPS(overload, 1)
				this.ALLOCDRAW(overload)
				this.turtle.walk()
				this.WRITEPROPS({
					offset:index.offset,
					size:index.size
				})
			},
			begin:function(overload){
				this.STYLEPROPS(overload, 3)
				this.ALLOCDRAW(overload)
				this.beginTurtle()
			},
			end:function(doBounds){
				var ot = this.endTurtle(doBounds)
				this.turtle.walk(ot)
				this.WRITEPROPS()
				return ot
			}
		}
	}

	pixel(){$
		var pos = this.mesh.xy*this.size+this.offset
		var col = texture2D(this.imageSampler, pos)
		return col *col.a * this.opacity
	}
}