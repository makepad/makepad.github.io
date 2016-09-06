module.exports = require('base/app').extend(function(proto){
	var storage = require('services/storage')
	var Worker = require('services/worker')
	var Dock = require('views/dock')

	var projectFile = "./makepad.json"
	var currentFile = "./examples/windtree.js"
	var styles = Styles()

	var User = require('views/draw').extend(styles.User, {
		x:'0',
		y:'0',
		name:'User',
		surface:true,
		onRemove:function(){
			// we have to free all associated resources.

		},
		onDraw:function(){
			this.drawBg(this.viewGeom)
		}
	})

	var Code = require('views/code').extend(styles.Code, {
		onKeyS:function(e){
			if(!e.meta && !e.ctrl) return true
			storage.saveText(currentFile, this.serializeWithFormatting())
		},
		onParsed:function(){
			// store it in the filetree
			if(this.fileNode) this.fileNode.data = this.text
			// check if our file is an app, ifso lets run it.
			var body = this.ast.body[0]
			if(body && body.type === 'ExpressionStatement' && 
				body.expression.type === 'AssignmentExpression' &&
				body.expression.right.type === 'CallExpression' && 
				body.expression.right.callee.type === 'MemberExpression' &&
				body.expression.right.callee.object.type === 'CallExpression' && 
				body.expression.right.callee.object.arguments[0] && 
				body.expression.right.callee.object.arguments[0].type === 'Literal'){
				var value = body.expression.right.callee.object.arguments[0].value
				if(value === 'base/app' || value === 'base/drawapp'){
					if(this.fileName) this.app.addUserTab(this.fileName)
					//this.app.runCurrentFile()
					return
				}
			}
			//if(this.app.runningFile === this){
			//console.log(this.fileName)
			///if(this.fileName) this.app.updateProcess(this.fileName)//text, this.app.userAppArgs)
			//}
		},
	})

	var HomeScreen = require('views/draw').extend(styles.HomeScreen, {
		onDraw:function(){
			this.beginBg(this.viewGeom)
			this.drawText({
				text:this.id==='codeHome'?'Welcome to MakePad! Makepad is a live code editor.\nThe editor is an AST editor which may feel a bit different at first. Use the tree on the left to explore some examples.':''
			})
			this.draw
			this.endBg()
		},
		onCompose:function(){
			return Code({
				x:'0',y:'0',h:0,w:0
			})
		}
	})

	var Settings = require('views/draw').extend(styles.Settings, {
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

	var LiveEdit = require('views/live').extend(styles.Live, {
		onPlay:function(){

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

	function projectToResources(projectTree, oldResources){
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
				if(oldResources){
					if(oldResources[store] !== child.data){
						oldResources[store] = child.data
						resources[store] = child.data
					}
				}
				else{
					resources[store] = child.data
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
			this.find('Dock').ids.tree.data = project
		}.bind(this))
	}

	proto.onAfterDraw = function(){
		this.onAfterDraw = undefined
	}

	proto.addCodeTab = function(node, fileName){
		var tabs = this.find('Dock').ids.codeHome.parent
		var idx = tabs.addNewChild(Code({
			tabText:fileName,
			fileNode:node,
			text:node.data
		}))
		tabs.selectTab(idx)
	}
	
	proto.updateProcess = function(fileName){
		if(!this.userProcess) return this.addProcessTab(fileName)
	}

	proto.addUserTab = function(fileName){
		var tabs = this.find('userTabs')
		for(var i = 0; i < tabs.data.length; i++){
			var tab = tabs.data[i]
			if(tab.fileName === fileName){
				tabs.selectTab(i)

				// send it only this fileName resource
				var userView = tab.userView
				userView.worker.init(
					fileName,
					projectToResources(this.app.projectData, userView.resources)
				)

				return
			}
		}

		var name = fileName
		if(name.indexOf('.') === 0) name = name.slice(1)
		if(name.indexOf('.js') === name.length-3) name = name.slice(0,-3)

		var tabData = {name:name, fileName:fileName, canClose:1}
		var tabId = tabs.data.push(
			tabData
		)-1
		
		tabs.addChild(tabData.userView = User({
			fileName:fileName,
			onAfterDraw:function(){
				this.onAfterDraw = undefined

				this.worker = new Worker(null, {
					fileName:fileName,
					parentFbId: this.$renderPasses.surface.framebuffer.fbId
				})		
				this.resources = projectToResources(this.app.projectData)
				this.worker.init(
					fileName,
					this.resources
				)
				
				this.worker.onPingTimeout = function(){
					this.worker.terminate()
				}

				this.worker.ping(2000)
			}
		}), tabId)

		tabs.selectTab(tabId)
	}

	proto.onCompose = function(){
		return [
			Dock({
				classes:{
					HomeScreen:HomeScreen,
					Code:Code,
					FileTree:FileTree,
					Settings:Settings,
					LiveEdit:LiveEdit
				},
				data:{
					mode:2,
					locked:false,
					pos:110,
					top:{
						mode:1,
						locked:false,
						pos:100,
						left:{
							bottom:true,
							tabs:[
								{type:'FileTree', id:'tree', tabText:'Files', open:true, noCloseTab:true},
								{type:'Settings', id:'settings', tabText:'', tabIcon:'gear',noCloseTab:true}
							]	
						},
						right:{
							mode:0,
							locked:false,
							pos:0.5,
							left:{
								bottom:true,
								tabs:[
									{type:'HomeScreen', id:'codeHome', tabIcon:'home', open:true, noCloseTab:true}
								]
							},
							right:{
								bottom:true,
								tabs:[
									{type:'HomeScreen', id:'outputHome', tabIcon:'home', open:true, noCloseTab:true}
								]
							}
						}
					},
					bottom:{
						folded:true,
						tabs:[
							{type:'LiveEdit', id:'liveEdit', tabIcon:'play', open:true, noCloseTab:true}
						]
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