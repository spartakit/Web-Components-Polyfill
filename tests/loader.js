module('Loader', {
	setup: function() {
		var mockXhr = function(){};
		mockXhr.prototype = {
			status: 200,
			response: "mock",
			open: function(inMethod, inUrl) {
			},
			send: function(){
			}
		}
		this.withMockXhr = function(fn) {
			this.replacedXHR = XMLHttpRequest;
			window.XMLHttpRequest = mockXhr;
			fn.call(this);
			window.XMLHttpRequest = this.replacedXHR;
		};
	},
	teardown: function() {
	}
});

test(".linksToUrls must qualify urls", 4, function() {
	var links = [];
    var createComponentsLink = function(href) {
        var link = document.createElement('link');
        link.rel = 'components';
        link.href = href;
		links.push(link);
	};
	//
    var hrefs = ['monkey', '.', 'http://bear/'];
    hrefs.forEach(createComponentsLink);
	//
	var urls = polyfill.loader.linksToUrls(links);
	equal(urls.length, 3);
	//
    var a = document.createElement('a');
	for (var i=0; i<3; i++) {
		a.href = hrefs[i];
		equal(urls[i], a.href);
	}
});

test(".loadDocuments must convert link tags into HTMLDocument instances", 2, function() {
	var links = [];
    var createComponentsLink = function(url) {
        var link = document.createElement('link');
        link.rel = 'components';
        link.href = url;
		links.push(link);
	};
	//
    var urls = ['http://monkey/', 'http://bear/', 'http://fish/'];
    urls.forEach(createComponentsLink);
	//
	var docs;
	this.withMockXhr(function() {
		docs = polyfill.loader.loadDocuments(links);
	});
	equal(docs.length, 3);
	//
	var areHtmlDocs = true;
	docs.forEach(function(d) {
		areHtmlDocs = areHtmlDocs && (d instanceof HTMLDocument);
	});
	ok(areHtmlDocs);
});


test(".ok must return true for non-error XHR status codes", 10, function() {
	// NOTE: xhr from file:// on some devices can return weird status codes (0?)
	ok(polyfill.loader.ok({status: 200}));
	ok(polyfill.loader.ok({status: 201}));
	ok(polyfill.loader.ok({status: 202}));
	ok(polyfill.loader.ok({status: 203}));
	ok(polyfill.loader.ok({status: 204}));
	ok(polyfill.loader.ok({status: 205}));
	ok(polyfill.loader.ok({status: 206}));
	ok(polyfill.loader.ok({status: 304}));
	ok(!polyfill.loader.ok({status: 404}));
	ok(!polyfill.loader.ok({status: 500}));
});

test('.loadUrl must fetch contents of a file synchronously', 1, function() {
	var contents = polyfill.loader.loadUrl('resources/char.txt');
    equal(contents, 'A');
});

test('end-to-end test', 2, function() {
    var createComponentsLink = function(url) {
        var link = document.createElement('link');
        link.rel = 'components';
        link.href = url;
		return link;
    };
    var links = [createComponentsLink('resources/char.txt')];
	//
	var docs = polyfill.loader.loadDocuments(links);
	equal(docs.length, 1);
	console.log(docs);
	equal(docs[0].body.innerHTML, 'A')
});
