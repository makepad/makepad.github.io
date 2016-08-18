module.exports=require('apps/drawapp').extend({
tools:{Rect:{
col:'red',
id:0,
pixel:function(){$
return mix('red',this.col,abs(
sin(8.*length(
this.mesh.xy-vec2(.5+.5*sin(this.time+this.id))
)+this.time)
))
}
}},
onFingerDown:function(){
this.redraw()
},
onDraw:function(){
for(var i=0;i<100;i++)
this.drawRect({
id:i,
col:[random(),random(),random(),1],
x:(i%10)*100,
y:floor(i/10)*100,
w:100,
h:100
})
}
})