const storage = require('services/storage')

module.exports = class Project extends require('base/store'){

	constructor(config){
		super()
		for(let key in config) this[key] = config[key]
		this.act("init", store=>{
			store.projectTree = {folder: [{name: 'loading'}]} 
			store.resourceList = {}
		})
		Object.seal(this)
	}

	loadProject(fileName){
		return storage.load(fileName).then(result=>{
			// add the project
			var projectTree = JSON.parse(result)

			var allProj = []
			var allNodes = []
			var pathNames = []
			var resourceList = {}
			function walk(node, base){
				node.folder = node.folder.sort((a,b)=>{
					if(a.name < b.name) return -1
				    if(a.name > b.name) return 1
				    return 0
				})
				var folder = node.folder
				if(!node.open) node.open = false
				node.index = {}
				for(let i = 0; i < folder.length; i++){
					var child = folder[i]
					node.index[child.name] = child
					if(child.folder){
						walk(child, base + child.name + '/')
						continue
					}
					var isBinary = child.name.indexOf('.js') !== child.name.length - 3
					var path = '/' + base + child.name
					allNodes.push(child)
					pathNames.push(path)
					allProj.push(storage.load(path, isBinary))
				}
			}
			walk(projectTree, '')

			return Promise.all(allProj, true).then(results => {
				// store all the data in the tree
				for(let i = 0; i < results.length; i++){
					resourceList[pathNames[i]] = {
						node:allNodes[i],
						path:pathNames[i],
						data:results[i],
						trace:''
					}
				}
				// lets store it
				this.act("loadProject",store=>{
					store.projectTree = projectTree
					store.resourceList = resourceList
				})
			}, fail=>{} ,true)
		}, fail=>{}, true)
	}
}