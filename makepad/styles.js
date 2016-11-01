
module.exports = class MakepadStyle extends require('base/style'){
	prototype(){

		this.dump = 1

		this.anims = {
			tween:2,
			duration:0.2,
			ease:[0,10,0,0]
		}

		this.fonts = {
			mono:require('fonts/ubuntu_monospace_256.font'),
			icon:require('fonts/fontawesome_low.font'),
			size:11
		}

		this.colors = {
			textSelect:'Purple900',
			accentNormal:'Purple900',
			accentGray:'Grey700',
			bgNormal:'Grey850',
			textNormal:'Grey300',
			textAccent:'Grey400',
			textMed:'Grey500',
			textHi:'Grey300',
			textLo:'Grey200',

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
			codeString:'GreenA200'
			/*
			codeClass:'Red300',
			codeClass:'Pink300',
			codeClass:'Purple300',
			codeClass:'DeepPurple300',
			codeClass:'Indigo300',
			codeClass:'Blue300',
			codeClass:'LightBlue300',
			codeClass:'Cyan300',
			codeClass:'Teal300',
			codeClass:'Green300',
			codeClass:'LightGreen300',
			codeClass:'Lime300',
			codeClass:'Yellow300',
			codeClass:'Amber300',
			codeClass:'Orange300',
			codeClass:'DeepOrange300',
			codeClass:'Brown300',
			codeClass:'Grey300',
			codeClass:'BlueGrey300',
			*/
		}
	}

	match(){
		var style = this
		// all Text things except icon get this font
		if(style.module('/libs/tools/text')) style.to = {
			font: style.fonts.mono
		}

		// all Text things except icon get this font
		if(style.module('/libs/tools/icon')) style.to = {
			font: style.fonts.icon
		}
	}
}