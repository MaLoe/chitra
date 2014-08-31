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
	vtrainer.initialize();
	// Display the loaded vocabulary
	displayLoadedVocabulary();
}

// Display the loaded vocabulary
function displayLoadedVocabulary () {
	var aData = vtrainer.getLoadedVocables();
	// Get the table and add a list of loaded vocables
	var tableref = document.getElementById("t_loaded_elements");
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

// Switch to settings on menu key
function onMenuKeyDown () {
	window.open("settings.html", "_self");
}
