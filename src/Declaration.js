(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

// NOTE: uses scope.flags

// noshadow=""			use custom content insertion algorithm instead of WebkitShadowDom
// clonemorph=""		morph nodes via cloning superclass node

// allow document.createElement to delegate to declarationRegistry
var domCreateElement = document.createElement.bind(document);
document.createElement = function(inTag) {
	return scope.declarationRegistry.make(inTag) || domCreateElement(inTag);
};

// Declaration

scope.Declaration = function(inProps) {
	// optional properties for Declaration constructor
	var declarationProperties = ["template", "resetStyleInheritance", "applyAuthorStyles"];
	// initialize properties
	declarationProperties.forEach(function(m) {
		this[m] = inProps[m];
	}, this);
	// create a new Element element
	this.archetype = new scope.HTMLElementElement(inProps.name, inProps.tagName, this);
	// generate a custom element constructor
	this.archetype.generatedConstructor = this.generateConstructor();
};

scope.Declaration.prototype = {
	generateConstructor: function() {
		var declaration = this;
		var extended = function() {
			// use the 'real' createElement, not any instance override
			return declaration.morph(document.__proto__.createElement.call(document, declaration.archetype.name));
		};
		return extended;
	},
	installLifecycle: function(inMap) {
		var lifecycleMethods = ["created", "inserted", "removed", "attributeChanged", "key"];
		lifecycleMethods.forEach(function(m) {
			this[m] = inMap[m] || nop;
		}, this);
		// TODO: Implement remove lifecycle methods.
	},
	evalScript: function(script) {
		inject(script, this.archetype, this.archetype.name);
	},
	morph: function(inElement) {
		if (inElement.__morphed__) {
			return inElement;
		}
		console.group("morphing: ", this.archetype.name);
		// create a raw component instance
		var instance = this.instance(inElement);
		// render the template
		var shadowRoot = this.renderTemplate(instance, inElement);
		// fire lifecycle events, setup observers
		this.finalize(instance, shadowRoot);
		// need to do this again as the user may have 'done stuff'
		scope.declarationRegistry.morphAll(instance);
		console.groupEnd();
		// return the morphed element
		return instance;
	},
	instance: function(inElement) {
		return scope.morphImpl.instance.call(this, inElement);
	},
	captureShadow: function(inInstance) {
		// polymorph here based on shadow dom support
		if (scope.flags.noShadow) {
			// any content inside this node is going to be shadow content
			if (inInstance.childNodes.length) {
				var shadow = document.createDocumentFragment();
				while (inInstance.childNodes.length) {
					shadow.appendChild(inInstance.childNodes[0]);
				}
			}
			return shadow;
		}
	},
	renderTemplate: function(instance, element) {
		//
		// NOTE: order of createShadowRoot, replaceChild, and instantiateTemplate
		// specifically crafted (via black-box testing) to satisfy shadowDom and
		// MDV implementations
		//
		if (this.template) {
			// construct shadowRoot
			var shadowRoot = this.createShadowRoot(instance);
			// support styling attributes
			shadowRoot.applyAuthorStyles = this.applyAuthorStyles;
			shadowRoot.resetStyleInheritance = this.resetStyleInheritance;
		}
		// replace the original element in DOM
		if (element.parentNode) {
			element.parentNode.replaceChild(instance, element);
		}
		// instantiate template
		if (shadowRoot) {
			this.instantiateTemplate(instance, shadowRoot, this.template);
			// instantiate internal web components
			// note: potentially recursive
			scope.declarationRegistry.morphAll(shadowRoot);
		}
		return shadowRoot;
	},
	finalize: function(instance, shadowRoot) {
		// get protected member key
		var declaration = scope.declarationRegistry.ancestor(this);
		var key = declaration && declaration.key;
		// fire lifecycle events
		this.created && this.created.call(instance, shadowRoot, key);
		this.inserted && this.inserted.call(instance, shadowRoot);
		// Setup mutation observer for attribute changes
		// NOTE: Consider a design change here: for a given instance we attach 
		// this observer for each component in the extension change. This is necessary
		// because attributeChanged is stored in the declaration lifecycle.
		if (this.attributeChanged && window.WebKitMutationObserver) {
			console.log("attaching mutation observer to ", instance)
			var observer = new WebKitMutationObserver(function(mutations) {
				mutations.forEach(function(m) {
					this.attributeChanged.call(instance, m.attributeName, m.oldValue,
						m.target.getAttribute(m.attributeName));
				}.bind(this));
			}.bind(this));
			observer.observe(instance, {
				attributes: true,
				attributeOldValue: true
			});
		}
		// flag this node as coming from polyfill
		instance.__morphed__ = true;
	},
	transplantNodeDecorations: function(inSrc, inDst) {
		forEach(inSrc.attributes, function(a) {
			inDst.setAttribute(a.name, a.value);
		});
		if (inSrc.childElementCount == 0) {
			inDst.innerHTML = inSrc.innerHTML;
		} else {
			var n$ = [];
			forEach(inSrc.children, function(n) {
				if (!isTemplate(n)) {
					n$.push(n);
				}
			});
			forEach(n$, function(n) {
				inDst.appendChild(n);
			});
		}
	},
	createShadowRoot: function(element) {
		return scope.shadowImpl.createShadowRoot(element);
	},
	instantiateTemplate: function(instance, shadowRoot, template) {
		scope.shadowImpl.installDom(instance, shadowRoot, template.content.cloneNode(true));
	}

};

// morph an x-foo in-place
scope.morphInPlaceImpl = {
	instance: function(inElement) {
		// generate an instance of our source component
		var instance = document.createElement(this.archetype.extendsTagName);
		// capture inherited content
		var shadow = this.captureShadow(instance);
		if (shadow) {
			instance.shadow = shadow;
		}
		// link canonical instance prototype to our custom prototype
		this.archetype.generatedConstructor.prototype.__proto__ = instance;
		// graft our enhanced prototype chain back onto our element
		inElement.__proto__ = this.archetype.generatedConstructor.prototype;
		// identify the new type for compatibility with the other impl
		inElement.setAttribute("is", this.archetype.name);
		// return the instance
		return inElement;
	}
};

// morph an x-foo by creating a new element and copying onto it
scope.morphInstanceImpl = {
	instance: function(inElement) {
		// generate an instance of our source component
		var instance = document.createElement(this.archetype.extendsTagName);
		// capture inherited content
		var shadow = this.captureShadow(instance);
		if (shadow) {
			inElement.shadow = shadow;
		}
		// transplant attributes and content into the new instance
		this.transplantNodeDecorations(inElement, instance);
		// link canonical instance prototype to our custom prototype
		this.archetype.generatedConstructor.prototype.__proto__ = instance.__proto__;
		// graft our enhanced prototype chain back onto instance
		instance.__proto__ = this.archetype.generatedConstructor.prototype;
		// identify the new type (boo, can't fix tagName in general)
		instance.setAttribute("is", this.archetype.name);
		// return the instance
		return instance;
	}
};

scope.morphImpl = scope.flags.cloneMorph ? scope.morphInstanceImpl : scope.morphInPlaceImpl;

var isTemplate = function(inNode) {
	return inNode.tagName == "TEMPLATE";
}

// works with actual ShadowDom
scope.webkitShadowImpl = {
	createShadowRoot: function(element) {
		var shadowRoot = new WebKitShadowRoot(element);
		// FIXME: .host not set automatically (spec says it is [?])
		if (!shadowRoot.host) {
			shadowRoot.host = element;
		}
		return shadowRoot;
	},
	installDom: function(instance, shadowRoot, dom) {
		shadowRoot.appendChild(dom);
	}
};

// custom implementation of shadow-dom without the shadow; i.e. content insertion
scope.customShadowImpl = {
	createShadowRoot: function(element) {
		element.host = element;
		return element;
	},
	installDom: function(instance, shadowRoot, dom) {
		// build a immutable list of template <content> elements
		var c$ = [];
		$$(dom, "content").forEach(function(content) {
			c$.push(content)
		});
		// replace each <content> element with matching content
		c$.forEach(function(content) {
			//inNode.childParents.push(content.parentNode);
			// build list of 'light dom' nodes that we will distribute
			var n$ = [];
			var slctr = content.getAttribute("select");
			var nodes = slctr ? $$(shadowRoot, slctr) : shadowRoot.childNodes;
			forEach(nodes, function(n) {
				// simulate shadow dom
				n.logicalParent = n.parentNode;
				// filter out template nodes
				if (!isTemplate(n)) {
					n$.push(n);
				}
			});
			// build a fragment from the selected nodes
			var frag = document.createDocumentFragment();
			n$.forEach(function(n) {
				frag.appendChild(n);
			});
			// replace the content node with the fragment
			content.parentNode.replaceChild(frag, content);
		});
		// install shadow content to <shadow> node, if any
		if (instance.shadow) {
			var shadow = $(dom, "shadow");
			if (shadow) {
				shadow.parentNode.replaceChild(instance.shadow, shadow);
			}
		}
		// if there is any unselected content, send it to the bit bucket
		shadowRoot.innerHTML = '';
		// the transformed dom
		shadowRoot.appendChild(dom);
	}
};

scope.shadowImpl = scope.flags.noShadow ? scope.customShadowImpl : scope.webkitShadowImpl;

})(window.__exported_components_polyfill_scope__);
