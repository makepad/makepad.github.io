module.exports = class Tree extends require('base/view'){
	prototype() {
		this.name = 'Tree'
		this.props = {
			data: [
				{name: 'folder1', folder: [
					{name: 'file1'},
					{name: 'file2'}
				]}
			]
		}
		this.hasRootLine = false
		this.hasFolderButtons = false
		this.overflow = 'scroll'
		this.padding = [2, 0, 0, 2]
		this.fontSize = 11
		this.folderTextColor = '#f'
		this.fileTextColor = '#a'
		this.selectedTextColor = '#f'
		this.openWithText = true
		this.tools = {
			Bg: require('tools/bg').extend({
				color: '#3',
				wrap: false,
			}),
			Cursor: require('tools/hover').extend({
				color: '#0000',
				wrap: false,
				selectedColor: [.44, .3, .97, 1.],
				hoverColor: [.44, .3, .97, .6],
				borderRadius: 1,
				pickAlpha: -1,
				tween: 2,
				duration: 0.2,
				displace: [0, -1],
				ease: [0, 10, 0, 0],
				w: '100%-2',
				padding: [0, 0, 0, 2]
			}),
			Text: require('tools/text').extend({
				font: require('fonts/ubuntu_monospace_256.font'),
				tween: 2,
				shadowOffset: [0, 0],
				shadowColor: '#0005',
				shadowBlur: 1,
				duration: 0.2,
				ease: [0, 10, 0, 0],
				color: 'white'
			}),
			Icon: require('tools/icon').extend({
				tween: 2,
				duration: 0.2,
				shadowOffset: [1, 1],
				shadowColor: '#0005',
				shadowBlur: 1,
				ease: [0, 10, 0, 0],
				color: '#a',
				margin: [0, 4, 0, 0]
			}),
			TreeLine: require('tools/shadowquad').extend({
				tween: 2,
				pickAlpha: -1,
				duration: 0.2,
				ease: [0, 10, 0, 0],
				w: 12.5,
				h: 16,
				shadowOffset: [0, 0],
				shadowColor: '#0005',
				isLast: 0,
				isFirst: 0,
				hasFolderButtons: 0,
				isFolder: 0,
				isOpen: 1,
				isSide: 0,
				isFiller: 0,
				lineColor: '#2',
				vertexStyle: function() {},
				pixel: function() {$
					var p = vec2(this.w, this.h) * this.mesh.xy
					var aa = this.antialias(p)
					var hh = this.h + 4
					if(this.isFirst > 0.5 && this.hasFolderButtons < 0.5) {
						// lets draw an animated folder icon
						var fbody = this.boxDistance(p, 0., 4., 11., 9., 1.)
						var ftab = this.boxDistance(p, 0., 2.5, 10. - 4., 10., 1.)
						var ftotal = this.unionDistance(ftab, fbody)
						if(this.mesh.z < .5) {
							return this.colorSolidDistance(aa, ftotal, this.shadowColor)
						}
						var bg = this.colorSolidDistance(aa, ftotal, '#7')
						var dy = 4.5 + this.isOpen * 2.
						var pt = vec2(p.x - (4 - p.y * 0.3) * this.isOpen, p.y)
						var fopen = this.boxDistance(pt, 0., dy, 11., 14. - dy, 1.)
						var fg = this.colorSolidDistance(aa, fopen, '#8')
						return mix(bg, fg, fg.a)
						//return 'red'
					}
					//return 'red'
					if(this.isFiller > .99 && this.hasFolderButtons > .5) return vec4(0.)
					if(this.isLast > .5 && this.hasFolderButtons > .5) {
						hh = this.h * .5 + 2
					}
					
					var B = 0.
					var cen = this.h * .5
					if(this.isFirst < 0.5 || this.hasFolderButtons > .5) {
						B = this.boxDistance(p, 4., -2, 2., hh, 0.5)
					}
					else {
						B = this.boxDistance(p, 4., cen, 2., hh, 0.5)
					}
					var A = 0.
					
					if(this.isSide < 0.5 && this.hasFolderButtons > .5) {
						A = this.boxDistance(p, 4., cen - 2, this.w - 4., 2., 0.5)
					}
					var f = this.unionDistance(B, A)
					if(this.isFolder > .5 && this.hasFolderButtons > .5) {
						// box
						var C = this.boxDistance(p, 1., cen - 5, 8., 8., 1.)
						f = this.unionDistance(f, C)
						// minus
						var D = this.boxDistance(p, 2., cen - 1.5, 6., 1., 1.)
						f = this.subtractDistance(D, f)
						// plus
						var E = this.boxDistance(p, 4.5, cen - 4., 1., 6., 1.)
						f = this.subtractDistance(E + this.isOpen, f)
					}
					var col = this.lineColor
					if(this.mesh.z < .5) col = this.shadowColor
					return this.colorSolidDistance(aa, f, col)
				}
			})
		}
	}
	
	computePath(find) {
		function walker(nodes) {
			for(let i = 0; i < nodes.length; i++) {
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
		var pick = this.pickMap[e.pickId]
		if(!pick) return
		var node = pick.node
		
		if(pick.node.folder && (this.openWithText || pick.type === 'tree' || e.tapCount > 0)) {
			this.store.act('treeToggle', store=>{
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
			for(let i = 0; i < nodes.length; i++) {
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
				this.store.act('treeToggle', store=>{
					sel.open = true
				})
			}
		}
		else if(e.name === 'leftArrow') {
			if(sel && sel.folder) {
				this.store.act('treeToggle', store=>{
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
		this.beginBg(this.viewGeom)
		this.pickMap = {}
		this.pickId = 1
		var p = this
		
		var iterFolder = (node, depth, closed)=>{
			var folder = node.folder
			
			for(var i = 0, len = folder.length - 1; i <= len; i++) {
				var iter = folder[i]
				drawNode(iter.name, folder[i], i, len, depth, closed)
			}
		}
		
		var drawNode = (name, node, i, len, depth, closed)=>{
			//var node=nodes[i]
			var treePick = this.addPickId()
			var textPick = this.addPickId()
			this.pickMap[treePick] = {node: node, type: 'tree'}
			this.pickMap[textPick] = {node: node, type: 'text'}
			this.setPickId(textPick)
			this.beginCursor({
				selected: this.selected === node
			})
			this.setPickId(treePick)
			for(let j = 0, dl = depth.length - 1; j <= dl; j++) {
				var isFolder = j == dl && node.folder? 1: 0
				if(this.hasRootLine || j > 0) 
				this.drawTreeLine({
					isFiller: j == dl? 0: depth[j + 1],
					isLast: j == dl && i === len,
					isFolder: isFolder,
					isSide: j < dl,
					hasFolderButtons: this.hasFolderButtons,
					isOpen: node.open? 1: 0,
					h: closed? 0: this.fontSize + 6
				})
				if(isFolder) { // add the first line from a folder
					//var x=this.turtle.wx// make sure the turtle doesnt move
					this.drawTreeLine({
						isFiller: !node.open,
						isOpen: node.open? 1: 0,
						isFirst: 1,
						isSide: 1,
						hasFolderButtons: 0,
						h: closed? 0: this.fontSize + 6
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
			this.setPickId(textPick)
			this.drawText({
				fontSize: closed? 0: this.fontSize,
				color: this.selected === node? this.selectedTextColor: node.folder? this.folderTextColor: this.fileTextColor,
				text: name
			})
			this.endCursor(true)
			this.turtle.lineBreak()
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