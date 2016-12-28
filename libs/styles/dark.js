module.exports = class DarkStyle extends require('base/style'){
	prototype(){
		this.anims = {
			openAnim:{fn:'ease', begin:10, end:10}
		}

		this.fonts = {
			mono:require('fonts/ubuntu_monospace_256.font'),
			icon:require('fonts/fontawesome_low.font'),
			size:11
		}

		this.colors = {
			textSelect:'Purple900',
			accentNormal:'Purple900',
			accentDown:'Purple500',
			accentGray:'Grey700',
			bgTop:'Grey900',
			bgNormal:'Grey850',
			bgHi:'Grey800',
			textNormal:'Grey300',
			textAccent:'Grey400',
			textMed:'Grey500',
			textHi:'Grey300',
			textLo:'Grey700',
			codeBg:'Grey900',
			codeClass:'Pink300',
			codeObject:'Indigo200',
			codeParen:'BlueGrey400',
			codeArray:'Cyan300',
			codeFunction:'Amber300',
			codeCall:'Yellow300',
			codeIf:'LightGreen300',
			codeLoop:'DeepOrange300',
			codeComment:'Blue700',
			codeException:'Red400',
			codeVar:'BlueGrey200',
			codeLet:'BlueGrey100',
			codeConst:'BlueGrey400',
			codeGlobal:'YellowA100',
			codeArg:'BlueGrey500',
			codeUnknown:'White',
			codeOperator:'Amber300',
			codeNumber:'IndigoA100',
			codeBoolean:'Red400',
			codeString:'GreenA200',
			codeTokException:'red'
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