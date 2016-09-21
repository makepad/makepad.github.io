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
		Background:require('tools/quad').extend({
			color:'#6',
			wrap:false,
		}),
		Cursor:require('tools/hover').extend({
			color:'#0000',
			wrap:false,
			selectedColor:'#779',
			hoverColor:'#5',
			borderRadius:5,
			pickAlpha:-1,
			tween:2,
			duration:0.2,
			displace:[0,-1],
			ease:[0,10,0,0],
			w:'100%-2',
			padding:[0,0,0,2]
		}),
		Text:require('tools/text').extend({
			font:require('fonts/ubuntu_monospace_256.font'),
			tween:2,
			shadowOffset:[1,1],
			shadowColor:'#0005',
			shadowBlur:1,
			duration:0.2,
			ease:[0,10,0,0],
			color:'white'
		}),
		Icon:require('tools/icon').extend({
			tween:2,
			duration:0.2,
			shadowOffset:[1,1],
			shadowColor:'#0005',
			shadowBlur:1,
			ease:[0,10,0,0],
			color:'#a',
			margin:[0,4,0,0]
		}),
		TreeLine:require('tools/shadowquad').extend({
			tween:2,
			pickAlpha:-1,
			duration:0.2,
			ease:[0,10,0,0],
			w:11,
			h:16,
			shadowOffset:[1,1],
			shadowColor:'#0005',
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
					B=this.boxDistance(p,4.,-2,2.,hh,0.5)
				}
				else {
					B=this.boxDistance(p,4.,cen,2.,hh,0.5)
				}
				var A=0.
				
				if(this.isSide<0.5){
					A=this.boxDistance(p,4.,cen-2,this.w-4.,2.,0.5)
				}
				var f=this.unionDistance(B,A)
				if(this.isFolder>.5){
					// box
					var C=this.boxDistance(p,1.,cen-5,8.,8.,1.)
					f=this.unionDistance(f,C)
					// minus
					var D=this.boxDistance(p,2.,cen-1.5,6.,1.,1.)
					f=this.subtractDistance(D,f)
					// plus
					var E=this.boxDistance(p,4.5,cen-4.,1.,6.,1.)
					f=this.subtractDistance(E+this.isOpen,f)
				}
				var col=this.lineColor
				if(this.mesh.z<.5)col=this.shadowColor
				return this.colorSolidDistance(aa,f,col)
			}
		})
	},
	fontSize:11,
	computePath:function(find){
		function walker(nodes){
			for(let i=0;i<nodes.length;i++){
				var node=nodes[i]
				if(node === find) return [node]
				if(node.folder&&!node.closed){
					var path = walker(node.folder)
					if(path){
						path.unshift(node)
						return path
					}
				}
			}
		}
		return walker(this.data.folder, find)
	},
	onFingerDown:function(e){
		this.setFocus()
		var node=this.pickMap[e.pickId]
		if(node&&node.folder){
			node.closed=!node.closed
			this.redraw()
		}
	
		// lets select something
		if((this.selected!==node || e.tapCount > 0) && node && !node.folder && this.onNodeSelect)this.onNodeSelect(node, this.computePath(node))

		if(this.selected!==node){
			this.selected=node
			this.redraw()
		}

	},
	onKeyDown:function(e){
		var list=[]
		function flattenTree(nodes){
			for(let i=0;i<nodes.length;i++){
				var node=nodes[i]
				list.push(nodes[i])
				if(node.folder&&!node.closed){
					flattenTree(node.folder)
				}
			}
		}
		flattenTree(this.data.folder)
		var sel=this.selected
		
		// lets find the next or prev treenode
		if(e.name==='downArrow'){
			var idx=list.indexOf(sel)+1
			this.selected=list[idx]||list[list.length-1]
		}
		else if(e.name==='upArrow'){
			var idx=list.indexOf(sel)-1
			this.selected=list[idx]||list[0]
		}
		else if(e.name==='rightArrow'){
			if(sel&&sel.folder)sel.closed=false
		}
		else if(e.name==='leftArrow'){
			if(sel&&sel.folder)sel.closed=true
		}
		this.redraw()
	},
	onDraw:function(){
		//alright so how are we going to select things
		
		this.beginBackground(this.viewGeom)
		this.pickMap={}
		this.pickId=1
		var p=this
		var drawText=function(nodes,depth,closed){
			for(let i=0,len=nodes.length-1;i<=len;i++){
				var node=nodes[i]
				this.pickMap[this.addPickId()]=node

				this.beginCursor({
					selected:this.selected===node
				})
				for(let j=0,dl=depth.length-1;j<=dl;j++){
					var isFolder=j==dl&&node.folder&&node.folder.length?1:0
					//var pid=pickId
					//if(isFolder)this.pickMap[pid=this.pickId++]=node
					//this.setPickId(pid)
					this.drawTreeLine({
						isFiller:j==dl?0:depth[j+1],
						isLast:j==dl&&i===len,
						isFolder:isFolder,
						isSide:j<dl,
						isOpen:!node.closed,
						h:closed?0:this.fontSize+6
					})
					if(isFolder){// add the first line from a folder
						var x=this.turtle.wx// make sure the turtle doesnt move
						this.drawTreeLine({
							isFiller:node.closed,
							isFirst:1,
							isSide:1,
							h:closed?0:this.fontSize+6
						})
						this.turtle.wx=x
					}
				}
				//this.setPickId(pickId)
				if(node.folder){
					this.drawIcon({
						fontSize:closed?0:this.fontSize+1,
						text:node.folder?
							this.lookupIcon.folder:
							this.lookupIcon.fileO
					})
				}
				else this.turtle.wx+=2
				this.drawText({
					fontSize:closed?0:this.fontSize,
					text:node.name
				})
				this.endCursor()
				this.turtle.lineBreak()
				if(node.folder){
					depth.push(i==len)
					
					drawText(node.folder,depth,closed||node.closed)
					depth.pop()
				}
				
			}
		}.bind(this)
		if(this.data&&this.data.folder)drawText(this.data.folder,[0],false)
		this.endBackground()
	}
})