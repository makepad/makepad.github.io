new require('styles/dark')

var storage = require('services/storage')
var Worker = require('services/worker')

var projectFile = "/makepad.json"
var currentFile = "./examples/windtree.js"
var ProjectStore = require('base/store')
var matchCache = {}

module.exports = class Makepad extends require('base/app'){
	
	prototype(){
		this.tools = {
			Dock: require('views/dock').extend({
				w:'100%',
				h:'100%',
				deserializeView(node){
					let type = node.type
					let typeCounter = this.owner.typeCounter
					var num  = typeCounter[type]? ++typeCounter[type]: typeCounter[type]=1
					return new this.owner[type](this,{
						id:node.id?node.id:type+num,
						tabTitle:node.title,
						w:'100%',
						h:'100%'
					})
				}
			}),
			Source: require('./makepad/source'),
			//Wave: require('./makepad/wave'),
			//FileTree:require('base/view'),
			FileTree: require('./makepad/filetree'),
			HomeScreen: require('./makepad/homescreen'),
			//Settings: require('./makepad/settings'),
			//UserProcess: require('./makepad/userprocess')
		}
		// set the styleclasscf4
		this.style = require('./makepad/styles')
	}

	constructor() {
		super()
		this.typeCounter = {}
		
		this.dock = new this.Dock(this,{
			data: {
				locked:true,
				position:125,
				vertical: true,
				pane1:{
					selected:1,
					tabs:[
						{type:'HomeScreen', title:'*'},
						{type:'FileTree', title:'Files'},
					]
				},
				pane2:{
					selected:0,
					locked:true,
					position:-100,
					vertical: true,
					pane1:{
						selected:0,
						tabs:[
							{type:'HomeScreen', id:'HomeSource', title:'*'}
						]
					},
					pane2:{
						selected:0,
						tabs:[
							{type:'HomeScreen', id:'HomeProcess', title:'*'}
						]
					}
				}
			}
		})

		this.store.act("init", store=>{
			store.projectTree = {}
			store.resourceMap = new Map()
			store.processList = []
		})

		this.store.observe(this.store.resourceMap, e=>{
			var store = this.store
			// we wanna know if dirty on a resource is flipped
			if(this.store.anyChanges(e, 1, 'dirty')) {
				this.processTabTitles()
			}
			// data or trace modified
			var source = this.store.anyChanges(e, 1, ['data', 'trace'])
			if(source) {
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
			// how about a datastore index? can we provide one?
		})

		// the setter of data makes it autobind to the store
		this.find('FileTree1').data = this.store.projectTree

		this.loadProject(projectFile).then(store=>{
			
			if(this.destroyed) return  // technically possible
			
			var resources = this.store.resourceMap
			var proj = this.store.projectTree
			var x = this.store.projectTree.open
			
			if(proj.open) {
				for(var i = 0; i < proj.open.length; i++) {
					var open = proj.open[i]
					var resource = resources.get(module.buildPath(open, '/'))
					this.addSourceTab(resource, open)
				}
			}
			if(!module.worker.hasParent && proj.run) {
				for(var i = 0; i < proj.run.length; i++) {
					var run = proj.run[i]
					var resource = resources.get(module.buildPath(run, '/'))
					this.addProcessTab(resource, run)
				}
			}
		})
	}
	
	loadProject(fileName) {
		return storage.load(fileName).then(result=>{
			// add the project
			var projectTree = JSON.parse(result)
			
			var allProj = []
			var allNodes = []
			var pathNames = []
			var resourceMap = new Map()
			function walk(node, base) {
				node.folder = node.folder.sort((a, b)=>{
					if(a.name < b.name) return -1
					if(a.name > b.name) return 1
					return 0
				})
				var folder = node.folder
				if(!node.open) node.open = false
				//node.index = {}
				for(let i = 0; i < folder.length; i++) {
					var child = folder[i]
					//node.index[child.name] = child
					if(child.folder) {
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
			
			return Promise.all(allProj, true).then(results=>{
				// store all the data in the resource list
				for(let i = 0; i < results.length; i++) {
					resourceMap.set(pathNames[i], {
						node: allNodes[i],
						path: pathNames[i],
						data: results[i],
						trace: '',
						traceLines: null,
						dirty: false,
						processes: [],
						parseErrors: []
					})
				}
				// lets store it
				this.store.act("loadProject", store=>{
					store.projectTree = projectTree
					store.resourceMap = resourceMap
					store.processList = []
				})
			}, fail=>{}, true)
		}, fail=>{}, true)
	}
	
	
	findResourceDeps(resource, deps) {
		var data = resource.trace || resource.data
		deps[resource.path] = data
		if(typeof data !== 'string') return 
		var code = data.replace(/\/\*[\S\s]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
		code.replace(/require\s*\(\s*(?:['"](.*?)["']|(\/(?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+\/))/g, (m, path, regex)=>{
			if(regex) {
				var wildcard = matchCache[mypath] || (matchCache[mypath] = new RegExp(regex.slice(1, -1)))
				for(var key of this.store.resourceMap.keys()) {
					if(key.match(wildcard)) {
						var dep = this.store.resourceMap.get(key)
						if(!deps[dep.path]) {
							this.findResourceDeps(dep, deps)
						}
					}
				}
				return
			}
			var mypath = module.buildPath(path, resource.path)
			var dep = this.store.resourceMap.get(mypath)
			if(dep && !deps[dep.path]) {
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
						var text = name + (tab.resource.dirty? "*": "") + '-' + rest
						if(tab.tabTitle !== text) {
							tab.tabTitle = text
							//tab.parent.redraw()
						}
					}
				}
			}
			else {
				var tabs = mergePaths[mergeKeys[0]]
				for(var i = 0; i < tabs.length; i++) {
					var tab = tabs[i]
					var text = name + (tab.resource.dirty? "*": "")
					if(tab.tabTitle !== text) {
						tab.tabTitle = text
						//tab.parent.redraw()
					}
				}
			}
		}
	}
	
	addSourceTab(resource) {

		var path = resource.path
		var ext = path.slice(path.lastIndexOf('.') + 1)
		var Type
		var config
		if(ext === 'js') {
			Type = this.Source
			config = {}
		}
		if(ext === 'wav') {
			Type = this.Wave
			config = {}
		}
		
		/*
		var old = this.find('Source' + resource.path)
		if(old) {
			var tabs = old.parent
			tabs.selectTab(tabs.children.indexOf(old))
			return 
		}*/
		// we need to find the tabs to put this sourcefile somehow.
		let tabs = this.find('HomeSource').parent
		var view = new Type(this.dock, {
			id:'Source' + resource.path,
			tabTitle: resource.path,
			resource: resource,
			onCloseTab: function() {
				this.app.processTabTitles()
			}
		})
		console.log(view)
		// select it
		tabs.selected = tabs.tabs.push(view) - 1
		tabs.redraw()
		//this.processTabTitles()
	}
	
	addProcessTab(resource) {
		return
		var old = this.find('Process' + resource.path)
		if(old) {
			var tabs = old.parent
			tabs.selectTab(tabs.children.indexOf(old))
			return 
		}
		
		var processList = this.store.processList
		this.store.act("addProcess", store=>{
			processList.push({
				path: resource.path,
				runtimeErrors: []
			})
		})
		
		var tabs = this.find('HomeProcess').parent
		var idx = tabs.addNewChild(new this.UserProcess({
			name: 'Process' + resource.path,
			tabText: resource.path,
			resource: resource,
			process: processList[processList.length - 1],
			onCloseTab: function() {
				this.app.processTabTitles()
			}
		}))
		tabs.selectTab(idx)
		this.processTabTitles()
	}
	
	onDraw() {
		this.dock.draw(this)
	}
}