/*!
* baeword with Ext JS Library 3.0+
* Copyright(c) 2006-2009 Ext JS, LLC
* licensing@extjs.com
* http://www.extjs.com/license
* beaword powered by Wilson@yyfearth.com
* filename: baeword.js
*/
Ext.namespace('baeword');
baeword.info = {
	LAST_UPDATE: '2010-09-28 17:25:06',
	CODE_NAME: 'Proto',
	APP_VER: '0.8',
	APP_NAME: 'baeword',
	FX_VER: 'ExtJS 3.2+',
	FX_ID: 'ext322',
	BY: 'yyfearth.com',
	EMAIL: 'yyfearth@gmail.com',
	WEB_SITE: 'http://yyfearth.com/',
	HOME: 'http://yyfearth.appspot.com/apps/'
};

(function (baeword) { // baeword init

	var nav = navigator,
		ERR_SOUND_URL = '../res/err.mp3',
		BLANK_IMAGE_URL = '../images/blank.gif',
		ICON_BASE_URL = '../images/apps/',
		APPS_INDEX_URL = 'index.html'; //APPS_INDEX_URL="index";

	// update
	//baeword.last_update_ts = Date.parse(baeword.LAST_UPDATE) / 1000;
	// app cache update
	//nav.onLine

	var localCache = new Ext.ux.state.StorageProvider({ name: 'bae', fallback: false }),
	optionCache = new Ext.ux.state.StorageProvider({ name: 'cur' }),
	tempCache = new Ext.ux.state.StorageProvider({ name: 'tmp', session: true, fallback: false }),
	def_option = { autosave: true, autosound: true, hidden_para: true, defaultDict: 'g', filter: {} }, // default option
	option = (optionCache.set('option', Ext.applyIf(optionCache.get('option') || {}, def_option)), optionCache.get('option')); // auto default
	Ext.state.Manager.setProvider(optionCache);

	// set env
	Ext.BLANK_IMAGE_URL = Ext.SSL_SECURE_URL = BLANK_IMAGE_URL;
	Ext.BLANK_URL = Ext.isSecure ? Ext.SSL_SECURE_URL : 'about:blank';
	Ext.USE_NATIVE_JSON = true; // to use native json parser
	Ext.enableListenerCollection = true;

	// init wordlist
	baeword.wordlist = {};

	var dict_items = [{
		dict: 'g',
		url: [
			'http://www.google.com/dictionary?langpair=en|zh-CN&q={word}',
			'http://www.google.com.hk/dictionary?langpair=en|zh-CN&q={word}'
		],
		text: 'Google Dictionary',
		iconCls: 'icon-dict-g'
	}, {
		dict: 'w',
		url: [
			'http://yyfearth.appspot.com/webster/{word}',
			'http://gae.yyfearth.com/webster/{word}'
		],
		text: 'Merriam-Webster(LE)',
		iconCls: 'icon-dict-w'
	}, {
		dict: 'mw',
		url: 'http://www.merriam-webster.com/dictionary/{word}',
		text: 'Merriam-Webster(Full)',
		iconCls: 'icon-dict-mw'
	}, {
		dict: 'k',
		url: 'http://www.iciba.com/{word}',
		text: 'iciba 爱词霸',
		iconCls: 'icon-dict-k'
	}, {
		dict: 'y',
		url: 'http://dict.youdao.com/search?q={word}&ue=utf8',
		text: 'youdao 有道词典',
		iconCls: 'icon-dict-y'
	}];
	dict_items.forEach(function (itm) { if (itm.dict) dict_items[itm.dict] = itm; }); // index

	var Wordlist = function (wordlist) {
		this.setId(wordlist.id);
		this.setName(wordlist.name);
		this.setDesc(wordlist.desc);
		this.firstload = true;
		this.setText(wordlist.text, true);
		this.setFilters(wordlist.filters);
	};
	Wordlist.fields = [{
		name: 'id', type: 'string', title: 'Id'
	}, {
		name: 'rate', type: 'int', title: 'Rate'
	}, {
		name: 'word', type: 'string', title: 'Word'
	}, {
		name: 'para', type: 'string', title: 'Paraphrase'
	}, {
		name: 'rmrk', type: 'string', title: 'Remark'
	}];
	Wordlist.idIndex = 0;
	Wordlist.prototype = {
		setTxtAttr: function (name, val) {
			if (val && name) name = name.toString(), val = val.toString();
			else return this;
			this[name] = val;
			return this;
		},
		setId: function (id) {
			return this.setTxtAttr('id', id);
		},
		setName: function (name) {
			return this.setTxtAttr('name', name);
		},
		setDesc: function (desc) {
			return this.setTxtAttr('desc', desc);
		},
		setText: function (wordtext, alowblank) {
			if (!wordtext) return this;
			wordtext = wordtext.toString().replace(/\r/i, '').replace(/\s*\t+\s*/, '\t');
			this.wordlist = null;
			if (wordtext.length < 1)
				return this;
			if (this.firstload && !this.cacheloaded) { // load cache only while init not import
				var strd = localCache.get('wordlist-' + this.id) || [];
				if (strd.length) {
					this.wordlist = strd;
					this.index = localCache.get('index-' + this.id) || null;
					this.cacheloaded = true;
				}
			}
			this.firstload = false;
			if (!this.wordlist) {
				this.parseText(wordtext, alowblank);
				this.save();
				this.saveIndex();
			} else if (!this.index) {
				this.buildIndex();
				this.saveIndex();
			}
			return this;
		},
		getText: function () {
			//return this.wordtext;
			var text = this.wordlist.map(function (row) {
				return row.join('\t').replace(/\s+$/, '');
			}), cols = [], fields = Wordlist.fields;
			for (var k = 0; k < fields.length; k++)
				cols.push(fields[k].name);
			text.unshift(cols.join('\t'));
			return text.join('\n');
		},
		parseText: function (text, alowblank) {
			var rows = text.split('\n'), cols = rows[0].split('\t');
			var fields = Wordlist.fields;
			var wordlist = [], index = {};
			for (var i = 1, idx = 0; i < rows.length; i++, idx++) {
				rows[i] = rows[i].replace(/\s+$/, '');
				if (rows[i].length < 1) continue;
				rows[i] = rows[i].split(/\s*\t\s*/);
				var json = {}, array = [null, -1, null, '', ''];
				for (var j = 0; j < cols.length; j++)
					json[cols[j]] = rows[i][j];
				if (json.word == null) continue;
				for (var k = 0; k < fields.length; k++) {
					var name = fields[k].name;
					if (name in json) {
						array[k] = json[name];
						if (fields[k].type == 'int') {
							array[k] = parseInt(array[k]);
							if (isNaN(array[k])) array[k] = -1; // careful
						}
					}
				}
				wordlist.push(array);
				index[array[Wordlist.idIndex]] = wordlist.length - 1;
			}
			if (wordlist.length < 1 && !alowblank) throw new Error('Invalid text!');
			this.wordlist = wordlist;
			this.index = index;
		},
		buildIndex: function () {
			//Ext.ux.console('build index')
			var index = {};
			for (var i = 0; i < this.wordlist.length; i++)
				index[this.wordlist[i][Wordlist.idIndex]] = i;
			this.index = index;
			//Ext.ux.console('index builded')
		},
		setFilters: function (filters) {
			var fs = filters && filters.length ? this.saveFilters(filters) : [];
			for (i = 0; i < 26; i++) { // A-Z
				var a = String.fromCharCode(65 + i);
				fs.push({
					name: '- ' + a + ' -',
					filter: { 'word': new RegExp('^' + a, 'i') }
				});
			}
			fs = fs.concat([{ // pos and rate
				name: 'n.', filter: { para: /\bn\.?\s/i }
			}, {
				name: 'v./vt./vi.', filter: { para: /\bv[ti]?\.?\s/i }
			}, {
				name: 'vt.', filter: { para: /\bvt\.?\s/i }
			}, {
				name: 'vi.', filter: { para: /\bvi\.?\s/i }
			}, {
				name: 'a./adj.', filter: { para: /\ba(dj)?\.?\s/i }
			}, {
				name: 'ad./adv.', filter: { para: /\bad?\.?\s/i }
			}, {
				name: 'prep.', filter: { para: /\bprep\.?\s/i }
			}, {
				name: 'pron.', filter: { para: /\bpron\.?\s/i }
			}, {
				name: 'conj.', filter: { para: /\bconj\.?\s/i }
			}, {
				name: 'art.', filter: { para: /\bart\.?\s/i }
			}, {
				name: 'Ongoing', filter: { rate: /^[1-9]$/ }
			}, {
				name: 'Reciting', filter: { rate: /^[1-4]$/ }
			}, {
				name: 'Beware', filter: { rate: /^[6-9]$/ }
			}, {
				name: 'Active \u2605', filter: { rate: /^\d$/ }
			}, {
				name: 'Inactive \u2606', filter: { rate: /../ }
			}, {
				name: 'Recited \u3007', filter: { rate: 0 }
			}]);
			// Stared
			for (i = 1; i <= 6; i++) {
				fs.push({
					name: i + ' ' + new Array(i + 1).join('\u2605'), // +1 need
					filter: { rate: i }
				});
			}
			// All
			fs.push({ name: 'All', filter: true });
			// set filter
			this.filters = fs;
			return this;
		},
		update: function (id, data) {
			if (data == null) { // del
				this.wordlist[this.index[id]] = undefined; // del data
				this.index[id] = undefined; // del idx
				this.indexChanged = true;
				return;
			} else if (this.index[id] == null) { // add
				this.wordlist[this.index[id] = this.wordlist.length] = [];
				this.indexChanged = true;
			}
			for (var i = 0; i < Wordlist.fields.length; i++) { // add or upd
				var val = data[Wordlist.fields[i].name];
				if (val == null) continue;
				this.wordlist[this.index[id]][i] = val;
			}
		},
		saveIndex: function () {
			localCache.set('index-' + this.id, this.index);
		},
		saveFilters: function (filters) {
			localCache.set('filters-' + this.id, filters.map(function (f) {
				var filter = { name: f.name, filter: {} };
				if (f.filter === true || f.filter === null)
					filter.filter = f.filter;
				else if (f.filter instanceof Function)
					filter.filter = f.filter.toString();
				else for (var name in f.filter)
					filter.filter[name] = f.filter[name].toString();
				return filter;
			}));
			return filters;
		},
		save: function () {
			localCache.set('wordlist-' + this.id, this.wordlist);
			if (this.indexChanged) {
				this.saveIndex();
				this.indexChanged = false;
			}
		}
	};
	var Word = Ext.data.Record.create(Wordlist.fields);

	// create the data store
	var store = new Ext.data.ArrayStore({
		superclass: Ext.data.ArrayStore.prototype,
		autoDestroy: true,
		storeId: 'wordlistStore',
		fields: Wordlist.fields,
		idIndex: Wordlist.idIndex,
		removedRecords: [],
		changed: 0,
		listeners: {
			//load: function () { }, // store loaded replaced by onload single
			update: storeChanged,
			add: storeChanged,
			remove: function (s, r, i) {
				this.removedRecords.push(r);
				storeChanged();
			}
		},
		// for additional sort
		sortReversed: false,
		sortByLen: false,
		_reversedCache: {},
		_cachedRev: function (str) {
			return this._reversedCache[str] || (this._reversedCache[str] = str.split('').reverse().join(''));
		},
		createSortFunction: function (field, direction) { // override
			direction = direction || 'ASC';
			var directionModifier = direction.toUpperCase() == 'DESC' ? -1 : 1;
			var sortType = this.fields.get(field).sortType;
			//create a comparison function. Takes 2 records, returns 1 if record 1 is greater,
			//-1 if record 2 is greater or 0 if they are equal
			function str_cmp(v1, v2) {
				return (v1 > v2 ? 1 : (v1 < v2 ? -1 : 0));
			}
			var self = this, cmp_func = this.sortByLen ? function (v1, v2) {
				return str_cmp(v1.length, v2.length) || str_cmp(v1.length, v2.length);
			} : str_cmp;
			return field == 'word' && this.sortReversed ? function (r1, r2) {
				return directionModifier * cmp_func(self._cachedRev(r1.data.word), self._cachedRev(r2.data.word));
			} : function (r1, r2) {
				return directionModifier * cmp_func(sortType(r1.data[field]), sortType(r2.data[field]));
			};
		},
		sortBy: function (fn, direction) { // not override
			direction = direction || 'ASC';
			this.data.sort(direction, fn);
			if (this.snapshot && this.snapshot != this.data)
				this.snapshot.sort(direction, fn);
		},
		// for additional filter
		prefilter: function (filter) {
			// _prefilter must be a array [{ fn: func, scope: this }, ...]
			if (filter == '*') {
				this._prefilter = [];
			} else if (Ext.isFunction(filter)) {
				this._prefilter = [{ fn: filter, scope: this}];
			} else { // must be a array
				var fs = [];
				filter.forEach(function (f) {
					var fn = this.createFilterFn(f.property, f.value);
					fn && fs.push({ fn: fn, scope: this });
				}, this);
				this._prefilter = fs;
			}
			this.filterBy();
		}, //filter: function () {}, // called filterBy, so only override filterBy is ok
		filterSearch: function (field, filter) {
			if (field == null) {
				this.filterBy(); // use stored prefilter and filter
			} else if (Ext.isFunction(field)) {
				this.superclass.filterBy.call(this, field, filter || this);
			} else {
				this.superclass.filterBy.call(this, this.createFilterFn(field, filter), this);
			}
		},
		filterBy: function (fn, scope) {
			var fs = this._prefilter ? this._prefilter.concat([]) : []; // clone
			if (fn) this._filter = { fn: fn, scope: this };
			this._filter && fs.push(this._filter);
			fn = this.createMultipleFilterFn(fs);
			return fn
				? this.superclass.filterBy.call(this, fn, scope || this)
				: this.clearFilter();
		},
		clearFilter: function (suppressEvent) {
			this._filter = null;
			this.superclass.clearFilter.call(this, suppressEvent);
		}
	});

	var editor = new (Ext.extend(Ext.ux.grid.RowEditor, {
		ignoreNoChange: true,
		editable: false,
		once: false,
		edit: function (row) {
			this.startEditing(row, true, false);
		},
		editOnce: function (row) {
			return this.startEditing(row, true, true);
		},
		startEditing: function (row, focus, once) {
			if (once) { // edit once
				this.once = this.editable = true;
			} else { // edit not once
				if (this.once) {
					this.stopEditing(false);
					return false;
				} else if (!this.editable)
					return false;
			}
			return this.superclass.startEditing.call(this, row, focus);
		},
		stopEditing: function (save) {
			if (this.once) this.editable = this.once = false;
			return this.superclass.stopEditing.call(this, save);
		},
		initComponent: function () {
			this.superclass = this.constructor.superclass;
			this.superclass.initComponent.call(this);
		}
	}))();

	var filters = new Ext.ux.grid.GridFilters({
		// encode and local configuration options defined previously for easier reuse
		encode: false, // json encode the filter query
		local: true,   // defaults to false (remote filtering)
		filters: [{
			type: 'string', dataIndex: 'id'
		}, {
			type: 'numeric', dataIndex: 'rate'
		}, {
			type: 'string', dataIndex: 'word'
		}, {
			type: 'string', dataIndex: 'para'
		}, {
			type: 'string', dataIndex: 'rmrk'
		}]
	});

	var comboList = new Ext.form.ComboBox({
		id: 'combo-list',
		store: new Ext.data.ArrayStore({
			autoDestroy: true,
			idIndex: 0,
			fields: ['id', 'name'],
			loaded: false,
			listeners: {
				beforeload: function (store) {
					store.loaded = false;
					store.owner.disable();
				},
				load: function (store) {
					store.loaded = true;
					store.owner.enable();
				}
			}
		}),
		width: 150,
		allowBlank: false,
		autoSelect: false,
		shadow: true,
		editable: false,
		disabled: true,
		triggerAction: 'all',
		mode: 'local',
		displayField: 'name',
		valueField: 'id',
		lastValue: null,
		stateful: true,
		stateId: 'option',
		stateEvents: ['select'],
		getState: function () {
			return option;
		},
		applyState: function (state) {
			this.value = 'Loading ...';
		},
		listeners: {
			'render': function () {
				this.init();
			},
			'select': function () {
				option.wordlist = this.value;
				if (this.lastValue != this.value) {
					this.lastValue = this.value;
					load(this.value);
				}
			}
		},
		init: function () {
			var self = this.store.owner = this, list_store_data = localCache.get('wordlist-index') || [];
			if (list_store_data.length) {
				self.store.loadData(list_store_data);
			} else {
				self.store.loadData([]);
				this.reset();
				setTimeout(function () {
					dlgWordlists.show();
				}, 100);
			}
		},
		load: function () {
			if (!this.store.loaded) return false;
			if (option.wordlist != null) {
				this.setValue(option.wordlist);
				var r = this.findRecord('value', this.value);
				this.fireEvent('select', this, r, this.store.indexOf(r));
			} else if (this.store.getCount()) {
				option.wordlist = this.store.getAt(0).data.id;
				this.setValue(option.wordlist);
				this.fireEvent('select', store, this.store.getAt(0), 0);
			}
		}
	});

	var comboFilter = new Ext.form.ComboBox({
		store: new Ext.data.ArrayStore({
			autoLoad: false,
			autoDestroy: true,
			fields: ['name', 'idx']
		}),
		width: 100,
		allowBlank: false,
		shadow: true,
		editable: false,
		triggerAction: 'all',
		mode: 'local',
		displayField: 'name',
		valueField: 'idx',
		stateful: true,
		stateId: 'option',
		stateEvents: ['change'],
		getState: function () {
			return option;
		}, // disable 'applyState' to prevent evoke before everything is ready
		applyState: function (state) { }, // override for disable
		change: function (idx, force) {
			var count = this.store.getCount();
			if (!count) return false; // not ready
			if (idx != null && !Ext.isNumber(idx)) {
				idx = parseInt(idx);
				if (isNaN(idx)) idx = null;
			}
			if (idx == this.value && !force)
				return false;
			if (idx == null) {
				this.setRawValue('(Custom)');
				if (idx === null) changeFilter(true);
				idx = -1;
			} else {
				idx = (idx + count) % count;
				if (idx != this.value || force) {
					this.setRawValue('');
					this.setValue(idx);
				}
				comboSearch.reset();
				option.filter[option.wordlist] = this.value;
				changeFilter(idx);
				this.fireEvent('change', idx, -1);
			}
			grid.view.scrollToTop();
			if (idx == 0) {
				baeword.btnFirst.disable();
				baeword.btnPrev.disable();
				baeword.btnNext.enable();
				baeword.btnLast.enable();
			} else if (idx == baeword.wordlist.cur.filters.length - 1) {
				baeword.btnFirst.enable();
				baeword.btnPrev.enable();
				baeword.btnNext.disable();
				baeword.btnLast.disable();
			} else if (idx < 0) { // custom
				baeword.btnFirst.enable();
				baeword.btnPrev.enable();
				baeword.btnNext.disable();
				baeword.btnLast.enable();
			} else {
				baeword.btnFirst.enable();
				baeword.btnPrev.enable();
				baeword.btnNext.enable();
				baeword.btnLast.enable();
			}
		},
		listeners: {
			'render': function () {
				this.el.unselectable();
			},
			'select': function () {
				this.change(this.value, true);
			}
		},
		loadFilters: function (filters) {
			var filterstoredata = [], combo = this;
			for (i = 0; i < filters.length; i++)
				filterstoredata.push([filters[i].name, i]);
			combo.store.loadData(filterstoredata);
			// bind change default or last filter on wordlist are ready
			store.on('load', function () {
				combo.change(option.filter[option.wordlist] || 0, true); // start
			}, this, { single: true });
		}
	});

	var comboSearch = new Ext.form.ComboBox({
		id: 'search-bar',
		store: new Ext.data.ArrayStore({
			autoDestroy: true,
			fields: ['word']
		}),
		width: 150,
		allowBlank: true,
		shadow: true,
		editable: true,
		enableKeyEvents: true,
		emptyText: 'Type to search',
		mode: 'local',
		displayField: 'word',
		valueField: 'word',
		stateId: 'searched',
		words: [],
		triggerConfig: {
			id: 'triggerSearch',
			tag: 'img', src: Ext.BLANK_IMAGE_URL,
			cls: 'x-form-trigger x-form-search-trigger'
		},
		addHistory: function (word) {
			if (!word) return false;
			var i = this.words.indexOf(word);
			if (i >= 0) this.words.splice(i, 1);
			this.words.unshift(word);
			this.loadWords();
			tempCache.set(this.stateId, this.words.join('|'));
		},
		clear: function () {
			//store.filterSearch();
			comboFilter.change(option.filter[option.wordlist], true); // restore filter
		},
		loadWords: function () {
			comboSearch.store.loadData(comboSearch.words.map(function (w) { return [w]; }));
		},
		go: function () {
			baeword.dlgDict.go(comboSearch.getRawValue(), option.defaultDict);
		},
		listeners: {
			render: function () {
				var data = tempCache.get(this.stateId);
				if (data && data.length) {
					this.words = data.split('|');
					this.loadWords();
				}
				Ext.fly('triggerSearch').on('click', comboSearch.go);
			},
			specialkey: function (field, e) {
				// e.HOME, e.END, e.PAGE_UP, e.PAGE_DOWN, e.TAB, e.ESC,
				// arrow keys: e.LEFT, e.RIGHT, e.UP, e.DOWN
				if (e.getKey() == e.ENTER) {
					baeword.dlgDict.go(field.getRawValue(), option.defaultDict);
				} else if (e.getKey() == e.ESC) {
					this.clear();
				} else return true;
				e.stopEvent();
				return false;
			},
			keyup: function (combo, e) {
				combo._timeout = combo._timeout && clearTimeout(combo._timeout) || setTimeout(function () {
					var word = combo.getRawValue();
					if (word.length) {
						//changeFilter({ 'word': new RegExp(word, 'i') });
						store.filterSearch('word', new RegExp(word, 'i'));
						comboFilter.change();
						comboSearch.focus();
					} else combo.clear();
				}, 300);
			},
			select: function () {
				//changeFilter({ 'word': new RegExp(this.getRawValue(), 'i') });
				store.filterSearch('word', new RegExp(word, 'i'));
				comboFilter.change();
			}
		}
	});

	var rmrkEditor = new Ext.Editor({
		id: 'rmrk-editor',
		autoSize: false,
		ignoreNoChange: true,
		shadow: false,
		field: { xtype: 'textfield', allowBlank: true },
		to: function (row, col) {
			if (row == null || editor.editable) return false;
			if (col == null) col = 5;
			this.row = row;
			this.target = Ext.fly(grid.view.getCell(row, col).firstChild);
			this.record = grid.getSelectionModel().getSelected();
			this.startEdit(this.target, this.record.get('rmrk'));
		},
		listeners: {
			beforeshow: function () { // the real autoSize is here
				this.el.setRegion(this.target.parent().getRegion());
				this.field.el.setRegion(this.target.parent().getRegion());
			},
			complete: function (ed, value, oldValue) {
				this.record.set('rmrk', Ext.util.Format.trim(value));
			},
			hide: function () {
				grid.view.focusRow(this.row); // necessary
			}
		}
	});

	var para_cmenu = new Ext.menu.Menu({
		id: 'para-cmenu',
		shadow: true,
		items: [{
			text: 'Edit',
			iconCls: 'icon-edit',
			handler: function () {
				if (para_cmenu.row == null) return false;
				editor.editOnce(para_cmenu.row);
			}
		}, {
			text: 'Play Sound',
			iconCls: 'icon-play-sound',
			handler: function () {
				if (para_cmenu.record == null) return false;
				play(para_cmenu.record.get('word'));
			},
			listeners: {
				'render': function (b) {
					if (!can_play_mp3()) b.disable();
				}
			}
		}, {
			id: 'menu-dict',
			text: 'Online Dictionary',
			handler: function () {
				if (para_cmenu.record == null) return false;
				baeword.dlgDict.go(para_cmenu.record.get('word'));
			}
		}],
		syncDict: function () {
			if (!this.menuDict) return false;
			var dictInfo = dict_items[option.defaultDict];
			this.menuDict.setText(dictInfo.text);
			this.menuDict.setIconClass(dictInfo.iconCls);
		},
		listeners: {
			render: function () {
				this.menuDict = Ext.getCmp('menu-dict');
				this.syncDict();
			},
			beforeshow: function () {
				this.syncDict();
			}
		}
	});

	var DictSwitch = Ext.extend(Ext.CycleButton, {
		stateful: true,
		stateId: 'option',
		stateEvents: ['change'],
		getState: function () {
			return option;
		},
		applyState: function (state) {
			this.sync();
		},
		tooltip: {
			title: 'Online Dictionary',
			text: 'Look up the word in online dictionary<br/>' +
			'<i>Click to switch the Dictionaries.</i>'
		},
		items: dict_items,
		sync: function (id) {
			if (id && (id in dict_items)) option.defaultDict = id;
			var btn = this;
			if (btn.getActiveItem().dict != option.defaultDict) Ext.each(btn.items, function (itm, i) {
				if (itm.dict == option.defaultDict) {
					btn.setActiveItem(btn.menu.items.get(i));
					return false;
				}
			});
			return this;
		},
		changeHandler: function (btn, item) {
			option.defaultDict = item.dict;
			Ext.each(btn.constructor.instances, function (b) {
				if (b != btn) b.sync();
			});
		},
		initComponent: function () {
			dict_items[option.defaultDict].checked = true; // prevent select first item by default
			this.constructor.superclass.initComponent.call(this);
			var instances = this.constructor.instances || [];
			if (instances.length) this.menu = instances[0].menu; // share menu
			instances.push(this);
			this.constructor.instances = instances;
		}
	});

	var barRateStats = new Ext.Spacer({
		id: 'rate-stats',
		cls: 'x-panel-body bae',
		init: function () {
			this.rate_stats = { stats: [] };
			for (var i = -1; i < 10; i++) {
				this.rate_stats.stats[i + 1] = this.rate_stats[i] = {
					title: i + ' ' + (i == 0 ? '\u3007' : (i < 0 ? '\u2606' : new Array(i + 1).join('\u2605'))),
					cssCls: 'word-row-rate-' + (i < 0 ? 'x' : i)
				};
			}
			// add events
			store.on('load', this.refresh, this, { single: true, delay: 300 });
			grid.view.on('refresh', this.refresh, this, { buffer: 300 });
			this.relayEvents(this.el, ['click']);
		},
		calc: function () {
			var rate_stats = this.rate_stats,
				total_width = 300, // width
				p = total_width, lastr = null,
				count = store.getCount(),
				total_len = baeword.wordlist.cur.wordlist.length,
				two_precent = (total_len != count);
			rate_stats.count = count;
			rate_stats.total = total_len;
			rate_stats.total_precent = two_precent ? '/' + (count / total_len * 100).toFixed(2) : '';
			for (var i = -1; i < 10; i++) {
				rate_stats[i].sum = count;
				rate_stats[i].count = 0;
			}
			store.each(function (r) {
				var rate = r.get('rate');
				if (rate < 0 || rate > 9) rate = -1;
				rate_stats[rate].count++;
			});
			for (var i = 9; i >= -1; i--) { // calc %
				var r = rate_stats[i], precent = r.count / rate_stats.count;
				if (isNaN(precent)) precent = 0;
				r.precent = (precent * 100).toFixed(2) + '%';
				if (two_precent) r.precent += '/' + (r.count / total_len * 100).toFixed(2) + '%';
				r.width = 0;
				if (r.count) {
					r.width = precent * total_width;
					if (r.width <= 1) {
						r.width = 1;
					} else {
						lastr = r; // lastr = (last and width>1)
						r.width = Math.round(r.width);
					}
					p -= r.width;
				}
			} // if p remains
			if (p && lastr) lastr.width += p;
		},
		_bar_div_t: new Ext.Template('<div class="rate-stats {cssCls}" ' +
			'ext:qtitle="Rate: {title}" ext:qtip="{count}/{sum} ({precent})" ' +
			'style="display:inline-block;width:{width}px;height:20px"></div>', {
				compiled: true,
				disableFormats: true
			}),
		_table_t: new Ext.XTemplate(
		'<table onmousedown="baeword.grid.el.unmask();return false" style="cursor:default">' +
			'<caption class="caption">Statistics</caption>' +
			'<tpl for="stats">' +
				'<tr><td>{title}</td><td>: </td><td>{count}</td><td>({precent})</td></tr>' +
			'</tpl>' +
			'<tr><td>Count (filtered)</td><td>: </td><td>{count}</td><td>(100%{total_precent})</td></tr>' +
			'<tr><td>Total (wordlist)</td><td>: </td><td colspan="2">{total}</td></tr>' +
		'</table>', {
			compiled: true,
			disableFormats: true
		}),
		refresh: function () {
			if (store.getCount()) {
				this.calc();
				// update proc bar
				var bar_html = [];
				for (var i = 9; i >= -1; i--)
					if (this.rate_stats[i].count)
						bar_html.push(this._bar_div_t.apply(this.rate_stats[i]))
				this.update(bar_html.join(''));
			} else {
				this.el.clean();
			}
		},
		listeners: {
			render: function () {
				this.init();
			},
			click: function () {
				if (store.getCount()) {
					grid.el.mask(this._table_t.apply(this.rate_stats)).on('mousedown', function () {
						grid.el.unmask();
					}, null, { single: true });
				} else return beep();
			}
		}
	});

	baeword.btnSave = new Ext.Toolbar.SplitButton({
		id: 'btnSave',
		cls: 'x-btn-text-icon',
		iconCls: 'icon-accept',
		text: 'Save',
		tooltip: {
			title: 'Save changes',
			text: 'Save changes manually or open the Menu.<br/>' +
				'<i>If you do not want always click it manual, enable the "auto save" in menu.</i>'
		},
		handler: function (b) {
			if (store.changed) {
				editor.stopEditing();
				save();
			} else {
				b.showMenu();
			}
		},
		menu: {
			items: [{
				id: 'menuAutoSave',
				text: 'Auto Save',
				xtype: 'menucheckitem',
				stateful: true,
				stateId: 'option',
				stateEvents: ['checkchange'],
				getState: function () {
					return option;
				},
				applyState: function (state) {
					this.setChecked(state.autosave);
				},
				listeners: {
					'checkchange': function (b, checked) {
						option.autosave = checked;
						b.setIconClass(checked ? 'icon-accept' : null);
						if (checked) {
							store.autosave = setInterval(function () {
								if (store.changed) save();
							}, 30000); // 30s
						} else if (store.autosave) {
							clearInterval(store.autosave);
							store.autosave = null;
						}
					}
				}
			}, '-', {
				id: 'menuSound',
				text: 'Auto Sound',
				xtype: 'menucheckitem',
				iconCls: 'icon-sound-off',
				stateful: true,
				stateId: 'option',
				stateEvents: ['checkchange'],
				getState: function () {
					return option;
				},
				applyState: function (state) {
					if (!can_play_mp3()) return false;
					this.setChecked(state.autosound);
				},
				listeners: {
					'checkchange': function (b, checked) {
						if (!can_play_mp3()) {
							b.disable();
							return false;
						}
						option.autosound = checked;
						b.setIconClass(checked ? 'icon-sound-on' : 'icon-sound-off');
					},
					'render': function (b) {
						if (!can_play_mp3()) b.disable();
					}
				}
			}, '-', {
				id: 'menuEditable',
				text: 'Editable',
				xtype: 'menucheckitem',
				iconCls: 'icon-not-editable',
				checkHandler: function (b, checked) {
					editor.stopEditing();
					editor.editable = checked;
					if (checked) {
						b.setIconClass('icon-editable');
						//Ext.getCmp('btnAdd').enable();
						//Ext.getCmp('btnDel').enable();
					} else {
						b.setIconClass('icon-not-editable');
						//Ext.getCmp('btnAdd').disable();
						//Ext.getCmp('btnDel').disable();
					}
				}
			}, {
				id: 'btnAdd',
				iconCls: 'icon-add',
				text: 'Add',
				disabled: true/*,
				handler: function () {
					editor.stopEditing();
					store.insert(0, new Word({
						rate: -1,
						word: 'new word',
						para: '',
						rmrk: ''
					}));
					grid.view.refresh();
					grid.getSelectionModel().selectFirstRow();
					grid.getSelectionModel().getSelected().markDirty();
					editor.startEditing(0);
				}*/
			}, {
				id: 'btnDel',
				iconCls: 'icon-del',
				text: 'Remove',
				disabled: true/*,
				handler: function () {
					editor.stopEditing();
					store.remove(grid.getSelectionModel().getSelected());
					grid.view.refresh();
				}*/
			}, '-', {
				id: 'btnReset',
				iconCls: 'icon-reset',
				text: 'Reset Settings',
				handler: function () {
					ask_to_save(function () {
						Ext.Msg.show({
							title: 'Reset Settings',
							msg: 'Are you sure to Reset all settings and KEEP your Records?<br/>(Press "YES" Your Records WON\'T BE LOST!<br/>Press "NO" Everything will be reset!)',
							buttons: Ext.Msg.YESNOCANCEL,
							icon: Ext.MessageBox.QUESTION,
							fn: function (btn) {
								if (btn != 'cancel') reset_settings(btn == 'no'); // reset_settings(clear?)
							}
						});
					});
				}
			}, '-', {
				id: 'btnAbout',
				iconCls: 'icon-info',
				text: 'About Info',
				handler: function () {
					grid.el.mask(baeword.btnSave.menu._info_t.apply(baeword.info)).on('mousedown', function () {
						grid.el.unmask();
					}, null, { single: true });
				}
			}],
			_info_t: new Ext.Template(
			'<table onmousedown="baeword.grid.el.unmask();return false" style="font-size:14px;cursor:default">' +
				'<caption class="caption">{APP_NAME} with {FX_VER}</caption>' +
				'<tr><td></td><td>by <a href="{WEB_SITE}">{BY}</a></td>' +
				'</tr><tr style="height:5px"></tr>' +
				'<tr><td class="right">Version: </td><td>{APP_VER} ({CODE_NAME})</td></tr>' +
				'<tr><td class="right">Last Update: </td><td>{LAST_UPDATE}</td></tr>' +
				'<tr><td class="right">e-Mail: </td><td><a href="mailto:{EMAIL}">{EMAIL}</a></td></tr>' +
				'<tr><td class="right">Home Page: </td><td><a href="{HOME}">{HOME}</a></td></tr>' +
			'</table>', {
				compiled: true,
				disableFormats: true
			})
		}
	});

	var grid_columns_cfg = [new Ext.grid.RowNumberer({
		renderer: function (v, metadata, record, rowIndex) {
			rowIndex++;
			metadata.attr = String.format('ext:qtip="{0}" style="font-size: {1}px"', rowIndex, rowIndex > 9999 || rowIndex > 999 && 7 || rowIndex > 99 && 9 || 12);
			return rowIndex;
		}
	}), {
		id: 'id',
		header: 'Id',
		sortable: true,
		width: 50,
		dataIndex: 'id',
		editor: {
			xtype: 'textfield',
			readOnly: true,
			allowBlank: false
		}
	}, {
		id: 'rate',
		header: '\u2606',
		sortable: true,
		width: 30,
		renderer: function (val, metadata) {
			var stars = val + ' ', st;
			if (val == 0) {
				st = '\u3007';
				stars += st;
			} else if (val > 0 && val < 10) {
				st = '\u2605';
				stars += new Array(val + 1).join(st);
			} else {
				st = '\u2606';
				stars += st;
			}
			metadata.attr = 'ext:qtip="' + stars + '"';
			return st;
		},
		dataIndex: 'rate',
		editor: {
			xtype: 'textfield',
			allowBlank: false
		}
	}, {
		id: 'word',
		header: 'Word',
		sortable: true,
		width: 120,
		dataIndex: 'word',
		renderer: function (val, metadata) {
			if (val.length > 11) metadata.attr = 'ext:qtip="' + val + '"';
			return val;
		},
		editor: {
			xtype: 'textfield',
			allowBlank: false
		}
	}, {
		id: 'para',
		header: 'Paraphrase',
		sortable: true, // for pos sort
		width: 300,
		dataIndex: 'para',
		renderer: function (val) { // metadata.attr too large
			return String.format('<span ext:qtip="{1}">{0}</span>', val, val.replace(/ (\d+) /g, '<br/>$1 '));
		},
		editor: {
			xtype: 'textfield',
			allowBlank: true
		}
	}, {
		id: 'rmrk',
		header: 'Remark',
		sortable: true,
		width: 120,
		dataIndex: 'rmrk',
		renderer: function (val, metadata) {
			if (val.replace(/[^\x00-\xff]/g, 'xx').length > 15)
				metadata.attr = 'ext:qtip="' + val + '"';
			return val;
		},
		editor: {
			xtype: 'textfield',
			allowBlank: true
		}
	}];

	var grid_tbar_cfg = [{
		iconCls: 'icon-book',
		tooltip: 'Wordlist Selection',
		overflowText: 'Wordlists',
		handler: function (b) { dlgWordlists.show(b.el); }
	}, ' ', comboList, ' ', {
		tooltip: 'Reload',
		overflowText: 'Reload',
		iconCls: 'icon-reload',
		handler: function () {
			if (store.changed > 0) {
				if (store.autosave) {
					save();
					load(comboList.getValue());
				} else Ext.Msg.show({
					title: 'Lost Changes',
					msg: 'You are going to reload data that the unsaved changes will lost.<br/>Are you sure to do so?',
					buttons: Ext.Msg.OKCANCEL,
					fn: function (btn) {
						if (btn == 'ok') {
							store.rejectChanges();
							load(comboList.getValue());
						}
					},
					animEl: 'elId',
					icon: Ext.MessageBox.WARNING
				});
			} else load(comboList.getValue());
		},
		scope: this
	}, '-', baeword.btnSave, '->', {
		text: 'Online Dict: ',
		disabled: true
	}, new DictSwitch({ id: 'dict-bar-switch' }), comboSearch, '-', {
		iconCls: 'icon-transport',
		tooltip: {
			title: 'Export and Import wordlist',
			text: 'Export to a well formated page for save or print. <br/>' +
					'Export to a text for backup and import in the future. <br/>' +
					'Import wordlist from a text exported by this application.'
		},
		menu: [{
			text: 'Export displayed to Page',
			handler: exportHTML
		}, {
			text: 'Export wordlist to Text',
			handler: function (b) {
				ask_to_save('Before Export Confirm', 'You must save before export!', function () {
					baeword.dlgExport.show(grid.body);
				});
			}
		}, '-', {
			text: 'Import wordlist from Text',
			handler: function (b) {
				baeword.dlgImport.show(grid.body);
			}
		}]
	}];
	var grid_bbar_cfg = [baeword.btnFirst = new Ext.Button({
		tooltip: 'First',
		overflowText: 'First',
		iconCls: 'icon-filter-first',
		disabled: true,
		handler: function () { comboFilter.change(0); },
		scope: this
	}), baeword.btnPrev = new Ext.Button({
		tooltip: 'Prev',
		overflowText: 'Prev',
		iconCls: 'icon-filter-prev',
		disabled: true,
		handler: function () {
			var force = /\(custom\)/i.test(comboFilter.getRawValue());
			comboFilter.change(option.filter[option.wordlist] - (force ? 0 : 1), force);
		},
		scope: this
	}), '-', comboFilter, '-', baeword.btnNext = new Ext.Button({
		tooltip: 'Next',
		overflowText: 'Next',
		iconCls: 'icon-filter-next',
		disabled: true,
		handler: function () { comboFilter.change(option.filter[option.wordlist] + 1); },
		scope: this
	}), baeword.btnLast = new Ext.Button({
		tooltip: 'Last',
		overflowText: 'Last',
		iconCls: 'icon-filter-last',
		disabled: true,
		handler: function () { comboFilter.change(baeword.wordlist.cur.filters.length - 1); },
		scope: this
	}), '-', {
		tooltip: 'Refresh',
		overflowText: 'Refresh',
		iconCls: 'icon-refresh',
		handler: function () {
			store.filterBy();
			store.applySort();
			grid.view.refresh();
		},
		scope: this
	}, '->', barRateStats];

	var grid = baeword.grid = new Ext.grid.GridPanel({
		id: 'grid-baeword',
		store: store,
		stateful: true,
		state: {},
		stateId: 'grid-states',
		bodyCfg: { cls: 'x-panel-body bae' },
		plugins: [editor, filters],
		columns: grid_columns_cfg,
		autoExpandColumn: 'para',
		view: new Ext.ux.grid.BufferView({
			//autoFill: true,
			//forceFit: true,
			scrollDelay: false,
			rowHeight: 20,
			getRowClass: function (row) {
				var rate = row.get('rate'), mod = '';
				if (rate < 0 || rate > 9) rate = 'x';
				else if (row.isModified('rate')) mod = ' word-row-rated';
				return 'word-row-rate-' + rate + mod;
			} //,listeners: {refresh: function (v) {}} // ob by stats itself
		}),
		sm: new Ext.grid.RowSelectionModel({
			singleSelect: true,
			listeners: {
				rowselect: function (sm, i) { // problem fixed since extjs 3.0.3
					//Ext.ux.console.log('start grid.rowselect');
					grid.view.focusRow(i); // necessary
					grid.view.selectIdx = i;
					//grid.selectedEl = Ext.fly(grid.view.getRow(i));
					if (option.autosound) play(grid.getSelectionModel().getSelected().get('word'));
					//Ext.ux.console.log('end grid.rowselect');
				}
			}
		}),
		tbar: grid_tbar_cfg,
		bbar: grid_bbar_cfg,
		listeners: {
			render: function () { // init
				grid.row_h = grid.view.rowHeight + 2;
				grid.view.scroller.on('scroll', function (e) { // override scrolling
					//this.dom.scrollTop = Math.floor(this.dom.scrollTop / grid.row_h) * grid.row_h;
					var xh; if (xh = this.dom.scrollTop % grid.row_h) this.dom.scrollTop -= xh;
				});
				grid.view.scroller.on('mousewheel', function (e) { // override mouse scroll
					if (rmrkEditor.editing) {
						e.stopEvent();
						return false;
					}
					var d = -e.getWheelDelta() * grid.row_h;
					if (e.ctrlKey || e.shiftKey || e.altKey)
						return true;
					e.stopEvent();
					this.dom.scrollTop += d;
				});
				this.body.on('keyup', function (e) {
					e.key = e.getKey();
					// grid.selectedEl && grid.selectedEl.removeClass(e.key == 16 && 'x-grid3-row-shift' || e.key == 17 && 'x-grid3-row-ctrl' || e.key == 18 && 'x-grid3-row-alt');
					(e.key >= 16 || e.key <= 18) && grid.selectedEl && grid.selectedEl.removeClass('x-shift-ctrl-alt');
				});
				if (Ext.isIE) this.el.dom.onselectstart = function () { // for ie
					return editor.editable || rmrkEditor.editing;
				};
			},
			afterrender: function () {
				grid.offsetH = grid.getHeight() - grid.view.scroller.getHeight();
				this.buildHMenu();
			},
			keydown: function (e) {
				if (editor.editable || rmrkEditor.editing) return false;
				var key = e.getKey();
				if (key == 38 || key == 40) { // up & down
					grid.view.scroller.dom.scrollTop += (key == 38 ? -grid.row_h : grid.row_h);
					grid.view.selectIdx && grid.view.ensureVisible(grid.view.selectIdx, 1, true);
				} else if (key == 37 || key == 39) {// left & right
					chgrate(key == 39);
				} else if (key == 10 || key == 13) { // enter
					chgrate();
				} else if (key == 113) { // F2
					grid.view.selectIdx != null && editor.editOnce(grid.view.selectIdx);
				}
				(grid.selectedEl = Ext.fly(grid.view.getRow(grid.view.selectIdx))) &&
					(e.shiftKey || e.ctrlKey || e.altKey) && grid.selectedEl.addClass('x-shift-ctrl-alt');
				//if (grid.selectedEl) { // may press multy at same time
				//	e.shiftKey && grid.selectedEl.addClass('x-grid3-row-shift');
				//	e.ctrlKey && grid.selectedEl.addClass('x-grid3-row-ctrl');
				//	e.altKey && grid.selectedEl.addClass('x-grid3-row-alt');
				//}
			},
			keypress: function (e) {
				if (editor.editable || rmrkEditor.editing) return false;
				var key = e.getKey(), rate = null;
				if (key >= 48 && key <= 57) { // 0-9
					rate = key - 48;
				} else if (key == 46 || key == 47 || key == 96) { // `(~)/.//
					rate = -1;
				} else if (key == 45 || key == 61 || key == 43) { // - & +/=
					rate = (key != 45);
				} else if (key == 32 || key == 34 || key == 39) { // "/'
					rate = ' ';
					e.stopEvent();
				} else if (key == 42) { // star
					rate = '*';
				} else { // query
					var _func = arguments.callee,
						chr = String.fromCharCode(e.getCharCode());
					if (!/\w/.test(chr)) return false;
					_func._query = _func._query ? _func._query + chr : chr;
					_func._timeout = _func._timeout && clearTimeout(_func._timeout) || setTimeout(function () {
						_func._timeout = null;
						var ret = store.find('word', _func._query, 0, false, false);
						_func._query = '';
						//alert(_func._query)
						if (ret < 0) return beep();
						grid.getSelectionModel().selectRow(ret);
						grid.view.ensureVisible(ret, 0, true);
					}, 500);
					return false;
				}
				if (rate != null) chgrate(rate);
				return false;
			},
			rowdblclick: function (grid, i, e) {
				(document.selection || document.getSelection()).empty();
				if (!editor.editable && !rmrkEditor.editing) {
					grid.getSelectionModel().selectRow(i);
					chgrate(' ');
					e.stopEvent();
					return false;
				}
			},
			cellclick: function (self, row, col, e) {
				if (col == 5 && !rmrkEditor.editing) { // rmrk
					rmrkEditor.to(row, col);
					//if(grid.colModel.isCellEditable(row, col)){
					//	var rec = grid.getSelectionModel().getSelected();
					//	grid.view.ensureVisible(row, col, true);
					//	var ed = this.colModel.getCellEditor(col, row);
					//	ed.startEdit(this.view.getCell(row, col).firstChild, rec.get('rmrk'));
					//}
					return false;
				}
			},
			rowcontextmenu: function (self, row, e) {
				if (e.ctrlKey || e.shiftKey || e.altKey) // hold ctrl/shift/alt show org cmenu
					return true;
				e.stopEvent();
				var sm = grid.getSelectionModel();
				sm.selectRow(row);
				//para_cmenu.col = col;
				para_cmenu.row = row;
				para_cmenu.record = sm.getSelected();
				para_cmenu.showAt(e.getXY());
				return false;
			},
			headercontextmenu: function (self, col, e) {
				if (e.ctrlKey || e.shiftKey || e.altKey || !col) // hold ctrl/shift/alt show org cmenu
					return true;
				e.stopEvent();
				//var hd_btn = e.getTarget('.x-grid3-hd-inner', 2, true).child('.x-grid3-hd-btn');
				//hd_btn.fireEvent('click');
				grid.view.hdCtxIndex = col;
				grid.view.hmenu.showAt(e.getXY());
				return false;
			}
		},
		buildHMenu: function () {// Add hmenus
			var hmenu = grid.view.hmenu,
				hmenu_sep = hmenu.addSeparator({ hidden: true }), // a separator --
				rand_sort_menu = hmenu.insert(2, { // Add Sort Random menu
					itemId: 'rand_sort_menu',
					text: 'Sort Random',
					iconCls: 'icon-sort-rand',
					handler: function () {
						var v = {};
						store.each(function (r) {
							v[r.id] = Math.random();
						});
						grid.view.clearHeaderSortState();
						store.sortBy(function (r1, r2) {
							return v[r1.id] - v[r2.id];
						});
						grid.view.refresh();
					}
				}),
				word_bylen_menu = hmenu.insert(3, { // Add Sort By Len menu
					checked: false,
					itemId: 'word_bylen_menu',
					text: 'Order By Length',
					hidden: true,
					stateful: true,
					stateId: 'option',
					stateEvents: ['checkchange'],
					getState: function () {
						return option;
					},
					applyState: function (state) {
						store.sortByLen = this.checked = state.sort_by_len;
						//this.fireEvent('checkchange', this, this.checked); // will force sort word col
					},
					listeners: {
						checkchange: function (item, value) {
							store.sortByLen = option.sort_by_len = value;
							store.singleSort('word', store.sortInfo && store.sortInfo.field == 'word' ? store.sortInfo.direction : null);
						}
					}
				}),
				word_inverted_menu = hmenu.insert(4, { // Add Sort Reversed menu
					checked: false,
					itemId: 'word_inverted_menu',
					text: 'Inverted Sequence',
					hidden: true,
					stateful: true,
					stateId: 'option',
					stateEvents: ['checkchange'],
					getState: function () {
						return option;
					},
					applyState: function (state) {
						triggerWord(store.sortReversed = this.checked = state.inverted_seq);
						//this.fireEvent('checkchange', this, this.checked); // will force sort word col
					},
					listeners: {
						checkchange: function (item, value) {
							store.sortReversed = option.inverted_seq = value;
							store.singleSort('word', store.sortInfo && store.sortInfo.field == 'word' ? store.sortInfo.direction : null);
							triggerWord(value);
						}
					}
				}),
				para_hidden_menu = hmenu.add({ // Add ShowPara menu
					checked: true,
					itemId: 'para_hidden_menu',
					text: 'Always show Paras',
					hidden: true,
					stateful: true,
					stateId: 'option',
					stateEvents: ['checkchange'],
					getState: function () {
						return option;
					},
					applyState: function (state) {
						this.setChecked(!state.hidden_para);
					},
					listeners: {
						checkchange: function (item, value) {
							triggerParas(option.hidden_para = !value);
						}
					}
				});

			hmenu.on('beforeshow', function () {
				var dataIndex = grid.view.cm.config[grid.view.hdCtxIndex].dataIndex;
				hmenu_sep.setVisible(dataIndex == 'para');
				para_hidden_menu.setVisible(dataIndex == 'para');
				word_bylen_menu.setVisible(dataIndex == 'word');
				word_inverted_menu.setVisible(dataIndex == 'word');
			});

			function triggerParas(force_val) {
				grid[force_val ? 'addClass' : 'removeClass']('para-hidden');
			}
			function triggerWord(rev_val) {
				grid[rev_val ? 'addClass' : 'removeClass']('word-inverted-seq');
			}
		}
	});

	var dlgDict = baeword.dlgDict = new Ext.Window({
		width: 550,
		height: 500,
		maximizable: true,
		opacity: 1,
		closeAction: 'hide',
		html: '<iframe id="ifr_dlgDict" border="0" frameBorder="0" marginWidth="0" marginHeight="0" style="background-color:white" src="' + Ext.BLANK_URL + '"></iframe>',
		tools: [{
			id: 'pin',
			qtip: 'Stay OnTop',
			hidden: false,
			handler: function (event, toolEl, panel) {
				panel.keepOnTop = true;
				this.hide();
				panel.tools.unpin.show();
			}
		}, {
			id: 'unpin',
			qtip: 'Restore',
			hidden: true,
			handler: function (event, toolEl, panel) {
				panel.keepOnTop = false;
				this.hide();
				panel.tools.pin.show();
			}
		}],
		tbar: [{
			id: 'btnBack',
			iconCls: 'icon-go-back',
			overflowText: 'Click here to go back to the original page.',
			handler: function () {
				var ifr = Ext.getDom('ifr_dlgDict');
				ifr.src = ifr.src;
			}
		}, '->', {
			text: 'Search: ',
			disabled: true
		}, new DictSwitch({ id: 'dict-dlg-switch' }), {
			id: 'dict-search-bar',
			xtype: 'combo',
			store: comboSearch.store,
			width: comboSearch.width,
			allowBlank: comboSearch.allowBlank,
			shadow: comboSearch.shadow,
			editable: comboSearch.editable,
			enableKeyEvents: comboSearch.enableKeyEvents,
			emptyText: comboSearch.emptyText,
			mode: comboSearch.mode,
			displayField: comboSearch.displayField,
			valueField: comboSearch.valueField,
			triggerConfig: {
				id: 'triggerDictSearch',
				tag: 'img', src: Ext.BLANK_IMAGE_URL,
				cls: 'x-form-trigger x-form-search-trigger'
			},
			listeners: {
				render: function (self) {
					Ext.fly('triggerDictSearch').on('click', function () {
						dlgDict.go(self.getRawValue(), option.defaultDict);
					});
					DictSwitch.instances[1].on('change', function () {
						if (!dlgDict.hidden) dlgDict.go(self.getRawValue(), option.defaultDict);
					});
				},
				specialkey: function (field, e) {
					if (e.getKey() == e.ENTER) {
						dlgDict.go(field.getRawValue(), option.defaultDict);
						e.stopEvent();
						return false;
					}
				}
			}
		}],
		listeners: {
			afterrender: function (wnd) {
				if (!wnd.ifr_dict) {
					wnd.ifr_dict = Ext.get('ifr_dlgDict');
					wnd.ifr_dict.on('load', function () {
						if (this.getAttribute('src') == Ext.BLANK_URL) return false;
						wnd._mask_timeout = wnd._mask_timeout && clearTimeout(wnd._mask_timeout);
						wnd.body.unmask(); // unmask after loaded
					});
					// useless for cannot catch 404
					//wnd.ifr_dict.on('error', function () {
					//	if (this.getAttribute('src') == Ext.BLANK_URL) return false;
					//	var key = option.defaultDict;
					//	if (dict_items[key].url[1] && !wnd.ifr_dict.retry) { // has a bak url
					//		wnd.ifr_dict.retry = true;
					//		wnd.ifr_dict.dom.src = dict_items[key].url[1].replace('{word}', word);
					//		dict_items[key].retry
					//			? dict_items[key].retry++
					//			: (dict_items[key].retry = 1);
					//		if (dict_items[key].retry > 3) { // MAX_RETRY
					//			// switch url and bak
					//			dict_items[key].url.reverse();
					//		}
					//	} else {
					//		wnd._mask_timeout = wnd._mask_timeout && clearTimeout(wnd._mask_timeout);
					//		Ext.Msg.alert('Online Dict Error', 'Faild to load: ' + wnd.ifr_dict.dom.src);
					//		wnd.body.unmask(); // unmask after faild
					//	}
					//});
					wnd.searchBar = Ext.getCmp('dict-search-bar');
					wnd.btnBack = Ext.getCmp('btnBack');
					wnd.showed = true;
				}
			},
			activate: function () {
				if (this.opacity < 1) this.el.setOpacity(this.opacity = 1), this.el.clearOpacity(); // recover when keepOnTop
				this.body.unmask(); // unmask when activated
			},
			deactivate: function () {
				if (this.keepOnTop) { // set opacity and keepOnTop
					this.el.setOpacity(this.opacity = 0.7, true);
					var i = 1; this.manager.each(function () { i++ });
					this.setZIndex(this.manager.zseed + i * 10);
				}
				this.body.mask().setOpacity(0.3); // mask for click to top
			},
			resize: function () {
				if (this.ifr_dict) // sync ifr size
					this.ifr_dict.setSize(this.getInnerWidth(), this.getInnerHeight());
				if (this.showed) this.toFront(); // resize to front
			},
			hide: function () {
				if (this.ifr_dict) this.ifr_dict.dom.src = Ext.BLANK_URL;
			}
		},
		go: function (word, dict_id) {
			if (!word) return false;
			if (!dict_id) dict_id = option.defaultDict;
			this.show();
			this.word = word = word.replace(/\s*\(.+?\)/g, '');
			var wnd = this, pos = wnd.getPosition(), // dict icon
			icon = '<img src="' + Ext.BLANK_IMAGE_URL + '" class="' + dict_items[dict_id].iconCls + '" style="float:left;width:16px;height:16px;margin:0 3px 0 0"/>';
			if (pos[1] < 0) wnd.setPosition(pos[0], 0);
			wnd.setTitle(icon + word + ' - Online Dictionary [' + dict_items[dict_id].text + ']');
			wnd.ifr_dict.setSize(wnd.getInnerWidth(), wnd.getInnerHeight());
			wnd.body.mask('', 'loading'); // mask for loading
			wnd._mask_timeout = setTimeout(function () {
				wnd._mask_timeout = null;
				wnd.body.unmask();
			}, 5000);
			var url = dict_items[dict_id].url;
			wnd.ifr_dict.retry = false;
			wnd.ifr_dict.dom.src = (Ext.isArray(url) ? url[0] : url).replace('{word}', word);
			wnd.focus();
			comboSearch.addHistory(word);
			comboSearch.collapse();
			DictSwitch.instances[0].sync(dict_id);
			this.searchBar.setRawValue(word);
			this.searchBar.collapse();
			this.btnBack.setText('Reload ' + word.bold());
		}
	});

	var dlgWordlists = new Ext.Window({
		id: 'dlg-wordlists',
		title: 'Wordlist Seletion',
		width: 300,
		autoHeight: true,
		modal: true,
		resizable: false,
		//renderTo: baeword.wnd.el, // in baeword.wnd.render
		closeAction: 'hide',
		initData: function (dlg) {
			var list_store_data = [];
			for (var id in dlg.data)
				list_store_data.push([id, dlg.data[id]]);
			var sm = new Ext.grid.CheckboxSelectionModel({ checkOnly: true });
			if (dlg.grid) dlg.grid.destroy();
			dlg.grid = new Ext.grid.GridPanel({
				store: new Ext.data.ArrayStore({
					autoDestroy: true,
					idIndex: 0,
					fields: ['id', 'name'],
					data: list_store_data
				}),
				frame: false,
				autoHeight: true,
				maxHeight: 200,
				enableHdMenu: false,
				renderTo: dlg.body,
				cm: new Ext.grid.ColumnModel({
					columns: [sm, {
						header: 'Wordlist',
						dataIndex: 'name',
						width: 200,
						sortable: true
					}]
				}),
				sm: sm,
				viewConfig: { forceFit: true },
				listeners: {
					viewready: function (g) {
						var l = [], seletedId = {}, userList = localCache.get('wordlist-index') || [];
						userList.forEach(function (itm) { seletedId[itm[0]] = true; });
						g.store.each(function (r) { if (r.id in seletedId) l.push(r); });
						g.getSelectionModel().selectRecords(l);
					}
				}
			});
		},
		listeners: {
			beforeshow: function (dlg) {
				if (!dlg.data) {
					// only do export on the first time or when store changed
					grid.el.mask('Loading ...');
					setTimeout(function () {
						var ts = Date.parse(new Date()) / 1000;
						$load('bae-wordlist-index.js?' + ts, function (data) {
							dlg.data = data;
							dlg.initData(dlg);
							dlg.grid.on('viewready', function () {
								setTimeout(function () {
									grid.el.unmask();
									dlg.show(grid.el);
								}, 300);
							}, null, { single: true });
						}, dlg, 5000, function () {
							Ext.Msg.alert('Loading Timeout', 'Loading Wordlist Index timeout!');
							grid.el.unmask();
						}, 'baeword.load');
					}, 100);
					return false;
				} else {
					this.grid.fireEvent('viewready', this.grid);
				}
			}
		},
		buttonAlign: 'left',
		buttons: [{
			text: 'Reload',
			handler: function () {
				dlgWordlists.hide().data = null;
				dlgWordlists.show();
			}
		}, '->', {
			text: 'OK',
			handler: function () {
				var wordlists = dlgWordlists.grid.getSelectionModel().getSelections().map(function (r) {
					return [r.id, r.data.name];
				});
				localCache.set('wordlist-index', wordlists);
				setTimeout(function () {
					comboList.init();
					comboList.load();
				}, 300);
				dlgWordlists.hide(); // must
			}
		}, {
			text: 'Cancel',
			handler: function () {
				dlgWordlists.hide(); // must
			}
		}]
	});

	var dlgWebStorage = baeword.dlgWebStorage = new Ext.Window({
		width: 550,
		height: 400,
		modal: true,
		//renderTo: baeword.wnd.el,
		closeAction: 'hide',
		user: null,
		url: {
			base: 'http://yyfearth.appspot.com/webstorage/',
			login: 'login',
			post: 'baeword-wordlist-{id}',
			get: 'baeword-wordlist-{id}'
		},
		html: '<iframe id="ifr_dlgWebStorage" border="0" frameBorder="0" marginWidth="0" marginHeight="0" style="background-color:white" src="' + Ext.BLANK_URL + '"></iframe>' +
		'<form id="frm_dlgWebStorage" method="post" target="ifr_dlgWebStorage"><input type="hidden" id="ws-title" name="title"/><input type="hidden" id="ws-desc" name="desc"/><input type="hidden" id="ws-data" name="data"/></form>',
		buttons: [{
			text: 'Close',
			handler: function () {
				dlgWebStorage.hide(); // must
			}
		}],
		messageHandler: function (wnd, method, obj_data) {
			switch (method) {
				case 'login':
					wnd.hide();
					if (obj_data.user) {
						dlgWebStorage.user = { email: obj_data.user, nickname: obj_data.nickname };
						if (Ext.isFunction(wnd.onLogined)) wnd.onLogined(wnd, obj_data);
					} else {
						Ext.Msg.alert('Login Failed', 'Login Faild for no user info!<br/>please retry.');
					}
					break;
				case 'post':
					wnd.hide();
					if (Ext.isFunction(wnd.onUploaded)) wnd.onUploaded(wnd, obj_data);
					break;
				case 'get':
					wnd.hide();
					if (Ext.isFunction(wnd.onDownloaded)) wnd.onDownloaded(wnd, obj_data);
					break;
				default:
					Ext.Msg.alert('Transmit Message Failed', 'No such method: ' + method);
					break;
			}
		},
		login: function (callback, btn) {
			if (this.user) return;
			var wnd = this;
			this.show(btn, function () { // must
				wnd.ifr_ws.dom.src = Ext.BLANK_URL;
				wnd.hide();
				var delay_show = setTimeout(function () {
					delay_show = null;
					wnd.show();
				}, 1000);
				this.setTitle('Login - WebStorage');
				this.onLogined = function (wnd, obj_data) {
					this.onLogined = null;
					delay_show = delay_show && clearTimeout(delay_show);
					if (Ext.isFunction(callback)) callback.call(wnd, dlgWebStorage.user);
				};
				wnd.ifr_ws.dom.src = wnd.url.base + wnd.url.login;
				//wnd.onPageLoad = function () {
				//	wnd.onPageLoad = null;
				//	setTimeout(function () {
				//		wnd.ifr_ws.dom.src = wnd.url.base + wnd.url.login;
				//	}, 300);
				//};
			});
		},
		upload: function (data, callback) {
			var wnd = this, form = Ext.getDom('frm_dlgWebStorage');
			if (!this.user) {
				if (callback) callback.call(wnd, { err: 'not login' });
				return false;
			}
			if (!Ext.isFunction(callback)) callback = null;
			form.reset();
			Ext.getDom('ws-title').value = 'baeword user\'s wordlist records of ' + baeword.wordlist.cur.name;
			Ext.getDom('ws-desc').value = '(User and Record Info will be displayed here in the futher)\nRecorded at ' + new Date().toLocaleTimeString();
			Ext.getDom('ws-data').value = data;
			form.action = this.url.base + this.url.post.replace('{id}', baeword.wordlist.cur.id); // post url
			//this.show();
			this.setTitle('Uploading... - WebStorage');
			this.onUploaded = function (wnd, obj_data) {
				this.onUploaded = null;
				if (callback) callback.call(wnd, obj_data);
			};
			form.submit();
		},
		download: function (callback) {
			var wnd = this;
			if (!this.user) {
				if (callback) callback.call(wnd, { err: 'not login' });
				return false;
			}
			if (!Ext.isFunction(callback)) callback = null;
			//this.show();
			this.setTitle('Downloading... - WebStorage');
			this.onDownloaded = function (wnd, obj_data) {
				this.onDownloaded = null;
				if (Ext.isFunction(callback)) callback.call(wnd, obj_data);
			};
			wnd.ifr_ws.dom.src = wnd.url.base + wnd.url.get.replace('{id}', baeword.wordlist.cur.id);
		},
		init: function () {
			var wnd = this;
			if (!this.ifr_ws) {
				this.ifr_ws = Ext.get('ifr_dlgWebStorage');
				this.ifr_ws.setSize(this.getInnerWidth(), this.getInnerHeight());
				this.ifr_ws.on('load', function () {
					if (Ext.isFunction(wnd.onPageLoad)) wnd.onPageLoad.call(this);
				});
				function callback(e) {
					// if (window.removeEventListener) // non-ie
					// 	window.removeEventListener('message', arguments.callee, false);
					// else if (window.detachEvent) // ie
					// 	window.detachEvent('onmessage', arguments.callee);
					var err_m = ['Transmit Message Failed', 'Transmit Message Faild for {err} error!<br/>please retry.'];
					if (e.data) {
						try {
							var data = Ext.decode(e.data);
						} catch (e) { }
						if (data && data.method)
							Ext.isFunction(wnd.messageHandler) && wnd.messageHandler(wnd, data.method.toLowerCase(), data);
						else Ext.Msg.alert(err_m[0], err_m[1].replace('{err}', 'data or parsing'));
					} else Ext.Msg.alert(err_m[0], err_m[1].replace('{err}', 'transmit'));
				}
				if (window.addEventListener) // non-ie
					window.addEventListener('message', callback, false);
				else if (window.attachEvent) // ie
					window.attachEvent('onmessage', callback);
			}
		},
		listeners: {
			'afterrender': function (wnd) {
				wnd.init();
			},
			'resize': function () {
				if (this.ifr_ws)
					this.ifr_ws.setSize(this.getInnerWidth(), this.getInnerHeight());
			},
			'hide': function () {
				this.ifr_ws.dom.src = Ext.BLANK_URL;
			}
		}
	});

	var TxtXport = Ext.extend(Ext.form.TextArea, {
		wordWrap: false,
		initComponent: Ext.form.TextArea.prototype.initComponent.createSequence(function () {
			Ext.applyIf(this, {
				wordWrap: true
			});
		}),
		onRender: Ext.form.TextArea.prototype.onRender.createSequence(function (ct, position) {
			this.el.setOverflow('auto');
			if (this.wordWrap === false) {
				if (!Ext.isIE) {
					this.el.set({ wrap: 'off' });
				} else {
					this.el.dom.wrap = 'off';
				}
			}
			if (this.preventScrollbars === true) {
				this.el.setStyle('overflow', 'hidden');
			}
		})
	});

	var DlgXport = Ext.extend(Ext.Window, {
		modal: true,
		width: 480,
		height: 450,
		draggable: false,
		resizable: false,
		shadow: true,
		//renderTo: baeword.wnd.el, // in baeword.wnd.render
		baseCls: 'x-panel',
		closeAction: 'hide',
		layout: 'fit',
		readonly: false,
		initComponent: function () {
			Ext.Window.prototype.initComponent.call(this);
			this.add(this.txtXport = new TxtXport({ readOnly: this.readonly }));
			this.on('beforeshow', function () {
				this.setPosition((baeword.wnd.el.getWidth() - this.getWidth()) / 2);
				this.setHeight(baeword.wnd.el.getHeight() - 30);
			});
		}
	});

	var dlgImport = baeword.dlgImport = new DlgXport({
		id: 'dlg-import',
		title: 'Import',
		listeners: {
			render: function (dlg) {
				store.on('load', dlg.txtXport.reset, dlg.txtXport);
			}
		},
		buttonAlign: 'left',
		buttons: [{
			text: 'Download from WebStorage',
			cls: 'x-btn-text-icon',
			iconCls: 'icon-download',
			handler: function (btn) {
				function after_login() {
					btn.timeout = btn.timeout && clearTimeout(btn.timeout);
					btn.disable();
					btn.setIconClass('icon-wait');
					btn.setText('Downloading...');
					var msg;
					baeword.dlgWebStorage.download(function (obj) {
						btn.setIconClass('icon-download');
						btn.enable();
						if (obj.err) {
							if (obj.err == 'no_such_name') {
								Ext.Msg.alert('Download Faild', 'Download Faild!<br/>No such Recode in WebStorage(' + baeword.dlgWebStorage.user.email + ')');
							} else {
								Ext.Msg.alert('Download Faild', 'Download Faild!<br/>' + obj.err);
							}
						} else if (obj.data) {
							dlgImport.txtXport.setValue(obj.data);
							btn.disable();
							var i = 30, intv = setInterval(function () {
								btn.setText('You can Download again after ' + --i + 's');
								if (!i) {
									clearInterval(intv);
									btn.enable();
									btn.setText('Download from WebStorage(' + baeword.dlgWebStorage.user.email + ')');
								}
							}, 1000);
							Ext.Msg.alert('Download Success', 'Download Success!<br/>From WebStorage(' + baeword.dlgWebStorage.user.email + ')');
						}
						btn.setText('Download from WebStorage(' + baeword.dlgWebStorage.user.email + ')');
					});
				}
				if (!baeword.dlgWebStorage.user) {
					btn.disable();
					btn.setIconClass('icon-wait');
					btn.setText('Login...');
					btn.timeout = setTimeout(function () {
						btn.timeout = null;
						btn.setIconClass('icon-download');
						btn.setText('Download from WebStorage');
						btn.enable();
					}, 5000);
					baeword.dlgWebStorage.hide();
					baeword.dlgWebStorage.login(after_login, btn);
				} else after_login();
			}
		}, '->', {
			text: 'Import',
			cls: 'x-btn-text-icon',
			iconCls: 'icon-accept',
			handler: function () {
				var val = dlgImport.txtXport.getValue();
				if (val) {
					var c = importText(val); // must
					if (c) {
						Ext.Msg.alert('Import', c + ' words Imported!');
						dlgImport.hide();
					} else Ext.Msg.alert('Import', 'Failed!');
				} else Ext.Msg.alert('Import', 'Empty!');
			}
		}, {
			text: 'Close',
			handler: function () {
				dlgImport.hide(); // must
			}
		}]
	});
	var dlgExport = baeword.dlgExport = new DlgXport({
		id: 'dlg-export',
		title: 'Export',
		readonly: true,
		listeners: {
			render: function (dlg) {
				store.on('load', dlg.txtXport.reset, dlg.txtXport);
				store.on('update', dlg.txtXport.reset, dlg.txtXport);
				store.on('add', dlg.txtXport.reset, dlg.txtXport);
				store.on('remove', dlg.txtXport.reset, dlg.txtXport);
			},
			show: function (dlg) {
				if (!dlg.txtXport.getValue()) {
					// only do export on the first time or when store changed
					dlg.el.mask('Exporting ...');
					dlg.txtXport.setValue('...');
					setTimeout(function () {
						dlg.txtXport.setValue(dlgExport.text = exportText());
						dlg.el.unmask();
					}, 100);
				}
			}
		},
		buttonAlign: 'left',
		buttons: [{
			text: 'Upload to WebStorage',
			cls: 'x-btn-text-icon',
			iconCls: 'icon-upload',
			handler: function (btn) {
				var text = dlgExport.txtXport.getValue();
				if (!text) {
					Ext.Msg.alert('Error', 'Export Text is empty!');
					return false;
				}
				function after_login() {
					btn.timeout = btn.timeout && clearTimeout(btn.timeout);
					btn.disable();
					btn.setIconClass('icon-wait');
					btn.setText('Uploading...');
					baeword.dlgWebStorage.upload(text, function (obj) {
						btn.setIconClass('icon-upload');
						if (obj.err) {
							btn.enable();
							btn.setText('Upload to WebStorage(' + baeword.dlgWebStorage.user.email + ')');
							Ext.Msg.alert('Upload Faild', 'Upload Faild for error:<br/>' + obj.err);
						} else {
							Ext.Msg.alert('Upload Success', 'Upload Success!<br/>To WebStorage(' + baeword.dlgWebStorage.user.email + ')');
							btn.disable();
							var i = 60, intv = setInterval(function () {
								btn.setText('You can Upload again after ' + --i + 's');
								if (!i) {
									clearInterval(intv);
									btn.enable();
									btn.setText('Upload to WebStorage(' + baeword.dlgWebStorage.user.email + ')');
								}
							}, 1000);
						}
					});
				}
				if (!baeword.dlgWebStorage.user) {
					btn.disable();
					btn.setIconClass('icon-wait');
					btn.setText('Login...');
					btn.timeout = setTimeout(function () {
						btn.timeout = null;
						btn.setIconClass('icon-upload');
						btn.setText('Download from WebStorage');
						btn.enable();
					}, 5000);
					baeword.dlgWebStorage.hide();
					baeword.dlgWebStorage.login(after_login, btn);
				} else after_login();
			}
		}, '->', {
			text: 'OK',
			handler: function () {
				dlgExport.hide(); // must
			}
		}]
	});

	// init wnd for baeword
	baeword.wnd = new Ext.Window({
		id: 'wnd-baeword',
		title: 'baeword',
		iconCls: 'icon-baeword',
		x: 50,
		y: 50,
		height: 491, //!!
		width: 650,
		minHeight: 118,
		minWidth: 560,
		minimizable: true,
		maximizable: true,
		monitorResize: true,
		autoShow: true,
		onEsc: Ext.emptyFn, // prevent esc to close
		baseCls: 'x-panel',
		//renderTo: 'desktop', // moved into desktop init
		grid: grid,
		stateful: true,
		stateId: 'wnd-states',
		stateEvents: ['resize', 'move', 'restore', 'beforeclose'],
		getState: function () {
			var state = Ext.Window.superclass.getState.call(this) || {};
			if (this.maximized || this.collapsed) {
				state.x = this.restorePos[0];
				state.y = this.restorePos[1];
				state = Ext.apply(state, this.restoreSize);
			} else {
				state = Ext.apply(state, this.getBox(true));
			}
			state.maximized = !!this.maximized;
			//Ext.ux.console('w ' + Ext.encode(state);
			return state;
		},
		listeners: {
			render: function () { // init
				this._autoShow = this.autoShow; // bak autoShow
				this.autoShow = false; // do not auto show, manual show afterrender if autoShow
				grid.render(this.body); // must
				grid.bwrap.addClass('x-panel-mc').setStyle('padding', '0px'); // gen border
				this.resizable = false;
				this.resizer = new Ext.Resizable(this.el, {
					window: this,
					minWidth: this.minWidth,
					minHeight: this.minHeight,
					handles: this.resizeHandles || 'all',
					transparent: true,
					pinned: true,
					resizeElement: this.resizerAction,
					handleCls: 'x-window-handle',
					listeners: { // keep step
						resize: function (r, w, h, e) {
							var nh = this.window.offsetH + Math.round((h - this.window.offsetH) / grid.row_h) * grid.row_h;
							if (this.window.getHeight() != nh)
								this.window.setHeight(nh);
							if (this.window.showed) this.window.toFront();
						}
					}
				});
				this.mon(this.resizer, 'beforeresize', this.beforeResize, this);
				// render sub wnds
				dlgExport.render(this.el);
				dlgImport.render(this.el);
				dlgWebStorage.render(this.el);
				dlgWordlists.render(this.el);
			},
			afterrender: function (wnd) {
				if (this._autoShow) {
					this.autoShow = true;
					wnd.show();
				}
			},
			show: function () {
				this.offsetH = this.getHeight() - grid.view.scroller.getHeight();
				if (!this.maximized)
					this.resizer.fireEvent('resize', this.resizer, this.width, this.height, null);
				if (!this.showed) {
					this.toBack();
					this.showed = true;
				}
			},
			resize: function () {
				var innerH = this.getInnerHeight();
				if (this.maximized) innerH -= (innerH - grid.offsetH + 3) % grid.row_h; // Math.floor
				grid.setSize(this.getInnerWidth(), innerH);
			},
			restore: function () {
				grid.setSize(this.getInnerWidth(), this.getInnerHeight()); // resize again
			},
			beforeclose: function (p) {
				if (store.changed > 0) {
					if (store.autosave) {
						save(); wnd_close();
					} else Ext.Msg.show({
						title: 'Save before close',
						msg: 'You have unsaved changes.<br/>Close the baeword and Save the changes?<br/><i>Click Yes, changes will be saved and the entire window(page) will be closed;<br/>Click No, the entire window(page) will be closed without save;<br/>Click Cancel, this dialog will disappear and noting will happen.</i>',
						buttons: Ext.Msg.YESNOCANCEL,
						fn: function (btn) {
							if (btn == 'yes') {
								save();
								wnd_close(true);
							} else if (btn == 'no')
								wnd_close(true);
						},
						icon: Ext.MessageBox.WARNING
					});
				} else wnd_close();
				return false;
			}
		}
	});

	var icon_base_url = ICON_BASE_URL, IconButton = Ext.extend(Ext.Button, {
		enableToggle: true,
		initComponent: function () {
			this.superclass = this.constructor.superclass;
			this.tooltip = this.title || this.name;
			this.superclass.initComponent.call(this);
			var thisp = this.wnd.icon = this;
			this.on('render', function () {
				this.btnEl.setSize(40, 40);
				this.iconImg = Ext.get(Ext.DomHelper.createDom({
					tag: 'img',
					width: '32px',
					height: '32px',
					alt: this.name,
					src: icon_base_url + this.name + '.ico'
				}));
				this.iconImg.appendTo(this.btnEl).center(this.btnEl);
			});
			//this.icon = icon_base_url + this.name + '.ico';
			this.wnd.on('minimize', function () {
				this.hide(thisp.el);
				thisp.toggle(false);
			});
			this.wnd.on('hide', function () {
				thisp.toggle(false);
			});
			this.wnd.on('beforeshow', function () {
				thisp.toggle(true);
			});
			this.on('toggle', function (thisp, state) {
				state ? thisp.wnd.show(thisp.el) : thisp.wnd.hide(thisp.el);
			});
		}
	}), icons = [
		(baeword.icon = new IconButton({ id: 'icon-baeword', name: 'baeword', wnd: baeword.wnd }))
	];

	/******************** PRIVATE FUNCTIONS BELOW ********************/

	/********** grid functions **********/

	function chgrate(r) {
		var selected = grid.getSelectionModel().getSelected(),
			rate = selected.get('rate'), cfm = true;
		if (r == null) { // grade jumping for enter
			// -1 -> 5, [6-9] -> 5, [1-5] -> 0, 0 -> -1
			rate = rate < 0 || rate > 5 ? 5 : rate ? 0 : -1;
		} else if (r === ' ') { // dblclick or '/" or space
			// -1/10 -> 5 else rate--
			rate < 0 || rate > 9 ? rate = 5 : rate--;
		} else if (r === '*') { // active/inactive
			// [0-9] -> -1, -1 -> 5
			rate = rate >= 0 && rate <= 9 ? -1 : 5;
			cfm = false; // to -1 without confirm
		} else {
			if (r == '+' || r == '-')
				r = (r == '+');
			if (r === true || r === false) {
				r ? rate++ : rate--;
			} else if (typeof r != 'number') {
				rate = parseInt(r);
				rate = isNaN(rate) ? -1 : r;
			} else { // is number
				rate = r;
				cfm = false; // to -1 without confirm
			}
		}
		if (rate < -1) rate = -1;
		else if (rate > 10) rate = 10;
		if ((rate < 0 || rate > 9) && cfm) {
			Ext.Msg.confirm('Inactivate Confirmation',
			'Do you really want to INACTIVATE the word <b>' + selected.get('word') + '</b> ?',
			function (btn) {
				if (btn == 'yes')
					selected.set('rate', rate);
			});
		} else selected.set('rate', rate);
		grid.view.refresh();
	}

	function changeFilter(filter) {
		//Ext.ux.console(typeof filter)
		if (filter == null) {
			store.prefilter(function () { return false; }); // select none
			return;
		} else if (filter === true) {
			store.prefilter('*');
		} else if (Ext.isNumber(filter)) {
			if (filter in baeword.wordlist.cur.filters) {
				arguments.callee(baeword.wordlist.cur.filters[filter].filter);
				return false;
			}
		} else if (Ext.isFunction(filter)) {
			store.prefilter(filter);
		} else if (Ext.isObject(filter)) {
			var fs = [];
			for (var col in filter) fs.push({
				property: col,
				value: filter[col]
			});
			store.prefilter(fs); // array
		} else {
			store.prefilter(function () { return false; }); // select none
		}
	}

	/********** import/export functions **********/

	function importText(text) {
		if (text.length < 1) return null;
		// clear unsaved recs
		store.removedRecords = [];
		store.commitChanges();
		store.changed = 0;
		// load on new recs
		baeword.wordlist.cur.setText(text);
		store.on('load', function () {
			comboFilter.change(option.filter[option.wordlist] || 0, true); // start
		}, this, { single: true });
		store.loadData(baeword.wordlist.cur.wordlist);
		return baeword.wordlist.cur.wordlist.length;
	}

	function exportText(bfilter) {
		// return save text only when not bfilter
		if (bfilter) {
			var text = [], cols = [];
			var fields = baeword.wordlist.cur.fields, c = store.getCount();
			for (var k = 0; k < fields.length; k++)
				cols.push(fields[k].name);
			text.push(cols.join('\t'));
			store.each(function (rec) {
				var row = [];
				for (var j = 0; j < fields.length; j++)
					row.push(rec.get(cols[j]));
				text.push(row.join('\t').replace(/\s+$/, ''));
			});
			return text.join('\n');
		} else {
			return baeword.wordlist.cur.getText();
		}
	}

	function exportHTML() {
		// build html
		var listname = baeword.wordlist.cur.name + (store.isFiltered() ? ' (' + comboFilter.getRawValue().replace('(Custom)', 'filtered').replace(/^[\(（](.*)[\)）]$/, '$1') + ')' : ''),
			html = [
				'<div id="export">', '<table border="1">', '<caption>',
				'<div class="title">Wordlist export from ' + listname + '</div>',
				'<div class="subtitle">' + new Date().toLocaleDateString() + ' -- by baeword</div>',
				'</caption>', '<tr>'
			];
		Wordlist.fields.forEach(function (field) { html.push('<th>' + field.title + '</th>'); });
		html.push('</tr>');
		store.each(function (r) {
			html.push('<tr>');
			Wordlist.fields.forEach(function (field) { html.push('<td>' + r.get(field.name) + '</td>'); });
			html.push('</tr>');
		});
		html.push('</table>');
		html.push('</div>');
		html = html.join('\n');
		// open window and send when ready
		var wnd = window.open('?export'), timeout = setTimeout(send, 1000); // timeout for opera
		Ext.fly(wnd).on('load', send);
		function send() {
			if (!wnd.location || wnd.location.href == 'about:blank') return false;
			timeout = timeout && clearTimeout(timeout);
			try {
				// rewrite all doc
				var doc = wnd.document || wnd.currentDocument;
				doc.writeln('<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />');
				doc.writeln('<title>WordList Export - ' + listname + '</title>');
				doc.writeln('<style type="text/css">#export td{padding:1px 3px}#export caption{margin:10px 5px 5px}#export .title{font-size:22px;font-weight:bold}#export .subtitle{font-size:16px;font-style:italic}</style>');
				doc.writeln(html);
				doc.close();
				// set events
				wnd.onbeforeunload = function () { return 'Are you sure to leave this page?\nWhile you confirmed, this page will simply disappear.\nIf you are trying to refreshing this page, please export again!'; };
				wnd.onunload = function () { this.onbeforeunload = function () { }; this.close(); };
			} catch (e) { Ext.Msg.alert('Error', 'Export HTML failed!<br/>' + e); }
		}
	}

	/********** play functions **********/

	function can_play_mp3() {
		if (option.can_play_mp3) return true;
		if (typeof Audio == 'undefined')
			return option.autosound = false;
		var audio = new Audio();
		option.can_play_mp3 = audio.canPlayType('audio/mpeg;');
		option.autosound = !!option.can_play_mp3;
		return option.can_play_mp3;
	}

	function beep() {
		if (!option.can_play_mp3) return false;
		if (!arguments.callee._audio) {
			arguments.callee._audio = new Audio(ERR_SOUND_URL);
			arguments.callee._audio.load();
		}
		arguments.callee._audio.play();
		return false;
	}
	baeword.beep = beep;

	var _err_sound_url = ERR_SOUND_URL
	function play(word) {
		if (!option.can_play_mp3 || !word) return false;
		word = word.replace(/\s/g, '_').replace(/\(.+?\)/g, '');
		//Ext.ux.console.log('timeout: '+word+'\t'+play.sound_timeout)
		play.sound_timeout = play.sound_timeout && clearTimeout(play.sound_timeout) || setTimeout(function () {
			play.sound_timeout = null;
			play_now(word);
		}, 300);
		function stop_now(word) {
			if (play.sound) {
				var s = play.sound;
				if (s.word == word) {
					if (s.ended) s.play();
					//Ext.ux.console.log('ended: '+word+'\t'+s.ended)
					return false;
				} else { // stop current
					//Ext.ux.console.log('stop: '+s.word)
					//if (s.currentTime > 0)
					s.pause();
					s.src = s.word = '';
					//play.sound = null;
					delete play.sound;
				}
			}
		}
		function play_now(word) {
			//Ext.ux.console.log('play: '+word)
			if (stop_now(word) == false) return false;
			if (!play.fixurl) play.fixurl = tempCache.get('fixurl') || {};
			var base_url = 'http://www.gstatic.com/dictionary/static/sounds',
				url = play.fixurl[word] || '~/de/0/' + word + '.mp3',
				s = play.sound;
			// build audio
			url = url.replace('~', base_url);
			play.sound = s = new Audio(url);
			s.word = word;
			s.autoplay = true;
			s.addEventListener('error', function () {
				play.sound = build_multi_src(this.word);
				play.sound.play();
			}, false);
			//Ext.ux.console.log('play: ' + url);
			function build_multi_src(word) {
				//Ext.ux.console.log('build_multi_src:' + word);
				var s = new Audio(), url = '~/lf/0/{0}%23_{1}_{2}.mp3';
				var pwords = [get_pword(word).join('/'), get_pword('x' + word).join('/')];
				function get_pword(word) {
					if (!word) return [];
					return [word.charAt(0), (word.slice(0, 2) + '_').slice(0, 2), (word.slice(0, 3) + '__').slice(0, 3), word];
				}
				s.word = word;
				s.urls = [
					'~/de/0/' + word + '.mp3',
					'~/de/0/' + word + '%401.mp3',
					String.format(url, pwords[0], 'us', 1),
					'~/de/0/x' + word + '.mp3',
					String.format(url, pwords[1], 'us', 1),
					'~/de/0/!' + word + '.mp3',
					String.format(url, pwords[0], 'us', 2),
					String.format(url, pwords[0], 'gb', 1),
					String.format(url, pwords[0], 'gb', 2),
					String.format(url, pwords[1], 'gb', 1),
					_err_sound_url
				];
				s.urls.forEach(function (url, i) {
					var rc = document.createElement('source');
					rc.setAttribute('src', url.replace('~', base_url));
					s.appendChild(rc);
				});
				s.addEventListener('canplay', function () {
					if (!/no_sound/.test(this.currentSrc)) // error donot save, so that can retry
						play.fixurl[this.word] = this.currentSrc.replace(base_url, '~');
				}, false);
				s.addEventListener('ended', function () {
					play.sound = new Audio(this.currentSrc);
				}, false);
				return s;
			}
		}
	}

	/********** store functions **********/

	function storeChanged() {
		store.changed = store.getModifiedRecords().length + store.removedRecords.length;
		if (store.autosave && store.changed > 10)
			save();
		baeword.btnSave.setIconClass('icon-save');
	}

	function ask_to_save(title, msg, callback, scope) {
		if (Ext.isFunction(title)) {
			callback = title;
			if (typeof msg != 'string') scope = msg;
			title = msg = null;
		}
		if (store.changed > 0) {
			if (store.autosave) {
				save();
				callback.call(scope || window);
			} else Ext.Msg.confirm(title || 'Save Changes',
				'You have unsaved changes.<br/>' +
				msg || 'Save them NOW or they will be lost?',
				function (btn) {
					if (btn == 'yes') {
						save();
						reset_cfm();
					} else reset_cfm();
				}
			);
		} else callback.call(scope || window);
	}

	function save() {
		var mod = store.getModifiedRecords();
		if (mod.length || store.removedRecords.length) {
			mod.forEach(function (rec) {
				var id = rec.get('id'), chgs = rec.getChanges();
				baeword.wordlist.cur.update(id, chgs); // update or add
			});
			store.removedRecords.forEach(function (rec) {
				baeword.wordlist.cur.update(rec.get('id'), null); // del
			});
			baeword.wordlist.cur.save();
			store.removedRecords = [];
			store.commitChanges();
			store.changed = 0;
			baeword.btnSave.setIconClass('icon-accept');
		}
	}

	function load(wordlist_id) {
		if (!wordlist_id) return false;
		function loaded(wordlist) {
			document.title = 'baeword - rendering...';
			baeword.wordlist.cur = baeword.wordlist[wordlist.id] = wordlist;
			comboFilter.loadFilters(wordlist.filters);
			store.loadData(wordlist.wordlist);
			document.title = 'baeword - ' + wordlist.name;
			grid.el.unmask();
		}
		function loading() {
			grid.getSelectionModel().clearSelections(true); // fast
			if (baeword.wordlist[wordlist_id]) {
				loaded(baeword.wordlist[wordlist_id]);
			} else {
				// open callback func interface
				function load_data(wordlist) { // data_js callback
					if (!wordlist || wordlist.id != wordlist_id) {
						Ext.Msg.alert('Error', 'Loading wordlist data failed!');
					} else {
						loaded(new Wordlist(wordlist));
					}
				};
				// do import
				$load('bae-wordlist-' + wordlist_id + '.js', load_data, baeword, 15000, function () {
					Ext.Msg.alert('Timeout', 'Loading wordlist data timeout!<br/>Maybe some problems occured.');
				}, 'baeword.load'); // self callback
			}
		}
		grid.el.mask('Loading...');
		document.title = 'baeword - loading...';
		setTimeout(loading, 100); // delay must
	}

	/********** other functions **********/

	function wnd_close(f) {
		if (f) {
			window.close(); // close window
			//history.back(); // if close window faild
			location.href = APPS_INDEX_URL;
		} else Ext.Msg.confirm('Close Window', 'Are you sure to close baeword?<br/><i>While you confirmed, the entire window(page) will be closed.</i>', function (btn) {
			if (btn == 'yes') wnd_close(true);
		});
	}

	function reset_settings(clear) {
		document.cookie = '';
		if (!clear) {
			var wordlists = {};
			for (var name in localStorage) {
				if (/wordlist-/.test(name))
					wordlists[name] = localStorage.getItem(name);
			}
			localStorage.clear();
			for (var name in wordlists)
				localStorage.setItem(name, wordlists[name]);
		} else {
			localStorage.clear();
		}
		if ('sessionStorage' in window)
			sessionStorage.clear();
		option.resetting = true;
		location.reload();
	}

	Ext.fly(window).on('beforeunload', function () { // on exit
		if (!option.resetting) {
			optionCache.set('option', option); // save options before exit
			tempCache.set('fixurl', play.fixurl); // save sound fixurl
			if (store.changed > 0) { // save word changes before exit
				if (store.autosave) save();
				else return 'You are going to leave baeword without saving any changes. \nAre you sure to do so?';
			}
		}
	});

	/********** on doc ready **********/

	Ext.onReady(function () { // EP: document ready

		Ext.QuickTips.init(); // QuickTips init
		// Apply a set of config properties to the singleton
		Ext.apply(Ext.QuickTips.getQuickTip(), {
			showDelay: 750,
			dismissDelay: 15000
		});

		// IE8 or Compat Performence Warnning
		if (/MSIE [78]/i.test(navigator.userAgent)) {
			Ext.Msg.alert('Performance Warnning', 'This application cannot work properly under you browser:<br/><b>Microsoft Internet Explorer 8.0</b> (or Compatibility View)<br/>For its low JS performance. <br/>It might work, but extremely slow or even crash during using!<br/>(<a href="browsers.html">We recommend you switch your browser to use this WebApp</a>)');
		}

		// init and first load
		Ext.getBody().addClass('ready');
		//var icons = Ext.get('desktop-icons');
		//icons.hover(function () {
		//	icons.setLeft(0);
		//}, function () {
		//	icons.setLeft(3 - icons.getWdith());
		//});
		// desktop init
		baeword.wnd.render(Ext.getBody());
		// desktop icons mast render after baeowrd
		icons.forEach(function (icon) { icon.render('desktop-icons'); });
		//baeword.wnd.show(); // show here
		baeword.wnd.body.mask().addClass('mask-wait');
		setTimeout(function () { // delay load
			if (comboList.store.loaded) {
				baeword.wnd.body.unmask();
				comboList.load(); // << load start from here
			} else {
				setTimeout(arguments.callee, 100);
			}
		}, 800);

	}); // end of onReady

	/********** labs functions **********/

	baeword.setTheme = function (theme_name) {
		// swapStyleSheet use append instead of replace
		var css = document.getElementById('theme');
		css.href = css.href.replace(/xtheme-\w+\.css$/, 'xtheme-' + theme_name + '.css');
	};

})(window.baeword) // end of baeword init
