(function(scope) {

// NOTE: use attributes on the script tag for this file as directives

// noshadow=""			use custom content insertion algorithm instead of WebkitShadowDom
// export="[name]"		exports polyfill scope into window as 'name'
// clonemorph=""		morph nodes via cloning superclass node

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

// missing DOM/JS API

var forEach = function(inArrayish, inFunc, inScope) {
	Array.prototype.forEach.call(inArrayish, inFunc, inScope);
};

var $ = function(inElement, inSelector) {
	return inElement.querySelector(inSelector);
};

var $$ = function(inElement, inSelector) {
	var nodes = inElement.querySelectorAll(inSelector);
	nodes.forEach = function(inFunc, inScope) {
		forEach(nodes, inFunc, inScope);
	}
	return nodes;
};

function nop() {};

// bind shim for iOs

if (!Function.prototype.bind) {
	console.warn("patching 'bind'");
	Function.prototype.bind = function(scope) {
		var _this = this;
		return function() {
			return _this.apply(scope, arguments);
		}
	}
};

// directives

var source = (function() {
	var thisFile = "components-polyfill.js";
	var source, s$ = $$(document, '[src]').forEach(function(s) {
		if (s.getAttribute('src').slice(-thisFile.length) == thisFile) {
			source = s;
		}
	});
	return source || {getAttribute: nop};
})();

scope.flags = {
	noShadow: Boolean(source.getAttribute("noshadow")),
	exportAs: source.getAttribute("export"),
	cloneMorph: source.getAttribute("clonemorph")
};
console.log(scope.flags);

if (scope.flags.exportAs) {
	window[scope.flags.exportAs] = scope;
}

// requirement testing

if (!scope.flags.noShadow && !window.WebKitShadowRoot) {
	console.error('Shadow DOM support is required.');
	return;
}

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

// xhr tools

var makeDocument = function(inHtml, inName) {
	var doc = document.implementation.createHTMLDocument();
	doc.body.innerHTML = inHtml;
	doc.name = inName;
	return doc;
};

var xhr = {
	ok: function(inRequest) {
		return (inRequest.status >= 200 && inRequest.status < 300) || (inRequest.status == 304);
	},
	load: function(url, next, context) {
		var request = new XMLHttpRequest();
		request.open('GET', url);
		request.addEventListener('readystatechange', function(e) {
			if (request.readyState === 4) {
				next.call(context, !xhr.ok(request) && request, request.response);
			}
		});
		request.send();
	}
};

// path conversion utilities

scope.path = {
	makeCssUrlsRelative: function(inCss, inBaseUrl) {
		return inCss.replace(/url\([^)]*\)/g, function(inMatch) {
			// find the url path, ignore quotes in url string
			var urlPath = inMatch.replace(/["']/g, "").slice(4, -1);
			urlPath = scope.path.resolveUrl(inBaseUrl, urlPath);
			urlPath = scope.path.makeRelPath(document.URL, urlPath);
		  return "url(" + urlPath + ")";
		});
	},
	resolveUrl: function(inBaseUrl, inUrl) {
		if (this.isAbsUrl(inUrl)) {
			return inUrl;
		}
		var base = this.urlToPath(inBaseUrl);
		return this.compressUrl(base + inUrl);
	},
	resolveNodeUrl: function(inNode, inRelativeUrl) {
		var baseUrl = this.urlFromNode(inNode);
		return this.resolveUrl(baseUrl, inRelativeUrl);
	},
	urlFromNode: function(inNode) {
		var n = inNode, p;
		while (p = n.parentNode) {
			n = p;
		}
		return (n && (n.URL || n.name)) || "";
	},
	urlToPath: function(inBaseUrl) {
		var parts = inBaseUrl.split("/");
		parts.pop();
		return parts.join("/") + "/";
	},
	isAbsUrl: function(inUrl) {
		return /^data:/.test(inUrl) || /^http[s]?:/.test(inUrl);
	},
	compressUrl: function(inUrl) {
		var parts = inUrl.split("/");
		for (var i=0, p; i < parts.length; i++) {
			p = parts[i];
			if (p == "..") {
				parts.splice(i-1, 2);
				i -= 2;
			}
		}
		return parts.join("/");
	},
	// make a relative path from source to target
	makeRelPath: function(inSource, inTarget) {
		var s, t;
		s = this.compressUrl(inSource).split("/");
		t = this.compressUrl(inTarget).split("/");
		while (s.length && s[0] === t[0]){
			s.shift();
			t.shift();
		}
		for(var i = 0, l = s.length-1; i < l; i++) {
			t.unshift("..");
		}
		return t.join("/");
	}
};

// caching parallel loader

scope.loader = {
	// caching
	cache: {},
	pending: {},
	log: function(inUrl, inMsg) {
		var path = inUrl.split("/");
		path = path.slice(-2);
		console.log("..." + path.join("/"), inMsg);
	},
	loadFromNode: function(inNode, inNext) {
		var url = this.nodeUrl(inNode);
		if (!this.cached(url, inNext)) {
			this.request(url, inNext);
		}
	},
	nodeUrl: function(inNode) {
		var nodeUrl = inNode.getAttribute("href") || inNode.getAttribute("src");
		var url = scope.path.resolveNodeUrl(inNode, nodeUrl);
		return url;
	},
	cached: function(inUrl, inNext) {
		var data = this.cache[inUrl];
		if (data !== undefined) {
			if (data == this.pending) {
				var p = data[inUrl] = data[inUrl] || [];
				p.push(inNext);
			} else {
				scope.loader.log(inUrl, "retrieved from cache");
				inNext(null, this.cache[inUrl], inUrl);
			}
			return true;
		}
	},
	request: function(inUrl, inNext) {
		this.cache[inUrl] = this.pending;
		//
		var onload = function(err, response) {
			console.log("(" + inUrl, "loaded)");
			this.cache[inUrl] = response;
			inNext(err, response, inUrl);
			this.resolvePending(inUrl);
		};
		//
		xhr.load(inUrl, onload.bind(this));
	},
	resolvePending: function(inUrl) {
		var p = this.pending[inUrl];
		if (p) {
			p.forEach(function(next) {
				scope.loader.log(inUrl, "retrieved from cache");
				next(null, null, inUrl);
			});
			this.pending[inUrl] = null;
		}
	},
	// completion tracking
	oncomplete: nop,
	inflight: 0,
	push: function() {
		this.inflight++;
	},
	pop: function() {
		if (--this.inflight == 0) {
			this.oncomplete();
		}
	},
	load: function(inNode, inNext) {
		this.push();
		this.loadFromNode(inNode, function(err, response) {
			inNext(err, response);
			this.pop();
		}.bind(this));
	},
	// hook to store HTMLDocuments in cache
	docs: {},
	loadDocument: function(inNode, inNext) {
		this.push();
		this.loadFromNode(inNode, function(err, response, url) {
			inNext(err, this.docs[url] = (this.docs[url] || makeDocument(response, url)));
			this.pop();
		}.bind(this));
	},
	fetchFromCache: function(inNode) {
		var url = this.nodeUrl(inNode);
		var data = this.docs[url] || this.cache[url];
		if (data === undefined) {
			console.error(url + " was not in cache");
		}
		return data;
	}
};

// external web component resource preloader

scope.componentLoader = {
	_preload: function(inNode) {
		$$(inNode, "link[rel=components]").forEach(function(n) {
			scope.loader.loadDocument(n, function(err, response) {
				if (!err) {
					scope.componentLoader._preload(response);
				}
			});
		});
		if (inNode != document) {
			$$(inNode, "link[rel=stylesheet],script[src]").forEach(function(n) {
				scope.loader.load(n, nop);
			});
		}
		if (!scope.loader.inflight) {
			scope.loader.oncomplete();
		}
	},
	preload: function(inDocument, inNext) {
		scope.loader.oncomplete = inNext;
		scope.componentLoader._preload(inDocument);
	},
	fetch: function(inNode) {
		return scope.loader.fetchFromCache(inNode);
	}
};


// HTMLElementElement

scope.HTMLElementElement = function(name, tagName, declaration) {
	this.name = name;
	this.extendsTagName = tagName;
	// lifecycle method is on element, but executes in declaration scope
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
		if (!instance.__morphed__ && shadowRoot && this.attributeChanged && window.WebKitMutationObserver) {
			console.log("attaching mutation observer to ", instance)
			var observer = new WebKitMutationObserver(function(mutations) {
				mutations.forEach(function(m) {
					this.attributeChanged.call(instance, m.attributeName, m.oldValue,
						m.target.getAttribute(m.attributeName));
				}.bind(this));
			}.bind(this));
			observer.observe(shadowRoot.host, {
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
	selector: function(inDeclaration) {
		return inDeclaration.archetype.name + ',[is=' + inDeclaration.archetype.name + ']'
	},
	morph: function(inNode, inDeclaration) {
		$$(inNode, this.selector(inDeclaration)).forEach(inDeclaration.morph, inDeclaration);
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
			console.error('name attribute is required.');
			return;
		}
		//
		console.group("creating an", name, "declaration");
		//
		// instantiate a declaration
		var declaration = new scope.Declaration({
			name: name,
			tagName: a('extends') || 'div',
			resetStyleInheritance: a("reset-style-inheritance"),
			applyAuthorStyles: a("apply-author-styles"),
			template: this.normalizeTemplate($(element, 'template'))
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
		//
		// fix css urls...
		this.adjustCssPaths(element, declaration);
		// apply @host styles.
		this.applyHostStyles(declaration);
		// evaluate components scripts
		this.scripts(element, declaration);
		//
		console.groupEnd();
	},
	normalizeTemplate: function(inTemplate) {
		if (inTemplate && !inTemplate.content) {
			var c = inTemplate.content = document.createDocumentFragment();
			while (inTemplate.childNodes.length) {
				c.appendChild(inTemplate.childNodes[0]);
			}
		}
		return inTemplate;
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
	adjustCssPaths: function(element, declaration) {
		if (declaration.template) {
			var baseUrl = scope.path.urlFromNode(element);
			forEach($$(declaration.template.content, "style"), function(s) {
				s.innerHTML = scope.path.makeCssUrlsRelative(s.innerHTML, baseUrl);
			});
		}
	},
	sheets: function(element, declaration) {
		var sheet = [];
		if (declaration.template) {
			console.group("sheets");
			forEach($$(element, "link[rel=stylesheet]"), function(s) {
				var styles = scope.componentLoader.fetch(s);
				sheet.push(styles);
			});
			if (sheet.length) {
				console.log("sheets found (", sheet.length, "), injecting");
				var style = document.createElement("style");
				style.style.display = "none !important;";
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
						var s = m.replace("@host", declaration.archetype.name + ", [is=" + declaration.archetype.name + "]");
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

scope.parser = {
	parseDocument: function(inDocument) {
		console.group(inDocument.name || inDocument.URL);
		this.parseExternalScripts(inDocument);
		this.parseLinkedDocuments(inDocument);
		this.parseElements(inDocument);
		console.groupEnd();
	},
	parseLinkedDocuments: function(inDocument) {
		var docs = this.fetchDocuments($$(inDocument, 'link[rel=components]'));
		// yield here when async
		this.parseDocuments(docs);
	},
	fetchDocuments: function(inLinks) {
		var docs = [];
		forEach(inLinks, function(link) {
			docs.push(scope.componentLoader.fetch(link));
		});
		return docs;
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
	injectScriptElement: function(inScript) {
		var ss = document.createElement("script");
		ss.textContent = scope.componentLoader.fetch(inScript);
		document.body.appendChild(ss);
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
	scope.componentLoader.preload(document, function() {
		scope.parser.parseDocument(document);
		scope.declarationRegistry.morphAll(document);
		scope.webComponentsReady();
	});
};

scope.run = function() {
	document.addEventListener('DOMContentLoaded', scope.ready);
};

if (!scope.runManually) {
	scope.run();
}

})(window.__exported_components_polyfill_scope__);
