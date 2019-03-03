module.exports = class FileTree extends require('base/view'){

	prototype() {
		this.props = {
			data: []
		}
		this.xOverflow='none'
		this.yOverflow='none'
		this.tools = {
			Tree: require('views/tree').extend({
				onNodeSelect: function(...args) {
					this.parent.onNodeSelect(...args)
				}
			}),
			Button: require('views/button').extend({
			}),
			Bg:require('shaders/quad').extend({
				w:'100%',
				padding:[0,0,0,5],
				wrap:false,
				color:module.style.colors.bgNormal
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
		this.app.addSourceTab(this.app.store.resourceMap.get(p))
	}
	
	onDraw() {
		this.beginBg({
		})
		
		this.drawButton({
			id:1,
			icon:'search'
		})

		this.drawButton({
			id:2,
			icon:'copy'
		})

		this.drawButton({
			id:3,
			icon:'exchange'
		})
		this.endBg()
		this.lineBreak()
		/*
		this.drawBg({
			//y:0,
			w:'100%',
			h:'100#',
			color:'red'
		})
		return*/
		this.drawTree({
			data:this.data,
			w:'100%',
			h:'100#'
		})
	}
}