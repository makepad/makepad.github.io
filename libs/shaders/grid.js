module.exports = class Grid extends require('shaders/quad'){ 
	prototype() { 
		this.bgColor = 'gray' 
		this.lineColor 
		this.zoom = 1. 
	} 
	pixel() {$ 
		
		//this.pixelStyle()
		var p = this.mesh.xy * vec2(this.w, this.h + 1.) 
		var aa = this.antialias(p) 
		var z = 10000. / this.zoom 
		z /= pow(5., floor(log(1000. / this.zoom) / log(5.))) 
		var v = this.boxDistance(mod(p, vec2(z, this.h)), 0., 0., 2., this.h + 1, 1.) 
		var h = this.boxDistance(mod(p, vec2(this.w, 20.)), 0., 0., this.w, 2., 1.) 
		var f = this.unionDistance(h, v) 
		return this.colorSolidDistance(aa, f, '#4') 
		/*
	// background field
	
	var fHan=0.
	
	fHan=this.boxDistance(p,0.,(this.h-this.handleSize)*this.handlePos,this.w,this.handleSize,this.borderRadius)
	
	// mix the fields
	var finalBg=mix(this.bgColor,vec4(this.bgColor.rgb,0.),clamp(fBg*aa+1.,0.,1.))
	return mix(this.handleColor,finalBg,clamp(fHan*aa+1.,0.,1.))
	*/
	} 
}