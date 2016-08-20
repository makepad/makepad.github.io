module.exports=require('apps/drawapp').extend({
tools:{Quad:{
pixel:function(){$
var pixelPos=vec2(this.w,this.h)*this.mesh.xy
var p=(this.mesh.xy-vec2(.5))*2.
var t=this.time
return mix(
'white',
'black',
abs(
sin(p.x*10+t)
)
)
}
}},
onDraw:function(){
this.drawQuad({
w:'100%',
h:'100%'
})
}
})