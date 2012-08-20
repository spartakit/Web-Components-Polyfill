(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

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
	nodeUrl: function(inNode) {
		var nodeUrl = inNode.getAttribute("href") || inNode.getAttribute("src");
		var url = scope.path.resolveNodeUrl(inNode, nodeUrl);
		return url;
	},
	resolveUrl: function(inBaseUrl, inUrl) {
		if (this.isAbsUrl(inUrl)) {
			return inUrl;
		}
		var base = this.urlToPath(inBaseUrl);
		return this.compressUrl(base + inUrl);
	},
	resolveNodeUrl: function(inNode, inRelativeUrl) {
		var baseUrl = this.documentUrlFromNode(inNode);
		return this.resolveUrl(baseUrl, inRelativeUrl);
	},
	documentUrlFromNode: function(inNode) {
		var n = inNode, p;
		while ((p = n.parentNode)) {
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

})(window.__exported_components_polyfill_scope__);
