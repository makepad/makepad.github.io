module.exports = function(){

	Object.defineProperty(this, 'macros', {
		get:function(){
			return this._canvasmacros
		},
		set:function(canvas){
			if(!this.hasOwnProperty('_macros')) this._canvasmacros = this._canvasmacros?Object.create(this._canvasmacros):{}
			for(var key in canvas){
				this._canvasmacros[key] = canvas[key]
			}				
		}
	})

}