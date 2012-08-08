(function(scope) {

// NOTE: depends on 'window' and 'document' globals

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
};

scope.Declaration.prototype = {
	generateConstructor: function() {
		var declaration = this;
		var extended = function() {
			return declaration.morph(domCreateElement(declaration.archetype.name));
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
		console.group("morphing an", this.archetype.name)
		// convert element to custom element
		//
		// generate an instance of our source component
		var instance = document.createElement(this.archetype.extendsTagName);
		// link canonical instance prototype to our custom prototype
		this.archetype.generatedConstructor.prototype.__proto__ = instance.__proto__;
		// graft our enhanced prototype chain back onto instance
		instance.__proto__ = this.archetype.generatedConstructor.prototype;
		// transplant attributes and content into the new instance
		this.transplantNodeDecorations(element, instance);
		//
		// identify the new type (boo, can't fix tagName in general)
		instance.setAttribute("is", this.archetype.name);
		//
		// construct shadowRoot
		var shadowRoot = this.createShadowRoot(instance, this.template);
		// instantiate internal web components
		if (shadowRoot) {
			// note: potentially recursive
			scope.declarationRegistry.morphAll(shadowRoot);
		}
		this.created && this.created.call(instance, shadowRoot);
		//
		// replace the original element in DOM
		if (element.parentNode) {
			element.parentNode.replaceChild(instance, element);
			this.inserted && this.inserted.call(instance, shadowRoot);
		}
		//
		// Setup mutation observer for attribute changes
		if (this.attributeChanged) {
			var observer = new WebKitMutationObserver(function(mutations) {
				mutations.forEach(function(m) {
					this.attributeChanged(m.attributeName, m.oldValue,
						m.target.getAttribute(m.attributeName));
				}.bind(this));
			}.bind(this));
			observer.observe(shadowRoot.host, {
				attributes: true,
				attributeOldValue: true
			});
		}
		//
		console.groupEnd();
		return instance;
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
	},
	morphAll: function(inNode) {
		for (var n in this.registry) {
			var d = this.registry[n];
			forEach($$(inNode, d.archetype.name + ',[is=' + d.archetype.name + ']'), d.morph, d);
		}
	}
};

// allow document.createElement to delegate to declarationRegistry
var domCreateElement = document.createElement.bind(document);
document.createElement = function(inTag) {
	return scope.declarationRegistry.make(inTag) || domCreateElement(inTag);
};

scope.declarationFactory = {
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
		console.group("creating an", name, "declaration");
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
		//
		console.groupEnd();
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
		this.hostSheet = s;
	}
};

// use for qualifying urls
var anchor = document.createElement('a');

// construct HTMLDocument from HTML
var makeDocument = function(inHtml, inName) {
	var doc = document.implementation.createHTMLDocument();
	doc.body.innerHTML = inHtml;
	doc.name = inName;
	return doc;
};

scope.loader = {
	// extract qualified urls from hrefs in <link rel="components" href="..."> tags
	linksToUrls: function(inLinks) {
		var urls = [];
		forEach(inLinks, function(link) {
			var href = link.getAttribute("href");
			if (href) {	
				anchor.href = href;
				urls.push(anchor.href);
			}
		});
		return urls;
	},
	loadDocuments: function(inLinks) {
		var html, doc, docs = [];
		forEach(this.linksToUrls(inLinks), function(url) {
			html = this.loadUrl(url);
			if (html) {
				docs.push(makeDocument(html, url));
			}
		}, this);
		return docs;
	},
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

scope.parser = {
	parseDocument: function(inDocument) {
		console.group(inDocument.name || inDocument.URL);
		this.parseLinkedDocuments(inDocument);
		this.parseExternalScripts(inDocument);
		this.parseElements(inDocument);
		console.groupEnd();
	},
	parseLinkedDocuments: function(inDocument) {
		var docs = scope.loader.loadDocuments($$(inDocument, 'link[rel=components]'));
		// yield here when async
		this.parseDocuments(docs);
	},
	parseDocuments: function(inDocs) {
		forEach(inDocs, this.parseDocument, this);
	},
	parseExternalScripts: function(inDocument) {
		if (inDocument != document) {
			$$(inDocument, 'script[src]').forEach(this.injectScriptElement);
		}
	},
	// FIXME: only here so it can be stubbed for testing
	// Instead, expose a 'utils' object on 'scope' for such things
	injectScriptElement: function(inSrc) {
		// NOTE: will load asynchronously
		var head = document.querySelector("head");
		var ss = document.createElement("script");
		ss.src = inSrc.getAttribute("src");
		head.appendChild(ss);
	},
	parseElements: function(inDocument) {
		$$(inDocument, 'element').forEach(function(element) {
			this.parseElement(element);
		}, this);
	},
	parseElement: function(inElement) {
		scope.declarationFactory.createDeclaration(inElement);
	}
};

scope.webComponentsReady = function() {
	var e = document.createEvent('Event');
	e.initEvent('WebComponentsReady', true, true);
	window.document.body.dispatchEvent(e);
};

scope.ready = function() {
	scope.declarationFactory.createHostSheet();
	scope.parser.parseDocument(document);
	scope.declarationRegistry.morphAll(document);
	scope.webComponentsReady();
};

scope.run = function() {
	document.addEventListener('DOMContentLoaded', scope.ready);
};

if (!scope.runManually) {
	scope.run();
}

function nop() {};

})(window.__exported_components_polyfill_scope__);
