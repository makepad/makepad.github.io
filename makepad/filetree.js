module.exports = class FileTree extends require('base/view'){

	baseStyle(style){
		style.to = {
		}
	}

	prototype() {
		this.props = {
			data: []
		}
		this.tools = {
			Tree: require('views/tree').extend({
				onNodeSelect: function(...args) {
					this.parent.onNodeSelect(...args)
				}
			}),
			Button: require('stamps/button').extend({
			}),
			Bg:require('shaders/bg').extend({
				color:'#3'
			})
		}
		this.mixin({
			name: 'FileTree'
		})
	}
	
	onNodeSelect(node, path, e) {
		if(e.tapCount < 1) return
		// compute path for node
		var p = '/'
		for(let i = 0; i < path.length; i++) {
			if(i > 0) p += '/'
			p += path[i].name
		}
		this.app.addSourceTab(this.store.resourceMap.get(p))
	}
	
	onDraw() {
		/*
		this.drawBg({
			x:0,
			y:0,
			w:'100%',
			h:'100%',
			color:'red'
		})*/
		this.drawTree({
			data:this.data,
			w:'100%',
			h:'100%'
		})
	}
}