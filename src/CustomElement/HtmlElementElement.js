(function(scope) {

scope = scope || {};

scope.HTMLElementElement = function(inName, inExtendsName, inLifecycleMethod) {
	this.name = inName;
	this.extendsName = inExtendsName;
	this.lifecycle = inLifecycleMethod;
};

})(window.__exported_components_polyfill_scope__);