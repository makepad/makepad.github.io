const storage = require('services/storage')
const Worker = require('services/worker')
const Dock = require('views/dock')
const projectFile = "./makepad.json"
const currentFile = "./examples/windtree.js"

var styles = {
	Code:{},
	HomeScreen:{
		padding:[4,4,4,4],
		Bg:{
			color:'#0c2141'
		},
		Text:{
			font:require('fonts/ubuntu_monospace_256.font'),
			color:'#f',
		}
	},
	FileTree:{
		Background:{
			color:'#4'
		},						
	}
}

class HomeScreen extends require('views/draw'){
	prototype(){
		this.mixin(styles.HomeScreen,{
			name:'HomeScreen',
			overflow:'scroll'
		})
	}

	onDraw(){
		this.beginBg(this.viewGeom)
		this.drawText({
			text:this.name==='CodeHome'?
			'Welcome to MakePad! Makepad is a live code editor.\n'+
			'The Goal of makepad is make programming enjoyable and learn through play.\n\n'+
			'Try opening an example on the left and clicking Play. Updates to these files will be Live'
			:''
		})
		this.endBg(true)
	}

	onCompose(){
		return new Code({
			x:'0',y:'0',h:0,w:0
		})
	}
}

class UserProcess extends require('views/draw'){

	prototype(){
		this.mixin(styles.UserProcess,{
			name:'Probes',
			surface:true
		})
	}

	onRemove(){
		// we have to free all associated resources.
	}

	onDraw(){
		this.drawBg(this.viewGeom)
	}
}


class Probes extends require('views/probes'){

	prototype(){
		this.mixin(styles.Probes,{
			name:'Probes'
		})
	}

	onPlay(){
		// ask which code file has focus
		var code = this.parent
		this.app.addProcessTab(code.trace, code.fileName)
	}

	onStop(){

	}
}

class Code extends require('views/code'){
	prototype(){
		this.name = 'Code'
		this.mixin(styles.Code,{
			name:'Code',
			drawPadding:[0,0,0,36],
			wrap:true,
			padding:[0,0,0,0]
		})
	}

	onKeyS(e){
		if(!e.meta && !e.ctrl) return true
		storage.save(this.fileName, this.serializeWithFormatting())
	}

	onParsed(){
		// store it in the filetree
		if(this.fileNode) this.fileNode.data = this.text
		// check if our file is an app, ifso lets run it.
		var body = this.ast.body[0]
		var proc = this.app.find('Process'+this.fileName)
		if(proc){
			var res = projectToResources(this.app.projectData, proc.resources)
			res[this.fileName] = this.trace
			console.log("---- restarting user process ----")
			//return
			proc.worker.init(
				this.fileName,
				res
			)
		}
	}

	onCompose(){
		return this.probes = new Probes({
			w:31,
			h:'100%'
		})
	}
}


class Settings extends require('views/draw'){
	prototype(){
		this.mixin(styles.Settings,{
			name:'Settings',
			Bg:{
				color:'#3'
			}
		})
	}
	
	onDraw(){
		this.beginBg(this.viewGeom)
		this.drawText({
			text:'...'
		})
		this.draw
		this.endBg()
	}

	onTabShow(){
		var dock = this.app.find('Dock')
		dock.toggleSplitterSettings(true)
		dock.toggleTabSettings(true)
	}

	onTabHide(){
		var dock = this.app.find('Dock')
		dock.toggleSplitterSettings(false)
		dock.toggleTabSettings(false)
	}
}

class FileTree extends require('views/tree'){
	prototype(){
		this.mixin(styles.FileTree,{
			name:'FileTree'
		})
	}

	onNodeSelect(node, path){
		// compute path for node
		if(path[0].name === 'libs'){
			var p = ''
			for(let i = 1; i < path.length;i++){
				if(i>1) p+= '/'
				p += path[i].name
			}
		}
		else{
			var p = './'
			for(let i = 0; i < path.length;i++){
				if(i>0) p+= '/'
				p += path[i].name
			}
		}
		this.app.addCodeTab(node, p)
	}
}

function loadProjectTree(projectFile){
	return new Promise(function(resolve, reject){
		storage.load(projectFile).then(function(text){
			var projectTree = JSON.parse(text)
			var allProj = []
			var allNodes = []

			function walk(folder, base){
				for(let i = 0; i < folder.length; i++){
					var child = folder[i]
					if(child.folder){
						walk(child.folder, base + child.name + '/')
						continue
					}
					var isBinary = child.name.indexOf('.js') !== child.name.length - 3
					var path = '/' + base + child.name
					allNodes.push(child)
					allProj.push(storage.load(path, isBinary))
				}
			}
			walk(projectTree.folder, '')

			Promise.all(allProj).then(function(results){
				// store all the data in the tree
				for(let i = 0; i < results.length; i++){
					allNodes[i].data = results[i]
				}
				resolve(projectTree)
			})
		})
	})
}

function projectToResources(projectTree, oldResourcesOrNode){
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

module.exports = class Makepad extends require('base/app'){

	onAfterCompose(){
		// we need to load all other files in the project
		loadProjectTree(projectFile).then(function(project){
			this.projectData = project
			this.find('FileTree').data = project
			var map = projectToResources(project, true)
			if(project.open){
				for(let i = 0; i < project.open.length; i++){
					var open = project.open[i]
					this.addCodeTab(map[open], open)
				}
			}
			if(project.run){
				for(let i = 0; i < project.run.length; i++){
					var run = project.run[i]
					this.addProcessTab(map[run].data, run)
				}
			}

		}.bind(this))
	}

	onAfterDraw(){
		this.onAfterDraw = undefined
	}

	addCodeTab(node, fileName){
		var old = this.find('Code'+fileName)
		if(old){
			var tabs = old.parent
			tabs.selectTab(tabs.children.indexOf(old))
			return
		}
		var tabs = this.find('CodeHome').parent
		var code = new Code({
			name:'Code'+fileName,
			tabText:fileName,
			fileName:fileName,
			fileNode:node,
			text:node.data
		})
		var idx = tabs.addNewChild(code)
		tabs.selectTab(idx)
		code.setFocus()
	}
	
	updateProcess(fileNode, fileName){
		if(!this.userProcess) return this.addProcessTab(fileName)
	}

	addProcessTab(source, fileName){
		var old = this.find('Process'+fileName)
		if(old){
			var tabs = old.parent
			tabs.selectTab(tabs.children.indexOf(old))
			return
		}
		var tabs = this.find('UserProcessHome').parent
		var idx = tabs.addNewChild(new UserProcess({
			name:'Process'+fileName,
			tabText:fileName,
			//fileNode:fileNode,
			text:source,
			onAfterDraw:function(){
				this.onAfterDraw = undefined

				this.worker = new Worker(null, {
					fileName:fileName,
					parentFbId: this.$renderPasses.surface.framebuffer.fbId
				})	

				this.resources = projectToResources(this.app.projectData)
				this.resources[fileName] = source

				this.worker.init(
					fileName,
					this.resources
				)
				
				this.worker.onPingTimeout = function(){
					// do other stuff
					//this.worker.terminate()
				}.bind(this)

				this.worker.ping(4000)
			}
		}))
		tabs.selectTab(idx)
	}

	onCompose(){

		return [
			new Dock({
				classes:{
					HomeScreen:HomeScreen,
					Code:Code,
					FileTree:FileTree,
					Settings:Settings
				},
				data:{
					mode:1,
					locked:false,
					pos:100,
					left:{
						bottom:true,
						tabs:[
							{type:'FileTree', tabText:'Files', open:true, noCloseTab:true},
							{type:'Settings', tabText:'', tabIcon:'gear',noCloseTab:true}
						]	
					},
					right:{
						mode:0,
						locked:false,
						pos:0.5,
						left:{
							bottom:true,
							tabs:[
								{type:'HomeScreen', name:'CodeHome', tabIcon:'home', open:true, noCloseTab:true}
							]
						},
						right:{
							bottom:true,
							tabs:[
								{type:'HomeScreen', name:'UserProcessHome', tabIcon:'home', open:true, noCloseTab:true}
							]
						}
					}
				}
			})
		]
	}
}