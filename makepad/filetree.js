module.exports = class FileTree extends require('views/tree'){
	prototype() {
		this.props = {
			data: {inward: 'Tree', prop: 'data'}
		}
		this.tools = {
			Tree: require('views/tree').extend(require('./styles').FileTree, {
				onNodeSelect: function(...args) {
					this.parent.onNodeSelect(...args)
				}
			}),
			Button: require('tools/button').extend({
				
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
		this.drawButton({icon: 'plus', w: '50%'})
		this.drawButton({icon: 'trash', w: '50%'})
	}
	
	onCompose() {
		return [
			new this.Tree({
				y: '36',
				name: 'Tree'
			})
		]
	}
}