exports.isArray = function(obj) {
	return Object.prototype.toString.call(obj) === "[object Array]"
}

// Checks if an object has a property.
exports.has = function(obj, propName) {
	return Object.prototype.hasOwnProperty.call(obj, propName)
}
