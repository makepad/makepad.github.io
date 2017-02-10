module.exports = class DarkStyle extends require('base/style'){
	prototype(){
		this.anims = {
			openAnim:{fn:'ease', begin:10, end:10}
		}

		this.fonts = {
			mono:require('fonts/ubuntu_monospace_256.font'),
			icon:require('fonts/fontawesome.font'),
			regular:require('fonts/ubuntu_regular_256.font'),
			size:11
		}

		this.colors = {
			textSelect:'Purple300',
			accentNormal:'Purple100',
			accentDown:'Purple500',
			accentGray:'Grey700',
			bgTop:'#c',
			bgNormal:'#d',
			bgHi:'#f',
			textNormal:'#0',
			textAccent:'#1',
			textMed:'#2',
			textHi:'#0',
			textLo:'#0',
			codeBg:'#c',
			codeClass:'Pink900',
			codeObject:'Indigo900',
			codeParen:'BlueGrey900',
			codeArray:'Cyan900',
			codeFunction:'Amber900',
			codeCall:'Yellow900',
			codeIf:'LightGreen900',
			codeLoop:'DeepOrange900',
			codeComment:'Blue900',
			codeException:'Red900',
			codeVar:'BlueGrey800',
			codeLet:'BlueGrey900',
			codeConst:'BlueGrey900',
			codeGlobal:'YellowA100',
			codeArg:'BlueGrey900',
			codeUnknown:'Black',
			codeOperator:'Amber900',
			codeNumber:'IndigoA100',
			codeBoolean:'Red900',
			codeString:'Green900',
			codeTokException:'red',
			codeLog:'yellow'
		}
	}

	inherit(path){
		var style = this
		// all Text things except icon get this font
		if(path == '/libs/shaders/text.js') style.to = {
			font: style.fonts.mono
		}

		// all Text things except icon get this font
		if(path == '/libs/shaders/icon.js') style.to = {
			font: style.fonts.icon
		}
	}
}