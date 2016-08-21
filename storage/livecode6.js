module.exports=require('apps/drawapp').extend({
data:[{name:'folder1',child:[
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
margin:[0,4,0,0]
}),
Quad:{
w:10,
h:16,
isLast:0,
isFolder:0,
isSide:0,
lineColor:'#7',
myfn:function(a,b){$
return 1.0/sqrt(a+b)
},
pixel:function(){$
var p=vec2(this.w,this.h)*this.mesh.xy
var aa=this.antialias(p)
var hh=this.h+4
if(this.isLast>.5){
hh=this.h*.5+2
}
var I=this.boxField(p,4.,-2,2.,hh,0.5)
var L=0.
if(this.isSide<0.5){
L=this.boxField(p,4.,this.h*.5-2,this.w-4.,2.,0.5)
}
var f=this.unionField(I,L)
return this.colorSolidField(aa,f,this.lineColor)

}
}
},
onDraw:function(){
// lets draw the text
var p=this
var drawText=function(nodes,depth){
for(var i=0,len=nodes.length-1;i<=len;i++){
var node=nodes[i]

for(var j=0;j<=depth;j++){
this.drawQuad({
isLast:j==depth&&i===len?1:0,
isFolder:node.child?1:0,
isSide:j<depth?1:0
})
}

this.drawIcon({
text:node.child?
this.lookupIcon.folder:
this.lookupIcon.fileO
})

this.drawText({
text:node.name
})

this.turtle.lineBreak()

if(node.child){
drawText(node.child,depth+1)
}
}
}.bind(this)
drawText(this.data,0)
}
})