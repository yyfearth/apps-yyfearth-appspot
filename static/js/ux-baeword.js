/*
* Ext JS Library 3.3.0
* Copyright(c) 2006-2010 Ext JS, Inc.
* licensing@extjs.com
* http://www.extjs.com/license
* BufferView RowEditor GridFilters
*/
Ext.ns("Ext.ux.grid");
Ext.ux.grid.BufferView=Ext.extend(Ext.grid.GridView,{rowHeight:19,borderHeight:2,scrollDelay:100,cacheSize:20,cleanDelay:500,initTemplates:function(){Ext.ux.grid.BufferView.superclass.initTemplates.call(this);var a=this.templates;a.rowHolder=new Ext.Template('<div class="x-grid3-row {alt}" style="{tstyle}"></div>');a.rowHolder.disableFormats=true;a.rowHolder.compile();a.rowBody=new Ext.Template('<table class="x-grid3-row-table" border="0" cellspacing="0" cellpadding="0" style="{tstyle}">',"<tbody><tr>{cells}</tr>",this.enableRowBody?'<tr class="x-grid3-row-body-tr" style="{bodyStyle}"><td colspan="{cols}" class="x-grid3-body-cell" tabIndex="0" hidefocus="on"><div class="x-grid3-row-body">{body}</div></td></tr>':"","</tbody></table>");a.rowBody.disableFormats=true;a.rowBody.compile()},getStyleRowHeight:function(){return Ext.isBorderBox?this.rowHeight+this.borderHeight:this.rowHeight},getCalculatedRowHeight:function(){return this.rowHeight+this.borderHeight},getVisibleRowCount:function(){var a=this.getCalculatedRowHeight(),b=this.scroller.dom.clientHeight;return b<1?0:Math.ceil(b/a)},getVisibleRows:function(){var a=this.getVisibleRowCount(),b=this.scroller.dom.scrollTop;b=b===0?0:Math.floor(b/this.getCalculatedRowHeight())-1;return{first:Math.max(b,0),last:Math.min(b+a+2,this.ds.getCount()-1)}},doRender:function(a,b,e,g,j,o,f){for(var k=this.templates,t=k.cell,u=k.row,v=k.rowBody,w=j-1,m=this.getStyleRowHeight(),r=this.getVisibleRows(),q=[],d,c={},h={tstyle:"width:"+this.getTotalWidth()+";height:"+m+"px;"},i,p=0,x=b.length;p<x;p++){i=b[p];m=[];var n=p+g,s=n>=r.first&&n<=r.last;if(s)for(var l=0;l<j;l++){d=a[l];c.id=d.id;c.css=l===0?"x-grid3-cell-first ":l==w?"x-grid3-cell-last ":"";c.attr=c.cellAttr="";c.value=d.renderer(i.data[d.name],c,i,n,l,e);c.style=d.style;if(c.value===undefined||c.value==="")c.value="&#160;";if(i.dirty&&typeof i.modified[d.name]!=="undefined")c.css+=" x-grid3-dirty-cell";m[m.length]=t.apply(c)}d=[];if(o&&(n+1)%2===0)d[0]="x-grid3-row-alt";if(i.dirty)d[1]=" x-grid3-dirty-row";h.cols=j;if(this.getRowClass)d[2]=this.getRowClass(i,n,h,e);h.alt=d.join(" ");h.cells=m.join("");q[q.length]=!s?k.rowHolder.apply(h):f?v.apply(h):u.apply(h)}return q.join("")},isRowRendered:function(a){return(a=this.getRow(a))&&a.childNodes.length>0},syncScroll:function(){Ext.ux.grid.BufferView.superclass.syncScroll.apply(this,arguments);this.update()},update:function(){if(this.scrollDelay){if(!this.renderTask)this.renderTask=new Ext.util.DelayedTask(this.doUpdate,this);this.renderTask.delay(this.scrollDelay)}else this.doUpdate()},onRemove:function(a,b,e,g){Ext.ux.grid.BufferView.superclass.onRemove.apply(this,arguments);g!==true&&this.update()},doUpdate:function(){if(this.getVisibleRowCount()>0){for(var a=this.grid,b=a.colModel,e=a.store,g=this.getColumnData(),j=this.getVisibleRows(),o,f=j.first;f<=j.last;f++)if(!this.isRowRendered(f)&&(o=this.getRow(f))){var k=this.doRender(g,[e.getAt(f)],e,f,b.getColumnCount(),a.stripeRows,true);o.innerHTML=k}this.clean()}},clean:function(){if(!this.cleanTask)this.cleanTask=new Ext.util.DelayedTask(this.doClean,this);this.cleanTask.delay(this.cleanDelay)},doClean:function(){if(this.getVisibleRowCount()>0){var a=this.getVisibleRows();a.first-=this.cacheSize;a.last+=this.cacheSize;var b=0,e=this.getRows();if(a.first<=0)b=a.last+1;for(var g=this.ds.getCount();b<g;b++)if((b<a.first||b>a.last)&&e[b].innerHTML)e[b].innerHTML=""}},removeTask:function(a){var b=this[a];if(b&&b.cancel){b.cancel();this[a]=null}},destroy:function(){this.removeTask("cleanTask");this.removeTask("renderTask");Ext.ux.grid.BufferView.superclass.destroy.call(this)},layout:function(){Ext.ux.grid.BufferView.superclass.layout.call(this);this.update()}});
Ext.ux.grid.RowEditor=Ext.extend(Ext.Panel,{floating:true,shadow:false,layout:"hbox",cls:"x-small-editor",buttonAlign:"center",baseCls:"x-row-editor",elements:"header,footer,body",frameWidth:5,buttonPad:3,clicksToEdit:"auto",monitorValid:true,focusDelay:250,errorSummary:true,saveText:"Save",cancelText:"Cancel",commitChangesText:"You need to commit or cancel your changes",errorText:"Errors",defaults:{normalWidth:true},initComponent:function(){Ext.ux.grid.RowEditor.superclass.initComponent.call(this);this.addEvents("beforeedit","canceledit","validateedit","afteredit")},init:function(a){this.ownerCt=this.grid=a;if(this.clicksToEdit===2)a.on("rowdblclick",this.onRowDblClick,this);else{a.on("rowclick",this.onRowClick,this);Ext.isIE&&a.on("rowdblclick",this.onRowDblClick,this)}a.getStore().on("remove",function(){this.stopEditing(false)},this);a.on({scope:this,keydown:this.onGridKey,columnresize:this.verifyLayout,columnmove:this.refreshFields,reconfigure:this.refreshFields,beforedestroy:this.beforedestroy,destroy:this.destroy,bodyscroll:{buffer:250,fn:this.positionButtons}});a.getColumnModel().on("hiddenchange",this.verifyLayout,this,{delay:1});a.getView().on("refresh",this.stopEditing.createDelegate(this,[]))},beforedestroy:function(){this.stopMonitoring();this.grid.getStore().un("remove",this.onStoreRemove,this);this.stopEditing(false);Ext.destroy(this.btns,this.tooltip)},refreshFields:function(){this.initFields();this.verifyLayout()},isDirty:function(){var a;this.items.each(function(b){if(String(this.values[b.id])!==String(b.getValue())){a=true;return false}},this);return a},startEditing:function(a,b){if(this.editing&&this.isDirty())this.showTooltip(this.commitChangesText);else{if(Ext.isObject(a))a=this.grid.getStore().indexOf(a);if(this.fireEvent("beforeedit",this,a)!==false){this.editing=true;var c=this.grid,d=c.getView(),f=d.getRow(a),e=c.store.getAt(a);this.record=e;this.rowIndex=a;this.values={};this.rendered||this.render(d.getEditorParent());this.setSize(Ext.fly(f).getWidth());this.initialized||this.initFields();c=c.getColumnModel();d=this.items.items;for(var i,g,h=0,j=c.getColumnCount();h<j;h++){g=this.preEditValue(e,c.getDataIndex(h));i=d[h];i.setValue(g);this.values[i.id]=Ext.isEmpty(g)?"":g}this.verifyLayout(true);this.isVisible()?this.el.setXY(Ext.fly(f).getXY(),{duration:0.15}):this.setPagePosition(Ext.fly(f).getXY());this.isVisible()||this.show().doLayout();b!==false&&this.doFocus.defer(this.focusDelay,this)}}},stopEditing:function(a){this.editing=false;if(this.isVisible())if(a===false||!this.isValid()){this.hide();this.fireEvent("canceledit",this,a===false)}else{a={};for(var b=this.record,c=false,d=this.grid.colModel,f=this.items.items,e=0,i=d.getColumnCount();e<i;e++)if(!d.isHidden(e)){var g=d.getDataIndex(e);if(!Ext.isEmpty(g)){var h=b.data[g],j=this.postEditValue(f[e].getValue(),h,b,g);if(String(h)!==String(j)){a[g]=j;c=true}}}if(c&&this.fireEvent("validateedit",this,a,b,this.rowIndex)!==false){b.beginEdit();Ext.iterate(a,function(k,l){b.set(k,l)});b.endEdit();this.fireEvent("afteredit",this,a,b,this.rowIndex)}this.hide()}},verifyLayout:function(a){if(this.el&&(this.isVisible()||a===true)){a=this.grid.getView().getRow(this.rowIndex);this.setSize(Ext.fly(a).getWidth(),Ext.isIE?Ext.fly(a).getHeight()+9:undefined);a=this.grid.colModel;for(var b=this.items.items,c=0,d=a.getColumnCount();c<d;c++)if(a.isHidden(c))b[c].hide();else{var f=0;f+=c===d-1?3:1;b[c].show();b[c].setWidth(a.getColumnWidth(c)-f)}this.doLayout();this.positionButtons()}},slideHide:function(){this.hide()},initFields:function(){var a=this.grid.getColumnModel(),b=Ext.layout.ContainerLayout.prototype.parseMargins;this.removeAll(false);for(var c=0,d=a.getColumnCount();c<d;c++){var f=a.getColumnAt(c),e=f.getEditor();e||(e=f.displayEditor||new Ext.form.DisplayField);e.margins=c==0?b("0 1 2 1"):c==d-1?b("0 0 2 1"):Ext.isIE?b("0 0 2 0"):b("0 1 2 0");e.setWidth(a.getColumnWidth(c));e.column=f;if(e.ownerCt!==this){e.on("focus",this.ensureVisible,this);e.on("specialkey",this.onKey,this)}this.insert(c,e)}this.initialized=true},onKey:function(a,b){if(b.getKey()===b.ENTER){this.stopEditing(true);b.stopPropagation()}},onGridKey:function(a){if(a.getKey()===a.ENTER&&!this.isVisible()){var b=this.grid.getSelectionModel().getSelected();if(b){this.startEditing(this.grid.store.indexOf(b));a.stopPropagation()}}},ensureVisible:function(a){this.isVisible()&&this.grid.getView().ensureVisible(this.rowIndex,this.grid.colModel.getIndexById(a.column.id),true)},onRowClick:function(a,b,c){if(this.clicksToEdit=="auto"){a=this.lastClickIndex;this.lastClickIndex=b;if(a!=b&&!this.isVisible())return}this.startEditing(b,false);this.doFocus.defer(this.focusDelay,this,[c.getPoint()])},onRowDblClick:function(a,b,c){this.startEditing(b,false);this.doFocus.defer(this.focusDelay,this,[c.getPoint()])},onRender:function(){Ext.ux.grid.RowEditor.superclass.onRender.apply(this,arguments);this.el.swallowEvent(["keydown","keyup","keypress"]);this.btns=new Ext.Panel({baseCls:"x-plain",cls:"x-btns",elements:"body",layout:"table",width:this.minButtonWidth*2+this.frameWidth*2+this.buttonPad*4,items:[{ref:"saveBtn",itemId:"saveBtn",xtype:"button",text:this.saveText,width:this.minButtonWidth,handler:this.stopEditing.createDelegate(this,[true])},{xtype:"button",text:this.cancelText,width:this.minButtonWidth,handler:this.stopEditing.createDelegate(this,[false])}]});this.btns.render(this.bwrap)},afterRender:function(){Ext.ux.grid.RowEditor.superclass.afterRender.apply(this,arguments);this.positionButtons();this.monitorValid&&this.startMonitoring()},onShow:function(){this.monitorValid&&this.startMonitoring();Ext.ux.grid.RowEditor.superclass.onShow.apply(this,arguments)},onHide:function(){Ext.ux.grid.RowEditor.superclass.onHide.apply(this,arguments);this.stopMonitoring();this.grid.getView().focusRow(this.rowIndex)},positionButtons:function(){if(this.btns){var a=this.grid,b=this.el.dom.clientHeight,c=a.getView().scroller.dom.scrollLeft,d=this.btns.getWidth();this.btns.el.shift({left:Math.min(a.getWidth(),a.getColumnModel().getTotalWidth())/2-d/2+c,top:b-2,stopFx:true,duration:0.2})}},preEditValue:function(a,b){var c=a.data[b];return this.autoEncode&&typeof c==="string"?Ext.util.Format.htmlDecode(c):c},postEditValue:function(a){return this.autoEncode&&typeof a=="string"?Ext.util.Format.htmlEncode(a):a},doFocus:function(a){if(this.isVisible()){var b=0,c=this.grid.getColumnModel();if(a)b=this.getTargetColumnIndex(a);b=b||0;for(var d=c.getColumnCount();b<d;b++){a=c.getColumnAt(b);if(!a.hidden&&a.getEditor()){a.getEditor().focus();break}}}},getTargetColumnIndex:function(a){var b=this.grid,c=b.view;a=a.left;b=b.colModel.config;for(var d=0,f=false,e;e=b[d];d++)if(!e.hidden)if(Ext.fly(c.getHeaderCell(d)).getRegion().right>=a){f=d;break}return f},startMonitoring:function(){if(!this.bound&&this.monitorValid){this.bound=true;Ext.TaskMgr.start({run:this.bindHandler,interval:this.monitorPoll||200,scope:this})}},stopMonitoring:function(){this.bound=false;this.tooltip&&this.tooltip.hide()},isValid:function(){var a=true;this.items.each(function(b){if(!b.isValid(true))return a=false});return a},bindHandler:function(){if(!this.bound)return false;var a=this.isValid();!a&&this.errorSummary&&this.showTooltip(this.getErrorText().join(""));this.btns.saveBtn.setDisabled(!a);this.fireEvent("validation",this,a)},lastVisibleColumn:function(){for(var a=this.items.getCount()-1,b;a>=0;a--){b=this.items.items[a];if(!b.hidden)return b}},showTooltip:function(a){var b=this.tooltip;if(!b)b=this.tooltip=new Ext.ToolTip({maxWidth:600,cls:"errorTip",width:300,title:this.errorText,autoHide:false,anchor:"left",anchorToTarget:true,mouseOffset:[40,0]});var c=this.grid.getView(),d=parseInt(this.el.dom.style.top,10);c=c.scroller.dom.scrollTop;var f=this.el.getHeight();if(d+f>=c){b.initTarget(this.lastVisibleColumn().getEl());if(!b.rendered){b.show();b.hide()}b.body.update(a);b.doAutoWidth(20);b.show()}else b.rendered&&b.hide()},getErrorText:function(){var a=["<ul>"];this.items.each(function(b){b.isValid(true)||a.push("<li>",b.getActiveError(),"</li>")});a.push("</ul>");return a}});Ext.preg("roweditor",Ext.ux.grid.RowEditor);
Ext.ux.grid.GridFilters=Ext.extend(Ext.util.Observable,{autoReload:true,filterCls:"ux-filtered-column",local:false,menuFilterText:"Filters",paramPrefix:"filter",showMenu:true,stateId:undefined,updateBuffer:500,constructor:function(a){a=a||{};this.deferredUpdate=new Ext.util.DelayedTask(this.reload,this);this.filters=new Ext.util.MixedCollection;this.filters.getKey=function(b){return b?b.dataIndex:null};this.addFilters(a.filters);delete a.filters;Ext.apply(this,a)},init:function(a){if(a instanceof Ext.grid.GridPanel){this.grid=a;this.bindStore(this.grid.getStore(),true);this.filters.getCount()==0&&this.addFilters(this.grid.getColumnModel());this.grid.filters=this;this.grid.addEvents({filterupdate:true});a.on({scope:this,beforestaterestore:this.applyState,beforestatesave:this.saveState,beforedestroy:this.destroy,reconfigure:this.onReconfigure});a.rendered?this.onRender():a.on({scope:this,single:true,render:this.onRender})}else if(a instanceof Ext.PagingToolbar)this.toolbar=a},applyState:function(a,b){var d,c;this.applyingState=true;this.clearFilters();if(b.filters)for(d in b.filters)if(c=this.filters.get(d)){c.setValue(b.filters[d]);c.setActive(true)}this.deferredUpdate.cancel();this.local&&this.reload();delete this.applyingState;delete b.filters},saveState:function(a,b){var d={};this.filters.each(function(c){if(c.active)d[c.dataIndex]=c.getValue()});return b.filters=d},onRender:function(){this.grid.getView().on("refresh",this.onRefresh,this);this.createMenu()},destroy:function(){this.removeAll();this.purgeListeners();if(this.filterMenu){Ext.menu.MenuMgr.unregister(this.filterMenu);this.filterMenu.destroy();this.filterMenu=this.menu.menu=null}},removeAll:function(){if(this.filters){Ext.destroy.apply(Ext,this.filters.items);this.filters.clear()}},bindStore:function(a,b){if(!b&&this.store)this.local?a.un("load",this.onLoad,this):a.un("beforeload",this.onBeforeLoad,this);if(a)this.local?a.on("load",this.onLoad,this):a.on("beforeload",this.onBeforeLoad,this);this.store=a},onReconfigure:function(){this.bindStore(this.grid.getStore());this.store.clearFilter();this.removeAll();this.addFilters(this.grid.getColumnModel());this.updateColumnHeadings()},createMenu:function(){var a=this.grid.getView().hmenu;if(this.showMenu&&a){this.sep=a.addSeparator();this.filterMenu=new Ext.menu.Menu({id:this.grid.id+"-filters-menu"});this.menu=a.add({checked:false,itemId:"filters",text:this.menuFilterText,menu:this.filterMenu});this.menu.on({scope:this,checkchange:this.onCheckChange,beforecheckchange:this.onBeforeCheck});a.on("beforeshow",this.onMenu,this)}this.updateColumnHeadings()},getMenuFilter:function(){var a=this.grid.getView();if(!a||a.hdCtxIndex===undefined)return null;return this.filters.get(a.cm.config[a.hdCtxIndex].dataIndex)},onMenu:function(){var a=this.getMenuFilter();if(a){this.menu.menu=a.menu;this.menu.setChecked(a.active,false);this.menu.setDisabled(a.disabled===true)}this.menu.setVisible(a!==undefined);this.sep.setVisible(a!==undefined)},onCheckChange:function(a,b){this.getMenuFilter().setActive(b)},onBeforeCheck:function(a,b){return!b||this.getMenuFilter().isActivatable()},onStateChange:function(a,b){if(a!=="serialize"){b==this.getMenuFilter()&&this.menu.setChecked(b.active,false);if((this.autoReload||this.local)&&!this.applyingState)this.deferredUpdate.delay(this.updateBuffer);this.updateColumnHeadings();this.applyingState||this.grid.saveState();this.grid.fireEvent("filterupdate",this,b)}},onBeforeLoad:function(a,b){b.params=b.params||{};this.cleanParams(b.params);var d=this.buildQuery(this.getFilterData());Ext.apply(b.params,d)},onLoad:function(a){a.filterBy(this.getRecordFilter())},onRefresh:function(){this.updateColumnHeadings()},updateColumnHeadings:function(){var a=this.grid.getView(),b,d,c;if(a.mainHd){b=0;for(d=a.cm.config.length;b<d;b++){c=this.getFilter(a.cm.config[b].dataIndex);Ext.fly(a.getHeaderCell(b))[c&&c.active?"addClass":"removeClass"](this.filterCls)}}},reload:function(){if(this.local){this.grid.store.clearFilter(true);this.grid.store.filterBy(this.getRecordFilter())}else{var a,b=this.grid.store;this.deferredUpdate.cancel();if(this.toolbar){a=b.paramNames.start;if(b.lastOptions&&b.lastOptions.params&&b.lastOptions.params[a])b.lastOptions.params[a]=0}b.reload()}},getRecordFilter:function(){var a=[],b,d;this.filters.each(function(c){c.active&&a.push(c)});b=a.length;return function(c){for(d=0;d<b;d++)if(!a[d].validateRecord(c))return false;return true}},addFilter:function(a){var b=this.getFilterClass(a.type);a=a.menu?a:new b(a);this.filters.add(a);Ext.util.Observable.capture(a,this.onStateChange,this);return a},addFilters:function(a){if(a){var b,d,c,e=false,f;if(a instanceof Ext.grid.ColumnModel){a=a.config;e=true}b=0;for(d=a.length;b<d;b++){if(e){f=a[b].dataIndex;if(c=a[b].filter||a[b].filterable){c=c===true?{}:c;Ext.apply(c,{dataIndex:f});c.type=c.type||this.store.fields.get(f).type.type}}else c=a[b];c&&this.addFilter(c)}}},getFilter:function(a){return this.filters.get(a)},clearFilters:function(){this.filters.each(function(a){a.setActive(false)})},getFilterData:function(){var a=[],b,d;this.filters.each(function(c){if(c.active){var e=[].concat(c.serialize());b=0;for(d=e.length;b<d;b++)a.push({field:c.dataIndex,data:e[b]})}});return a},buildQuery:function(a){var b={},d,c,e,f,g=a.length;if(this.encode){f=[];for(d=0;d<g;d++){c=a[d];f.push(Ext.apply({},{field:c.field},c.data))}if(f.length>0)b[this.paramPrefix]=Ext.util.JSON.encode(f)}else for(d=0;d<g;d++){c=a[d];e=[this.paramPrefix,"[",d,"]"].join("");b[e+"[field]"]=c.field;e=e+"[data]";for(f in c.data)b[[e,"[",f,"]"].join("")]=c.data[f]}return b},cleanParams:function(a){if(this.encode)delete a[this.paramPrefix];else{var b,d;b=RegExp("^"+this.paramPrefix+"[[0-9]+]");for(d in a)b.test(d)&&delete a[d]}},getFilterClass:function(a){switch(a){case "auto":a="string";break;case "int":case "float":a="numeric";break;case "bool":a="boolean"}return Ext.ux.grid.filter[a.substr(0,1).toUpperCase()+a.substr(1)+"Filter"]}});Ext.preg("gridfilters",Ext.ux.grid.GridFilters);
Ext.ns("Ext.ux.menu");
Ext.ux.menu.RangeMenu=Ext.extend(Ext.menu.Menu,{constructor:function(a){Ext.ux.menu.RangeMenu.superclass.constructor.call(this,a);this.addEvents("update");this.updateTask=new Ext.util.DelayedTask(this.fireUpdate,this);var b,c,d,e;a=0;for(b=this.menuItems.length;a<b;a++){c=this.menuItems[a];if(c!=="-"){d={itemId:"range-"+c,enableKeyEvents:true,iconCls:this.iconCls[c]||"no-icon",listeners:{scope:this,keyup:this.onInputKeyUp}};Ext.apply(d,Ext.applyIf(this.fields[c]||{},this.fieldCfg[c]),this.menuItemCfgs);e=d.fieldCls||this.fieldCls;c=this.fields[c]=new e(d)}this.add(c)}},fireUpdate:function(){this.fireEvent("update",this)},getValue:function(){var a={},b,c;for(b in this.fields){c=this.fields[b];if(c.isValid()&&String(c.getValue()).length>0)a[b]=c.getValue()}return a},setValue:function(a){for(var b in this.fields)this.fields[b].setValue(a[b]!==undefined?a[b]:"");this.fireEvent("update",this)},onInputKeyUp:function(a,b){if(b.getKey()==b.RETURN&&a.isValid()){b.stopEvent();this.hide(true)}else{if(a==this.fields.eq){this.fields.gt&&this.fields.gt.setValue(null);this.fields.lt&&this.fields.lt.setValue(null)}else this.fields.eq.setValue(null);this.updateTask.delay(this.updateBuffer)}}});
Ext.ns("Ext.ux.grid.filter");
Ext.ux.grid.filter.Filter=Ext.extend(Ext.util.Observable,{active:false,dataIndex:null,menu:null,updateBuffer:500,constructor:function(a){Ext.apply(this,a);this.addEvents("activate","deactivate","serialize","update");Ext.ux.grid.filter.Filter.superclass.constructor.call(this);this.menu=new Ext.menu.Menu;this.init(a);if(a&&a.value){this.setValue(a.value);this.setActive(a.active!==false,true);delete a.value}},destroy:function(){this.menu&&this.menu.destroy();this.purgeListeners()},init:Ext.emptyFn,getValue:Ext.emptyFn,setValue:Ext.emptyFn,isActivatable:function(){return true},getSerialArgs:Ext.emptyFn,validateRecord:function(){return true},serialize:function(){var a=this.getSerialArgs();this.fireEvent("serialize",a,this);return a},fireUpdate:function(){this.active&&this.fireEvent("update",this);this.setActive(this.isActivatable())},setActive:function(a,b){if(this.active!=a){this.active=a;if(b!==true)this.fireEvent(a?"activate":"deactivate",this)}}});
Ext.ux.grid.filter.NumericFilter=Ext.extend(Ext.ux.grid.filter.Filter,{fieldCls:Ext.form.NumberField,iconCls:{gt:"ux-rangemenu-gt",lt:"ux-rangemenu-lt",eq:"ux-rangemenu-eq"},menuItemCfgs:{emptyText:"Enter Filter Text...",selectOnFocus:true,width:125},menuItems:["lt","gt","-","eq"],init:function(a){this.menu&&this.menu.destroy();this.menu=new Ext.ux.menu.RangeMenu(Ext.apply(a,{fieldCfg:this.fieldCfg||{},fieldCls:this.fieldCls,fields:this.fields||{},iconCls:this.iconCls,menuItemCfgs:this.menuItemCfgs,menuItems:this.menuItems,updateBuffer:this.updateBuffer}));this.menu.on("update",this.fireUpdate,this)},getValue:function(){return this.menu.getValue()},setValue:function(a){this.menu.setValue(a)},isActivatable:function(){var a=this.getValue();for(key in a)if(a[key]!==undefined)return true;return false},getSerialArgs:function(){var a,b=[],c=this.menu.getValue();for(a in c)b.push({type:"numeric",comparison:a,value:c[a]});return b},validateRecord:function(a){a=a.get(this.dataIndex);var b=this.getValue();if(b.eq!==undefined&&a!=b.eq)return false;if(b.lt!==undefined&&a>=b.lt)return false;if(b.gt!==undefined&&a<=b.gt)return false;return true}});
Ext.ux.grid.filter.StringFilter=Ext.extend(Ext.ux.grid.filter.Filter,{iconCls:"ux-gridfilter-text-icon",emptyText:"Enter Filter Text...",selectOnFocus:true,width:125,init:function(a){Ext.applyIf(a,{enableKeyEvents:true,iconCls:this.iconCls,listeners:{scope:this,keyup:this.onInputKeyUp}});this.inputItem=new Ext.form.TextField(a);this.menu.add(this.inputItem);this.updateTask=new Ext.util.DelayedTask(this.fireUpdate,this)},getValue:function(){return this.inputItem.getValue()},setValue:function(a){this.inputItem.setValue(a);this.fireEvent("update",this)},isActivatable:function(){return this.inputItem.getValue().length>0},getSerialArgs:function(){return{type:"string",value:this.getValue()}},validateRecord:function(a){a=a.get(this.dataIndex);if(typeof a!="string")return this.getValue().length===0;return a.toLowerCase().indexOf(this.getValue().toLowerCase())>-1},onInputKeyUp:function(a,b){if(b.getKey()==b.RETURN&&a.isValid()){b.stopEvent();this.menu.hide(true)}else this.updateTask.delay(this.updateBuffer)}});
/*!
* StorageProvider for Ext JS Library 3.0+
* Copyright(c) 2006-2010 Ext JS, Inc.
* licensing@extjs.com
* http://www.extjs.com/license
* by Wilson@yyfearth.com
* filename: StorageProvider.js
* last update: 2010-8-2 13:00:12
*/
Ext.namespace('Ext.ux.state');

/**
* @class Ext.ux.state.StorageProvider
* @extends Ext.state.Provider
* The default Provider implementation which saves state via local or session storage.
* <br />Usage:
<pre><code>
var cp = new Ext.ux.state.StorageProvider({
name: 'yy', // default yy, only accept /^\w{1,3}/
share: true, // default true, StorageProviders with same name will share state obj
session: false, // default false, if true the fallback CookieProvider.expires forced to null
fallback: true or false or {
path: '/cgi-bin/',
expires: new Date(new Date().getTime()+(1000*60*60*24*30)), //30 days
domain: 'extjs.com'
}
});
Ext.state.Manager.setProvider(cp);
</code></pre>
* @cfg {String} path The path for which the cookie is active (defaults to root '/' which makes it active for all pages in the site)
* @cfg {Date} expires The cookie expiration date (defaults to 7 days from now)
* @cfg {String} domain The domain to save the cookie for.  Note that you cannot specify a different domain than
* your page is on, but you can specify a sub-domain, or simply the domain itself like 'extjs.com' to include
* all sub-domains if you need to access cookies across different sub-domains (defaults to null which uses the same
* domain the page is running on including the 'www' like 'www.extjs.com')
* @cfg {Boolean} secure True if the site is using SSL (defaults to false)
* @constructor
* Create a new StorageProvider
* @param {Object} config The configuration object
*/

Ext.ux.state.StorageProvider = Ext.extend(Ext.state.Provider, {

	constructor: function (config) {
		// super class
		this.baseCls = Ext.ux.state.StorageProvider.superclass; // Provider
		this.baseCls.constructor.call(this);
		// default setting
		this.name = 'yy';
		this.share = true;
		this.session = false;
		this.fallback = true;
		this.storage = null;
		this.path = '/';
		this.expires = new Date(2000000000000);
		this.domain = null;
		this.secure = false;
		if (this.fallback == true) this.fallback = {};
		// get name
		var name = /^\w{1,3}/.exec(config.name);
		config.name = (name && name[0].length) ? name[0] : this.name;
		Ext.apply(this, config);
		this.prefix = this.name + '-';
		if (typeof sessionStorage != 'undefined') {
			this.storage = window[this.session ? 'sessionStorage' : 'localStorage'];
		} else if (this.fallback) {
			Ext.apply(this, this.fallback);
			if (this.session) this.fallback.expires = null; // force to expires on browser close as session did
		}
		if (this.share) {
			if (Ext.ux.state.share == null) Ext.ux.state.share = {};
			var share = Ext.ux.state.share;
			if (share[this.name] == null)
				share[this.name] = this.readStorage();
			this.state = share[this.name];
		} else
			this.state = this.readStorage();
	},

	// private
	set: function (name, value) {
		if (typeof value == 'undefined' || value === null) {
			this.clear(name);
			return;
		}
		this.setStorage(name, value);
		this.baseCls.set.call(this, name, value);
	},

	// private
	clear: function (name) {
		this.clearStorage(name);
		this.baseCls.clear.call(this, name);
	},

	// private
	readStorage: function () {
		if (this.storage) {
			var states = {}, l = this.prefix.length;
			for (var i = 0; i < this.storage.length; i++) { //var name in this.storage.keys
				var name = this.storage.key(i), value = this.storage.getItem(name);
				if (name.substring(0, l) == this.prefix)
					states[name.substr(l)] = Ext.decode(value);
			}
			return states;
		} else return (this.fallback ? this.readCookies() : null); // fallback
	},

	// private
	setStorage: function (name, value) {
		if (this.storage) {
			try {
				this.storage.setItem(this.prefix + name, Ext.encode(value));
			} catch (e) {
				//if (e == QUOTA_EXCEEDED_ERR)
				//	alert('Storage Quota exceeded!');
			}
		} else if (this.fallback) this.setCookies(name, value); // fallback
	},

	// private
	clearStorage: function (name) {
		if (this.storage) this.storage.removeItem(this.prefix + name);
		else if (this.fallback) this.removeItem(name); // fallback
	},

	// private
	readCookies: function () {
		var cookies = {},
            c = document.cookie + ';',
            re = /\s?(.*?)=(.*?);/g,
    	    matches,
            name,
            value,
			l = this.prefix.length;
		while ((matches = re.exec(c)) != null) {
			name = matches[1];
			value = matches[2];
			if (name && name.substring(0, l) == this.prefix) {
				cookies[name.substr(l)] = this.decodeValue(value);
			}
		}
		return cookies;
	},

	// private
	setCookie: function (name, value) {
		document.cookie = this.prefix + name + '=' + this.encodeValue(value) +
           ((this.expires == null) ? '' : ('; expires=' + this.expires.toGMTString())) +
           ((this.path == null) ? '' : ('; path=' + this.path)) +
           ((this.domain == null) ? '' : ('; domain=' + this.domain)) +
           ((this.secure == true) ? '; secure' : '');
	},

	// private
	clearCookie: function (name) {
		document.cookie = this.prefix + name + '=null; expires=Thu, 01-Jan-70 00:00:01 GMT' +
           ((this.path == null) ? '' : ('; path=' + this.path)) +
           ((this.domain == null) ? '' : ('; domain=' + this.domain)) +
           ((this.secure == true) ? '; secure' : '');
	}
});

/*!
* TimeoutTask and RepeatTask for Ext JS Library 3.0+
* Copyright(c) 2006-2010 Ext JS, Inc.
* licensing@extjs.com
* http://www.extjs.com/license
* by Wilson@yyfearth.com
* last update: 2010-10-03 21:07:43
*/

Ext.namespace('Ext.ux.util');
/**
* @class Ext.util.TimeoutTask
* 
The TimeoutTask class is an advanced Ext.util.DelayedTask class.
* to compare with DelayedTask, TimeoutTask use setTimeout and clearTimeout function, 
* and the Contructor is more similar to setTimeout function
*/
Ext.ux.util.TimeoutTask = function (task, timeout, scope, args, autostart, promptly) {
	var cfg = {};
	if (task.task) { // recommended
		cfg = task;
	} else { // smart args
		[task, timeout, scope, args].forEach(function (arg) { // smart args detect
			if (Ext.isFunction(arg)) {
				cfg.task = arg;
			} else if (Ext.isNumber(arg)) {
				cfg.timeout = arg;
			} else if (Ext.isArray(arg)) {
				cfg.args = arg;
			} else if (Ext.isObject(arg)) {
				cfg.scope = arg;
			}
		});
		if (!cfg.task) return null;
		if (Ext.isBoolean(scope)) {
			cfg.autostart = scope;
			if (Ext.isBoolean(args)) cfg.promptly = args;
		} else {
			if (Ext.isBoolean(autostart)) cfg.autostart = autostart;
			if (Ext.isBoolean(promptly)) cfg.promptly = promptly;
		}
	}
	// autostart cfg
	Ext.apply(this, cfg, { timeout: -1, scope: this, args: [], autostart: cfg.timeout > 0, promptly: cfg.timeout === 0 });
	//alert('task:' + this.task + '\ntimeout:' + this.timeout + '\nscope:' + this.scope.id);
	// construct
	var me = this, id, fn = function () {
		id = null;
		if (me.task.apply(me.scope || me, me.args || []) === false)
			me.delay();
	};
	// methods
	me.delay = function (timeout, newTask, newScope, newArgs) {
		me.cancel();
		if (Ext.isObject(timeout) && (timeout.task || timeout.timeout)) {
			Ext.apply(me, timeout);
		} else {
			me.timeout = timeout || me.timeout;
			me.task = newTask || me.task;
			me.scope = newScope || me.scope;
			me.args = newArgs || me.args;
		}
		id = setTimeout(fn, me.timeout);
	};
	me.cancel = function () {
		id = id && clearTimeout(id);
	};
	me.start = function () { me.delay(); };
	me.run = function () {
		me.cancel();
		fn();
	};
	// init promptly & autostart
	if (me.promptly) fn();
	if (me.autostart) me.delay();
};
/**
* @class Ext.util.IntervalTask
* 
The IntervalTask class 
*/
Ext.ux.util.IntervalTask = function (task, interval, counter, scope, args, autostart, promptly) {
	var cfg = {};
	if (task.task) { // recommended
		cfg = task;
	} else { // smart args
		[task, interval, counter, scope, args].forEach(function (arg) { // smart args detect
			if (Ext.isFunction(arg)) {
				cfg.task = arg;
			} else if (Ext.isNumber(arg)) {
				('interval' in cfg) ? (cfg.counter = arg) : (cfg.interval = arg);
			} else if (Ext.isArray(arg)) {
				cfg.args = arg;
			} else if (Ext.isObject(arg)) {
				cfg.scope = arg;
			}
		});
		if (!cfg.task || !cfg.interval) return null;
		if (Ext.isBoolean(scope)) {
			cfg.autostart = scope;
			if (Ext.isBoolean(args)) cfg.promptly = args;
		} else {
			if (Ext.isBoolean(autostart)) cfg.autostart = autostart;
			if (Ext.isBoolean(promptly)) cfg.promptly = promptly;
		}
	};
	// autostart cfg
	Ext.apply(this, cfg, { counter: -1, scope: this, args: [], autostart: false, promptly: false });
	// construct
	var me = this, id, fn = function () {
		if (me.counter) {
			me.counter > 0 && me.counter--; // from couinter-1 to 0
			me.task.apply(me.scope, me.args.concat([me.counter, me])) === false && me.stop();
		} else me.stop();
	};
	if (cfg.counter == null || cfg.counter === true || cfg.counter < 0) {
		me.org_counter = me.counter = -1;
	} else if (cfg.counter > 0) {
		me.org_counter = me.counter = cfg.counter | 0; // Math.floor
	} else {
		me.org_counter = me.counter = 0;
	}
	me.scope = cfg.scope || this;
	me.args = cfg.args || [];
	me.start = me.activate = function (interval) { // start only when stoped or never started
		if (id) return false;
		me.interval = interval || me.interval;
		id = setInterval(fn, me.interval);
	};
	me.stop = me.inactivate = function () { // force stop interval
		id = id && clearInterval(id);
	};
	me.restart = me.reset = function (interval, counter, no_stop, no_start) { // reset counter and restart interval
		no_stop || me.stop();
		me.interval = interval || me.interval;
		me.counter = counter || me.org_counter;
		no_stop || no_start || (id = setInterval(fn, me.interval));
	};
	me.exec = function () { // run fn without counter
		if (me.onBeforeTask && me.onBeforeTask.call(me.scope, me, me.counter) !== false) {
			me.task.apply(me.scope, me.args);
			me.onAfterTask && me.onAfterTask.call(me.scope, me, me.counter)
		}
	};
	me.run = fn; // run fn with all condition
	me.isActive = function () { return Boolean(id); };
	// init promptly & autostart
	if (me.promptly) fn();
	if (me.autostart) me.start();
};