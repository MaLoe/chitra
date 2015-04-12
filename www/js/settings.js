/*
 * License TODO
 */

function initialize () {
	console.log("███ initializing...");
	document.addEventListener("deviceready", onDeviceReady, false);
}

function onDeviceReady () {
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
				// fill table
				var table = document.createElement("table");
				table.style.width = "100%";

				var tbdy = document.createElement("tbody");

				for (var sURL in oFiles) {
					// TODO: dont display files here which are not present
					if (!(sURL in oPresentFiles) && sURL.indexOf("TODO") != -1)
						continue;

					var tr = document.createElement("tr");
					// selection checkbox
					var td_chck = document.createElement("td");
					var chckb = document.createElement("input");
					chckb.type = "checkbox";
					chckb.value = sURL;
					chckb.checked = oFiles[sURL].checked;
					chckb.onclick = function (event) {
						vtrainer.setFileSelection(event.target.value, event.target.checked)
					}
					td_chck.appendChild(chckb);
					td_chck.width = "100";
					tr.appendChild(td_chck);
					// filename column
					var td_filename = document.createElement("td");
					var name = oFiles[sURL].name;
					if (name == "")
						name = sURL.substring(sURL.lastIndexOf('/') + 1);
					td_filename.appendChild(document.createTextNode(name));
					tr.appendChild(td_filename);
					// edit button TODO: this is only temporary, this should be done by a press&hold
					// mousedown -> timer setzen -> bei mouseup timer canceln, nach timer -> editshow
					// -> auf die row betreffend, bzw touchstart&touchend
					var td_edit = document.createElement("td");
					td_edit.style.textAlign = "right";
					var editb = document.createElement("input");
					editb.type = "button";
					editb.name = sURL;
					editb.value = "E"; // TODO icon & delete button
					editb.onclick = function (event) { showEdit(event.target.name) }
					td_edit.appendChild(editb);
					td_edit.width = "100";
					tr.appendChild(td_edit);
					// append row
					tbdy.appendChild(tr);
				}
				table.appendChild(tbdy);
				document.getElementById("divDataFiles").innerHTML = "";
				document.getElementById("divDataFiles").appendChild(table);
			}, onFail);
		}, onFail);
	}, onFail);
}

function showEdit(sURL) {
	var oFiles = vtrainer.getFileSelections();
	document.getElementById("ef_url").value = sURL;
	document.getElementById("ef_name").value = oFiles[sURL].name;
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
