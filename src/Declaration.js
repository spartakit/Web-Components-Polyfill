(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

// NOTE: uses scope.flags
//
// noshadow=""			use custom content insertion algorithm instead of WebkitShadowDom
// clonemorph=""		morph nodes via cloning superclass node

// Declaration

scope.Declaration = function(inProps) {
	// optional properties for Declaration constructor
	var declarationProperties = ["template", "resetStyleInheritance", "applyAuthorStyles"];
	// initialize properties
	declarationProperties.forEach(function(m) {
		this[m] = inProps[m];
	}, this);
	// create a new Element element
	this.archetype = new scope.HTMLElementElement(inProps.name, inProps.tagName);
	// attach declare method to archetype (called in declaration scope)
	this.archetype.declare = this.declare.bind(this);
	// generate a custom element constructor
	this.archetype.component = this.generateConstructor();
	// generate a component
	this.declare();
};

scope.Declaration.prototype = {
	declare: function() {
		// identify baseTag and baseComponent
		this.baseTag = this.archetype.extendsTagName;
		var ancestor = scope.declarationRegistry.registry[this.baseTag];
		if (ancestor) {
			this.baseTag = ancestor.baseTag;
			var baseComponent = ancestor.component;
		}
		console.log("extends:", this.archetype.extendsTagName, ", base tag:", this.baseTag);
		// generate the component
		this.component = scope.component.declare(baseComponent);
		console.log("component: ", this.component.prototype);
	},
	create: function() {
		return new (this.component)();
		// use the 'real' createElement, not any instance override
		//return declaration.morph(document.__proto__.createElement.call(document, declaration.archetype.name));
	},
	morph: function(inElement) {
		// subvert the constructor
		var component = Object.create(this.component.prototype);
		component.initialize(inElement);
		console.log("instance from morph: ", component);
		return component;
	},
	generateConstructor: function() {
		var declaration = this;
		var ctor = function() {
			return declaration.create();
		};
		return ctor;
	},
	finalize: function() {
		// insert user supplied prototype into component's chain
		var ap = this.archetype.component.prototype || {};
		// NOTE: only acceptable if ap has a trivial __proto__ itself
		ap.__proto__ = this.component.prototype;
		this.component.prototype = ap;
		// attach template
		ap.template = this.template;
	},
	exportLifecycleMethod: function() {
		return this.installLifecycle.bind(this);
	}
};

})(window.__exported_components_polyfill_scope__);
