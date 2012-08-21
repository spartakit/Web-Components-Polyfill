(function(scope) {

scope = scope || {};

// HTMLElementElement

scope.HTMLElementElement = function(name, tagName, declaration) {
	this.name = name;
	this.extendsTagName = tagName;
};

scope.HTMLElementElement.prototype = {
	__proto__: HTMLElement.prototype
};

})(window.__exported_components_polyfill_scope__);
