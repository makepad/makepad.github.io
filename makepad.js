module.exports = require('base/app').extend(function(proto){
	var storage = require('services/storage')
	var Worker = require('services/worker')
	var Dock = require('views/dock')

	var projectFile = "./makepad.json"
	var currentFile = "./examples/windtree.js"
	var styles = Styles()

	var UserProcess = require('views/draw').extend(styles.UserProcess, {
		x:'0',
		y:'0',
		name:'UserProcess',
		surface:true,
		onRemove:function(){
			// we have to free all associated resources.
		},
		onDraw:function(){
			this.drawBg(this.viewGeom)
		}
	})
	
	var Probes = require('views/probes').extend({
		onPlay:function(){
			// ask which code file has focus
			var code = this.parent
			this.app.addProcessTab(code.trace, code.fileName)
		},
		onStop:function(){

		}
	})

	var Code = require('views/code').extend(styles.Code, {
		name:'Code',
		onKeyS:function(e){
			if(!e.meta && !e.ctrl) return true
			storage.save(this.fileName, this.serializeWithFormatting())
		},
		onParsed:function(){
			// store it in the filetree
			if(this.fileNode) this.fileNode.data = this.text
			// check if our file is an app, ifso lets run it.
			var body = this.ast.body[0]
			/*
			this.isExecutableCode = false
			if(body && body.type === 'ExpressionStatement' && 
				body.expression.type === 'AssignmentExpression' &&
				body.expression.right.type === 'CallExpression' && 
				body.expression.right.callee.type === 'MemberExpression' &&
				body.expression.right.callee.object.type === 'CallExpression' && 
				body.expression.right.callee.object.arguments[0] && 
				body.expression.right.callee.object.arguments[0].type === 'Literal'){
				var value = body.expression.right.callee.object.arguments[0].value
				if(value === 'base/app' || value === 'base/drawapp'){
					this.isExecutableCode = true
					*/
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
					//if(this.fileName) this.app.addUserTab(this.fileName)
					//this.app.runCurrentFile()
					//return
			//	}
			//}
			// do some updating somehow

			//if(this.app.runningFile === this){
			//console.log(this.fileName)
			///if(this.fileName) this.app.updateProcess(this.fileName)//text, this.app.userAppArgs)
			//}
		},
		drawPadding:[0,0,0,36],
		wrap:true,
		padding:[0,0,0,0],
		onCompose:function(){
			return this.probes = Probes({
				w:31,
				h:'100%'
			})
		}
	})

	var HomeScreen = require('views/draw').extend(styles.HomeScreen, {
		name:'HomeScreen',
		overflow:'scroll',
		onDraw:function(){
			this.beginBg(this.viewGeom)
			this.drawText({
				text:this.name==='CodeHome'?
				'Welcome to MakePad! Makepad is a live code editor.\n'+
				'The Goal of makepad is make programming enjoyable and learn through play.\n\n'+
				'Try opening an example on the left and clicking Play. Updates to these files will be Live'
				:''
			})
			this.endBg(true)
		},
		onCompose:function(){
			return Code({
				x:'0',y:'0',h:0,w:0
			})
		}
	})

	var Settings = require('views/draw').extend(styles.Settings, {
		name:'Settings',
		Bg:{
			color:'#3'
		},
		onDraw:function(){
			this.beginBg(this.viewGeom)
			this.drawText({
				text:'...'
			})
			this.draw
			this.endBg()
		},
		onTabShow:function(){
			var dock = this.app.find('Dock')
			dock.toggleSplitterSettings(true)
			dock.toggleTabSettings(true)
		},
		onTabHide:function(){
			var dock = this.app.find('Dock')
			dock.toggleSplitterSettings(false)
			dock.toggleTabSettings(false)
		}
	})

	var FileTree = require('views/tree').extend(styles.FileTree, {
		name:'FileTree',
		onNodeSelect:function(node, path){
			// compute path for node
			if(path[0].name === 'libs'){
				var p = ''
				for(var i = 1; i < path.length;i++){
					if(i>1) p+= '/'
					p += path[i].name
				}
			}
			else{
				var p = './'
				for(var i = 0; i < path.length;i++){
					if(i>0) p+= '/'
					p += path[i].name
				}
			}
			this.app.addCodeTab(node, p)
		}
	})

	proto.onInit = function(){
	}

	function loadProjectTree(projectFile){
		return new Promise(function(resolve, reject){
			storage.load(projectFile).then(function(text){
				var projectTree = JSON.parse(text)
				var allProj = []
				var allNodes = []

				function walk(folder, base){
					for(var i = 0; i < folder.length; i++){
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
					for(var i = 0; i < results.length; i++){
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
			for(var i = 0; i < folder.length; i++){
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

	proto.onAfterCompose = function(){
		// we need to load all other files in the project
		loadProjectTree(projectFile).then(function(project){
			this.projectData = project
			this.find('FileTree').data = project
			var map = projectToResources(project, true)
			if(project.open){
				for(var i = 0; i < project.open.length; i++){
					var open = project.open[i]
					this.addCodeTab(map[open], open)
				}
			}
			if(project.run){
				for(var i = 0; i < project.run.length; i++){
					var run = project.run[i]
					this.addProcessTab(map[run].data, run)
				}
			}

		}.bind(this))
	}

	proto.onAfterDraw = function(){
		this.onAfterDraw = undefined
	}

	proto.addCodeTab = function(node, fileName){
		var old = this.find('Code'+fileName)
		if(old){
			var tabs = old.parent
			tabs.selectTab(tabs.children.indexOf(old))
			return
		}
		var tabs = this.find('CodeHome').parent
		var code = Code({
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
	
	proto.updateProcess = function(fileNode, fileName){
		if(!this.userProcess) return this.addProcessTab(fileName)
	}

	proto.addProcessTab = function(source, fileName){
		var old = this.find('Process'+fileName)
		if(old){
			var tabs = old.parent
			tabs.selectTab(tabs.children.indexOf(old))
			return
		}
		var tabs = this.find('UserProcessHome').parent
		var idx = tabs.addNewChild(UserProcess({
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
					this.worker.terminate()
				}.bind(this)

				this.worker.ping(2000)
			}
		}))
		tabs.selectTab(idx)
	}

	proto.onCompose = function(){
		return [
			Dock({
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

	function Styles(){
		return {
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
	}

})