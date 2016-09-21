var service = require('$keyboard1')

var idToKeyName = {
	8:'backSpace',9:'tab',13:'enter',16:'shift',17:'ctrl',18:'alt',
	19:'pause',20:'capsLock',27:'escape',
	32:'space',33:'pageUp',34:'pageDown',
	35:'end',36:'home',37:'leftArrow',38:'upArrow',39:'rightArrow',40:'downArrow',
	45:'insert',46:'delete',
	48:'num0',49:'num1',50:'num2',51:'num3',52:'num4',
	53:'num5',54:'num6',55:'num7',56:'num8',57:'num9',
	65:'a',66:'b',67:'c',68:'d',69:'e',70:'f',71:'g',
	72:'h',73:'i',74:'j',75:'k',76:'l',77:'m',78:'n',
	79:'o',80:'p',81:'q',82:'r',83:'s',84:'t',85:'u',
	86:'v',87:'w',88:'x',89:'y',90:'z',
	93:'meta',
	96:'pad0',97:'pad1',98:'pad2',99:'pad3',100:'pad4',101:'pad5',
	102:'pad6',103:'pad7',104:'pad8',105:'pad9',
	106:'multiply',107:'add',109:'subtract',110:'decimal',111:'divide',
	112:'f1',113:'f2',114:'f3',115:'f4',116:'f5',117:'f6',
	118:'f7',119:'f8',120:'f9',121:'f10',122:'f11',123:'f12',
	144:'numlock',145:'scrollLock',186:'semiColon',187:'equals',188:'comma',
	189:'dash',190:'period',191:'slash',192:'accent',219:'openBracket',
	220:'backSlash',221:'closeBracket',222:'singleQuote'
}

var Keyboard = require('base/class').extend(function Keyboard(proto){
	require('base/events')(proto)
})

var keyboard = module.exports = new Keyboard()

keyboard.setClipboardText = function(text){
	service.postMessage({
		fn:'setClipboardText',
		text:text
	})
}

keyboard.useSystemEditMenu = function(capture){
	service.postMessage({
		fn:'useSystemEditMenu',
		capture:capture
	})
}

keyboard.setCharacterAccentMenuPos = function(x, y){
	service.postMessage({
		fn:'setCharacterAccentMenuPos',
		x:x,y:y
	})
}


keyboard.setWorkerKeyboardFocus = function(){
	service.postMessage({
		fn:'setWorkerKeyboardFocus'
	})
}

keyboard.setTextInputFocus = function(focus){
	service.postMessage({
		fn:'setTextInputFocus',
		focus:focus
	})
}

var pileupQueue = []
var pileupTimer

function flushPileupQueue(){
	for(let i = 0; i < pileupQueue.length; i++){
		var msg = pileupQueue[i]
		if(keyboard[msg.fn]) keyboard[msg.fn](msg)
	}
	pileupQueue.length = 0
}

service.onMessage = function(msg){
	if(msg.code) msg.name = idToKeyName[msg.code] || 'unknown'
	if(Date.now()-msg.pileupTime > 16){
		if(msg.repeat) return // drop repeat keys
		if(pileupTimer) clearTimeout(pileupTimer)
		pileupQueue.push(msg)
		pileupTimer = setTimeout(flushPileupQueue, 16)
		return
	}
	if(pileupTimer) clearTimeout(pileupTimer), pileupTimer = undefined
	pileupQueue.push(msg)
	flushPileupQueue()
}