/*
 * License TODO
 */

function initialize () {
	console.log("███ initializing...");
	document.addEventListener("deviceready", onDeviceReady, false);
}

function onDeviceReady () {
	document.addEventListener("menubutton", onMenuKeyDown, false);
	// Initialize vocable trainer
	vtrainer.initialize(function () {
		$("#select_mode").val(vtrainer.getSetting(vtrainer.SETTINGS.MODE));
		// uncomment this if this page is the first shown $("#select_mode").selectmenu("refresh");
		$("#select_font").val(vtrainer.getSetting(vtrainer.SETTINGS.FONTSIZE));
		// uncomment this if this page is the first shown $("#select_font").selectmenu("refresh");
		$("#tts_server").val(vtrainer.getSetting(vtrainer.SETTINGS.TTS));
		// set font size
		$(document.body).css({'font-size': 100 * vtrainer.getSetting(vtrainer.SETTINGS.FONTSIZE) + '%'});
		// fill table containing checked files
		fillTable();
		// show page (hide the loading screen)
		window.open('#page_main_settings','_self');
	});
}

function fillTable(entries) {
	vtrainer.getDir("vocabulary", function(vocabDir) {
		var directoryReader = vocabDir.createReader();
		// Get a list of all the entries in the directory
		directoryReader.readEntries(function(entries) {
			var oPresentFiles = {}; // used to check if the file is still present
			var oFiles = vtrainer.getFileSelections();
			// scan the vocabulary dir and add all files if unknown
			for (var i = 0; i < entries.length; i++) {
				oPresentFiles[entries[i].nativeURL] = true;
				if (!entries[i].nativeURL in oFiles) {
					// save file settings if we found a new one
					vtrainer.setFile(
						entries[i].nativeURL, false,
						"<vocabulary>/" + entries[i].name
					);
					oFiles = vtrainer.getFileSelections();
				}
			}
			// create list of checkboxes with labels
			var chckblist = document.createElement("fieldset");
			$(chckblist).data("role", "controlgroup");
			var legend = document.createElement("legend");
			$(legend).append("Files:");
			$(chckblist).append(legend);
			// fill list
			for (var sURL in oFiles) {
				// TODO: dont display files here which are not present
				if (!(sURL in oPresentFiles) && sURL.indexOf("TODO") != -1)
					continue;
				// selection checkbox
				var chckb = document.createElement("input");
				chckb.type = "checkbox";
				chckb.name = sURL;
				chckb.checked = oFiles[sURL].checked;
				chckb.onclick = function (event) {
					vtrainer.setFileSelection(event.target.name, event.target.checked)
				}
				// label
				var label = document.createElement("label");
				var sLabel = oFiles[sURL].name;
				if (sLabel == "")
					sLabel = sURL.substring(sURL.lastIndexOf('/') + 1);
				// bind longpress event to this row -> showEdit()
				$(label).data("url", sURL);
				$(label).bind("taphold", showEdit);
				// append to list
				$(label).append(chckb, sLabel);
				$(chckblist).append(label);
			}
			// replace div's html and trigger jquery styling
			$("#divDataFiles").html(chckblist);
			$(chckblist).trigger("create");
		}, vtrainer.onFail);
	});
}

function showEdit(event) {
	var oFiles = vtrainer.getFileSelections();
	document.getElementById("ef_url").value = $(this).data("url");
	document.getElementById("ef_name").value = oFiles[$(this).data("url")].name;
	window.open("#page_edit_file","_self");
}

// open panel on menu key
function onMenuKeyDown () {
	$("#panel_menu").panel("toggle");
}
