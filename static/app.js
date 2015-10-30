/*
 * The MIT License (MIT)
 * 
 * Copyright (c) 2010-2015 Carnegie Mellon University
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

function getGroupName() {
	return gapi.hangout.getHangoutId();
}

function getAttemptName() {
	var count = gapi.hangout.data.getState()['count'];
	if (count) {
		return count.toString();
	} else {
		return "";
	}
}

function isExchangeActive() {
	var exchanging = gapi.hangout.data.getState()['exchanging'];
	if (exchanging == "0") {
		return false;
	} else {
		return true;
	}
}

function addAttempt() {
	// don't set local state, allow shared object callback to reset us
	var value = 0;
	count = gapi.hangout.data.getState()['count'];
	if (count) {
		value = parseInt(count);
	}
	console.log('New count is ' + value);
	gapi.hangout.data.submitDelta({
		'count' : '' + (value + 1)
	});
}

function setExchangeActive(isActive) {
	// set local state as well, so we do not re-call begin exchange
	self.exchanging = (isActive ? "1" : "0");
	console.log('Exchange activity is ' + isActive);
	gapi.hangout.data.submitDelta({
		'exchanging' : '' + (isActive ? "1" : "0")
	});
}

function getNumUsers() {
	return gapi.hangout.getParticipants().length;
}

function resetButtonClick() {
	// this should reset the entire state, and not touch count
	initIncrementalState();
}

function setInnerHtml(elementId, text) {
	document.getElementById(elementId).innerHTML = text;
}

function setValue(elementId, text) {
	document.getElementById(elementId).value = text;
}

function setVisibility(elementId, visible) {
	if (visible) {
		document.getElementById(elementId).style.visibility = 'visible';
	} else {
		document.getElementById(elementId).style.visibility = 'hidden';
	}
}

function setChecked(elementId, checked) {
	document.getElementById(elementId).checked = checked;
}

function updateParticipantsUi(participants) {
	console.log('Participants count: ' + participants.length);
	setInnerHtml('participants', participants.length.toString());
}

function serverSubmitButtonClick() {
	console.log('Click serverSubmitButtonClick');

	// main video: Never speak the SECRET out loud or display on video.
	// main video: It is safe to speak your word phrases to release the SECRET.
	// side bar: Type or paste your SECRET here. (edit box)
	// side bar: SEND TO THIS HANGOUT. (button)
	// side bar: Speak or sign any of the following words to find a match. This
	// ensures no one but the participants in this Hangout can receive the
	// SECRET. (text)
	// side bar: word word word (radio 1, non-cut-paste)
	// side bar: word word word (radio 2, non-cut-paste)
	// side bar: word word word (radio 3, non-cut-paste)
	// side bar: Match Selected (button)
	// side bar: No Match (button)
	// side bar: Secret sent by User1, SHHHHHH!!!!! Just read it, don’t speak.
	// (text, able to cut-paste)
	// side bar: Secret will expire in 0:30 seconds from view (text, auto reset)
	// side bar: RESET NOW (button)

	var numUsers = getNumUsers();

	// prevent single users from launching exchange
	if (numUsers < 2) {
		return false;
	}

	// button click requires secret, others do not need
	var secret = document.getElementById("secret-input").value;
	console.log("secret: " + secret);
	if (secret == null || secret == "") {
		return false;
	}

	// trigger hangouts state object to start exchange
	setExchangeActive(true);

	beginExchange(getGroupName(), getAttemptName(), numUsers, secret);
}

function beginExchange(unique_group_name, attempt_name, numUsers, secret) {

	setVisibility('secret-div', ((secret == null || secret == "") ? false
			: true));

	console.log("unique_group_name --> " + unique_group_name);
	console.log("attempt_name --> " + attempt_name);
	console.log("numUsers --> " + numUsers);

	self.secret = secret;

	var ssExchange = new SafeSlinger.SafeSlingerExchange(
			"https://01060000t-dot-slinger-dev.appspot.com");
	self.ssExchange = ssExchange;
	self.ssExchange.numUsers = numUsers;
	console.log("numUsers: " + self.ssExchange.numUsers);

	var grpname = unique_group_name + attempt_name;
	if (grpname == null || grpname == "") {
		return false;
	}
	self.lowNum = parseInt(CryptoJS.enc.Hex.stringify(CryptoJS.SHA3(grpname))
			.substring(0, 8), 16);
	console.log("lowNum: " + self.lowNum);

	self.ssExchange.beginExchange(self.secret);
	self.ssExchange.assignUserRequest(function(response) {
		console.log(response);
		var userID = self.ssExchange.assignUser(response);

		self.ssExchange.syncUsersRequest(self.lowNum, function(response) {
			console.log(response);
			var isData = self.ssExchange.syncUsers(response);
			progressDataRequest();
		});
	});

}

function progressDataRequest() {
	progressData();
}

function progressData() {
	if (!self.ssExchange.isDataComplete()) {
		setTimeout(function() {
			progressData();
		}, 1000);
	} else {
		var position = self.ssExchange.getPosition();
		var hash = self.ssExchange.getHash24Bits();
		var decoy1 = self.ssExchange.getDecoy24Bits1();
		var decoy2 = self.ssExchange.getDecoy24Bits2();

		showPhrases(position, hash, decoy1, decoy2);
	}
}

function showPhrases(position, hash, decoy1, decoy2) {

	console.log("position --> " + position);
	console.log("hash --> " + hash);
	console.log("decoy1 --> " + decoy1);
	console.log("decoy2 --> " + decoy2);

	self.hashes = [];
	self.hashes[position - 1] = hash;
	switch (position - 1) {
	case 0:
		self.hashes[1] = decoy1;
		self.hashes[2] = decoy2;
		break;
	case 1:
		self.hashes[0] = decoy1;
		self.hashes[2] = decoy2;
		break;
	case 2:
		self.hashes[0] = decoy1;
		self.hashes[1] = decoy2;
		break;
	}

	var phrase1 = SafeSlinger.util.getWordPhrase(self.hashes[0]);
	var phrase2 = SafeSlinger.util.getWordPhrase(self.hashes[1]);
	var phrase3 = SafeSlinger.util.getWordPhrase(self.hashes[2]);

	setInnerHtml("first", phrase1);
	setInnerHtml("second", phrase2);
	setInnerHtml("third", phrase3);

	setVisibility('phrase-div', true);
}

function noMatchButtonClick() {
	setVisibility('phrase-div', false);
	self.ssExchange.syncSignaturesRequest(null, function(response) {
		console.log(response);
		var isMatch = self.ssExchange.syncSignatures(response);
		progressMatchRequest();
	});
}

function firstButtonClick() {
	setVisibility('phrase-div', false);
	self.ssExchange.syncSignaturesRequest(self.hashes[0], function(response) {
		console.log(response);
		var isMatch = self.ssExchange.syncSignatures(response);
		progressMatchRequest();
	});
}

function secondButtonClick() {
	setVisibility('phrase-div', false);
	self.ssExchange.syncSignaturesRequest(self.hashes[1], function(response) {
		console.log(response);
		var isMatch = self.ssExchange.syncSignatures(response);
		progressMatchRequest();
	});
}

function thirdButtonClick() {
	setVisibility('phrase-div', false);
	self.ssExchange.syncSignaturesRequest(self.hashes[2], function(response) {
		console.log(response);
		var isMatch = self.ssExchange.syncSignatures(response);
		progressMatchRequest();
	});
}

function progressMatchRequest() {
	progressMatch();
}

function progressMatch() {
	if (!self.ssExchange.isMatchComplete()) {
		setTimeout(function() {
			progressMatch();
		}, 1000);
	} else {
		var dataSet = self.ssExchange.getDataSet();
		showResults(dataSet);
	}
}

function showResults(plaintextSet) {
	setVisibility('phrase-div', false);
	setVisibility('result-div', true);

	var results = "";
	for (var i = 0; i < self.ssExchange.uidSet.length; i++) {
		var uid = self.ssExchange.uidSet[i];
		if (plaintextSet[uid] != null && plaintextSet[uid] != "") {
			if (uid != self.ssExchange.userID) {
				results += "Their secret: " + plaintextSet[uid] + " ";
			}
		}
	}
	setInnerHtml("result", results);
}

function initIncrementalState() {
	setValue("secret-input", "");

	setInnerHtml("first", "");
	setInnerHtml("second", "");
	setInnerHtml("third", "");

	setInnerHtml("result", "");

	setVisibility('users-div', true);
	setVisibility('secret-div', true);
	setVisibility('phrase-div', false);
	setVisibility('result-div', false);

	updateParticipantsUi(gapi.hangout.getParticipants());

	// init
	setExchangeActive(false);
	addAttempt();
}

// A function to be run at app initialization time which registers our callbacks
function init() {
	console.log('Init app.');
	self.attempt = "";
	self.exchanging = "0"; // false

	// When API is ready...
	gapi.hangout.onApiReady.add(function(eventObj) {
		if (eventObj.isApiReady) {
			console.log('API is ready');

			gapi.hangout.data.onStateChanged.add(function(eventObj) {
				console.log('onStateChanged');

				if (getAttemptName() != self.attempt) {
					self.attempt = getAttemptName();
					setExchangeActive(false);
					// self.ui.showServerSecretView(getGroupName(),
					// getAttemptName(), getNumUsers());
				}
				if (isExchangeActive() != self.exchanging) {
					self.exchanging = isExchangeActive();
					if (isExchangeActive()) {
						beginExchange(getGroupName(), getAttemptName(),
								getNumUsers(), "");
					}
				}
			});

			gapi.hangout.onParticipantsChanged.add(function(eventObj) {
				console.log('onParticipantsChanged');

				updateParticipantsUi(eventObj.participants);

				setExchangeActive(false);
				// self.ui.showServerSecretView(getGroupName(),
				// getAttemptName(),
				// getNumUsers());
			});

			initIncrementalState();
		}
	});
}

// Wait for gadget to load.
gadgets.util.registerOnLoadHandler(init);
