/* Common JS */
$(document).ready(function(){

	//validate
	$.validate({
		validateOnBlur : true,
		showHelpOnFocus : false,
		addSuggestions : false,
		scrollToTopOnError: false,
		borderColorOnError : '#c10000'
	});

	(function(){
		var phoneInput = $(".js-phone-mask");

		phoneInput.mask("+9(999)999-99-99");

		//SET CURSOR POSITION
		$.fn.setCursorPosition = function(pos) {
			console.log('init');
			this.each(function(index, elem) {
				if (elem.setSelectionRange) {
					elem.setSelectionRange(pos, pos);
				} else if (elem.createTextRange) {
					var range = elem.createTextRange();
					range.collapse(true);
					range.moveEnd('character', pos);
					range.moveStart('character', pos);
					range.select();
				}
			});
			return this;
		}

		phoneInput.on('focus', function(){
			var _this = $(this);
			console.log('focus');

			setTimeout(function() {
				console.log('timeout');
				_this.setCursorPosition(1);
			},100);
		});
	})();

	// Clear placeholder
	// (function() {
	// 	var el = $('input, textarea');
	// 	el.focus(function(){
	// 		$(this).data('placeholder',$(this).attr('placeholder'));
	// 		$(this).attr('placeholder','');
	// 	});
	// 	el.blur(function(){
	// 		$(this).attr('placeholder',$(this).data('placeholder'));
	// 	});
	// }());

   //slow scroll
   $('.js-btn').click(function(){
      $('html, body').animate({scrollTop:$('#subs-form').position().top}, 1200);
      return false;
   });

   // Ajax Form
	(function () {
		var subForm = $('.js-form'),
			helpForm = $('.js-form-success'),
			closeBtn = $('.js-form-success-close');

		subForm.submit(function (e) {
			e.preventDefault();
			var post_data = subForm.serialize();

			console.log(post_data);

			// Ajax post data to server
			$.post('send.php', post_data, function(response){
				if (response.type == 'error'){
					// your code here
				} else {
					// your code here
					helpForm.fadeIn();
					setTimeout(function () {
						helpForm.fadeOut();
						subForm.trigger('reset');
					},5000);
				}
			}, 'json');
		});

		closeBtn.on('click', function () {
			$(this).closest(helpForm).fadeOut();
		});

	})();

});