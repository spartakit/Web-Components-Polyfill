(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

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

var makeDocument = function(inHtml, inName) {
	var doc = document.implementation.createHTMLDocument();
	doc.body.innerHTML = inHtml;
	doc.name = inName;
	return doc;
};


// caching parallel loader

var loader = {
	// caching
	cache: {},
	pending: {},
	display: function(inUrl) {
		var path = inUrl.split("/");
		path = path.slice(-2);
		return "..." + path.join("/");
	},
	nodeUrl: function(inNode) {
		var url = inNode.getAttribute("href") || inNode.getAttribute("src");
		//var url = scope.path.resolveNodeUrl(inNode, nodeUrl);
		return url;
	},
	loadFromNode: function(inNode, inNext) {
		var url = loader.nodeUrl(inNode);
		if (!this.cached(url, inNext)) {
			this.request(url, inNext);
		}
	},
	cached: function(inUrl, inNext) {
		var data = this.cache[inUrl];
		if (data !== undefined) {
			if (data == this.pending) {
				var p = data[inUrl] = data[inUrl] || [];
				p.push(inNext);
			} else {
				console.log(loader.display(inUrl), "cached or pending");
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
				console.log(loader.display(inUrl), "resolved via cache");
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
		var url = loader.nodeUrl(inNode);
		var data = this.docs[url] || this.cache[url];
		if (data === undefined) {
			console.error(url + " was not in cache");
		}
		return data;
	}
};

// web component resource loader

var componentLoader = {
	_preload: function(inNode) {
		$$(inNode, "link[rel=components]").forEach(function(n) {
			loader.loadDocument(n, function(err, response) {
				if (!err) {
					componentLoader._preload(response);
				}
			});
		});
		if (inNode != document) {
			$$(inNode, "link[rel=stylesheet],script[src]").forEach(function(n) {
				loader.load(n, nop);
			});
		}
		if (!loader.inflight) {
			loader.oncomplete();
		}
	},
	preload: function(inDocument, inNext) {
		loader.oncomplete = inNext;
		componentLoader._preload(inDocument);
	},
	fetch: function(inNode) {
		return loader.fetchFromCache(inNode);
	}
};

scope.componentLoader = componentLoader;

})(window.__exported_components_polyfill_scope__);
