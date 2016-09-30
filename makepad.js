var storage = require('services/storage') 
var Worker = require('services/worker') 

var Dock = require('views/dock') 
var Source = require('./makepad/source') 
var FileTree = require('./makepad/filetree') 
var HomeScreen = require('./makepad/homescreen') 
var Settings = require('./makepad/settings') 
var UserProcess = require('./makepad/userprocess') 

var projectFile = "/makepad.json" 
var currentFile = "./examples/windtree.js" 
var ProjectStore = require('base/store') 

module.exports = class Makepad extends require('base/app'){ 
	
	constructor(){
		super()
	
		this.store.act("init",store=>{
			store.projectTree = {}
			store.resourceMap = {}
			store.processList = []
		})

		this.store.observe(this.store.resourceMap, e=>{
			var store = this.store
			// we wanna know if dirty on a resource is flipped
			if(this.store.anyChanges(e, 1, null, 'dirty')){
				this.processTabTitles()
			}
			// data or trace modified
			var source = this.store.anyChanges(e, 1, null, ['data','trace'])
			if(source){
				var resource = source.object
				// find all processes
				var procs = this.app.findAll(/^Process/) 
				for(var i = 0; i < procs.length; i++) { 
					var proc = procs[i] 
					// update resource
					if(resource.path in proc.deps) { 
						proc.reloadWorker()	
					}
				} 				
			}

		})
	}

	loadProject(fileName){
		return storage.load(fileName).then(result=>{
			// add the project
			var projectTree = JSON.parse(result)

			var allProj = []
			var allNodes = []
			var pathNames = []
			var resourceMap = {}
			function walk(node, base){
				node.folder = node.folder.sort((a,b)=>{
					if(a.name < b.name) return -1
				    if(a.name > b.name) return 1
				    return 0
				})
				var folder = node.folder
				if(!node.open) node.open = false
				//node.index = {}
				for(let i = 0; i < folder.length; i++){
					var child = folder[i]
					//node.index[child.name] = child
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
				// store all the data in the resource list
				for(let i = 0; i < results.length; i++){
					resourceMap[pathNames[i]] = {
						node:allNodes[i],
						path:pathNames[i],
						data:results[i],
						trace:'',
						dirty:false,
						processes:[],
						parseErrors:[]
					}
				}
				// lets store it
				this.store.act("loadProject",store=>{
					store.projectTree = projectTree
					store.resourceMap = resourceMap
					store.processList = []
				})

			}, fail=>{} ,true)
		}, fail=>{}, true)
	}
	
	onAfterCompose() { 
		// the setter of data makes it autobind to the store
  		this.find('FileTree').data = this.store.projectTree

		this.loadProject(projectFile).then(store => {

			if(this.destroyed) return  // technically possible

			var resources = this.resources = this.store.resourceMap
			var proj = this.store.projectTree

			if(proj.open) {
				for(var i = 0; i < proj.open.length; i++) { 
					var open = proj.open[i] 
					var resource = resources[storage.buildPath('/', open)] 
					this.addSourceTab(resource, open) 
				} 
			}
			if(!module.worker.hasParent && proj.run) { 
				for(var i = 0; i < proj.run.length; i++) { 
					var run = proj.run[i] 
					var resource = resources[storage.buildPath('/', run)] 
					this.addProcessTab(resource, run) 
				} 
			} 
		}) 
	} 
	
	onAfterDraw() { 
		this.onAfterDraw = undefined 
	} 
	
	findResourceDeps(resource, deps) { 
		var data = resource.trace || resource.data 
		deps[resource.path] = data
		if(typeof data !== 'string') return  
		var code = data.replace(/\/\*[\S\s]*?\*\//g, '').replace(/\/\/[^\n]*/g, '') 
		code.replace(/require\s*\(\s*['"](.*?)["']/g, (m, path)=>{ 
			if(path.charAt(0) === '$') return  
			var mypath = module.worker.buildPath(resource.path, path) 
			var dep = this.resources[mypath] 
			if(!deps[dep.path]) { 
				this.findResourceDeps(dep, deps) 
			} 
		}) 
	} 
	
	// create uniquely identifyable tab titles
	processTabTitles() { 
		var allTabs = this.findAll(/^Source|^Process/) 
		var collide = {} 
		for(var i = 0; i < allTabs.length; i++) { 
			var tab = allTabs[i] 
			if(!tab.resource) continue 
			var path = tab.resource.path 
			var name = path.slice(path.lastIndexOf('/') + 1) 
			if(!collide[name]) collide[name] = {} 
			if(!collide[name][path]) collide[name][path] = [] 
			collide[name][path].push(tab) 
		} 
		for(var name in collide) { 
			var mergePaths = collide[name] 
			var mergeKeys = Object.keys(mergePaths) 
			if(mergeKeys.length > 1) { 
				for(var i = 0; i < mergeKeys.length; i++) { 
					var tabs = mergePaths[mergeKeys[i]] 
					for(var j = 0; j < tabs.length; j++) { 
						var tab = tabs[j] 
						var path = tab.resource.path 
						var rest = path.slice(1, path.lastIndexOf('/')) 
						var text = name + (tab.resource.dirty? "*": "") + ':' + rest 
						if(tab.tabText !== text) { 
							tab.tabText = text 
							tab.parent.redraw() 
						} 
					} 
				} 
			}
			else { 
				var tabs = mergePaths[mergeKeys[0]] 
				for(var i = 0; i < tabs.length; i++) { 
					var tab = tabs[i] 
					var text = name + (tab.resource.dirty? "*": "") 
					if(tab.tabText !== text) { 
						tab.tabText = text 
						tab.parent.redraw() 
					} 
				} 
			} 
		} 
	} 
	
	addSourceTab(resource) { 
		var old = this.find('Source' + resource.path) 
		if(old) { 
			var tabs = old.parent 
			tabs.selectTab(tabs.children.indexOf(old)) 
			return  
		} 
		var tabs = this.find('HomeSource').parent 
		var source = new Source({
			name: 'Source' + resource.path, 
			tabText: resource.path, 
			resource: resource, 
			//text: resource.data, 
			onCloseTab: function() {
				this.app.processTabTitles()
			} 
		}) 
		var idx = tabs.addNewChild(source)
		tabs.selectTab(idx)
		source.setFocus()
		this.processTabTitles()
	} 
	
	addProcessTab(resource) { 
		var old = this.find('Process' + resource.path) 
		if(old) { 
			var tabs = old.parent 
			tabs.selectTab(tabs.children.indexOf(old)) 
			return  
		} 

		var process = this.store.wrap({
			path:resource.path,
			runtimeErrors:[]
		})

		this.store.act("addProcess",store=>{
			store.processList.push(process)
		})

		var tabs = this.find('HomeProcess').parent 
		var idx = tabs.addNewChild(new UserProcess({ 
			name: 'Process' + resource.path, 
			tabText: resource.path, 
			resource: resource, 
			process: process,
			onCloseTab: function() { 
				this.app.processTabTitles() 
			}
		})) 
		tabs.selectTab(idx) 
		this.processTabTitles() 
	} 
	
	onCompose() { 
		
		return [ 
			new Dock({ 
				classes: { 
					HomeScreen: HomeScreen, 
					Source: Source, 
					FileTree: FileTree, 
					Settings: Settings 
				}, 
				data: { 
					mode: 1, 
					locked: false, 
					pos: 95, 
					left: { 
						bottom: false, 
						tabs: [ 
							{type: 'FileTree', tabText: 'Files', open: true, noCloseTab: true}, 
							{type: 'Settings', tabText: '', tabIcon: 'gear', noCloseTab: true} 
						] 
					}, 
					right: { 
						mode: 0, 
						locked: false, 
						pos: 0.5, 
						left: { 
							bottom: false, 
							tabs: [ 
								{type: 'HomeScreen', name: 'HomeSource', tabIcon: 'home', open: true, noCloseTab: true} 
							] 
						}, 
						right: { 
							bottom: false, 
							folded:false,
							tabs: [ 
								{type: 'HomeScreen', name: 'HomeProcess', tabIcon: 'home', open: true, noCloseTab: true} 
							] 
						} 
					} 
				} 
			}) 
		] 
	} 
}