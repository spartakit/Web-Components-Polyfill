module('Parser', {
	setup: function() {
		var mockFactory = {
			createDeclaration: function(inElement) {
				this.oncreate && this.oncreate(inElement);
			}.bind(this)
		};
		this.realFactory = polyfill.declarationFactory;
		polyfill.declarationFactory = mockFactory;
	},
	teardown: function() {
		polyfill.declarationFactory = this.realFactory;
	}
});

test('.parseElement calls declarationFactory.createDeclaration', function() {
	var created = false;
	this.oncreate = function() {
		created = true;
	};
	polyfill.parser.parseElement(null);
	this.oncreate = null;
	ok(created);
});

test('.parseElements creates a declaration for each <element>', function() {
	var mock = document.createElement("div");
	mock.innerHTML = "<element></element><element></element><element></element>";
	//
	var count = 0;
	this.oncreate = function() {
		count++;
	};
	polyfill.parser.parseElements(mock);
	this.oncreate = null;
	//
	equal(count, 3);
});

/*
test('.parse must trigger .onparse callback for each <element>', 3, function() {
    var parser = new polyfill.Parser();
    var count = 0;
    parser.onparse = function(element) {
        count++;
    }
    parser.parse('<element></element>');
    ok(count == 1);
    parser.parse('<div></div>');
    ok(count == 1);
    parser.parse('<element></element><element></element>');
    ok(count == 3);
});

test('parsed content must not run scripts', 1, function() {
    var parser = new polyfill.Parser();
    parser.onparse = function(element) {
    }
    parser.parse('<element><script> window.booger = true; </script></element>');
    ok(!window.boooger);
});

asyncTest('parsed content must not fetch resources', 1, function() {
    var parser = new polyfill.Parser();
    var cacheWarmUp = new Image();
    cacheWarmUp.addEventListener('load', function() {
        parser.onparse = function(element) {
            var img = element.appendChild(document.createElement('img'));
            img.addEventListener('load', function() {
                ok(false);
                start();
            });
            img.src = cacheWarmUp.src;
        }
        parser.parse('<element></element>');
        ok(true);
        start();
    });
    cacheWarmUp.src = 'resources/logo.jpg';
});
*/