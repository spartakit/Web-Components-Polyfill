(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

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
		var url = scope.path.nodeUrl(inNode);
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
		var url = scope.path.nodeUrl(inNode);
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

})(window.__exported_components_polyfill_scope__);
