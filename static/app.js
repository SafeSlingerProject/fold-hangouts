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

var serverPath = '//fold-hangouts.appspot.com/';

// The functions triggered by the buttons on the Hangout App
function countButtonClick() {
  // Note that if you click the button several times in succession,
  // if the state update hasn't gone through, it will submit the same
  // delta again.  The hangout data state only remembers the most-recent
  // update.
  console.log('Button clicked.');
  var value = 0;
  var count = gapi.hangout.data.getState()['count'];
  if (count) {
    value = parseInt(count);
  }

  console.log('New count is ' + value);
  // Send update to shared state.
  // NOTE:  Only ever send strings as values in the key-value pairs
  gapi.hangout.data.submitDelta({'count': '' + (value + 1)});
}

function resetButtonClick() {
  console.log('Resetting count to 0');
  gapi.hangout.data.submitDelta({'count': '0'});
}

var forbiddenCharacters = /[^a-zA-Z!0-9_\- ]/;
function setText(element, text) {
  element.innerHTML = typeof text === 'string' ?
      text.replace(forbiddenCharacters, '') :
      '';
}

function getMessageClick() {
  console.log('Requesting message from main.py');
  var http = new XMLHttpRequest();
  http.open('GET', serverPath);
  http.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var jsonResponse = JSON.parse(http.responseText);
      console.log(jsonResponse);

      var messageElement = document.getElementById('message');
      setText(messageElement, jsonResponse['message']);
    }
  }
  http.send();
}

function updateStateUi(state) {
  var countElement = document.getElementById('count');
  var stateCount = state['count'];
  if (!stateCount) {
    setText(countElement, 'Probably 0');
  } else {
    setText(countElement, stateCount.toString());
  }
}

function updateParticipantsUi(participants) {
  console.log('Participants count: ' + participants.length);
  var participantsListElement = document.getElementById('participants');
  setText(participantsListElement, participants.length.toString());
}

// A function to be run at app initialization time which registers our callbacks
function init() {
  console.log('Init app.');

  var apiReady = function(eventObj) {
    if (eventObj.isApiReady) {
      console.log('API is ready');

      gapi.hangout.data.onStateChanged.add(function(eventObj) {
        updateStateUi(eventObj.state);
      });
      gapi.hangout.onParticipantsChanged.add(function(eventObj) {
        updateParticipantsUi(eventObj.participants);
      });

      updateStateUi(gapi.hangout.data.getState());
      updateParticipantsUi(gapi.hangout.getParticipants());

      gapi.hangout.onApiReady.remove(apiReady);
    }
  };

  // This application is pretty simple, but use this special api ready state
  // event if you would like to any more complex app setup.
  gapi.hangout.onApiReady.add(apiReady);
}

gadgets.util.registerOnLoadHandler(init);
