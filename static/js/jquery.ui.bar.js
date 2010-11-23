/*
* jQuery UI bar 1.8
*
* Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
* Dual licensed under the MIT (MIT-LICENSE.txt)
* and GPL (GPL-LICENSE.txt) licenses.
*
* Bar Widget Powered by yyfearth.com
* http://yyfearth.com/jqui-nav
*
* Depends:
*	jquery.ui.core.js
*	jquery.ui.widget.js
*/
(function ($) {

	$.widget('ui.bar', {
		options: {
			appendTo: 'body',
			filter: 'li',
			selectable: true,
			hover: true,
			delay: 500,
			fx_speed: 300,
			selected: null,
			selecting: null,
			click: null,
			value: null,
			index: null,
			disabled: false
		},
		_create: function () {
			var self = this;

			if (this.element.hasClass('ui-bar')) { // aleady created
				this.items = $(self.options.filter, self.element);
				return this;
			}

			// turn off animation if fx_speed = 0 or $.fx.off
			self.options.fx_speed = parseInt(self.options.fx_speed);
			if ($.fx.off || /msie 6/i.test(navigator.userAgent) || self.options.fx_speed < 0 || isNaN(self.options.fx_speed))
				self.option('fx_speed', 0); // fx off when ie6 (filter bug)
			this.element.addClass('ui-bar');

			// cache bar-item children based on filter
			var items = this.items = $(self.options.filter, self.element);

			// disabled
			var diasbled = self.options.disabled;

			items.addClass('ui-bar-item ui-state-default').each(function () {
				var $this = $(this), $a = $this.find('a');
				if (!diasbled) {
					disabled = $a.attr('disabled');
					disabled = (disabled == 'disabled' || disabled == 'true' || $a.hasClass('disabled') || $a.hasClass('ui-state-disabled'));
				}
				$.data(this, {
					'href': (disabled ? '#disabled' : $a.attr('href')),
					'title': $a.attr('title')
				});
				$this.attr('title', $a.attr('title')).html($a.html());
				if (disabled) $this.addClass('ui-state-disabled').attr('disabled', 'disabled');
			}).hover(function () {
				var $this = $(this);
				if (!$this.hasClass('ui-state-active') && !$this.hasClass('ui-state-disabled')) {
					$this.stop().switchClass('ui-state-default', 'ui-state-hover', self.options.fx_speed / 2);
					if (self.options.fx_speed) {
						var fx_timeout = $.data(this, 'fx_timeout');
						if (fx_timeout) clearTimeout(fx_timeout);
						fx_timeout = setTimeout(function () { $this.stop().attr('style', '').switchClass('ui-state-default', 'ui-state-hover', 0); }, self.options.fx_speed / 2 + 1);
						$.data(this, 'fx_timeout', fx_timeout);
					}
					if (self.options.hover) {
						if (self._timeout) clearTimeout(self._timeout);
						self._timeout = setTimeout(function () { $this.click(); }, self.options.delay);
					}
				}
			}, function () {
				var $this = $(this);
				if (!$this.hasClass('ui-state-active') && !$this.hasClass('ui-state-disabled')) {
					$this.stop().removeClass('ui-state-pressed').switchClass('ui-state-hover', 'ui-state-default', self.options.fx_speed * 2);
					if (self.options.fx_speed) {
						var fx_timeout = $.data(this, 'fx_timeout');
						if (fx_timeout) clearTimeout(fx_timeout);
						fx_timeout = setTimeout(function () { $this.stop().attr('style', '').switchClass('ui-state-hover', 'ui-state-default', 0); }, self.options.fx_speed * 2 + 1);
						$.data(this, 'fx_timeout', fx_timeout);
					}
					if (self._timeout) clearTimeout(self._timeout),self._timeout = null;
				}
			}).mousedown(function () {
				var $this = $(this);
				!$this.hasClass('ui-state-active') && !$this.hasClass('ui-state-disabled') &&
				$this.switchClass('ui-state-hover ui-state-default', 'ui-state-pressed', 0);
			}).mouseup(function () {
				var $this = $(this);
				!$this.hasClass('ui-state-active') && !$this.hasClass('ui-state-disabled') &&
				$this.switchClass('ui-state-pressed', 'ui-state-default', 0);
			}).click(function () {
				//alert($.data(this, 'href'));
				var $this = $(this);
				if ($this.hasClass('ui-state-active') || $this.hasClass('ui-state-disabled'))
					return false;
				if ($.isFunction(self.options.selecting) && self.options.selecting.call(self, this) === false)
					return false;
				self._timeout && clearTimeout(self._timeout);
				$this.switchClass('ui-state-hover ui-state-pressed', 'ui-state-default', 0);
				return ($.isFunction(self.options.click) ?
					self.options.click.call(self, self, {
						index: self.items.index(this),
						value: $.data(this, 'href'),
						title: $.data(this, 'title'),
						element: this
					}) !== false : true) &&
					self._select(this);
			})

			if (this.options.value != null)
				this.value(this.options.value);
			else if (this.options.index != null)
				this.select(this.options.index);

			return this;
		},
		_select: function (item) {
			if (item == null) {
				this.items.removeClass('ui-state-active');
				return true;
			} else if (this.options.selectable) {
				var $item = $((typeof item == 'number') ? this.items[item] : item);
				if ($item.hasClass('ui-state-active') || $item.hasClass('ui-state-disabled'))
					return false;
				$item.switchClass('ui-state-hover ui-state-pressed ui-state-default', 'ui-state-active', 0)
				.siblings(this.options.filter).switchClass('ui-state-active', 'ui-state-default', 0);
				// selected(this, ui)
				return $.isFunction(this.options.selected) ?
					this.options.selected.call(this, this, {
						index: this.items.index($item),
						value: $.data(item, 'href'),
						title: $.data(item, 'title'),
						element: item
					}) : true;
			} else return true;
		},
		select: function (idx) {
			if (idx == null) {
				return this.items.index('.ui-state-active');
			} else {
				var l = this.items.length;
				// if (idx > l || idx < 1 - l) throw new Error('idx out of bound');
				idx = (l + idx) % l;
				$(this.items[idx]).click();
			}
		},
		value: function (val) {
			if (val == null) {
				return $.data(this.items.filter('.ui-state-active')[0], 'href');
			} else {
				this.items.each(function () {
					if ($.data(this, 'href') == val) {
						$(this).click();
						return false;
					}
				});
			}
		},
		clear: function () {
			this._select(null);
			return this;
		},
		destroy: function () {
			this.items
			.removeClass('item')
			.removeData('bar-item');
			this.element
			.removeClass('ui-bar')
			.removeData('bar')
			.unbind('.bar');

			return this;
		}

	});

})(jQuery);
