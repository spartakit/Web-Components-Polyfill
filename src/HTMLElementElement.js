(function(scope) {

scope = scope || {};

// HTMLElementElement

scope.HTMLElementElement = function(name, tagName, declaration) {
	this.name = name;
	this.extendsTagName = tagName;
	// lifecycle method is on element, but executes in declaration scope
	this.lifecycle = declaration.exportLifecycleMethod();
};

scope.HTMLElementElement.prototype = {
	__proto__: HTMLElement.prototype
};

})(window.__exported_components_polyfill_scope__);
