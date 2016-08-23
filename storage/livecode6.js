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
			{name:'file9'},
			
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
		]},
	],
	tools:{
		Text:{
			drawDiscard:'y',
			tween:2,
			duration:0.2,
			ease:[0,10,0,0],
			color:'white'
		},
		Icon:require('shaders/fontawesomeshader').extend({
			drawDiscard:'y',
			tween:2,
			duration:0.2,
			ease:[0,10,0,0],
			color:'#a',
			margin:[0,4,0,0]
		}),
		Quad:{
			drawDiscard:'y',
			tween:2,
			pickAlpha:-1,
			duration:0.2,
			ease:[0,10,0,0],
			w:11,
			h:16,
			isLast:0,
			isFirst:0,
			isFolder:0,
			isOpen:1,
			isSide:0,
			isFiller:0,
			lineColor:'#8',
			vertexStyle:function(){},
			pixel:function(){$
				var p=vec2(this.w,this.h)*this.mesh.xy
				var aa=this.antialias(p)
				var hh=this.h+4
				if(this.isFiller>.99)return vec4(0.)
				if(this.isLast>.5){
					hh=this.h*.5+2
				}
				
				var B=0.
				var cen=this.h*.5
				if(this.isFirst<0.5){
					B=this.boxField(p,4.,-2,2.,hh,0.5)
				}
				else {
					B=this.boxField(p,4.,cen,2.,hh,0.5)
				}
				var A=0.
				
				if(this.isSide<0.5){
					A=this.boxField(p,4.,cen-2,this.w-4.,2.,0.5)
				}
				var f=this.unionField(B,A)
				if(this.isFolder>.5){
					// box
					var C=this.boxField(p,1.,cen-5,8.,8.,1.)
					f=this.unionField(f,C)
					// minus
					var D=this.boxField(p,2.,cen-1.5,6.,1.,1.)
					f=this.subtractField(D,f)
					// plus
					var E=this.boxField(p,4.5,cen-4.,1.,6.,1.)
					f=this.subtractField(E+this.isOpen,f)
				}
				
				return this.colorSolidField(aa,f,this.lineColor)
			}
		}
	},
	fontSize:12,
	onFingerDown:function(e){
		var node=this.pickMap[e.pickId]
		if(node&&node.folder){
			node.folder.closed=!node.folder.closed
			this.redraw()
		}
	},
	onDraw:function(){
		this.pickMap={}
		this.pickId=1
		var p=this
		var drawText=function(nodes,depth,closed){
			for(var i=0,len=nodes.length-1;i<=len;i++){
				var node=nodes[i]
				var pickId=this.pickId++
				this.pickMap[pickId]={node:node}
				for(var j=0,dl=depth.length-1;j<=dl;j++){
					var isFolder=j==dl&&node.child&&node.child.length?1:0
					var pid=pickId
					if(isFolder)this.pickMap[pid=this.pickId++]={folder:node}
					this.setPickId(pid)
					this.drawQuad({
						isFiller:j==dl?0:depth[j+1],
						isLast:j==dl&&i===len?1:0,
						isFolder:isFolder,
						isSide:j<dl?1:0,
						isOpen:node.closed?0:1,
						h:closed?0:this.fontSize+6
					})
					if(isFolder){// add the first line from a folder
						var x=this.turtle.wx// make sure the turtle doesnt move
						this.drawQuad({
							isFiller:node.closed?1:0,
							isFirst:1,
							isSide:1,
							h:closed?0:this.fontSize+6
						})
						this.turtle.wx=x
					}
				}
				this.setPickId(pickId)
				this.drawIcon({
					fontSize:closed?0:this.fontSize,
					text:node.child?
						this.lookupIcon.folder:
						this.lookupIcon.fileO
				})
				this.drawText({
					fontSize:closed?0:this.fontSize,
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
		drawText(this.data,[0],false)
	}
})