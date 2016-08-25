module.exports = require('base/app').extend(function(proto){

	var storage = require('services/storage')
	var Worker = require('services/worker')

	var Tabs = require('views/tabs')
	var Tree = require('views/tree')
	var Button = require('views/button')
	var projectFile = "./makepad.json"
	var currentFile = "./examples/windtree.js"
	// which file to load
	if(storage.search) currentFile = storage.search.slice(1)


	var User = require('views/draw').extend({
		name:'User',
		surface:true,
		Bg:{
			color:'#333'
		},
		onDraw:function(){
			this.drawBg(this.viewGeom)
		}
	})

	var Code = require('views/code').extend({
		x:'0',
		y:'0',
		onKeyS:function(e){
			if(!e.meta && !e.ctrl) return true
			storage.saveText(currentFile, this.serializeWithFormatting())
		},
		onParsed:function(){
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
					this.app.runCurrentFile()
					return
				}
			}
			if(this.app.runningFile === this){
				this.app.userApp.run(this.text, this.app.userAppArgs)
			}
		},
	})

	var Input = require('base/view').extend({
	})

	var HomeScreen = require('views/draw').extend({
		padding:[4,4,4,4],
		Bg:{
			color:'#0c2141'
		},
		Text:{
			font:require('fonts/ubuntu_monospace_256.font'),
			color:'#f',
		},
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

	var MainTabs = require('views/tabs').extend({
		onCloseTab:function(index){
		},
		onSelectTab:function(index){
		},
		Tab:{
			states:{
				selected:{
					Bg:{color:'#0c2141'},
					Text:{color:'#e'}
				},
				selectedOver:{
					Bg:{color:'#0c2141'}
				}
			}
		}
	})

	var FileTree = require('views/tree').extend({
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
			this.app.openCodeFile(p)
		},
		Background:{
			color:'#4'
		},		
	})

	var PlayButton = require('views/button').extend({
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
		onClick:function(){
			this.app.runCurrentFile()
		}
	})

	proto.onInit = function(){
	
	}

	proto.onAfterCompose = function(){
		storage.loadText(projectFile).then(function(text){
			var proj = JSON.parse(text)
			this.find('Tree').data = proj
		}.bind(this))

		var mainTabs = this.find('mainTabs')
		mainTabs.data = [
			{name:'', icon:'home', canClose:0},
		]
		mainTabs.selectTab(0)
	}

	proto.runCurrentFile = function(){
		var mainTabs = this.find('mainTabs')
		var code = mainTabs.children[mainTabs.selectedIndex]

		this.runningFile = code
		if(!this.userApp){
			this.userAppArgs = {
				painter1:{
					fbId: this.find('User').$renderPasses.surface.framebuffer.fbId
				}
			}
			this.userApp = new Worker(code.text, this.userAppArgs)
		}
		else this.userApp.run(code.text, this.userAppArgs)

	}

	proto.openCodeFile = function(file){
		// if file is already in tabs, focus it
		var mainTabs = this.find('mainTabs')
		for(var i = 0; i < mainTabs.data.length; i++){
			var tab = mainTabs.data[i]
			if(tab.file === file){
				mainTabs.selectTab(i)
				return
			}
		}
		
		var name = file
		if(file.indexOf('.') === 0) name = name.slice(1)
		if(name.indexOf('.js') === name.length-3) name = name.slice(0,-3)

		// lets add a tab
		var tabId = mainTabs.data.push(
			{name:name, file:file, canClose:1}
		)-1

		// lets load up the file
		storage.loadText(file).then(function(text){
			// add code editor to tab view
			mainTabs.addChild(Code({
				text:text
			}), tabId)
			mainTabs.selectTab(tabId)
			// hide everything except our current child
		}.bind(this))
	}

	proto.onCompose = function(){
		return [
			Tabs({
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
				HomeScreen({}),
				PlayButton({
				})
			),
			User({
				w:'45%',
			})
		]
	}
})