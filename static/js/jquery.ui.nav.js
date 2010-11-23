/*
* jQuery UI nav sidebar 1.8
*
* Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
* Dual licensed under the MIT (MIT-LICENSE.txt)
* and GPL (GPL-LICENSE.txt) licenses.
*
* Nav Sidebar Widget Powered by yyfearth.com
* http://yyfearth.com/jqui-nav
*
* Depends:
*	jquery.ui.core.js
*	jquery.ui.widget.js
*	jquery.ui.accordion.js
*	jquery.ui.bar.js
*	jquery.ui.resizable.js
*/
if (!String._FORMAT_SEPARATOR) {
	String._FORMAT_SEPARATOR = String.fromCharCode(0x1f);
	String._FORMAT_ARGS_PATTERN = new RegExp('^[^' + String._FORMAT_SEPARATOR + ']*' + new Array(100).join('(?:.([^' + String._FORMAT_SEPARATOR + ']*))?'));
}
if (!String.format) {
	String.format = function (s) {
		return Array.prototype.join.call(arguments, String._FORMAT_SEPARATOR).replace(String._FORMAT_ARGS_PATTERN, s);
	};
}

//function _clear_t_or_i(id, isI) {
//	if (!id) return null;
//	isI = (isI == true || /^i/i.test(isI));
//	if (isI)
//		clearInterval(id);
//	else
//		clearTimeout(id);
//	return null;
//}

//function debug(str) {
//	$('#debug').prepend(new Date().toLocaleTimeString() + ' - ' + str + '<br/>');
//}

(function ($) {

	$.widget('ui.nav', {
		options: {
			container: null,
			data: null,
			priv: null,
			width: 220,
			fx_speed: 300,
			change: null,
			current: null,
			autohide: true,
			target: null
		},
		_create: function () {
			var container = this.element;

			if (container.hasClass('ui-nav')) {
				// already created
				this.accordions = $('.accordion', container)
				this.icon_bar = $('#icon-bar', container);
				if (!this.icon_bar.length) this.icon_bar = null;

				return this;
			}

			return this.rebuild();
		},
		rebuild: function () {
			var self = this,
				data = this.option('data'),
				container = this.element,
				data_cache = {};

			if (!(data && data.type == 'root' && data.item && data.item.length))
				throw new Error('invalid data to define the nav');

			// is ie6
			self.ie6 = /msie 6/i.test(navigator.userAgent);

			// preprocess data
			data = self._init_data();

			// turn off animation if fx_speed = 0 or $.fx.off
			self.options.fx_speed = parseInt(self.options.fx_speed);
			if ($.fx.off || self.options.fx_speed < 0 || isNaN(self.options.fx_speed)) self.option('fx_speed', 0);

			container.addClass('ui-nav');

			function find_el(el) {
				if (el instanceof jQuery) {
					return el;
				} else {
					if (el == null) {
						return null;
					} else if (typeof el == 'string' && el.length) {
						var c = $(el);
						if (c.length) return c;
						else if (/^\w/.test(el)) {
							c = $('#' + el);
							if (!c.length) return null;
							return c;
						};
					} else return $(el);
				}
			}

			// save container
			self.option('container', container);

			// find target iframe or window by default
			var target = self.option('target');
			if (target == document) {
				target = $(document.location);
			} else if (target == window && target == location) {
				target = $(window.location);
			} else {
				target = find_el(target);
			}
			if (target && /iframe/i.test(target[0].tagName)) { // iframe
				if (!target.siblings().filter('.ifr_mask').length)
					target.before('<div class="ifr_mask"></div>');
			}
			if (target) target.load(function () {
				var items = $('#nav-panel .ui-bar-item');
				function _failed_match(url) {
					self.option('current', null);
					items.switchClass('ui-state-active', 'ui-state-default', 0);
					if (self.icon_bar)
						self.icon_bar.bar('clear');
					self.option('change').call(self, self, {
						current: null,
						indexes: null,
						navaddr: (url ? [url] : [])
					});
					return false;
				} // end of _failed_match
				try {
					var href, t_href = (document.frames && !window.opera ? target[0].Document : target[0].contentDocument);
					if (t_href) {
						var t_loc = t_href.location;
						href = t_loc.href.substr(t_loc.href.indexOf(t_loc.pathname));
						t_href = href.toLowerCase();
					} else return _failed_match();
					// search matched items
					if (items.length) items.each(function (i, item) {
						if (!data_cache[item.id] || data_cache[item.id].disabled) return true;
						var data = data_cache[item.id], s_href = data.href.toLowerCase();
						if (t_href.slice(-s_href.length) == s_href) { // match
							items = null;
							if ($(item).hasClass('ui-state-active')) // already selected
								return false;
							self.option('current', data)._activate(data);
							self.option('change').call(self, self, {
								current: data,
								indexes: data.index_path,
								navaddr: _nav_addr(data)
							});
							return false;
						} // else alert(t_href.slice(-s_href.length) +'\n'+ data.href)
					}); // end of each
					if (items) return _failed_match(href);
				} catch (e) { // failed
					return _failed_match();
				}
			});
			self.option('target', target);
			// end of target iframe proc

			// build html
			var builder = this.builder = this._build_html(); // builder is a jq obj
			builder.width(self.option('width'));
			container.replaceWith(builder);
			// end of build html

			// item bars
			// page item list bar in each accordions
			var $bar_lis = builder.find('.item-bar li'), data_cache = {};
			// bind associated data
			$bar_lis.each(function (i) {
				data.indexes.item[i].element = this;
				data_cache[this.id] = data.indexes.item[i];
			});
			// build item bars
			builder.find(".item-bar").bar({
				hover: false,
				fx_speed: self.options.fx_speed,
				selecting: function () {
					$bar_lis.switchClass('ui-state-active', 'ui-state-default', 0);
				},
				click: function (bar, ui) {
					ui.data = data_cache[ui.element.id];
					self.option('current', ui.data);
					if ($.isFunction(self.option('change'))) {
						if (self.option('change').call(self, self, {
							current: ui.data,
							indexes: ui.data.index_path,
							navaddr: _nav_addr(ui.data)
						}) == false) return false;
					}
					if (target) {
						if (target.attr('src'))
							target.attr('src', ui.data.href);
						if (target.attr('href'))
							target.attr('href', ui.data.href);
					}
				}
			});
			// end of item bars

			function _nav_addr(item_data) { // func to produce nav addr array
				var nav_addr = [];
				for (var i = 0, c = data; i < 3; i++) {
					c = c.item[item_data.index_path[i]];
					nav_addr[i] = c.title;
				}
				return nav_addr;
			} // end of _nav_addr

			// accordions
			self.accordions = builder.find('.accordion').accordion({
				active: false,
				autoHeight: false,
				header: "h3",
				event: 'focus',
				changestart: function () { // clear timeout
					if (self._acc_timeout) clearTimeout(self._acc_timeout), self._acc_timeout = null;
				}
			}).each(function (i, acc) {
				if (data.item[i].disabled)
					$(acc).accordion('disable').addClass('disabled');
				else
					$(acc).accordion('activate', 0).addClass('active');
			}); // end of accordions
			var gray_acc = self.accordions.filter('.disabled').prepend('<div class="accordion-disabled-mask"></div>').resize(function () {
				var $this = $(this);
				$('.accordion-disabled-mask', this).width($this.width()).height($this.height());
			});
			self.accordions.filter('.active').find('.ui-accordion-header').hover(function () {
				var acc_h = $(this);
				if (self._acc_timeout) clearTimeout(self._acc_timeout);
				self._acc_timeout = setTimeout(function () {
					acc_h.focus();
				}, 300);
			}, function () {
				if (self._acc_timeout) clearTimeout(self._acc_timeout), self._acc_timeout = null;
			}); // end of accordions hover

			// icon bar
			if (builder.find('#icon-bar')) { // if has icon bar
				var $navp = $('#nav-panel', builder), $cmpnts = $('.nav-panel-page', $navp), last_cmpnt = $($cmpnts[0]);
				// disabled accordions mask
				self.icon_bar = builder.find('#icon-bar').bar({
					fx_speed: 0, // no animations
					selecting: function () { // ensure the panel is ready
						self.expand(true);
					},
					selected: function (bar, ui) {
						// change panel bkgcolor to the icon's
						var bkgcol = $(ui.element).css('background-color');
						if ($navp.css('background-color') != bkgcol) {
							$navp.animate({ backgroundColor: bkgcol });
						}
						// exchange effect
						if (!self.options.fx_speed) {
							$($cmpnts[ui.index]).show().siblings().hide(); // assure no 2 display
						} else {
							last_cmpnt.effect('drop', { mode: 'hide' }, self.options.fx_speed, function () {
								$cmpnts.hide();
								$($cmpnts[ui.index]).effect('drop', { mode: 'show' }, self.options.fx_speed, function () {
									$(this).show().siblings().hide(); // assure no 2 display
								})[0].style.filter = '';
							});
							last_cmpnt = $($cmpnts[ui.index]);
						}
					}
				});
				if (self.ie6 && window.BLANK_IMG) { // ie6
					$('img[src$=".png"]', self.icon_bar).one('load', function () {
						var at = { s: this.src, w: this.width, h: this.height };
						$(this).attr('src', window.BLANK_IMG).css({
							'width': at.w,
							'height': at.h,
							'filter': 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\'' + at.s + '\', sizingMethod=\'scale\')',
							'background-repeat': 'no-repeat'
						});
					});
				}
			} else self.icon_bar = null;
			// end of if has icon bar

			function nav_panel_resize() {
				$('#nav-panel', self.builder).width(builder.width() - self.icon_bar.width() - 1);
			}
			builder.resizable({ // nav resizable
				handles: 'e',
				maxWidth: 350,
				minWidth: 150,
				start: function () {
					if ($('#nav-panel', self.builder).css('display') == 'none' || self._expanding || self._shrinking)
						return false;
					self._resizing = true;
					$('.ifr_mask').show();
				},
				resize: function () {
					gray_acc.resize(); // call mask resize
					nav_panel_resize();
				},
				stop: function () {
					$('.ifr_mask').hide();
					self._resizing = false;
					self.option('width', builder.width());
				}
			}); // end of nav resizable
			gray_acc.resize(); // call mask resize
			nav_panel_resize();

			// auto hide
			if (self.option('autohide')) {
				if (target && /iframe/i.test(target[0].tagName)) { // iframe
					var _auto_hide_timeout;
					builder.hover(function () { // in
						if (_auto_hide_timeout) clearTimeout(_auto_hide_timeout);
						_auto_hide_timeout = setTimeout(function () { self.expand(); }, 500);
					}, function () { // out
						if (_auto_hide_timeout) clearTimeout(_auto_hide_timeout);
						_auto_hide_timeout = setTimeout(function () { self.shrink(); }, 1000);
					});
					//var tar_doc = document.frames&&!window.opera ? target : $(target[0].contentWindow.body);
					//alert(target[0].contentWindow)
					function ifr_onfocus() {
						if(self.builder.width() > self.icon_bar.width()){
							if (_auto_hide_timeout) clearTimeout(_auto_hide_timeout);
							_auto_hide_timeout = setTimeout(function () { self.shrink(); }, 100);
						}
					}
					if (document.frames && !window.opera) { // ie
						target.click(ifr_onfocus).focus(ifr_onfocus);
					} else {
						target.load(function () { $(this.contentWindow).click(ifr_onfocus).focus(ifr_onfocus); });
					}
				}
			} // end of auto hide

			// activate default item
			self.activate(data.init_idxes);

			return this;
		},
		shrink: function (promptly) {
			try {
				var self = this, navp = $('#nav-panel', self.builder);
				if (!self._resizing && !self._shrinking && !self._expanding && self.builder.width() > self.icon_bar.width()) {
					self._shrinking = true;
					function _after_shrink() {
						navp.hide();
						self.builder.width(self.icon_bar ? self.icon_bar.width() : 5);
						self._shrinking = false;
					}
					if (promptly || !self.options.fx_speed) {
						_after_shrink();
					} else {
						if (self.ie6) {
							$('.accordion', navp).hide();
						} else {
							navp.css({
								'position': 'absolute',
								'left': (self.icon_bar ? self.icon_bar.width() : 0) + 'px'
							});
						}
						navp.effect('drop', { mode: 'hide' }, self.options.fx_speed, _after_shrink);
					}
				}
			} catch (e) { alert('shrink err: ' + e); }
			return this;
		},
		expand: function (promptly) {
			try {
				var self = this, navp = $('#nav-panel', self.builder);
				if (!self._resizing && !self._expanding && self.builder.width() < self.options.width) {
					self._expanding = true;
					if (self._shrinking) {
						navp.stop().hide();
						self._shrinking = false;
					}
					self.builder.width(self.options.width);
					function _after_expanded() {
						if (self.ie6) {
							$('.accordion', navp).show();
						} else if (window.op) {
							navp.css({
								'position': 'relative',
								'left': '0px'
							});
						}
						navp.show()[0].style.filter = '';
						self._expanding = false;
					}
					if (promptly || !self.options.fx_speed) {
						_after_expanded();
					} else {
						navp.effect('drop', { mode: 'show' }, this.options.fx_speed, _after_expanded);
					}
				}
			} catch (e) { alert('expanding err: ' + e); }
			return this;
		},
		_activate: function (item_data) {
			if (this.icon_bar) this.icon_bar.bar('select', item_data.index_path[0]);
			$(this.accordions[item_data.index_path[0]]).accordion('activate', item_data.index_path[1]);
			if (!$(item_data.element).hasClass('ui-state-active')) {
				$('#nav-panel .ui-bar-item', this.builder).not(item_data.element).switchClass('ui-state-active', 'ui-state-default', 0);
				$(item_data.element).switchClass('ui-state-default', 'ui-state-active', 0);
			}
			return this;
		},
		activate: function (item_data) {
			try {
				var idxp;
				if ($.isArray(item_data) && item_data.length == 3) {
					idxp = item_data;
					try {
						item_data = this.option('data').item[idxp[0]].item[idxp[1]].item[idxp[2]];
					} catch (e) { return false; }
				} else if (item_data.index_path) {
					idxp = item_data.index_path;
				} else {
					return this.option('current');
				}
				if ($(item_data.element).hasClass('ui-state-active')) return false;
				$(String.format('#nav-item-$1-$2', item_data.name, item_data.index_path.join('-')), this.builder).click();
				this._activate(item_data).option('current', item_data);
			} catch (e) { alert('activate err: ' + e); }
			return this;
		},
		_init_data: function () {
			try {
				var data = this.option('data'), priv = this.option('priv');
				data.indexes = { cmpnt: [], group: [], item: [] };
				var cur = null; //, a = document.createElement('a'); // use a to pause href
				if (data.init) { // has init page
					var cur = data.init.split('/');
					if (cur[0] == '') cur.shift();
				}
				data.disabled = !priv || ((priv && !priv.root) || data.disabled); // (priv != null) && ((priv && !priv.root) || data.disabled);
				// build indexes and search init defalt index
				for (var i = 0; i < data.item.length; i++) {
					var cmpnt = data.item[i], c_priv = priv ? (priv.root == true || priv.root && priv.root[cmpnt.name]) : null;
					cmpnt.index = i;
					cmpnt.index_path = [i];
					cmpnt.disabled =data.disabled || cmpnt.disabled || !c_priv;
					if (cur && cmpnt.name == cur[0]) cur[0] = i;
					data.indexes.cmpnt.push(cmpnt);
					for (var ii = 0; ii < cmpnt.item.length; ii++) {
						var group = cmpnt.item[ii], g_priv = c_priv ? (c_priv == true || c_priv[group.name]) : null;
						group.index = i;
						group.index_path = [i, ii];
						group.disabled = cmpnt.disabled || group.disabled || !g_priv;
						if (cur[0] == i && group.name == cur[1]) cur[1] = ii;
						data.indexes.group.push(group);
						for (var iii = 0; iii < group.item.length; iii++) {
							var item = group.item[iii], i_priv = g_priv ? (g_priv == true || g_priv[item.name]) : null;
							item.index = i;
							item.index_path = [i, ii, iii];
							item.disabled = group.disabled || item.disabled || !i_priv;
							if (item.disabled) item.href = '#disabled';
							if (cur[1] == ii && item.name == cur[2]) cur[2] = iii;
							data.indexes.item.push(item);
						}
					}
				}
				// get init defalut item indexes
				data.init_idxes = [0, 0, 0];
				for (var j = 0; j < 3; j++) {
					if (cur[j] < 0) break;
					data.init_idxes[j] = cur[j];
				}
				this.option('data', data);
				return data;
			} catch (e) { alert('init data err: ' + e); }
		},
		_build_html: function () {
			try {
				var self = this, data = this.option('data');

				function mergehtml(ohtml, whtml, widget) {
					// merge groups/item into html
					widget = '{' + widget + '}';
					return ohtml ? ((ohtml.search(widget) < 0) ? whtml + ohtml : ohtml.replace(widget, whtml)) : whtml;
				}

				var icon_bar = (data.item.length > 1 && !(!data.item[0].icon || data.item[0].icon == null || data.item[0].icon == 'null'));

				// begin to construct html with json data
				//container.empty(); // clear content
				var builder = this.option('container').clone().html('<div id="nav-panel"></div>');
				if (icon_bar) {
					icon_bar = $('<ol id="icon-bar"></ol>');
					builder.prepend(icon_bar);
				}

				// each conponent
				builder.find('#nav-panel').html($.map(data.item, function (cmpnt) {
					// build icon on bar
					if (icon_bar)
						icon_bar.append(String.format('<li $4><a href="#cmpnt-$1-$2" title="$3"><img src="$5" alt="$1" title="$3"/></a></li>',
							cmpnt.name, cmpnt.index, cmpnt.title, (cmpnt.disabled ? 'class="ui-gray"' : ''), cmpnt.icon));
					if (cmpnt.item && cmpnt.item.length) {
						// each groups in cmpnt
						var accs_html = '<div class="accordion">' + $.map(cmpnt.item, function (acc) {
							if (acc.item && acc.item.length) {
								var acc_html = '<ol class="item-bar">' + $.map(acc.item, function (item) {
									return String.format('<li id="nav-item-$1-$2"><a href="$3" title="$4" $5>$6</a></li>', item.name, item.index_path.join('-'), item.href, item.title, (item.disabled ? 'class="ui-state-disabled"' : ''), (item.html ? item.html : item.title));
								}).join('\n') + '</ol>';
								acc.html = mergehtml(acc.html, acc_html, 'bar');
							}
							if (acc.html == null) acc.html = '';
							if (acc.title)
								return String.format('<div><h3><a>$1</a></h3><div>$2</div></div>', acc.title, acc.html);
							else
								return String.format('<div>$2</div>', acc.html);
						}).join('\n') + '</div>';
						// merge groups into html
						cmpnt.html = mergehtml(cmpnt.html, accs_html, 'accordion');
					}
					return String.format('<div id="cmpnt-$1-$2" class="nav-panel-page$3">\n<h2>$4</h2>$5</div>', cmpnt.name, cmpnt.index, (cmpnt.disabled ? ' ui-state-disabled' : ''), cmpnt.title, (cmpnt.html ? cmpnt.html : ''));
				}).join('\n'));
				return builder;
			} catch (e) { alert('build html err: ' + e); }
		},
		destroy: function () {
			//this.items
			//.removeClass('item')
			//.removeData('bar-item');
			//this.element
			//.removeClass('ui-bar ui-bar-disabled')
			//.removeData('bar')
			//.unbind('.item-bar');

			return this;
		}

	});

})(jQuery);
