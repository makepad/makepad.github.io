module.exports=require('apps/drawapp').extend({
tools:{Rect:{
pixel:function(){$
return mix('#7e2','#10f',abs(
sin(8.*length(
this.mesh.xy-vec2(.5)
)+this.time)
))
}
}},
onDraw:function(){
for(var i=0;i<100;i++)
this.drawRect({
x:(i%10)*100,
y:floor(i/10)*100,
w:100,
h:100
})
}
})