module.exports = require('tools/quad').extend({
	pixel:function(){$
		return 'red'
		/*
		this.pixelStyle()
		var p = this.mesh.xy * vec2(this.w, this.h)
		var aa = this.antialias(p)
		
		// background field
		var fBg = this.boxDistance(p, 0., 0., this.w, this.h, this.borderRadius)

		var fHan = 0.						
		if(this.vertical < 0.5){
			fHan = this.boxDistance(p, (this.w-this.handleSize)*this.handlePos, 0., this.handleSize, this.h, this.borderRadius)
		}
		else{
			fHan = this.boxDistance(p, 0., (this.h-this.handleSize)*this.handlePos, this.w, this.handleSize, this.borderRadius)
		}
		
		// mix the fields
		var finalBg = mix(this.bgColor, vec4(this.bgColor.rgb, 0.), clamp(fBg*aa+1.,0.,1.))
		return mix(this.handleColor, finalBg, clamp(fHan * aa + 1., 0., 1.))
		*/
	}
})