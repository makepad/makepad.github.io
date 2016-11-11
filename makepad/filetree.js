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
			ButtonBar: require('base/view').extend({
				tools:{
					Button: require('stamps/button').extend({
				
					}),
					Bg:require('tools/bg').extend({
						color:'#3'
					})
				},
				onDraw(){
					this.beginBg(this.viewGeom)
					this.drawButton({icon: 'trash',align:[1,0]})
					this.drawButton({icon: 'plus',align:[0,0]})
					this.endBg(true)
				}
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
	}
	
	onCompose() {
		return [
			new this.ButtonBar({
				name:'ButtonBar',
				y:NaN,
				h:38,
				down:1,
			}),
			new this.Tree({
				y:NaN,
				name: 'Tree'
			})
		]
	}
}