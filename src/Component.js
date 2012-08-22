(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

defaultBase = null;

component = {
	declare: function(inBase) {
		var ctor = function() {
			// return the public interface
			return this.created();
		};
		ctor.prototype = (inBase || defaultBase).prototype;
		return ctor;
	}
};

defaultBase = function() {};
defaultBase.prototype = {
	exports: [
	],
	created: function() {
		this.extendsTag = this.extendsTag || "div";
		this.initialize(document.createElement(this.extendsTag));
		return this.node;
	},
	initialize: function(inNode) {
		this.node = inNode;
		this.lightdom = this.node.cloneNode(true);
		this.node.lightdom = this.lightdom;
		this.xport()
		this.observe();
		this.render();
	},
	xport: function() {
		var p = this;
		while (p) {
			if (p.hasOwnProperty("exports")) {
				p.exports.forEach(function(n) {
					this.node[n] = this[n].bind(this);
				}, this);
			}
			p = p.__proto__;
		}
	},
	render: function() {
		scope.customShadowImpl.installDom(this);
	},
	observe: function() {
		var contentChanges = function() {
			this.render();
		}.bind(this);
		var observer = new WebKitMutationObserver(contentChanges);
		observer.observe(this.lightdom, {
			characterData: true,
			childList: true,
			subtree: true
		});
	}
};
		
// exports

scope.component = component;

})(window.__exported_components_polyfill_scope__);