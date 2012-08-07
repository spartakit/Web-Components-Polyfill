(function(scope) {

scope = scope || {};

if (!window.WebKitShadowRoot) {
	console.error('Shadow DOM support is required.');
	return;
}

// missing DOM/JS API

var forEach = function(inArrayish, inFunc, inScope) {
	Array.prototype.forEach.call(inArrayish, inFunc, inScope);
};

var $$ = function(inElement, inSelector) {
	var nodes = inElement.querySelectorAll(inSelector);
	nodes.forEach = function(inFunc, inScope) {
		forEach(nodes, inFunc, inScope);
	}
	return nodes;
};

var mixin = function(inObj, inProps) {
	var p = inProps, g, s;
	for (var n in p) {
		g = p.__lookupGetter__(n);
		s = p.__lookupSetter__(n);
		if (g || s) {
			if (g) {
				inObj.__defineGetter__(n, g);
			}
			if (s) {
				inObj.__defineSetter__(n, s);
			}
		} else {
			inObj[n] = p[n];
		}
	}
	return inObj;
};

// debuggable script injection
// 
// this technique allows the component scripts to be
// viewable and debuggable in inspector scripts
// tab (although they are all named "(program)").

// invoke inScript in inContext scope
var inject = function(inScript, inContext, inName) {
	// inject a (debuggable!) script tag
	var	tag = document.createElement("script");
	tag.textContent = "componentScript('" + inName + "', function(){" + inScript + "});";
	document.body.appendChild(tag);
};

// global necessary for script injection
window.componentScript = function(inName, inFunc) {
	scope.declarationRegistry.exec(inName, inFunc);
};

// HTMLElementElement

scope.HTMLElementElement = function(name, tagName, declaration) {
	this.name = name;
	this.extendsTagName = tagName;
	this.lifecycle = scope.Declaration.prototype.installLifecycle.bind(declaration);
};

scope.HTMLElementElement.prototype = {
	__proto__: HTMLElement.prototype
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
	// Hard-bind the following methods to "this":
	this.morph = this.morph.bind(this);
};

scope.Declaration.prototype = {
	generateConstructor: function() {
		var archetype = this.archetype;
		var extended = function() {
			return declaration.morph(document.createElement(archetype.name));
		};
		return extended;
	},
	installLifecycle: function(inMap) {
		var lifecycleMethods = ["created", "inserted", "removed", "attributeChanged"];
		lifecycleMethods.forEach(function(m) {
			this[m] = inMap[m] || nop;
		}, this);
		// TODO: Implement remove lifecycle methods.
	},
	evalScript: function(script) {
		inject(script, this.archetype, this.archetype.name);
		//FIXME: Add support for external js loading.
	},
	morph: function(element) {
		// convert element to custom element
		//
		// generate an instance of our source component
		var instance = document.createElement(this.archetype.extendsTagName);
		// FIXME: this can be done once, as a preprocess
		this.archetype.generatedConstructor.prototype.__proto__ = instance.__proto__;
		// graft our enhanced prototype chain onto instance
		instance.__proto__ = this.archetype.generatedConstructor.prototype;
		// transplant attributes and content into the new instance
		this.transplantNodeDecorations(element, instance);
		// replace the original element in DOM
		if (element.parentNode) {
			element.parentNode.replaceChild(instance, element);
		}
		//
		// identify the new type (boo, can't fix tagName in general)
		instance.setAttribute("is", this.archetype.name);
		//
		// construct shadowRoot
		var shadowRoot = this.createShadowRoot(instance, this.template);
		//
		// Fire created event
		this.created && this.created.call(instance, shadowRoot);
		this.inserted && this.inserted.call(instance, shadowRoot);
		//
		// Setup mutation observer for attribute changes
		if (this.attributeChanged) {
			var observer = new WebKitMutationObserver(function(mutations) {
				mutations.forEach(function(m) {
					this.attributeChanged(m.attributeName, m.oldValue,
						m.target.getAttribute(m.attributeName));
				}.bind(this));
			}.bind(this));

			// TOOD: spec isn't clear if it's changes to the custom attribute
			// or any attribute in the subtree.
			observer.observe(shadowRoot.host, {
				attributes: true,
				attributeOldValue: true
			});
		}
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
				n$.push(n);
			});
			forEach(n$, function(n) {
				inDst.appendChild(n);
			});
		}
	},
	createShadowRoot: function(element, template) {
		if (template) {
			var shadowRoot = new WebKitShadowRoot(element);
			// NOTE: MDV chromium build implements this element so use it!
			if (template instanceof HTMLTemplateElement) {
				//console.log("Using native HTMLTemplateElement");
				shadowRoot.appendChild(template.content.cloneNode(true));
			} else {
				forEach(this.template.childNodes, function(node) {
					shadowRoot.appendChild(node.cloneNode(true));
				});
			}
			// FIXME: .host not set automatically (spec says it is [?])
			if (!shadowRoot.host) {
				shadowRoot.host = element;
			}
			return shadowRoot;
		}
	}
};

// declaration registry singleton
scope.declarationRegistry = {
	registry: {},
	register: function(name, declaration) {
		this.registry[name] = declaration;
	},
	ancestors: function(inDeclaration) {
		var results = [];
		var d = inDeclaration;
		while (d) {
			d = this.registry[d.archetype.extendsTagName];
			if (d) {
				results.unshift(d);
			}
		}
		return results;
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
	}
};

var domCreateElement = document.createElement.bind(document);
document.createElement = function(inTag) {
	return scope.declarationRegistry.make(inTag) || domCreateElement(inTag);
};

scope.DeclarationFactory = function() {
	// target for @host rules
	this.hostSheet = this.createHostSheet();
};

scope.DeclarationFactory.prototype = {
	// Called whenever each Declaration instance is created.
	oncreate: null,
	createDeclaration: function(element) {
		// sugar
		var a = function(n) {
			return element.getAttribute(n);
		};
		// require a name
		var name = a('name');
		if (!name) {
			// FIXME: Make errors more friendly.
			console.error('name attribute is required.');
			return;
		}
		// instantiate a declaration
		var declaration = new scope.Declaration({
			name: name,
			tagName: a('extends') || 'div',
			template: element.querySelector('template'),
			//constructorName: a('constructor'),
			resetStyleInheritance: a("reset-style-inheritance"),
			applyAuthorStyles: a("apply-author-styles")
		});
		// register the declaration so we can find it by name
		scope.declarationRegistry.register(name, declaration);
		// optionally install the constructor on the global object
		var ctor = a('constructor');
		if (ctor) {
			window[ctor] = declaration.archetype.generatedConstructor;
		}
		// load component stylesheets
		this.sheets(element, declaration);
		// apply @host styles.
		this.applyHostStyles(declaration);
		// evaluate components scripts
		this.scripts(element, declaration);
		// notify observer
		this.oncreate && this.oncreate(declaration);
	},
	scripts: function(element, declaration) {
		// accumulate all script content from the element declaration
		var script = [];
		forEach($$(element, "script"), function(s) {
			script.push(s.textContent);
		});
		// if there is any code, inject it
		if (script.length) {
			inject(script.join(';\n'), declaration.archetype, declaration.archetype.name);
		}
	},
	sheets: function(element, declaration) {
		var sheet = [];
		if (declaration.template) {
			console.group("sheets");
			//var doc = declaration.template.content;
			var doc = element;
			forEach($$(doc, "link[rel=stylesheet]"), function(s) {
				var href = s.getAttribute("href");
				var styles = scope.loader.loadUrl(href);
				console.log(href, styles);
				sheet.push(styles);
			});
			if (sheet.length) {
				console.log("sheets found (", sheet.length, "), injecting");
				var style = document.createElement("style");
				style.innerHTML = sheet.join('');
				declaration.template.content.appendChild(style);
			}
			console.groupEnd();
		}
	},
	hostRe:/@host[^{]*({[^{]*})/gim,
	applyHostStyles: function(declaration) {
		// strategy: apply a rule for each @host rule with @host replaced with the component name
		// into a stylesheet added at the top of head (so it's least specific)
		if (declaration.template) {
			forEach($$(declaration.template.content, "style"), function(s) {
				var matches = s.innerHTML.match(this.hostRe);
				if (matches) {
					matches.forEach(function(m) {
						var s = m.replace("@host", "[is=" + declaration.archetype.name + "]");
						var n = document.createTextNode(s);
						this.hostSheet.appendChild(n);
					}, this);
				}
			}, this);
		}
	},
	// support for creating @host rules
	createHostSheet: function() {
		var s = document.createElement("style");
		var h = document.head;
		if (h.children.length) {
			h.insertBefore(s, h.children[0]);
		} else {
			h.appendChild(s);
		}
		return s;
	}
};

scope.Parser = function() {
};

scope.Parser.prototype = {
	// Called for each element that's parsed.
	onparse: null,
	parse: function(string) {
		var doc = document.implementation.createHTMLDocument();
		doc.body.innerHTML = string;
		[].forEach.call(doc.querySelectorAll('element'), function(element) {
			this.onparse && this.onparse(element);
		}, this);
	}
};


scope.Loader = function() {
	this.start = this.start.bind(this);
};

scope.Loader.prototype = {
	// Called for each loaded declaration.
	onload: null,
	onerror: null,
	start: function() {
		[].forEach.call(document.querySelectorAll('link[rel=components]'), function(link) {
			this.load(link.href);
		}, this);
	},
	load: function(url) {
		var request = new XMLHttpRequest();
		var loader = this;

		request.open('GET', url);
		request.addEventListener('readystatechange', function(e) {
			if (request.readyState === 4) {
				if (request.status >= 200 && request.status < 300 || request.status === 304) {
					loader.onload && loader.onload(request.response);
				} else {
					loader.onerror && loader.onerror(request.status, request);
				}
			}
		});
		request.send();
	}
};

scope.loader = {
	ok: function(inRequest) {
		return (inRequest.status >= 200 && inRequest.status < 300) || (inRequest.status == 304);
	},
	loadUrl: function(url) {
		var request = new XMLHttpRequest();
		request.open('GET', url, false);
		request.send();
		return this.ok(request) ? request.response : '';
	}
};

scope.run = function() {
	var ready = function() {
		loader.start();
		//scope.parser.parseDocument(document);
	};
	document.addEventListener('DOMContentLoaded', ready);
	//
	var loader = new scope.Loader();
	//
	var parser = new scope.Parser();
	loader.onload = parser.parse.bind(parser);
	loader.onerror = function(status, resp) {
		console.error("Unable to load component: Status " + status + " - " +
			resp.statusText);
	};
	//
	var factory = new scope.DeclarationFactory();
	parser.onparse = factory.createDeclaration.bind(factory);
	factory.oncreate = function(declaration) {
		[].forEach.call(
			document.querySelectorAll(declaration.archetype.name + ',[is=' + declaration.archetype.name + ']'),
			declaration.morph);
	};
};

if (!scope.runManually) {
	scope.run();
}

function nop() {}

})(window.__exported_components_polyfill_scope__);
