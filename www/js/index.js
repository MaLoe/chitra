/*
 * License TODO
 */

function initialize () {
    // Bind any events that are required on startup. Common events are:
	document.addEventListener("deviceready", onDeviceReady, false);
}

// deviceready Event Handler
function onDeviceReady () {
	document.addEventListener("menubutton", onMenuKeyDown, false);
	// Initialize vocable trainer
	vtrainer.initialize(function () {
		// set font size
		$(document.body).css({'font-size': 100 * vtrainer.getSetting(vtrainer.SETTINGS.FONTSIZE) + '%'});
		// enable next button after vtrainer initialized
		document.getElementById("next_b").disabled = false;
		// show page (hide the loading screen)
		window.open('#page_trainer','_self');
	});
}

function toggleFav () {
	var vocable = document.getElementById("content_vocable").innerHTML;
	if(vtrainer.toggleFav(vocable)) {
		// the current vocable was set to favorite
		document.getElementById("fav_b").style.backgroundImage = "url('img/star_fav.png')";
	}
	else {
		// the current vocable was unfavored
		document.getElementById("fav_b").style.backgroundImage = "url('img/star_nofav.png')";
	}
}

function show () {
	vtrainer.show();
	// show current element
	document.getElementById("content_vocable").style.visibility = "visible";
	document.getElementById("content_pronunciation").style.visibility = "visible";
	document.getElementById("content_translation").style.visibility = "visible";
	document.getElementById("content_comment").style.visibility = "visible";
}

function next () {
	// enable buttons
	document.getElementById("fav_b").disabled = false;
	document.getElementById("show_b").disabled = false;
	document.getElementById("audio_b").disabled = false;
	// hide everything
	document.getElementById("content_vocable").style.visibility = "hidden";
	document.getElementById("content_pronunciation").style.visibility = "hidden";
	document.getElementById("content_translation").style.visibility = "hidden";
	document.getElementById("content_comment").style.visibility = "hidden";

	// get a new (different than current) element
	vtrainer.next();
	
	// update favorite button
	if(vtrainer.isFavorite(vtrainer.getCurrentVocable()))
		document.getElementById("fav_b").style.backgroundImage = "url('img/star_fav.png')";
	else
		document.getElementById("fav_b").style.backgroundImage = "url('img/star_nofav.png')";

	// update data
	document.getElementById("content_vocable").innerHTML = vtrainer.getCurrentVocable();
	document.getElementById("content_pronunciation").innerHTML = vtrainer.getCurrentPronunciation();
	document.getElementById("content_translation").innerHTML = vtrainer.getCurrentTranslation();
	document.getElementById("content_comment").innerHTML = vtrainer.getCurrentComment();
	// show stuff according to current mode
	switch(vtrainer.getSetting(vtrainer.SETTINGS.MODE)) {
		case vtrainer.MODES.TRANSLATION:
			document.getElementById("content_translation").style.visibility = "visible";
			document.getElementById("content_comment").style.visibility = "visible";
			break;
		case vtrainer.MODES.AUDIO:
			vtrainer.playAudio();
			break;
		default:
			document.getElementById("content_vocable").style.visibility = "visible";
	}
}

function playAudio () {
	vtrainer.playAudio();
}

// open panel on menu key
function onMenuKeyDown () {
	$("#panel_menu").panel("toggle");
}
