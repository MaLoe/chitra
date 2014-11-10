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
		fillTable();
	});
}

function setFileSelection(sUrl, bChecked) {
	// get files array
	var aFiles = JSON.parse(localStorage.getItem("files"));
	// set new value
	var i = 0;
	while (i < aFiles.length) {
		if (aFiles[i].url == sUrl) {
			break;
		}
		i++;
	}
	if (aFiles.length == i) {
		// there are no settings for this url
		aFiles[i] = {
			url : sUrl,
			name : ""
		};
	}
	aFiles[i].checked = bChecked;
	// save files array
	localStorage.setItem("files", JSON.stringify(aFiles));
}

function fillTable(entries) {
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
		fileSystem.root.getDirectory("vocabulary", {create: true, exclusive: false}, function(directoryEntry) {
			var directoryReader = directoryEntry.createReader();
			// Get a list of all the entries in the directory
			directoryReader.readEntries(function(entries) {
				var aFiles = JSON.parse(localStorage.getItem("files"));
				// scan the vocabulary dir and add all files if unknown
				for (var i = 0; i < entries.length; i++) {
					var found = false;
					for (var j = 0; j < aFiles.length && !found; j++) {
						if (aFiles[j].url == entries[i].nativeURL)
							found = true;
					}
					if (!found) {
						var newFile = {
							url : entries[i].nativeURL,
							checked : false,
							name : "<vocabulary>/" + entries[i].name
						};
						aFiles.push(newFile);
					}
				}
				// fill table
				var table = document.createElement("table");
				table.style.width = "100%";

				var tbdy = document.createElement("tbody");

				for (var i = 0; i < aFiles.length; i++) {
					var tr = document.createElement("tr");
					// selection checkbox
					var td_chck = document.createElement("td");
					var chckb = document.createElement("input");
					chckb.type = "checkbox";
					chckb.value = aFiles[i].url;
					chckb.checked = aFiles[i].checked;
					chckb.onclick = function (event) { setFileSelection(event.target.value, event.target.checked) }
					td_chck.appendChild(chckb);
					td_chck.width = "100";
					tr.appendChild(td_chck);
					// filename column
					var td_filename = document.createElement("td");
					var name = aFiles[i].name;
					if (name == "")
						name = aFiles[i].url.substring(aFiles[i].url.lastIndexOf('/') + 1);
					td_filename.appendChild(document.createTextNode(name));
					tr.appendChild(td_filename);
					// edit button TODO: this is only temporary, this should be done by a press&hold
					// mousedown -> timer setzen -> bei mouseup timer canceln, nach timer -> editshow
					// -> auf die row betreffend, bzw touchstart&touchend
					var td_edit = document.createElement("td");
					td_edit.style.textAlign = "right";
					var editb = document.createElement("input");
					editb.type = "button";
					editb.name = aFiles[i].url;
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

function showEdit(sFileID) {
	window.open("#page_edit_file","_self");
}

function addFile(url, name, checked) {
	console.log("███ adding file: " + JSON.stringify({url : url, checked : Boolean(checked), name : name}));
	var aFiles = JSON.parse(localStorage.getItem("files"));
	aFiles.push({
		url : url,
		checked : Boolean(checked),
		name : name
	});
	localStorage.setItem("files", JSON.stringify(aFiles));
}

function resetData() {
	// clear local storage
	localStorage.removeItem("files");
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
