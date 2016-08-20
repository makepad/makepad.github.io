module.exports=require('apps/drawapp').extend({
tools:{
Rect:{color:'#005'},
Branch:require('shaders/quadshader').extend({
path:0,
depth:0,
leaf:0,
rotate2d:function(v,a){$
var ca=cos(a)
var sa=sin(a)

return vec2(
v.x*ca-v.y*sa,
v.x*sa+v.y*ca
)
},
pixel:function(){$
if(this.depth>12.){
var d=length(this.mesh.xy-vec2(.5))*2
var col=mix('#0f0','#f0f',this.leaf)
return mix(col,vec4(col.rgb,0),d)
}
var s=(14.-(this.depth))*0.2
return mix(
vec4('black'.rgb,0.),
'brown',
sin(this.mesh.y*PI)*s
)
},
vertex:function(){$
var depth=int(this.depth)
var fpos=vec2()
this.pickId=-1.
this.isFingerOver(fpos)

var pos=vec2(200,300)
var scale=vec2(50.,50)
var dir=vec2(0,-0.8)
var smaller=vec2(.85,.85)
var path=this.path


for(var i=0;i<14;i++){
if(i>=depth)break
var turnRight=mod(path,2.)
var angle=25.
if(turnRight>0.){
angle=-1.*angle
}
if(i>6){
angle+=sin(this.time+0.02*pos.x)*20.
}
var dist=max(50.-length(fpos-pos),0.)
angle+=dist*1.
//angle+=sin(pos.x+this.time)*2

dir=this.rotate2d(dir,angle*TODEG)
pos+=dir*scale
scale=scale*smaller
path=floor(path/2.)
}

var m=this.rotate2d(
vec2(1.,0.2)*(this.mesh.xy-vec2(1,0.5)),
atan(
dir.y,
dir.x
)
)+vec2(.0,0.)

var v=vec4(
m*scale.xy+pos.xy,
0.,
1.
)

return v*this.viewPosition*this.camPosition*this.camProjection
}
})
},
onDraw:function (){
var p=this
this.drawRect(this.viewGeom)
function recur(path,depth){
p.drawBranch({
leaf:random(),
path:path,
depth:depth
})
if(depth>12)return
recur(path,depth+1)
recur(path+pow(2,depth),depth+1)
}
recur(0,0)
}
})
