module.exports = require('base/view').extend({
	name:'Tree',
	props:{
		data:[
			{name:'folder1',folder:[
				{name:'file1'},
				{name:'file2'}
			]}
		]
	},
	padding:[2,0,0,2],

	tools:{
		Background:require('tools/background').extend({
			color:'#2',
			wrap:false,
		}),
		Selection:require('tools/rect').extend({

		}),
		Text:require('tools/font').extend({
			font:require('fonts/ubuntu_monospace_256.font'),
			tween:2,
			duration:0.2,
			ease:[0,10,0,0],
			color:'white'
		}),
		Icon:require('tools/icon').extend({
			tween:2,
			duration:0.2,
			ease:[0,10,0,0],
			color:'#a',
			margin:[0,4,0,0]
		}),
		Quad:require('tools/quad').extend({
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
		})
	},
	fontSize:11,
	onFingerDown:function(e){
		var node = this.pickMap[e.pickId]
		if(node && node.folder){
			node.folder.closed=!node.folder.closed
			this.redraw()
		}
		// lets select something
		
	},
	onDraw:function(){
		this.beginBackground(this.viewGeom)
		this.pickMap={}
		this.pickId=1
		var p=this
		var drawText=function(nodes,depth,closed){
			for(var i=0,len=nodes.length-1;i<=len;i++){
				var node=nodes[i]
				var pickId=this.pickId++
				this.pickMap[pickId]={node:node}
				for(var j=0,dl=depth.length-1;j<=dl;j++){
					var isFolder=j==dl&&node.folder&&node.folder.length?1:0
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
				if(node.folder){
					this.drawIcon({
						fontSize:closed?0:this.fontSize+1,
						text:node.folder?
							this.lookupIcon.folder:
							this.lookupIcon.fileO
					})
				}
				else this.turtle.wx += 2
				this.drawText({
					fontSize:closed?0:this.fontSize,
					text:node.name
				})
				this.turtle.lineBreak()
				if(node.folder){
					depth.push(i==len?1:0)
					
					drawText(node.folder,depth,closed||node.closed)
					depth.pop()
				}
				
			}
		}.bind(this)
		if(this.data && this.data.folder) drawText(this.data.folder,[0],false)
		this.endBackground()
	}
})