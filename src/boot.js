(function(scope) {

scope = scope || {};

// NOTE: uses 'window' and 'document' globals

scope.webComponentsReady = function() {
	var e = document.createEvent('Event');
	e.initEvent('WebComponentsReady', true, true);
	window.document.body.dispatchEvent(e);
};

scope.ready = function() {
	scope.declarationFactory.createHostSheet();
	scope.componentLoader.preload(document, function() {
		parser.parse(document, scope.declarationFactory.declarationFromElement);
		scope.declarationFactory.morphAll(document);
		scope.webComponentsReady();
	});
};

scope.run = function() {
	document.addEventListener('DOMContentLoaded', scope.ready);
};

if (!scope.flags.runManually) {
	scope.run();
}

window.__exported_components_polyfill_scope__ = null;

})(window.__exported_components_polyfill_scope__);
