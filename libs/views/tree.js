module.exports = class Tree extends require('base/view'){
	
	// default style sheet
	
	prototype() {
		let colors = module.style.colors
		let fonts = module.style.fonts
		
		this.wrap = false
		this.name = 'Tree'
		this.hasRootLine = false
		this.hasFolderButtons = false
		this.openWithText = true
		this.cursorMargin = [0, 0, 2, 1]
		this.fontSize = fonts.size
		
		this.props = {
			data:[
				{name:'folder1', folder:[
					{name:'file1'},
					{name:'file2'}
				]}
			]
		}
		
		this.overflow = 'scroll'
		this.states = {
			default:{
				duration:0.3,
				time    :{fn:'ease', begin:0, end:10},
				to      :{
					Text    :{
						x       :null,
						y       :null,
						fontSize:null
					},
					Cursor  :{
						x:null,
						y:null,
						w:null,
						h:null
					},
					TreeLine:{
						x     :null,
						y     :null,
						w     :null,
						h     :null,
						isOpen:null
					}
				}
			}
		}
		this.tools = {
			Bg      :require('shaders/quad').extend({
				queue  :false,
				wrap   :false,
				padding:[6, 0, 0, 9],
				color  :colors.bgHi
			}),
			Cursor  :require('shaders/hover').extend({
				queue        :false,
				wrap         :false,
				displace     :[0, -1],
				color        :colors.bgHi,
				selectedColor:colors.accentNormal,
				hoverColor   :colors.accentGray,
				pickAlpha    :-1,
				w            :'100%-2'
			}),
			Text    :require('shaders/text').extend({
				queue:false,
				font :fonts.regular,
				color:colors.textNormal
			}),
			Icon    :require('shaders/icon').extend({
				queue:false,
			}),
			TreeLine:require('shaders/shadowquad').extend({
				queue           :false,
				isLast          :0,
				isFirst         :0,
				isFolder        :0,
				isOpen          :1,
				isSide          :0,
				
				isFiller        :0,
				pickAlpha       :{kind:'uniform', value:-1},
				w               :12.6,
				h               :16,
				
				hasFolderButtons:{kind:'uniform', value:0},
				lineColor       :{kind:'uniform', value:colors.accentGray},
				folderBase      :{kind:'uniform', value:colors.textMed},
				folderHighlight :{kind:'uniform', value:colors.textAccent},
				vertexStyle     :function() {},
				pixel           :function() {$
					this.viewport()
					
					var hh = this.h + 4
					if(this.isFirst > 0.5 && this.hasFolderButtons < 0.5) {
						// lets draw an animated folder icon
						this.box(0., 4., 11., 9., 1.)
						this.box(0., 2.5, 10. - 4., 10., 1.)
						
						if(this.mesh.z < .5) {
							return this.fill(this.shadowColor)
						}
						this.fill(this.folderBase)
						this.pos = vec2(this.pos.x - (4 - this.pos.y * 0.3) * this.isOpen, this.pos.y)
						var dy = 4.5 + this.isOpen * 2.
						this.box(0., dy, 11., 14. - dy, 1.)
						return this.fill(this.folderHighlight)
					}
					
					if(this.isFiller > .99 && this.hasFolderButtons > .5) return vec4(0.)
					if(this.isLast > .5 && this.hasFolderButtons > .5) {
						hh = this.h * .5 + 2
					}
					
					//var B=0.
					var cen = this.h * .5
					if(this.isFirst < 0.5 || this.hasFolderButtons > .5) {
						this.box(4., -2, 2., hh, 0.5)
					}
					else {
						this.box(4., cen, 2., hh, 0.5)
					}
					
					if(this.isSide < 0.5 && this.hasFolderButtons > .5) {
						this.box(4., cen - 2, this.w - 4., 2., 0.5)
					}
					
					if(this.isFolder > .5 && this.hasFolderButtons > .5) {
						// box
						this.box(1., cen - 5, 8., 8., 1.)
						// minus
						this.box(2., cen - 1.5, 6., 1., 1.)
						this.subtract()
						// plus
						this.box(4.5, cen - 4., 1., 6., 1.)
						this.field += this.isOpen
						this.subtract()
					}
					if(this.mesh.z < .5) return this.fill(this.shadowColor)
					return this.fill(this.lineColor)
				}
			})
		}
	}
	
	computePath(find) {
		function walker(nodes) {
			for(let i = 0;i < nodes.length;i++){
				var node = nodes[i]
				if(node === find) return [node]
				if(node.folder && !node.closed) {
					var path = walker(node.folder)
					if(path) {
						path.unshift(node)
						return path
					}
				}
			}
		}
		return walker(this.data.folder, find)
	}
	
	onFingerDown(e) {
		this.setFocus()
		var pick = this.pickIds[e.pickId]
		if(!pick) return
		var node = pick.node
		
		if(pick.node.folder && (this.openWithText || pick.type === 'tree' || e.tapCount > 0)) {
			this.app.store.act('treeToggle', store=>{
				node.open = !node.open
			})
			this.redraw()
		}
		else {
			// lets select something
			if((this.selected !== node || e.tapCount > 0) && node && this.onNodeSelect) {
				this.onNodeSelect(node, this.computePath(node), e)
			}
			
			if(this.selected !== node) {
				this.selected = node
				this.redraw()
			}
		}
	}
	
	onKeyDown(e) {
		var list = []
		function flattenTree(nodes) {
			for(let i = 0;i < nodes.length;i++){
				var node = nodes[i]
				list.push(nodes[i])
				if(node.folder && node.open) {
					flattenTree(node.folder)
				}
			}
		}
		flattenTree(this.data.folder)
		var sel = this.selected
		
		// lets find the next or prev treenode
		if(e.name === 'downArrow') {
			var idx = list.indexOf(sel) + 1
			this.selected = list[idx] || list[list.length - 1]
			
		}
		else if(e.name === 'upArrow') {
			var idx = list.indexOf(sel) - 1
			this.selected = list[idx] || list[0]
		}
		else if(e.name === 'rightArrow') {
			if(sel && sel.folder) {
				this.app.store.act('treeToggle', store=>{
					sel.open = true
				})
			}
		}
		else if(e.name === 'leftArrow') {
			if(sel && sel.folder) {
				this.app.store.act('treeToggle', store=>{
					sel.open = false
				})
			}
		}
		else if(e.name === 'enter' || e.name === 'space') {
			this.onNodeSelect(sel, this.computePath(sel), e)
		}
		this.redraw()
	}
	
	onDraw(debug) {
		//alright so how are we going to select things
		this.beginBg({moveScroll:0, x:'0', y:'0', w:'100%', h:'100%'})
		this.freePickIds()
		//this.clearPickIds()
		var p = this
		
		var iterFolder = (node, depth, closed) =>{
			var folder = node.folder
			
			for(var i = 0, len = folder.length - 1;i <= len;i++){
				var iter = folder[i]
				drawNode(iter.name, folder[i], i, len, depth, closed)
			}
		}
		
		var drawNode = (name, node, i, len, depth, closed) =>{
			//var node=nodes[i]
			//var treePick = 0//this.allocPickId()
			//var textPick = 0//this.allocPickId()
			//this.pickMap[treePick] = {node:node, type:'tree'}
			//this.pickMap[textPick] = {node:node, type:'text'}
			//this.setPickId(textPick)			
			//this.setPickId(treePick)
			this.allocPickId({node:node, type:'tree'}, true)
			for(let j = 0, dl = depth.length - 1;j <= dl;j++){
				var isFolder = j == dl && node.folder?1:0
				if(this.hasRootLine || j > 0) 
				this.drawTreeLine({
					isFiller        :j == dl?0:depth[j + 1],
					isLast          :j == dl && i === len,
					isFolder        :isFolder,
					isSide          :j < dl,
					dump            :1,
					hasFolderButtons:this.hasFolderButtons,
					isOpen          :node.open?1:0,
					h               :closed?0:this.fontSize + 6
				})
				if(isFolder) { // add the first line from a folder
					//var x=this.turtle.wx// make sure the turtle doesnt move
					this.drawTreeLine({
						isFiller        :!node.open,
						isOpen          :node.open?1:0,
						isFirst         :1,
						isSide          :1,
						hasFolderButtons:0,
						h               :closed?0:this.fontSize + 6
					})
					//this.turtle.wx=x
				}
			}
			if(node.folder && this.hasFolderButtons || node.icon) {
				//this.drawFolder({
				//	w:this.fontSize+2,
				//	h:closed?0:this.fontSize+4
				//})
				//this.drawIcon({
				//	fontSize:closed?0:this.fontSize+1,
				//	text:node.icon?this.lookupIcon[node.icon]:node.folder?
				//		this.lookupIcon['folder-open']:
				//		this.lookupIcon.fileO
				//})
			}
			else this.turtle.wx += 2
			//this.setPickId(textPick)
			this.allocPickId({node:node, type:'text'}, true)
			if(this.selected === node) {
				this.scrollIntoView(0,this.turtle.wy,1,20)
			}
			
			this.beginCursor({
				selected:this.selected === node
			})
			
			this.drawText({
				margin  :closed?0:this.cursorMargin,
				fontSize:closed?0:this.fontSize,
				color   :this.selected === node?this.selectedTextColor:node.folder?this.folderTextColor:this.fileTextColor,
				text    :name
			})
			
			this.endCursor()
			this.lineBreak()
			if(node.folder) {
				depth.push(i == len)
				iterFolder(node, depth, closed || !node.open)
				depth.pop()
			}
		}
		if(this.data && this.data.folder) iterFolder(this.data, [0], false)
		this.endBg(true)
	}
}