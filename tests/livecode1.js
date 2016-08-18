module.exports=require('apps/drawapp').extend({
tools:{Rect:{
col:'red',
pixel:function(){$
return mix('#7e2',this.col,abs(
sin(8.*length(
this.mesh.xy-vec2(.5)
)+this.time)
))
}
}},
onDraw:function(){
for(var i=0;i<100;i++)
this.drawRect({
col:[random(),random(),random(),1],
x:(i%10)*100,
y:floor(i/10)*100,
w:100,
h:100
})
}
})