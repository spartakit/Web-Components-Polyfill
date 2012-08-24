(function(scope) {

scope = scope || {};
scope.flags = scope.flags || {};

var Declaration = function(inProps) {
	// optional properties for Declaration constructor
	var declarationProperties = ["name", "extendsName", "template",
		"resetStyleInheritance", "applyAuthorStyles", "lifecycle", "declClass"];
	// install properties
	declarationProperties.forEach(function(m) {
		this[m] = inProps[m];
	}, this);
	// create our HTMLElementElement instance
	this.element = new scope.HTMLElementElement(this.name, this.extendsName, this.setLifecycle.bind(this));
	// create our constructor
	this.element.generatedConstructor = this.generatedConstructor = this.generateConstructor();
	// initialize prototype, if we have an implementor
	if (this.declClass) {
		this.generatedConstructor.prototype = new this.declClass();
	}
	// locate ancestor declaration (if any)
	this.ancestor = scope.declarationRegistry.declByName(this.extendsName) || nob;
	// discover DOM tag extended by our ultimate base class
	this.baseTag = this.ancestor.baseTag || this.extendsName || "div";
	// finalize if our lifecycle is defined
	if (this.lifecycle) {
		this.finalize();
	}
	// otherwise, wait for lazy finalization
	else {
		// avoid null-checks
		this.lifecycle = nob;
	}
	// register ourselves
	scope.declarationRegistry.add(this);
};

Declaration.prototype = {
	generateConstructor: function() {
		var decl = this;
		return function Component() {
			return decl.create();
		};
	},
	finalize: function() {
		if (this.ancestor !== nob) {
			// non-dom inheritance
			var p = this.generatedConstructor.prototype;
			// we might have some links already
			while (p.__proto__.__proto__) {
				p = p.__proto__;
			}
			// chain to our ancestor prototype
			p.__proto__ = this.ancestor.generatedConstructor.prototype;
		} else {
			inheritanceImpl.inheritDom.call(this);
		}
	},
	createBaseElement: function() {
		return document.__proto__.createElement.call(document, this.baseTag);
	},
	createElement: function() {
		// if "realXTags", create an <x-[name]>, losing bindings (aka replaced elements won't work)
		// otherwise, create a <[baseTag]> with bindings intact
		return document.__proto__.createElement.call(document, scope.flags.realXTags ? this.name : this.baseTag);
	},
	setLifecycle: function(inLifecycle) {
		this.lifecycle = inLifecycle;
	},
	create: function(inNode) {
		var instance = inNode ? this.morph(inNode) : this.instance();
		instance.setAttribute("is", this.name);
		this.created(instance, this.createShadowDom(instance, this));
		return instance;
	},
	instance: function() {
		var instance = this.createElement();
		return inheritanceImpl.instance.call(this, instance);
	},
	morph: function(inNode) {
		if (inNode.__morphed__) {
			return inNode;
		}
		var instance = inheritanceImpl.instance.call(this, inNode);
		instance.__morphed_ = true;
		return instance;
	},
	createShadowDom: function(inNode) {
		return scope.shadowImpl.createShadow(inNode, this);
	},
	invoke: function(inMethodName, inInstance, inArgs) {
		return inheritanceImpl.invoke.call(this, inMethodName, inInstance, inArgs);
	},
	created: function(inInstance, inShadow) {
		this.key = this.invoke("created", inInstance,
			[inShadow, this.ancestor.lifecycle && this.ancestor.lifecycle.key]);
	},
	// TODO: find a way to discover if we are inserted
	inserted: function(inInstance) {
		this.invoke("inserted", inInstance);
	},
	// TODO: find a way to discover if we are removed
	removed: function(inInstance) {
		this.invoke("removed", inInstance);
	}
};

scope.Declaration = Declaration;

var publicInheritanceImpl = {
	instance: function(instance) {
		instance.__proto__ = this.generatedConstructor.prototype;
		return instance;
	},
	inheritDom: function() {
		var proto = this.generatedConstructor.prototype.__proto__;
		// DOM-based inheritance
		var base = this.createBaseElement();
		if (!scope.flags.realXTags) {
			base = base.__proto__;
		}
		proto.__proto__ = base;
	},
	invoke: function(inMethodName, inInstance, inArgs) {
		var fn = this.lifecycle[inMethodName];
		return fn && fn.apply(inInstance, inArgs || []);
	}
};

var protectedInheritanceImpl = {
	instance: function(instance) {
		var p = this.generatedConstructor.prototype;
		if (p.attach) {
			p.attach(instance);
		}
		return instance;
	},
	inheritDom: function() {
	},
	invoke: function(inMethodName, inInstance, inArgs) {
		var fn = this.generatedConstructor.prototype[inMethodName];
		// NOTE: lifecycle methods in protected mode 
		// take 'inNode' as first argument
		return fn && fn.apply(this, [inInstance].concat(inArgs || []));
	}
};

var inheritanceImpl = scope.flags.protect ? protectedInheritanceImpl : publicInheritanceImpl;

})(window.__exported_components_polyfill_scope__);
