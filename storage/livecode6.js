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
{name:'folder3',closed:true,child:[
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
w:11,
h:16,
isLast:0,
isFolder:0,
isSide:0,
isFiller:0,
lineColor:'#8',
vertexStyle:function(){},
pixel:function(){$
var p=vec2(this.w,this.h)*this.mesh.xy
var aa=this.antialias(p)
var hh=this.h+4
if(this.isFiller>.5)return vec4(0.)
if(this.isLast>.5){
hh=this.h*.5+2
}

var I=this.boxField(p,4.,-2,2.,hh,0.5)
var L=0.
if(this.isSide<0.5){
L=this.boxField(p,4.,this.h*.5-2,this.w-4.,2.,0.5)
}
var f=this.unionField(I,L)
if(this.isFolder>.5){
// box
var P=this.boxField(p,1.,3.,8.,8.,1.)
f=this.unionField(f,P)
// minus
var D=this.boxField(p,2.,6.5,6.,1.,1.)
f=this.subtractField(D,f)
}

return this.colorSolidField(aa,f,this.lineColor)
}
}
},
lineHeight:16,
onFingerDown:function(e){
console.log(e.pickId,this.pickMap[e.pickId])
},
onDraw:function(){
// lets draw the text
this.pickMap={}
this.pickId=1
var p=this
var drawText=function(nodes,depth,closed){
for(var i=0,len=nodes.length-1;i<=len;i++){
var node=nodes[i]
var pickId=this.pickId++
this.pickMap[pickId]={node:node}
for(var j=0,dl=depth.length-1;j<=dl;j++){
var isFolder=j==dl&&node.child?1:0
var pid=pickId
if(isFolder)this.pickMap[pid=++this.pickId]={folder:node}
this.setPickId(pid)
this.drawQuad({
isFiller:j==dl?0:depth[j+1],
isLast:j==dl&&i===len?1:0,
isFolder:isFolder,
isSide:j<dl?1:0,
h:this.lineHeight
})
}
this.setPickId(pickId)
this.drawIcon({
text:node.child?
this.lookupIcon.folder:
this.lookupIcon.fileO
})
this.setPickId(pickId)
this.drawText({
text:node.name
})

this.turtle.lineBreak()

if(node.child){
depth.push(i==len?1:0)
drawText(node.child,depth,closed||node.closed)
depth.pop()
}
}
}.bind(this)
drawText(this.data,[0])
}
})