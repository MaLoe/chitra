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
		// Display the loaded vocabulary
		displayLoadedVocabulary("t_loaded_elements");
		displaySettings("t_current_settings");
	});
}

// Display the loaded vocabulary
function displayLoadedVocabulary (id) {
	var aData = vtrainer.getLoadedVocables();
	// Get the table and add a list of loaded vocables
	var tableref = document.getElementById(id);
	var tbdy = document.createElement("tbody");
    for (i = 0; i < aData.length; i++) {
		var tr = document.createElement("tr");
		// Create table cells
		var td_pronunciation = document.createElement("td");
		var td_translation = document.createElement("td");
		var td_comment = document.createElement("td");
		var td_vocable = document.createElement("td");
		var td_occurrences = document.createElement("td");
		var td_shown = document.createElement("td");
		// Fill the cells
		td_vocable.appendChild(document.createTextNode(aData[i].vocable));
		td_translation.appendChild(document.createTextNode(aData[i].translation));
		td_pronunciation.appendChild(document.createTextNode(aData[i].pronunciation));
		td_comment.appendChild(document.createTextNode(aData[i].comment));
		td_occurrences.appendChild(document.createTextNode(aData[i].occurrences));
		td_shown.appendChild(document.createTextNode(aData[i].shown));
		// Create a favorite checkbox
		var td_chck = document.createElement("td");
		var chckb = document.createElement("input");
		chckb.type = "checkbox";
		chckb.value = aData[i].vocable;
		chckb.checked = aData[i].favorite;
		chckb.onclick = function (event) { vtrainer.toggleFavorite(event.target.value) }
		td_chck.appendChild(chckb);
		// Append cells to new row
		tr.appendChild(td_vocable);
		tr.appendChild(td_pronunciation);
		tr.appendChild(td_translation);
		tr.appendChild(td_comment);
		tr.appendChild(td_shown);
		tr.appendChild(td_occurrences);
		tr.appendChild(td_chck);
		// Append new row
		tbdy.appendChild(tr);
    }
	tableref.appendChild(tbdy);
}

function displaySettings (id) {
	var taleref = document.getElementById(id);
	var files = localStorage.getItem("files");

	var tableref = document.getElementById(id);
	var tbdy = document.createElement("tbody");
	var tr = document.createElement("tr");

	var td_s_key = document.createElement("td");
	var td_s_val = document.createElement("td");

	td_s_key.appendChild(document.createTextNode("files"));
	td_s_val.appendChild(document.createTextNode(files));

	tr.appendChild(td_s_key);
	tr.appendChild(td_s_val);

	tbdy.appendChild(tr);
	tableref.appendChild(tbdy);
}

// Switch to settings on menu key
function onMenuKeyDown () {
	window.open("settings.html", "_self");
}
