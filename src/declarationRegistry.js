(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

scope.declarationRegistry = {
	registry: {},
	register: function(name, declaration) {
		this.registry[name] = declaration;
	},
	ancestor: function(inDeclaration) {
		return this.registry[inDeclaration.archetype.extendsTagName];
	},
	// invoke inFunc in the context of inName's archetype
	exec: function(inName, inFunc) {
		var declaration = this.registry[inName];
		if (declaration) {
			inFunc.call(declaration.archetype);
		}
	},
	// make component from inName's declaration
	make: function(inName) {
		var declaration = this.registry[inName];
		if (declaration) {
			return declaration.archetype.generatedConstructor();
		}
	},
	morphAll: function(inNode) {
		for (var n in this.registry) {
			this.morph(inNode, this.registry[n]);
		}
	},
	morph: function(inNode, inDeclaration) {
		$$(inNode, this.selector(inDeclaration)).forEach(inDeclaration.morph, inDeclaration);
	},
	selector: function(inDeclaration) {
		return inDeclaration.archetype.name + ',[is=' + inDeclaration.archetype.name + ']'
	}
};

// allow document.createElement to delegate to declarationRegistry
document.createElement = function(inTag) {
	return scope.declarationRegistry.make(inTag) || document.__proto__.createElement.call(document, inTag);
};

})(window.__exported_components_polyfill_scope__);
