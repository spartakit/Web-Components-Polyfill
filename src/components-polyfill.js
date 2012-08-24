(function(scope) {

scope = scope || {};

// NOTE: use attributes on the script tag for this file as directives

// protection			element script is 'protected', isolated from the node itself
// noshadow				use custom content insertion algorithm instead of WebkitShadowDom
// export="[name]"		exports polyfill scope into window as 'name'
// clonemorph			morph nodes via cloning superclass node

// NOTE: uses 'window' and 'document' globals

// directives

var thisFile = "components-polyfill.js";

var source, base = "";

(function() {
	var s$ = document.querySelectorAll('[src]');
	Array.prototype.forEach.call(s$, function(s) {
		var src = s.getAttribute('src');
		if (src.slice(-thisFile.length) == thisFile) {
			source = s;
			base = src.slice(0, -thisFile.length);
		}
	});
	source = source || {getAttribute: nop};
})();

var flags = scope.flags = {
	runManually: source.hasAttribute("runManually"),
	protect: source.hasAttribute("protection"),
	//noShadow: source.hasAttribute("noshadow"),
	//cloneMorph: source.hasAttribute("clonemorph"),
	exportAs: source.getAttribute("export")
};

console.log(flags);

if (flags.exportAs) {
	window[flags.exportAs] = scope;
}

window.__exported_components_polyfill_scope__ = scope;


var require = function(inSrc) {
	document.write('<script src="' + base + inSrc + '"></script>');
};

[
	"lang.js",
	"ShadowDom/customShadow.js",
	"CustomElement/HtmlElementElement.js",
	"CustomElement/Declaration.js",
	"CustomElement/declarationRegistry.js",
	"ComponentDocument/loader.js",
	"ComponentDocument/parser.js",
	"ComponentDocument/declarationFactory.js",

	"boot.js"
].forEach(require);

})(window.__exported_components_polyfill_scope__);
