/*!
* beaword powered by Wilson@yyfearth.com
* filename: loader-baeword.js
* last update: 2010-09-28 00:39:32
*/

(function () { // loader util closure

	try { // browser check
		var ua = navigator.userAgent;
		navigator.app = window.opera && 'opera' || /MSIE/i.test(ua) && 'ie' || /firefox/i.test(ua) && 'firefox' || /chrome/i.test(ua) && 'chrome' || /safari/i.test(ua) && 'safari' || /webkit/i.test(ua) && 'webkit' || 'mozilla';
		navigator.moz5 = /Mozilla\/5.0/i.test(ua);
		navigator.kernel = /Trident/i.test(ua) && 'Trident' || /WebKit/i.test(ua) && 'WebKit' || /KHTML/i.test(ua) && 'KHTML' || /Presto/i.test(ua) && 'Presto' || /Gecko/i.test(ua) && 'Gecko'
		if (navigator.app == 'ie') {
			navigator.ver = parseFloat(ua.match(/MSIE (\d+\.\d+)/)[1]);
			if (typeof localStorage != 'object' || navigator.ver > 8) { // IE7- or IE8/9 localfile
				var ver = navigator.ver.toFixed(1);
				if (navigator.ver == 8) ver += ' (localStorage Disabled)';
				else if (navigator.ver > 8) ver += ' (Temporary Unsupported)';
				alert('Your Browser\nMicrosoft Internet Explorer ' + ver + '\nis not supported by this application!\n\nWe recommend you switch your browser to use this WebApp.');
				document.execCommand('stop');
				location.replace('browsers.html');
			}
		} else if (typeof localStorage == 'undefined') {
			window.localStorage = null;
		}
	} catch (e) {
		window.localStorage = null;
	}
	if (!localStorage) {
		alert('This application cannot work properly under you browser,\nwhich do not support some HTML5 Features!\n\nRecommended browser: \nGoogle Chrome, Apple Safari 4+, Mozilla Firefox 3.0+, Opera 10+\n(Microsoft Internet Explorer 8 might work, but extremely slow!)')
		location.replace('browsers.html');
	}

	// browser hack
	// w3c standard implements
	if (!Array.prototype.map) {
		Array.prototype.map = function (fun /*, thisp*/) {
			var len = this.length;
			if (typeof fun != 'function')
				throw new TypeError();
			var res = new Array(len);
			var thisp = arguments[1];
			for (var i = 0; i < len; i++) {
				if (i in this)
					res[i] = fun.call(thisp, this[i], i, this);
			}
			return res;
		};
	}
	if (!Array.prototype.forEach) {
		Array.prototype.forEach = function (fun /*, thisp*/) {
			var len = this.length;
			if (typeof fun != "function")
				throw new TypeError();
			var thisp = arguments[1];
			for (var i = 0; i < len; i++) {
				if (i in this)
					fun.call(thisp, this[i], i, this);
			}
		};
	}
	// JSON supporting code was repaced with Ext.USE_NATIVE_JSON = true below

	//Ext.ux.console = { // debug console with timing
	//	init: function () { if (!window.console) console = null; },
	//	msg: function (msg, type) {
	//		if (!console) return false;
	//		if (!(console[type] instanceof Function)) type = 'log';
	//		var d = new Date(), t = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ' - ';
	//		console[type](t + msg);
	//	},
	//	log: function (msg) { return this.msg(msg, 'log'); },
	//	warn: function (msg) { return this.msg(msg, 'warn'); },
	//	error: function (msg) { return this.msg(msg, 'error'); },
	//	info: function (msg) { return this.msg(msg, 'info'); }
	//};

	// import and load
	function _build_func(name, func) {
		if (typeof name != 'string' && typeof func != 'function') return false;
		var b = window, ns = name.split('.'), fn = ns.pop();
		ns.forEach(function (n) { b = b[n] ? b[n] : (b[n] = {}); });
		return b[fn] = func;
	}
	function _import_js(js_file, callback, scope, id) { // the base of import and load
		var js = document.createElement('script'),
		html_doc = document.getElementsByTagName('head')[0];
		id && js.setAttribute('id', id);
		js.setAttribute('type', 'text/javascript');
		js.setAttribute('src', js_file);
		html_doc.appendChild(js);
		if (typeof callback == 'function') {
			js.onreadystatechange = function () { // for ie
				if (/^$(loaded|complete)/i.test(js.readyState))
					callback.call(scope || window, js);
			};
			js.onload = function () { // for non-ie
				callback.call(scope || window, js);
			};
		}
		return js;
	}
	function _import_css(css_file, id) { // import css
		var css = document.createElement('link'),
		html_doc = document.getElementsByTagName('head')[0];
		id && css.setAttribute('id', id);
		css.setAttribute('rel', 'stylesheet');
		css.setAttribute('type', 'text/css');
		css.setAttribute('href', css_file);
		html_doc.appendChild(css);
		return css;
	}

	function $import(file, callback, scope, id) { // import once !
		if (!file) return false;
		else if (file instanceof Array) { // js_files array
			var c = file.lenght, _callee = arguments.callee;
			file.forEach(function (f) {
				if (f.src) { // json
					if (typeof callback == 'function') {
						_callee(f.src, function (f_dom) {
							if (typeof f.callback == 'function')
								f.callback.call(f.scope || scope || window, f_dom);
							if (! --c) callback.call(scope || window, f_dom);
						}, f.scope || window, f.id || null);
					} else _callee(f.src, null, null, f.id || null);
				} else { // string
					if (typeof callback == 'function') {
						_callee(f, function (f_dom) {
							if (! --c) callback.call(scope || window, f_dom);
						}, scope || window, id || null);
					} else _callee(f);
				}
			});
		} else {
			if (file in arguments.callee.history) {
				return false;
			} else {
				arguments.callee.history[file] = true;
				/\.css$/i.test(file)
					? _import_css(arguments.callee.CSS_BASE_URL + file, id)
					: _import_js(arguments.callee.JS_BASE_URL + file, callback, scope, id);
			}
		}
	}

	function $load(js_file, callback, scope, timeout, fallback, self_callback) { // import and remove node
		if (js_file instanceof Array) { // js_files array
			var c = array.lenght;
			array.forEach(function (js) {
				if (typeof callback == 'function') {
					func(js, function (js_dom) {
						if (! --c) callback.call(scope || window, js_dom);
					}, scope, timeout, fallback);
				} else func(js);
			});
		} else { // single js_file
			var _callback = (typeof callback == 'function' ? callback : null),
			_fallback = (typeof fallback == 'function' ? fallback : null); ;
			if (self_callback) { // build func
				_build_func(self_callback, function () { // open
					_build_func(self_callback, function () { }); // close
					if (typeof callback == 'function') callback.apply(scope || window, arguments);
				}); // set self_callback
				_callback = null; // forbid js loaded callback
				_fallback = function () {
					_build_func(self_callback, function () { }); // close
					if (typeof fallback == 'function') fallback.call(scope || window);
				};
			}
			var js_dom, _timeout = setTimeout(function () {
				js_dom && js_dom.parentNode.removeChild(js_dom);
				_fallback && _fallback.call(scope || window); // fallback
			}, timeout || 30000); // default 30s
			js_dom = _import_js(arguments.callee.BASE_URL + js_file, function (js_dom) {
				_timeout = _timeout && clearTimeout(_timeout);
				_callback && _callback.call(scope || window); // callback
				js_dom.parentNode.removeChild(js_dom);
			}, scope);
		}
	}

	function $include(src, id) {
		if (!src) return false;
		else if (src instanceof Array) { // js_files array
			var _callee = arguments.callee;
			src.forEach(function (f) { f.src ? _callee(f.src, f.id || null) : _callee(f); });
		} else {
			if (src in $import.history) {
				return false;
			} else {
				$import.history[src] = true;
				/\.css$/i.test(src)
					? document.writeln('<link rel="stylesheet" type="text/css" href="' + $import.CSS_BASE_URL + src + (id ? '" id="' + id : '') + '" />')
					: document.writeln('<script type="text/javascript" src="' + $import.JS_BASE_URL + src + (id ? '" id="' + id : '') + '"></script>');
			}
		}
	}

	$load.BASE_URL = '../data/';
	$import.JS_BASE_URL = '../js/';
	$import.CSS_BASE_URL = '../css/';
	$import.history = {};
	window.$include = $include;
	window.$import = $import;
	window.$load = $load;

	// dev
	var files = [
		'ext-all-notheme.css',
		{ id: 'theme', src: 'xtheme-blue.css' },
		'ux-baeword.css',
		'baeword.css',
		'ext-base-debug-w-comments.js',
		'ext-all-debug-wo-flash.js',
		'ux-baeword.js',
		'baeword.js'
	];

	//deploy
	//var files = ["ext-all.css","ux-baeword.css","baeword.css","ext-base.js","ext-all.js","ux-baeword.js","baeword.js"];

	if (/\bexport\b/i.test(location.search)) { // export page
		document.title = 'WordList Export - Waiting...';
		document.write('<h1 style="text-align:center">Waiting...</h1>');
		document.close();
		// code moved to exportHTML
	} else { // baeword loader
		$include(files);
	}

})() // end of loader util closure
