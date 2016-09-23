module.exports = class Hover extends require('tools/bg'){

	prototype(){
		this.props = {
			selected: {noTween:1, value:0},

			selectedColor: {noTween:1,pack:'float12', value:'red'},
			selectedBorderColor: {noTween:1,pack:'float12', value:'yellow'},
			selectedBorderRadius: {noTween:1,value:-1.},
			selectedBorderWidth: {noTween:1,value:-1.},

			hoverColor: {noTween:1, pack:'float12', value:'blue'},
			hoverBorderColor: {noTween:1, pack:'float12', value:'white'},
			hoverBorderRadius: {noTween:1, value:-1.},
			hoverBorderWidth: {noTween:1, value:-1.},

			displace: {noTween:1, value:[0,0]},
		}
	}

	vertexPre(){$
		this.x += this.displace.x
		this.y += this.displace.y
		if(this.selected > .5){
			this.color = this.selectedColor
			this.borderColor = this.selectedBorderColor
			if(this.selectedBorderRadius>=0.) this.borderRadius = this.selectedBorderRadius 
			if(this.selectedBorderWidth>=0.) this.borderWidth = this.selectedBorderWidth
		}
		else{
			var pos = vec2()
			if(this.isFingerOver(pos)>0){
				this.color = this.hoverColor
				this.borderColor = this.hoverBorderColor
				if(this.hoverBorderRadius>=0.) this.borderRadius = this.hoverBorderRadius 
				if(this.hoverBorderWidth>=0.) this.borderWidth = this.hoverBorderWidth
			}
		}
	}
}