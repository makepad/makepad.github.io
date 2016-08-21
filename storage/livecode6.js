module.exports=require('apps/drawapp').extend({
data:[
{name:'folder1',child:[
{name:'file1'},
{name:'file2'},
{name:'file3'},
{name:'folder6',child:[
{name:'file10'},
{name:'file11'},
{name:'file12'}
]},
]},
{name:'folder2',child:[]},
{name:'folder3',child:[
{name:'file4'},
{name:'file5'},
{name:'file6'}
]},
{name:'folder4',child:[]},
{name:'folder5',child:[
{name:'file7'},
{name:'file8'},
{name:'file9'}
]},
],
tools:{
Text:{
color:'white'
},
Icon:require('shaders/fontawesomeshader').extend({
color:'#a',
padding:[0,0,0,5]
}),
Quad:{
myfn:function(a,b){$
return 1.0/sqrt(a+b)
},
pixel:function(){$
var pixelPos=vec2(this.w,this.h)*this.mesh.xy
var p=(this.mesh.xy-vec2(.5))*2.
var t=this.time
return mix(
'white',
'blue',
abs(
this.myfn(p.x*p.x,p.y*p.y)+sin(atan(p.y,p.x)+t*2*3.14)
)
)
}
}
},
onDraw:function(){
// lets draw the text
var p=this
var drawText=function(nodes,indent){
for(var i=0;i<nodes.length;i++){
var node=nodes[i]
this.turtle.wx=indent
this.drawIcon({
text:this.lookupIcon.folder
})
this.drawText({
text:node.name
})
this.turtle.lineBreak()
if(node.child){
drawText(node.child,indent+10)
}
}
}.bind(this)
drawText(this.data,0)
}
})