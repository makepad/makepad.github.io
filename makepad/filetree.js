module.exports = class FileTree extends require('base/view'){

	defaultStyle(style){
		style.to = {
			Bg:{
				color:style.colors.bgTop
			}
		}
	}

	prototype() {
		this.props = {
			data: {inward: 'Tree', prop: 'data'}
		}
		this.tools = {
			Tree: require('views/tree').extend({
				onNodeSelect: function(...args) {
					this.parent.onNodeSelect(...args)
				}
			}),
			Button: require('tools/button').extend({
				
			}),
			Bg:require('tools/bg').extend({
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
		this.beginBg(this.viewGeom)
		this.drawButton({icon: 'plus', w: '50%'})
		this.drawButton({icon: 'trash', w: '50%'})
		this.endBg()
	}
	
	onCompose() {
		return [
			new this.Tree({
				y: '26',
				name: 'Tree'
			})
		]
	}
}