var lightGrid = [];
var lightGrid2 = [];
for(let r = 0; r < 50; r++) {
  let row = [];
  let row2 = [];
  for(let c = 0; c < 50; c++) {
    row.push(0);
    row2.push(0);
  }
  lightGrid.push(row);
  lightGrid2.push(row2);
}

var notes = [];
for(let c = 0; c < 16; c++) {
  notes.push([0,0,0,-1]); // x, y, z, n
}

var midiInput;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

  enableMidi();
}

function draw() {
  background(255);

  directionalLight(255,255,255,1,1.5,0);
  directionalLight(255,255,255,-1,0.1,0);

  rectMode(CENTER);

  noStroke();

  translate(-30,0,0);

  rotateX(-PI/8);
  rotateY(PI/5);
  rotateZ(PI/64);

  fill(127);
  box(500,30,500);

  fill(255);

  for(let x = 0; x < 32; x++) {
    for(let y = 0; y < 32; y++) {
      lightGrid[x][y] = 0;
      for(let n = 0; n < notes.length; n++) {
        if(notes[n][2]) lightGrid[x][y] += notes[n][2]/(1+0.05*pow(x-notes[n][0],2)+0.05*pow(y-notes[n][1],2));
      }
      lightGrid2[x][y] = lerp(lightGrid2[x][y],lightGrid[x][y],0.5);
      let z = lightGrid2[x][y];
      push();
      translate(-242.1875+x*15.625,-15.625-z,242.1875-y*15.625);
      sphere(7.8125);
      pop();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

//------------------------------------------------------------------------------
//                             MIDI
//------------------------------------------------------------------------------

function enableMidi() {
  WebMidi.enable(function (err) {
    if (err) console.log("An error occurred", err);

    //---------------------INPUT--------------------

    var liste = '';
    var taille = WebMidi.inputs.length;
    var i, num;
    var numStr = '0';

    var useLight = false;

    if(taille == 0) {
      window.alert("No MIDI input device detected.");
      disableMidi();
      return;
    }

    for(let i = 0; i < taille; i++) {
      num = i+1;
      var name = WebMidi.inputs[i].name;
      liste += '   ' + num.toString() + '   -   ' + name + '\n';
    }

    i = 0;
    num = 0;

    while((num < 1 || num > taille) && i < 1) {
      numStr = window.prompt("Write the number of the desired MIDI input device:\n\n"+liste);
      if(numStr == null)
      {
        num = 0;
        break;
      }
      else if(numStr) num = parseInt(numStr);
      i++;
    }

    if(num < 0 || !num || num > taille) {
      window.alert("No MIDI input selected. MIDI disabled.");
      disableMidi();
      return;
    }
    else {
      midiInput = WebMidi.inputs[num-1];
      let name = midiInput.name;
      window.alert('Input selected: ' + name + '.');
      if(!midiInput.hasListener('noteon',      'all', handleNoteOn)) {
        midiInput.addListener('noteon',        'all', handleNoteOn);
        midiInput.addListener('channelaftertouch', 'all', handleAftertouch);
        midiInput.addListener('pitchbend', 'all', handlePitchbend);
        midiInput.addListener('controlchange', 'all', handleControl);
        midiInput.addListener('noteoff',       'all', handleNoteOff);
        //midiInput.addListener('midimessage','all',handleNoteOn);
      }
    }
  },true);
}

//--------------------EVENTS--------------------

var oct0 = 3;

function handleNoteOn(e) {
  notes[e.channel-1][0] = ((e.note.number-60)%5+0.5)*32/5;
  notes[e.channel-1][1] = (floor((e.note.number-60)/5)+0.5)*32/5;
  notes[e.channel-1][2] = 100*e.velocity;
  notes[e.channel-1][3] = e.note.number;
}

function handleAftertouch(e) {
  if(notes[e.channel-1][3] < 0) return;
  notes[e.channel-1][2] = 100*e.value;
}

function handlePitchbend(e) {
  if(notes[e.channel-1][3] < 0) return;
  notes[e.channel-1][0] = ((notes[e.channel-1][3]-60)%5+0.5)*32/5+32*(e.value)/0.083251953125;
}

function handleControl(e) {
  if(notes[e.channel-1][3] < 0) return;
  notes[e.channel-1][1] = (floor((notes[e.channel-1][3]-60)/5)+0.5)*32/5+32*(e.value-63)/127;
}

function handleNoteOff(e) {
  notes[e.channel-1] = [0,0,0,-1];
}

function disableMidi() {
  midi = 0;

  for(let i = 0; i < WebMidi.inputs.length; i++) {
    WebMidi.inputs[i].removeListener();
  }

  WebMidi.disable();
}
