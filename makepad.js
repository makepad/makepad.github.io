//new require('styles/dark')
new require('styles/dark')

var storage = require('services/storage')
var Worker = require('services/worker')

var projectFile = "/makepad.json"
var currentFile = "./examples/windtree.js"
var ProjectStore = require('base/store')
var matchCache = {}
// ICON list
// search copy exchange play archive filter close gear info puzzle television
// f002 f0c5 f0ec f04b f187 f0b0 f00d f013 f129 f12e f26c
module.exports = class Makepad extends require('base/app'){
	
	prototype() {
		this.tools = {
			Dock       :require('views/dock').extend({
				w              :'100%',
				h              :'100%',
				deserializeView:function(node) {
					let type = node.type
					let typeCounter = this.owner.typeCounter
					var num = typeCounter[type]?++typeCounter[type]:typeCounter[type] = 1
					return new this.owner[type](this, {
						id      :node.id?node.id:type + num,
						tabTitle:node.title,
						tabIcon :node.icon,
						w       :'100%',
						h       :'100%'
					})
				}
			}),
			Source     :require('./makepad/source'),
			Wave       :require('./makepad/wave'),
			FileTree   :require('./makepad/filetree'),
			HomeScreen :require('./makepad/homescreen'),
			UserProcess:require('./makepad/userprocess'),
			ProcessLog :require('./makepad/processlog'),
			VisualEdit :require('./makepad/visualedit')
			//Settings: require('./makepad/settings'),
		}
	}
	
	constructor() {
		super()
		this.typeCounter = {}
		
		this.dock = new this.Dock(this, {
			data:{
				locked  :true,
				position:-120,
				vertical:false,
				pane1   :{
					locked  :true,
					position:120,
					vertical:true,
					pane1   :{
						selected:1,
						tabs    :[
							{type:'HomeScreen', icon:'gear'},
							{type:'FileTree', title:'Files'},
						]
					},
					pane2   :{
						selected:0,
						locked  :false,
						position:0.5,
						vertical:true,
						pane2   :{
							selected:0,
							tabs    :[
								{type:'HomeScreen', id:'HomeProcess', icon:'television'}
							]
						},
						pane1   :{
							selected:0,
							vertical:false,
							locked  :true,
							position:-150,
							pane1   :{
								tabs:[
									{type:'HomeScreen', id:'HomeSource', icon:'puzzle-piece'}
								]
							},
							pane2   :{
								selected:0,
								tabs    :[
									{type:'VisualEdit', id:'VisualEdit', icon:'pencil'}
								]
							}
						}
					}
				},
				pane2   :{
					selected:0,
					tabs    :[
						{type:'HomeScreen', id:'HomeLogs', icon:'info-circle'}
					]
				}
			}
		})
		
		this.app.store.act("init", store=>{
			store.projectTree = {}
			store.resourceMap = new Map()
			store.processList = []
		})
		
		this.app.store.observe(this.app.store.resourceMap, e=>{
			var store = this.app.store
			// we wanna know if dirty on a resource is flipped
			if(store.anyChanges(e, 1, 'dirty')) {
				this.processTabTitles()
			}
			// data or trace modified
			var source = store.anyChanges(e, 1, ['data', 'trace'])
			if(source) {
				var resource = source.object
				// find all processes
				var procs = this.app.findAll(/^Process/)
				for(var i = 0;i < procs.length;i++){
					var proc = procs[i]
					// update resource
					if(resource.path  in  proc.deps) {
						proc.reloadWorker()
					}
				}
			}
			// how about a datastore index? can we provide one?
		})
		
		// the setter of data makes it autobind to the store
		var tree = this.find('FileTree1')
		this.app.store.observe(this.app.store.projectTree, _=>{
			tree.data = this.app.store.projectTree
			tree.redraw()
		})
		
		this.loadProject(projectFile).then(store=>{
			
			if(this.destroyed) return  // technically possible
			
			var resources = this.app.store.resourceMap
			var proj = this.app.store.projectTree
			var x = this.app.store.projectTree.open
			
			if(proj.open) {
				for(var i = 0;i < proj.open.length;i++){
					var open = proj.open[i]
					var resource = resources.get(module.buildPath(open, '/'))
					this.addSourceTab(resource)
				}
			}
			if(!module.worker.hasParent && proj.run) {
				for(var i = 0;i < proj.run.length;i++){
					var run = proj.run[i]
					var resource = resources.get(module.buildPath(run, '/'))
					this.addProcessTab(resource)
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
				node.folder = node.folder.sort((a, b) =>{
					if(a.name < b.name) return -1
					if(a.name > b.name) return 1
					return 0
				})
				var folder = node.folder
				if(!node.open) node.open = false
				//node.index = {}
				for(let i = 0;i < folder.length;i++){
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
				for(let i = 0;i < results.length;i++){
					resourceMap.set(pathNames[i], {
						node        :allNodes[i],
						path        :pathNames[i],
						data        :results[i],
						trace       :'',
						traceLines  :null,
						dirty       :false,
						stackMarkers:null,
						processes   :[]
					})
				}
				// lets store it
				this.app.store.act("loadProject", store=>{
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
		code.replace(/require\s*\(\s*(?:['"](.*?)["']|(\/(?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+\/))/g, (m, path, regex) =>{
			if(regex) {
				var wildcard = matchCache[mypath] || (matchCache[mypath] = new RegExp(regex.slice(1, -1)))
				for(var key of this.app.store.resourceMap.keys()){
					if(key.match(wildcard)) {
						var dep = this.app.store.resourceMap.get(key)
						if(!deps[dep.path]) {
							this.findResourceDeps(dep, deps)
						}
					}
				}
				return
			}
			var mypath = module.buildPath(path, resource.path)
			var dep = this.app.store.resourceMap.get(mypath)
			if(dep && !deps[dep.path]) {
				this.findResourceDeps(dep, deps)
			}
		})
	}
	
	packageApp(resource) {
		// lets find the trace process
		var trace = this.find('ProcessTrace' + resource.path)
		
		var rm = this.app.store.resourceMap
		var list = [
			'/platform/web/audio1.js',
			// '/platform/web/cameras1.js',
			//'/platform/web/debug1.js',
			// '/platform/web/dropfiles1.js',
			'/platform/web/fingers1.js',
			//'/platform/web/gamepad1.js',
			// '/platform/web/http1.js',
			'/platform/web/keyboard1.js',
			'/platform/web/painter1.js',
			//'/platform/web/socket1.js',
			'/platform/web/storage1.js',
			'/platform/web/worker1.js',
			//'/libs/base/compiler.min.js',
			'/platform/boot.js',
			'/platform/web.js',
			'/platform/painterpaint.js',
			'/platform/painterscroll.js',
			'/platform/paintertodo.js',
			'/platform/painterubos.js',
			'/platform/painteruser.js',
			'/platform/service.js'
		]
		var traceMap = trace && trace.process && trace.process.trace
		var deps = {}
		for(var i = 0;i < list.length;i++){
			var path = list[i]
			var thing = rm.get(path)
			deps[path] = thing.data
		}
		var code = require('views/code')
		var parser = require('parsers/js')
		var min = new require('parsers/jsminformat')
		var deflate = require('parsers/deflate')
		var base64 = require('parsers/base64')
		var base85 = require('parsers/base85')
		min.defaultScope = Object.create(code.prototype.defaultScope)
		min.defaultScope.window = 'global'
		min.defaultScope.navigator = 'global'
		min.defaultScope.document = 'global'
		min.defaultScope.localStorage = 'global'
		min.defaultScope.location = 'global'
		
		min.defaultScope.URL = 'global'
		min.defaultScope.Blob = 'global'
		min.defaultScope.XMLHttpRequest = 'global'
		min.defaultScope.self = 'global'
		min.defaultScope.Worker = 'global'
		
		this.findResourceDeps(resource, deps)
		
		// lets package the resources
		var data = ''
		var sizes = []
		var stats = {}
		for(var key in deps){
			var value = deps[key]
			// if(key === '/libs/base/infer.js')continue
			// if(key.indexOf('/libs/parsers') === 0) continue
			// if(key === '/libs/base/compiler.js') continue
			if(typeof value !== 'string') continue
			// lets parse and minimize the resource
			var ast = parser.parse(value)
			if(key.indexOf('/libs/base/types.js') == 0) {
				//ast.body[ast.body.length - 1] = {type:'Identifier', value:''}
			}
			if(key.indexOf('/platform/boot.js') == 0) {
				//ast.body[ast.body.length - 1] = {type:'Identifier',value:''}
				//ast.body[ast.body.length - 2] = {type:'Identifier',value:''}
			}
			if(key.indexOf('/platform') == 0) {
				min.jsASTMinimize(ast, null, key, value, stats)
			}
			else {
				
				min.jsASTStrip(ast, traceMap, key, value, stats)
			}
			//console.log(key, min.text)
			
			deps[key] = min.text
			data += min.text
			sizes.push({key:key, size:min.text.length})
		}
		var statsort = []
		for(var key in stats){
			statsort.push({key:key, size:stats[key]})
		}
		statsort = statsort.sort((a, b) =>{
			if(a.size < b.size) return -1
			if(a.size > b.size) return 1
			return 0
		})
		sizes = sizes.sort((a, b) =>{
			if(a.size < b.size) return -1
			if(a.size > b.size) return 1
			return 0
		})
		console.log(statsort)
		//console.log(Object.keys(deps))
		console.log(data.length)
		var zip = deflate.gzip(data)
		var b64 = base64.fromByteArray(zip)
		var b85 = base85.encode(zip)
		console.log(zip.length)
		console.log(b64.length)
		console.log(b85.length)
		var zip2 = deflate.gzip(b64)
		console.log(b64.length)
		// alright lets generate a single HTML file.
		// non packed. including everything.

	}
	
	// create uniquely identifyable tab titles
	processTabTitles() {
		var allTabs = this.findAll(/^Source|^Process|^Log/)
		var collide = {}
		for(var i = 0;i < allTabs.length;i++){
			var tab = allTabs[i]
			if(!tab.resource) continue
			var path = tab.resource.path
			var name = path.slice(path.lastIndexOf('/') + 1)
			if(!collide[name]) collide[name] = {}
			if(!collide[name][path]) collide[name][path] = []
			collide[name][path].push(tab)
		}
		for(var name in collide){
			var mergePaths = collide[name]
			var mergeKeys = Object.keys(mergePaths)
			if(mergeKeys.length > 1) {
				for(var i = 0;i < mergeKeys.length;i++){
					var tabs = mergePaths[mergeKeys[i]]
					for(var j = 0;j < tabs.length;j++){
						var tab = tabs[j]
						var path = tab.resource.path
						var rest = path.slice(1, path.lastIndexOf('/'))
						var text = name + (tab.resource.dirty?"*":"") + '-' + rest
						if(tab.tabTitle !== text) {
							tab.tabTitle = text
							if(tab.parent) tab.parent.redraw()
						}
					}
				}
			}
			else {
				var tabs = mergePaths[mergeKeys[0]]
				for(var i = 0;i < tabs.length;i++){
					var tab = tabs[i]
					var text = name + (tab.resource.dirty?"*":"")
					if(tab.tabTitle !== text) {
						tab.tabTitle = text
						if(tab.parent) tab.parent.redraw()
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
		
		var old = this.find('Source' + resource.path)
		if(old) {
			old.parent.selectTab(old)
			return 
		}
		
		// we need to find the tabs to put this sourcefile somehow.
		let tabs = this.find('HomeSource').parent
		var view = new Type(this.dock, {
			id        :'Source' + resource.path,
			tabTitle  :resource.path,
			resource  :resource,
			onCloseTab:function() {
				this.app.processTabTitles()
			}
		})
		// select it
		tabs.selected = tabs.tabs.push(view) - 1
		tabs.redraw()
		
		this.processTabTitles()
	}
	
	addProcessTab(resource, trace) {
		var title = 'Process' + (trace?'Trace':'')
		var old = this.find(title + resource.path)
		if(old) {
			old.parent.selectTab(old)
			return 
		}
		
		var processList = this.app.store.processList
		this.app.store.act("addProcess", store=>{
			processList.push({
				path         :resource.path,
				runtimeErrors:[],
				logs         :[],
				trace        :new Map()
			})
		})
		
		var tabs = this.find('HomeProcess').parent
		let process = new this.UserProcess(this.dock, {
			id      :title + resource.path,
			tabTitle:resource.path,
			tabIcon :trace?'filter':null,
			resource:resource,
			trace   :trace,
			process :processList[processList.length - 1],
		})
		
		tabs.selected = tabs.tabs.push(process) - 1
		tabs.redraw()
		if(!trace) {
			// add log
			tabs = this.find('HomeLogs').parent
			let log = new this.ProcessLog(this.dock, {
				id      :'Log' + resource.path,
				tabTitle:resource.path,
				resource:resource,
				process :processList[processList.length - 1]
			})
			tabs.selected = tabs.tabs.push(log) - 1
			tabs.redraw()
		}
		this.processTabTitles()
	}
	
	closeTab(tab) {
		// remove it
		tab.parent.removeTab(tab)
		// destroy it
		tab.destroy()
	}
	
	onDraw() {
		//_=this
		this.dock.draw(this)
	}
}