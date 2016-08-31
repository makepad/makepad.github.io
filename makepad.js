module.exports = require('base/app').extend(function(proto){

	var storage = require('services/storage')
	var Worker = require('services/worker')

	var Splitter = require('views/splitter')
	var Fill = require('views/fill')
	var Tabs = require('views/tabs')
	var Tree = require('views/tree')
	var Button = require('views/button')
	var projectFile = "./makepad.json"
	var currentFile = "./examples/windtree.js"
	var styles = Styles()
	
	// which file to load

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

	var Input = require('base/view').extend(styles.Input, {
	})

	var HomeScreen = require('views/draw').extend(styles.HomeScreen, {
		onDraw:function(){
			this.beginBg(this.viewGeom)
			this.drawText({
				text:'Welcome to MakePad! Makepad is a live code editor.\nThe editor is an AST editor which may feel a bit different at first. Use the tree on the left to explore some examples.'
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

	var MainTabs = require('views/tabs').extend(styles.MainTabs, {
	})

	var SideTabs = require('views/tabs').extend(styles.SideTabs, {
	})

	var UserTabs = require('views/tabs').extend(styles.UserTabs, {
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

	var PlayButton = require('views/button').extend(styles.PlayButton, {
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
		//return
		// we need to load all other files in the project
		loadProjectTree(projectFile).then(function(project){
			this.projectData = project
			this.find('Tree').data = project
		}.bind(this))

		var mainTabs = this.find('mainTabs')
		mainTabs.data = [
			{name:'', icon:'home', canClose:0},
		]
		mainTabs.selectTab(0)
	}

	proto.onAfterDraw = function(){
		
		this.onAfterDraw = undefined
	}

	proto.addCodeTab = function(node, fileName){
		// if file is already in tabs, focus it
		var tabs = this.find('mainTabs')
		for(var i = 0; i < tabs.data.length; i++){
			var tab = tabs.data[i]
			if(tab.fileName === fileName){
				tabs.selectTab(i)
				return
			}
		}
		
		var name = fileName
		if(name.indexOf('.') === 0) name = name.slice(1)
		if(name.indexOf('.js') === name.length-3) name = name.slice(0,-3)

		var tabId = tabs.data.push(
			{name:name, fileName:fileName, canClose:1}
		)-1
	
		tabs.addChild(Code({
			fileName:fileName,
			fileNode:node,
			text:node.data
		}), tabId)

		tabs.selectTab(tabId)
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
		/*
			Splitter({
					split:'vertical',
					pos:100,
					w:'100%',
					h:'100%'
				},
				Fill({
					color:'red'
				}),
				Fill({
					color:'green'
				}),
				Fill({
					x:'$10',
					y:'$10',
					w:20,
					h:20,
					color:'blue'
				})
			)*/
		
			SideTabs({
				onInit:function(){
					this.selectTab(0)
				},
				name:'sideTab',
				data:[
					{name:'Files'},
					{name:'Input'},
					{name:'', icon:'gear', canClose:0}
				],
				w:'12%',
				},
				FileTree({
					data:[],
				}),
				Input({
				})
			),
			MainTabs({
				name:'mainTabs',
				w:'43%',
				data:[]
				},
				HomeScreen({})
				//PlayButton({
				//})
			),
			UserTabs({
				name:'userTabs',
				w:'45%'
			})
			
		]
	}

	function Styles(){
		return {
			
			Code:{
				x:'0',
				y:'0'
			},
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
			MainTabs:{
				Tab:{
					states:{
						selected:{
							Bg:{color:'#0c2141',shadowOffset:[2,2]},
							Text:{color:'#e'}
						},
						selectedOver:{
							Bg:{color:'#0c2141',shadowOffset:[2,2]}
						}
					}
				}
			},
			UserTabs:{
				Tab:{
					states:{
						selected:{
							Bg:{color:'#0c2141',shadowOffset:[2,2]},
							Text:{color:'#e'}
						},
						selectedOver:{
							Bg:{color:'#0c2141',shadowOffset:[2,2]}
						}
					}
				}
			},			
			FileTree:{
				Background:{
					color:'#4'
				},						
			},
			PlayButton:{
				Button:{
					Bg:{padding:[2.5,0,0,6],borderRadius:12},
					states:{
						default:{
							Bg:{
								color:'#3b3'
							}
						},
						clicked:{
							Bg:{color:'#5f5'}
						},
						over:{
							Bg:{color:'#0c0'}
						}
					}
				},
				x:'$0',
				y:'-20',
				h:'20',
				w:'20',
				icon:'play',				
			}
		}
	}

})