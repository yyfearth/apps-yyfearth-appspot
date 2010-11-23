window.BLANK_IMG = 'images/blank.gif'; // bank img for ie6 png
//var user_priv={root:{
//	"welcome": true,
//	"customer": true,
//	"pcustomer": true,
//	"sale": false
//}};
$.fx.off = false; // true to turn off all animation

$(function () {

	function load_nav_sidebar() {
		if (typeof user_priv != 'undefined') {
			//alert(JSON.stringify(user_priv))
			$('#nav').nav({
				data: nav_data,
				priv: user_priv,
				target: 'ifr_content',
				change: function (nav, ui) {
					if (ui.navaddr.length)
						$('#nav_addr').text(ui.navaddr.join(' > '));
				}
			});
		} else alert('load priv data failed!');
	}

	load_nav_sidebar();

	var ifr_content = $('#ifr_content');
	// nav ifr address
	ifr_content.load(function () {
		var href;
		try {
			href = (document.frames ? ifr_content[0].Document : ifr_content[0].contentDocument).location.href;
			ifr_content.data('href', href);
		} catch (e) {
			href = ifr_content[0].src;
		}
		$('#nav_addr_txt').val(href);
	});
	$('#nav_addr_widget').click(function () {
		$txt = $('#nav_addr_txt');
		if ($txt.css('display') != 'none') return false;
		$('#nav_addr').hide();
		$txt.show().focus().select();
	})
	$('#nav_addr_txt').blur(function () {
		$(this).hide();
		$('#nav_addr').show();
	}).keypress(function (e) { // not put into keydown (ie cannot evoke in keydown)
		if (e.keyCode == 13) { // enter
			$(this).hide();
			$('#nav_addr').show();
			if (ifr_content.data('href') != this.value) {
				$('#nav_addr').text(this.value);
				ifr_content.attr('src', this.value).focus();
			} else return false;
		} else if (e.keyCode == 27) // esc
			$(this).blur();
	}).keydown(function (e) { // not put into keypress (webkit cannot evoke esc in keypress)
		if (e.keyCode == 27) // esc
			$(this).blur();
	}).hide();
	
	// auto adjust height
	$(window).resize(function () {
		$('#nav,#container').height($(window).height() - $('#header').height() - 10);
		$('#ifr_content').height($('#container').height() - $('#nav_addr_widget').height() - 10);
	}).resize();
	
	// hide header
	$('#header').dblclick(function () {
		$(this).toggleClass('shrink', 300, function () {
			$(window).resize();
		});
		(document.selection || document.getSelection()).empty();
	});
	
	$('#nav_addr_widget').show();
});