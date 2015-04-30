/*
 * License TODO
 */

function initialize () {
    // Bind any events that are required on startup. Common events are:
	document.addEventListener("deviceready", onDeviceReady, false);
}

// Deviceready Event Handler
function onDeviceReady () {
	document.addEventListener("menubutton", onMenuKeyDown, false);
	// Initialize vocable trainer
	vtrainer.initialize(function () {
		// set font size
		$(document.body).css({'font-size': 100 * vtrainer.getSetting(vtrainer.SETTINGS.FONTSIZE) + '%'});
		// Display the loaded vocabulary
		displayLoadedVocabulary("t_loaded_elements");
		displaySettings("t_current_settings");
	});
}

// Display the loaded vocabulary
function displayLoadedVocabulary (id) {
	var oData = vtrainer.getLoadedVocables();
	var oFavs = vtrainer.getFavorites();
	// Get the table and add a list of loaded vocables
	var tableref = document.getElementById(id);
	var tbdy = document.createElement("tbody");
	for (var sFileKey in oData) {
		if (oData.hasOwnProperty(sFileKey)) {
			// create header row for file
			// TODO: make a folding based on header rows
			var tr_file = document.createElement("tr");
			tr_file.className = "ui-li-divider";
			var td_file = document.createElement("td");
			td_file.appendChild(document.createTextNode(sFileKey));
			td_file.colSpan = 7;
			tr_file.appendChild(td_file);
			tbdy.appendChild(tr_file);
			// append all elements of this file
			for (var i = 0; i < oData[sFileKey].length; i++) {
				var tr = document.createElement("tr");
				// Create table cells
				var td_pronunciation = document.createElement("td");
				var td_translation = document.createElement("td");
				var td_comment = document.createElement("td");
				var td_vocable = document.createElement("td");
				var td_occurrences = document.createElement("td");
				var td_shown = document.createElement("td");
				// Fill the cells
				td_vocable.appendChild(document.createTextNode(oData[sFileKey][i].vocable));
				td_translation.appendChild(document.createTextNode(oData[sFileKey][i].translation));
				td_pronunciation.appendChild(document.createTextNode(oData[sFileKey][i].pronunciation));
				td_comment.appendChild(document.createTextNode(oData[sFileKey][i].comment));
				td_occurrences.appendChild(document.createTextNode(oData[sFileKey][i].occurrences));
				td_shown.appendChild(document.createTextNode(oData[sFileKey][i].shown));
				// Create a favorite checkbox
				var td_chck = document.createElement("td");
				var chckb = document.createElement("input");
				chckb.type = "checkbox";
				chckb.value = oData[sFileKey][i].vocable;
				chckb.checked = (oData[sFileKey][i].vocable in oFavs);
				chckb.onclick = function (event) { vtrainer.toggleFav(event.target.value) }
				td_chck.appendChild(chckb);
				// Append cells to new row
				tr.appendChild(td_vocable);
				tr.appendChild(td_pronunciation);
				tr.appendChild(td_translation);
				tr.appendChild(td_comment);
				tr.appendChild(td_occurrences);
				tr.appendChild(td_shown);
				tr.appendChild(td_chck);
				// Append new row
				tbdy.appendChild(tr);
			}
		}
	}
	tableref.appendChild(tbdy);
	$(tableref).trigger("create");
}

function displaySettings (id) {
	oContent = {
		files: JSON.stringify(vtrainer.getFileSelections(), null, "  "),
		TTS: vtrainer.getSetting(vtrainer.SETTINGS.TTS),
		mode: vtrainer.getSetting(vtrainer.SETTINGS.MODE),
		fontsize: vtrainer.getSetting(vtrainer.SETTINGS.FONTSIZE)
	};

	var tableref = document.getElementById(id);
	var tbdy = document.createElement("tbody");

	for (var setting in oContent) {
		if (oContent.hasOwnProperty(setting)) {
			var tr = document.createElement("tr");

			var td_s_key = document.createElement("td");
			var td_s_val = document.createElement("td");
			var content = document.createElement("pre");
			content.innerText = oContent[setting];

			td_s_key.appendChild(document.createTextNode(setting));
			td_s_val.appendChild(content);

			tr.appendChild(td_s_key);
			tr.appendChild(td_s_val);

			tbdy.appendChild(tr);
		}
	}
	tableref.appendChild(tbdy);
}

// open panel on menu key
function onMenuKeyDown () {
	$("#panel_menu").panel("toggle");
}
