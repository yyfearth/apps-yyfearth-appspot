Y_JS_Cal = {
	id: 'Y_JS_Cal',
	html: '<table id="y_js_cal_table"><caption><a href="#" title="上月" id="y_js_cal_prev" class="a_button">&lt;</a> <input type="text" maxlength="4" title="年份 \n点击进行输入，鼠标滚轮可以自动增减年份。" id="y_js_cal_y" value="{y}"/>年<span id="y_js_cal_m" title="月份 \n点击进行选择，鼠标滚轮可以自动增减月份。">{m}</span>月 <a href="#" title="下月" id="y_js_cal_next" class="a_button">&gt;</a></caption><tr><th class="weekday">日</th><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th class="weekday">六</th></tr>\n<tr>{days}</tr>\n</table><a style="float:right" href="#" title="点击关闭本日历选择框" onclick="return Y_JS_Cal.hide()" class="a_button">关闭</a><a href="#" id="y_js_cal_now" title="点击选择今天" class="a_button">今天</a>',
	init: function () {
		//alert('init'); // debug
		this.container = document.getElementById(this.id); // only one shared Y_JS_Cal per page
		if (this.container == null) { // build shared container
			// build and insert new div into DOM
			var c = document.createElement('div');
			c.id = this.id;
			c.style.display = 'none';
			this.container = c;
			c.onclick = function (e) { // prevent click on container bubble to globle
				if (window.event) {
					window.event.cancelBubble = true;
				} else {
					e.stopPropagation();
				}
				return false;
			};
			// compatible bind event mousewheel
			var userAgent = navigator.userAgent.toLowerCase();
			var mozilla = this.mozilla = /mozilla/.test(userAgent) && !/(compatible|webkit)/.test(userAgent);
			function onmousewheel(e) {
				if (window.event) {
					e = window.event;
					e.cancelBubble = true;
				}
				var delta = (e.wheelDelta) ? e.wheelDelta / 120 : (-e.detail || 0) / 3;
				var keyalt = e.ctrlKey || e.shiftKey || e.altKey;
				if (delta < 0) { // down next
					Y_JS_Cal[keyalt ? 'next_year' : 'next']();
				} else if (delta > 0) { // up prev
					Y_JS_Cal[keyalt ? 'prev_year' : 'prev']();
				}
				if (e.stopPropagation)
					e.stopPropagation();
				if (e.preventDefault)
					e.preventDefault();
				if ('returnValue' in e)
					e.returnValue = false;
				return false;
			}
			if ('onmousewheel' in c) { // new browsers
				c.onmousewheel = onmousewheel;
			} else if (c.addEventListener) { // mozilla
				c.addEventListener((mozilla ? 'DOMMouseScroll' : 'mousewheel'), onmousewheel, false);
			} else if (c.attachEvent) { // ie
				c.attachEvent('onmousewheel', onmousewheel);
			} else c.onmousewheel = onmousewheel;
			// attach to DOM
			document.body.appendChild(c);
			// build month select box
			var _sel_m_html = '<select id="y_js_cal_sel_m" name="y_js_cal_sel_m" size="1">';
			for (var i = 1; i <= 12; i++)
				_sel_m_html += '<option value="' + i + '">' + i + '</option>';
			_sel_m_html += '</select>';
			this._sel_m_html = _sel_m_html;
		} // end building
		this.y = this.m = null; // init to prevent undifined
		return this;
	},
	prev: function () { // click prev month <
		this.m--;
		if (this.m < 1) {
			this.y--;
			this.m = 12;
		}
		this.build();
		return false;
	},
	next: function () { // click next month >
		this.m++;
		if (this.m > 12) {
			this.y++;
			this.m = 1;
		}
		this.build();
		return false;
	},
	prev_year: function () { // click prev month <
		this.y--;
		this.build();
		return false;
	},
	next_year: function () { // click next month >
		this.y++;
		this.build();
		return false;
	},
	readonly: false,
	build_days_grid: function () { // update interface
		// get datetime
		var y = this.y, m = this.m;
		var now = new Date();
		var iscurmonth = (this.curdate != null && y == this.curdate.getFullYear() && this.curdate.getMonth() == m - 1);
		var isthismonth = (y == now.getFullYear() && now.getMonth() == m - 1);
		// build html
		var h = '', mdaysc = new Date(y, m, 0).getDate(); // how many days of this month
		var firstday = 1 - (new Date(y, m - 1, 1)).getDay();
		var lastday = mdaysc;
		while (new Date(y, m - 1, lastday).getDay() != 6)
			lastday++;
		// from the first sunday to the last saturday
		for (var d = firstday; d <= lastday; d++) {
			var date = new Date(y, m - 1, d), css = '';
			if (d > 0 && d <= mdaysc) {
				css = 'normal';
				if (date.getDay() % 6 == 0)
					css += ' weekday';
				if (iscurmonth && this.curdate && d == this.curdate.getDate())
					css += ' current';
				if (isthismonth && d == now.getDate())
					css += ' today';
			}
			if (this.readonly)
				css += ' readonly';
			var datestr = this.stringifyDate(date);
			if (date.getDay() == 0) h += '</tr>\n<tr>';
			h += '<td id="y_js_cal_day" name="y_js_cal_day" utc="' + Date.parse(date) + '" title="' + datestr + '" class="' + css + '"><a href="#' + datestr + '" onclick="return false">' + date.getDate() + '</a></td>';
		}
		// update container
		this.container.innerHTML = this.html.replace(/{(\w+)}/g, function (w) {
			//alert(w); // debug
			switch (w) {
				case '{y}':
					return y;
				case '{m}':
					return m;
				case '{days}':
					return h;
			}
		});
		// get all days td
		var tddays = document.getElementsByName('y_js_cal_day');
		//alert(tddays.length); // debug
		// pop event select & return value on click day td
		if (!this.readonly) for (var i = 0; i < tddays.length; i++) {
			tddays.item(i).onclick = function () {
				//alert(this.title + '\n' + this.getAttribute('utc')); // debug
				Y_JS_Cal.select(this.getAttribute('utc'));
			};
		}
		// pop event on prev month <
		document.getElementById('y_js_cal_prev').onclick = function () {
			Y_JS_Cal.prev();
			return false;
		};
		// pop event on next month >
		document.getElementById('y_js_cal_next').onclick = function () {
			Y_JS_Cal.next();
			return false;
		};
		// pop event on now/today
		var y_js_cal_now = document.getElementById('y_js_cal_now');
		if (this.readonly) {
			y_js_cal_now['class'] = y_js_cal_now.className = 'readonly';
		} else y_js_cal_now.onclick = function () {
			Y_JS_Cal.select_now();
			return false;
		};
	},
	build_month_selector: function () {
		// select month element
		var y_js_cal_m = document.getElementById('y_js_cal_m'); // month lable(span)
		if (!this.readonly) y_js_cal_m.onclick = function () { // click lable to show select element
			if (this.innerHTML.length > 2) return false; // already showed
			this.innerHTML = Y_JS_Cal._sel_m_html; // replace innerhtml with select element
			var y_js_cal_sel_m = document.getElementById('y_js_cal_sel_m'); // get select element
			y_js_cal_sel_m.childNodes[Y_JS_Cal.m - 1].selected = true; // select curmonth option
			y_js_cal_sel_m.onchange = function () { // change month
				if (Y_JS_Cal.m == this.value) // cancel when not change
					return y_js_cal_sel_m.onblur();
				Y_JS_Cal.m = this.value; // update curmoneth(this.m) with value
				Y_JS_Cal.build(); // update interface
				return true;
			};
			y_js_cal_sel_m.onblur = function () { // cancel as hide select element when lost focus
				y_js_cal_sel_m.onblur = ''; // prevent pop this event in loop
				y_js_cal_m.innerHTML = Y_JS_Cal.m; // restore curmonth
				return false;
			};
			y_js_cal_sel_m.focus(); // set focus
			return false;
		};
	},
	build_year_input: function () {
		// input year
		var y_js_cal_y = document.getElementById('y_js_cal_y');
		y_js_cal_y.readOnly = this.readonly;
		if (!this.readonly) {
			y_js_cal_y.onkeypress = function (e) { // only accept numbers and enter
				var key = (window.event ? window.event.keyCode : e.which);
				if (key == 13) return this.onblur(); // enter to stop editing
				return (key > 47 && key < 58);
			};
			y_js_cal_y.onfocus = function (e) { // get focus to start editing
				// toggle style on
				this.style.backgroundColor = 'white';
				this.style.cursor = 'auto';
			};
			y_js_cal_y.onblur = function () { // lost focus to stop editing
				// toggle style out
				this.style.backgroundColor = '#ccccff';
				this.style.cursor = 'pointer';
				// cancel when not changed
				if (Y_JS_Cal.y == this.value) return false;
				// validate input value
				if (!/\d{4}/.test(this.value)) {
					alert('输入的年份无效！\n请输入4位的数字，如 1999 2009');
					this.value = Y_JS_Cal.y;
					return false;
				}
				// set input data as curyear
				Y_JS_Cal.y = this.value;
				// update interface
				Y_JS_Cal.build();
				return true;
			};
			function onmousewheel(e) {
				if (window.event) {
					e = window.event;
					e.cancelBubble = true;
				}
				var delta = (e.wheelDelta) ? e.wheelDelta / 120 : (-e.detail || 0) / 3;
				if (delta < 0) { // down next
					Y_JS_Cal.y++;
					Y_JS_Cal.build();
				} else if (delta > 0) { // up prev
					Y_JS_Cal.y--;
					Y_JS_Cal.build();
				}
				if (e.stopPropagation)
					e.stopPropagation();
				if (e.preventDefault)
					e.preventDefault();
				if ('returnValue' in e)
					e.returnValue = false;
				return false;
			}
			if ('onmousewheel' in y_js_cal_y) { // new browsers
				y_js_cal_y.onmousewheel = onmousewheel;
			} else if (y_js_cal_y.addEventListener) { // mozilla
				y_js_cal_y.addEventListener((Y_JS_Cal.mozilla ? 'DOMMouseScroll' : 'mousewheel'), onmousewheel, false);
			} else if (y_js_cal_y.attachEvent) { // ie
				y_js_cal_y.attachEvent('onmousewheel', onmousewheel);
			} else y_js_cal_y.onmousewheel = onmousewheel;
		}
	},
	build: function () {
		this.build_days_grid();
		this.build_month_selector();
		this.build_year_input();
	},
	esc_cancel: function (e) { // hide on press esc
		var key = (window.event ? window.event.keyCode : e.which);
		if (key == 27)
			Y_JS_Cal.hide();
	},
	click_outside_cancel: function () { // click outside to hiding
		if (!Y_JS_Cal.showing)
			Y_JS_Cal.hide();
		Y_JS_Cal.showing = false;
	},
	show: function (datetime, callback, scope, pos) {
		//alert('show') // debug
		this.showing = true; // showing flag used in global cancel click
		// parse para: datetime
		if (!datetime) {
			this.curdate = null;
			datetime = new Date();
		} else {
			try { // only give right datetime, the curdate td will be highlighted
				this.curdate = datetime = this.parseDate(datetime, false);
			} catch (e) {
				if (!callback || typeof callback == 'string') { // bindshow
					return this.bindshow(datetime, callback, scope);
				} else {
					this.curdate = null;
					datetime = new Date();
				}
			}
		}
		// auto init
		if (!this.container) this.init();
		// get curdate year month
		var y = datetime.getFullYear(), m = datetime.getMonth() + 1; // month to show = getMonth + 1
		// cancel when the binded cal already showed and curdate not changed
		if (scope == this.onselect_scope && this.container.style.display != 'none' && this.y == y && this.m == m) return false;
		// if already show, hide first to prevent dup def
		if (this.container.style.display != 'none') this.hide();
		this.y = y; this.m = m; // save changed year & month
		// handling callback
		if (callback instanceof Function) {
			this.onselect_scope = scope; // must below cancel
			this.onselect = callback;
		}
		this.build(); // update interface
		// get Pos
		pos = pos || this.getPos(scope);
		if (pos) { // display in given pos
			this.container.style.left = pos.x + 'px';
			this.container.style.top = pos.y + 'px';
		}
		this.container.style.display = 'block'; // show
		var w = document.getElementById('y_js_cal_table').offsetWidth;
		if (w > 100) this.container.style.width = w + 'px';
		// add globle events handler
		if (document.addEventListener) {
			document.addEventListener('click', this.click_outside_cancel, false);
			document.addEventListener('keydown', this.esc_cancel, false);
		} else if (document.attachEvent) {
			document.attachEvent('onclick', this.click_outside_cancel);
			document.attachEvent('onkeydown', this.esc_cancel);
		} else {
			this._org_document_onclick = document.onclick;
			this._org_document_onkeydown = document.onkeydown;
			document.onclick = this.click_outside_cancel;
			document.onkeydown = this.esc_cancel;
		}
		return false;
	},
	hide: function () { // hide
		//alert('hide') // debug
		this.container.style.display = 'none';
		if (document.removeEventListener) {
			document.removeEventListener('click', this.click_outside_cancel, false);
			document.removeEventListener('keydown', this.esc_cancel, false);
		} else if (document.detachEvent) {
			document.detachEvent('onclick', this.click_outside_cancel);
			document.detachEvent('onkeydown', this.esc_cancel);
		} else {
			document.onclick = this._org_document_onclick;
			document.onkeydown = this._org_document_onkeydown;
		}
		return false;
	},
	select_now: function () { // select now/today
		return this.select('now');
	},
	ret_data_str: true,
	select: function (day) { // select day
		day = this.parseDate(day);
		//alert('date selected: ' + this.stringifyDate(day)); // debug
		var ret = (this.ret_data_str ? this.stringifyDate(day) : day);
		this.curdate = day;
		this.hide();
		if (this.onselect)
			this.onselect.call((this.onselect_scope || this), ret);
		return ret;
	},
	stringifyDate: function (date) { // stringify date to string as yyyy-mm-dd
		if (date == null) date = new Date();
		var m = (date.getMonth() + 1), d = date.getDate(); // month to show = getMonth + 1
		if (m < 10) m = '0' + m;
		if (d < 10) d = '0' + d;
		return [date.getFullYear(), m, d].join('-');
	},
	parseDate: function (date, on_err_ret_now) { // parse Date as new Date if error return now
		//alert('parse:' + date);
		if (date instanceof Date) // already Date
			return date;
		if (/^(null|undefined|now|today)?$/i.test(date)) // null or spec string
			return new Date();
		if (/^\d+$/.test(date)) // utc
			return new Date(parseInt(date));
		var dt = new Date(date); // string
		if (isNaN(dt)) { // Invalid Date or yyyy-mm-dd cant parse in ie
			dt = date.match(/(\d{2,4})-(\d\d?)-(\d\d?)/);
			if (dt == null || dt.length == 0) {
				if (on_err_ret_now === false)
					throw new Error('illegal input:' + date);
				else
					return new Date();
			} else
				return new Date(dt[1], dt[2] - 1, dt[3])
		}
		//alert(td);
		return dt;
	},
	formatDate: function (date, format) {
		if (!(date instanceof Date))
			throw new Error('dateFormat err: input is ont Date!');
		return format.replace(/(yy){1,4}|M{1,5}|d{1,6}/g, function (p) {
			var M = date.getMonth() + 1, d = date.getDate(), w = date.getDay();
			switch (p) {
				case 'yyyy':
					return date.getFullYear();
				case 'MM':
					return padding(M);
				case 'dd':
					return padding(d);
				case 'M':
					return M;
				case 'd':
					return d;
				case 'MMM':
					return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'][M];
				case 'MMMM':
					return ['一','二','三','四','五','六','七','八','九','十','十一','十二'][M] + '月';
				case 'MMMMM':
					return ['January','February','March','April','May','June','July','August','September','October','November','December'][M];
				case 'ddd':
					return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][w];
				case 'dddd':
					return '周' + '日一二三四五六'.charAt(w);
				case 'ddddd':
					return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Satday'][w];
				case 'dddddd':
					return '星期' + '日一二三四五六'.charAt(w);
				case 'yy':
					return date.getYear();
			}
		});
		function padding(n) {
			n = n.toString();
			return n.length > 1 ? n : ('0' + n);
		}
	},
	getPos: function (obj) {
		if (obj.offsetLeft == null) return null;
		var pos = {
			x: obj.offsetLeft,
			y: obj.offsetTop + obj.offsetHeight
		};
		if (/MSIE/i.test(navigator.userAgent)) {
			while (obj = obj.offsetParent) {
				pos.x += (obj.offsetLeft - obj.scrollLeft + obj.clientLeft);
				pos.y += (obj.offsetTop - obj.scrollTop + obj.clientTop);
			}
		}
		return pos;
	},
	bindshow: function (scope, attr, format) {
		if (typeof scope == 'string')
			scope = document.getElementById(scope);
		if (!attr) attr = 'value';
		else if (!(attr in scope) && !format) {
			format = attr;
			attr = 'value';
		}
		Y_JS_Cal.readonly = !!scope.readOnly;
		Y_JS_Cal.ret_data_str = !format;
		if (!scope.disabled)
			Y_JS_Cal.show(scope[attr], function (val) {
				scope[attr] = (!format ? val : Y_JS_Cal.formatDate(val, format));
			}, scope);
	}
};
