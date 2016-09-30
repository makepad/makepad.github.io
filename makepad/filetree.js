module.exports = class FileTree extends require('views/tree'){
	prototype(){
		this.mixin(require('./styles').FileTree,{
			name:'FileTree'
		})
	}

	onNodeSelect(node, path, e){
		if(e.tapCount<1)return
		// compute path for node
		var p = '/'
		for(let i = 0; i < path.length;i++){
			if(i>0) p+= '/'
			p += path[i].name
		}
		this.app.addSourceTab(this.store.resourceMap.get(p))
	}
}