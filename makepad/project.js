const storage = require('services/storage')

exports.loadProjectTree = function loadProjectTree(projectTree){
	return new Promise(function(resolve, reject){
		var allProj = []
		var allNodes = []
		var pathNames = []
		var resources = {}
		function walk(node, base){
			var folder = node.folder
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

		Promise.all(allProj).then(function(results){
			// store all the data in the tree
			for(let i = 0; i < results.length; i++){
				resources[pathNames[i]] = {
					node:allNodes[i],
					path:pathNames[i],
					data:results[i]
				}
			}
			resolve(resources)
		})
	})
}

exports.projectToResources = function projectToResources(projectTree){
	var resources = {}
	function walk(folder, base){
		for(let i = 0; i < folder.length; i++){
			var child = folder[i]
			if(child.folder){
				if(base === './libs/') walk(child.folder, 'libs/'+child.name + '/')
				else walk(child.folder, base + child.name + '/')
				continue
			}
			var store = base+child.name
			if(typeof oldResourcesOrNode === 'object'){
				if(oldResourcesOrNode[store] !== child.data){
					oldResourcesOrNode[store] = child.data
					resources[store] = child.data
				}
			}
			else{
				resources[store] = oldResourcesOrNode?child:child.data
			}
		}
	}
	walk(projectTree.folder, './')
	return resources
}