// Function for fetching JSON from the REST API
function getJSON(theUrl, xstate, callback) {
	var xmlHttp = null;
	if (window.XMLHttpRequest) {
		xmlHttp = new XMLHttpRequest();
	} else {
		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
	}
	xmlHttp.open("GET", theUrl, true);
	xmlHttp.send(null);
	xmlHttp.onreadystatechange = function(state) {
		if (xmlHttp.readyState == 4 && xmlHttp.status && xmlHttp.status >= 200) {
			if (callback) {
				window.setTimeout(callback, 0.01, xmlHttp.status, (xmlHttp.responseText && xmlHttp.responseText.length > 1) ? JSON.parse(xmlHttp.responseText) : null, xstate);
			}
		}
	}
}


// Posting to the REST API, returns http code + JSON response
function postREST(url, json, oform, callback, xstate) {
    var form = new FormData(oform)
    var xmlHttp = null;
    if (window.XMLHttpRequest) {
	xmlHttp = new XMLHttpRequest();
    } else {
	xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    for (i in json) {
		if (json[i]) form.append(i, json[i])
    }
    
	var response = null
	var code = 500
	xmlHttp.onreadystatechange = function(state) {
		if (xmlHttp.readyState == 4 && xmlHttp.status && xmlHttp.status >= 200) {
			code = xmlHttp.status
			response = (xmlHttp.responseText && xmlHttp.responseText.length > 1) ? JSON.parse(xmlHttp.responseText) : null
			callback(code, response, xstate)
		}
	}
	xmlHttp.open("POST", url, false);
    xmlHttp.send(form);
}




// Election creation callback
function createElectionCallback(code, response) {
	if (code != 201) {
		alert(response.message)
	} else {
		location.href = "/edit_election.html?" + response.id
	}
}

// Create a new election
function createElection() {
	
	// Fetch data
	var eid = document.getElementById('eid').value;
	var title = document.getElementById('title').value
	var starts = document.getElementById('starts').value
	var ends = document.getElementById('ends').value
	var owner = document.getElementById('owner').value
	var monitors = document.getElementById('monitors').value
	
	
	
	// Validate data
	if (!eid || eid.length == 0) {
		eid = parseInt(Math.random()*987654321).toString(16).toLowerCase()
	}
	if (starts && starts.length == 0 | parseInt(starts) == 0) starts = null;
	if (ends && ends.length == 0 | parseInt(ends) == 0) ends = null;
	if (ends) {
		ends = parseInt($.datepicker.parseDate( "yy-mm-dd", ends).getTime()/1000)
	}
	if (starts) {
		starts = parseInt($.datepicker.parseDate( "yy-mm-dd", starts).getTime()/1000)
	}
	
	// Send request
	var code, response = postREST("/steve/admin/setup/" + eid, {
		owner: owner,
		title: title,
		monitors: monitors,
		starts: starts,
		ends: ends
		},
		undefined,
		createElectionCallback)	
}


// Election editing
function renderEditElection(code, response, election) {
	if (code == 200) {
		document.getElementById('title').innerHTML = "Edit election: " + response.base_data.title + " (#" + election  + ")"
		document.getElementById('iid').value = parseInt(Math.random()*987654321).toString(16).toLowerCase();
		
		var obj = document.getElementById('ballot')
		obj.innerHTML = "There are no issues in this election yet"
		var s = 0;
		if (response.issues && response.issues.length > 0) {
			obj.innerHTML = "";
		}
		for (i in response.issues) {
			var issue = response.issues[i]
			s++;
			var outer = document.createElement('li');
			// Set style
			outer.setAttribute("class", "issueListItem")
			
			var no = document.createElement('div');
			no.setAttribute("class", "issueNumber")
			no.innerHTML = (s)
			
			// Add issue
			var inner = document.createElement('span')
			inner.innerHTML = issue.id + ": " + issue.title;
			outer.appendChild(no)
			outer.appendChild(inner)
			outer.setAttribute("onclick", "location.href='edit_issue.html?" + election + "/" + issue.id + "';")
			obj.appendChild(outer)
		}
	} else {
		alert("Could not load election data: " + response.message)
	}
}

function loadElectionData(election) {
	election = election ? election : document.location.search.substr(1);
	getJSON("/steve/voter/view/" + election, election, renderEditElection)
}

function changeSTVType(type) {
	if (type == "yna") {
		document.getElementById('yna').style.display = "block";
		document.getElementById('stv').style.display = "none";
	} else {
		document.getElementById('yna').style.display = "none";
		document.getElementById('stv').style.display = "block";
	}
}

function createIssueCallback(code, response, state) {
	if (code == 201) {
		location.href = "/edit_issue.html?" + state.election + "/" + state.issue;
	} else {
		alert(response.message)
	}
}

function createIssue(election) {
	election = election ? election : document.location.search.substr(1);
	var iid = document.getElementById('iid').value;
	var type = document.getElementById('type').value;
	var title = document.getElementById('ititle').value;
	var description = document.getElementById('description').value;
	
	if (!iid || iid.length == 0) {
		iid = parseInt(Math.random()*987654321).toString(16).toLowerCase()
	}
	
	postREST("/steve/admin/create/" + election + "/" + iid, {
		type: type,
		title: title,
		description: description
	}, undefined, createIssueCallback, { election: election, issue: iid})
}


var step = 0;
var election_data = null
function loadElection(election, uid) {
	
	var messages = ["Herding cats...", "Shaving yaks...", "Shooing some cows away...", "Fetching election data...", "Loading issues..."]
	if (!election || !uid) {
		var l = document.location.search.substr(1).split("/");
		election = l[0];
		uid = l[1] ? l[1] : "";
	}
	if (step == 0) {
		getJSON("/steve/voter/view/" + election + "?uid=" + uid, [election,uid], displayElection)
	}
	
	var obj = document.getElementById('preloader');
	step++;
	if (!election_data && obj) {
		if (step % 2 == 1) obj.innerHTML = messages[parseInt(Math.random()*messages.length-0.01)]
	} else if (obj && (step % 2 == 1)) {
		obj.innerHTML = "Ready..!"
	}
	if (step % 2 == 1) {
		obj.style.transform = "translate(0,0)"
	} else {
		obj.style.transform = "translate(0,-500%)"
	}
	if (!election_data|| (step % 2 == 0) ) {
		window.setTimeout(loadElection, 750);
	}
}

function displayElection(code, response, el) {
	election_data = response
	if (code == 200) {
		window.setTimeout(renderElectionFrontpage, 2000, response, el);
	} else {
		document.getElementById('preloaderWrapper').innerHTML = "<h1>Sorry, an error occured while fetching election data:</h1><h2>" + response.message + "</h2>"
	}
}

function renderElectionFrontpage(response, el) {
	var par = document.getElementById('preloaderWrapper')
	par.innerHTML = "";
	
	var title = document.createElement('h1');
	title.innerHTML = response.base_data.title;
	par.appendChild(title);
	
	var issueList = document.createElement('ol');
	issueList.setAttribute("class", "issueList")
	
	var s = 0;
	for (i in response.issues) {
		var issue = response.issues[i]
		s++;
		var outer = document.createElement('li');
		// Set style
		outer.setAttribute("class", "issueListItem")
		
		var no = document.createElement('div');
		no.setAttribute("class", "issueNumber")
		no.innerHTML = (s)
		
		// Add issue
		var inner = document.createElement('span')
		inner.innerHTML = issue.id + ": " + issue.title;
		outer.appendChild(no)
		outer.appendChild(inner)
		outer.setAttribute("onclick", "location.href='ballot_" + (issue.type == "yna" ? "yna" : "stv") + ".html?" + el[0] + "/" + issue.id + "/" + (el[1] ? el[1] : "") + "';")
		outer.style.animation = "fadein " + (0.5 +  (s/6)) + "s"
		issueList.appendChild(outer)
	}
	par.appendChild(issueList)
}