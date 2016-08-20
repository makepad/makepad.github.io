module.exports=require('apps/drawapp').extend({
tools:{Quad:{
myfn:function(a,b){$
return a+b
},
pixel:function(){$
var pixelPos=vec2(this.w,this.h)*this.mesh.xy
var p=(this.mesh.xy-vec2(.5))*2.
var t=this.time
return mix(
'white',
'blue',
abs(
sin(p.x*this.myfn(5.,5.)+t)
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