module.exports = class Hover extends require('shaders/bg'){

	prototype(){
		this.props = {
			selected: 0,

			selectedColor: 'red',
			selectedBorderColor: 'yellow',
			selectedBorderRadius: -1,
			selectedBorderWidth: -1,

			hoverColor: 'blue',
			hoverBorderColor: 'white',
			hoverBorderRadius: -1,
			hoverBorderWidth: -1,

			displace: [0,0],
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