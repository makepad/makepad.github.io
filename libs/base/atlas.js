var types  = require('base/types')
var painter = require('services/painter')
var jpegdecoder = require('codecs/jpegdecoder')
//var pngdecoder = require('codercs/pngdecoder')

module.exports = class Atlas extends require('base/class'){
	prototype(){
		this.width = 4096
		this.height = 4096
		this.buffer = new Uint32Array(this.width*this.height)
		this.wx = 0
		this.mh = 0
		this.wy = 0
		this.border = 2


		this.texture = new painter.Texture({
			format:painter.RGBA,
			type:painter.UNSIGNED_BYTE,
			flags:0,
			//flags:painter.TRANSFER_DATA,
			w:this.width,
			h:this.height
		})
	}

	constructor(){
		super()
		// lets allocate a texture?
		this.index = {}
	}

	// alright 
	lookupImage(image){

		// lets find a way to pack this image into the texture
		// and store our image in the index
		var path = image.module.path
		var index = this.index[path]
		if(index) return index
		// ok so lets check if its loaded
		if(!image.decoded){
			var ext = path.slice(path.lastIndexOf('.')+1).toLowerCase()
			if(ext === 'jpg' || ext === 'jpeg'){
				image.decoded = jpegdecoder(image)
			}
		}
		var dec = image.decoded
		// now we need to allocate a chunk in the atlas.
		if(this.wx + this.border + dec.width > this.width){
			this.wy += this.mh + this.border
			this.wx = 0
			this.mh = 0
		}
		if(this.wx + this.border + dec.width > this.width || 
			this.wy + this.border + dec.height > this.height){
			return console.error('Image is too large to fit atlas')
		}
		// lets copy our image into the buffer
		var out = this.buffer//new Uint32Array(this.buffer)
		var inp = new Uint32Array(dec.data.buffer)
		var wx = this.wx
		var wy = this.wy
		var iheight = dec.height
		var iwidth = dec.width
		var owidth = this.width
		var oheight = this.height
		for(var y = 0; y < iheight; y++){
			for(var x = 0; x < iwidth; x++){
				out[(x+wx)+(y+wy)*owidth] = inp[(x + y * iwidth)]
			}
		}

		this.wx += iwidth + this.border
		if(iheight < this.mh) this.mh = iheight

		this.texture.update({
		 	array:this.buffer
		})

		return this.index[path] = {
			w:iwidth,
			h:iheight,
			offset:[wx/owidth, wy/oheight],
			size:[iwidth / owidth, iheight / oheight]
		}

	}
}	