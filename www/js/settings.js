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
		document.getElementById("select_mode").value = vtrainer.getMode();
		document.getElementById("tts_server").value = vtrainer.getTTSServerURL();
		fillTable();
	});
}

function fillTable(entries) {
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
		fileSystem.root.getDirectory("vocabulary", {create: true, exclusive: false}, function(directoryEntry) {
			var directoryReader = directoryEntry.createReader();
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
			}, onFail);
		}, onFail);
	}, onFail);
}

function showEdit(event) {
	var oFiles = vtrainer.getFileSelections();
	document.getElementById("ef_url").value = $(this).data("url");
	document.getElementById("ef_name").value = oFiles[$(this).data("url")].name;
	window.open("#page_edit_file","_self");
}

function addFile(url, name, checked) {
	vtrainer.setFile(url, checked, name);
}

function resetData() {
	// clear local storage
	localStorage.removeItem("settings");
	localStorage.removeItem("data");
	localStorage.removeItem("favs");
	// clear cache
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
		fileSystem.root.getDirectory("cache", {create: false, exclusive: false}, function(directoryEntry) {
			directoryEntry.removeRecursively(function(){}, onFail);
		}, onFail);
	}, onFail);
	// reload vtrainer
	location.reload();
}

// open panel on menu key
function onMenuKeyDown () {
	$("#panel_menu").panel("toggle");
}

function onFail(error, msg) {
	if (!msg)
		msg = "Error" + JSON.stringify(error);
	msg = "█!█ " + msg;

	if (navigator.notification)
		navigator.notification.alert(msg, null, Error, 'OK');
	else
		alert(msg);
	/*console.log("███ fail :(");
	//alert("Failed while reading data files: " + error.code);
	var tableref = document.getElementById("tDataFiles");
	var tbdy = document.createElement("tbody");
	var tr = document.createElement("tr");
	var td = document.createElement("td");
	td.appendChild(document.createTextNode("Failed while reading data files: " + error.code));
	tr.appendChild(td);
	tbdy.appendChild(tr);
	tableref.appendChild(tbdy);*/
}
