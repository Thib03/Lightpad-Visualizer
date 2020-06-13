var black = 0;
var white = 255;

var dimension;
var weight = 0.005;
var bigRadius = 0.35;
var littleRadius = 0.0905;

var velocity = [];
for(let n = 0; n < 7; n++) {
  velocity.push(0);
}

var number = [];
for(let n = 0; n < 75; n++) {
  number.push(0);
}

var notesOn = [];
for(let n = 0; n < 7; n++) {
  notesOn.push([]);
}

var lightGrid = [];
var lightGrid2 = [];
for(let r = 0; r < 8; r++) {
  let row = [];
  let row2 = [];
  for(let c = 0; c < 8; c++) {
    row.push(0);
    row2.push(0);
  }
  lightGrid.push(row);
  lightGrid2.push(row2);
}

var midiHandler;
var midi = 0;
var midiRadius = 0.35*littleRadius;

var midiInput, midiOutput;

var launchpad;

var noteOnStatus     = 144;
var noteOffStatus    = 128;
var aftertouchStatus = 160;

var synth;

var font, fontLight;

var tritons = [];

for(let i = 0; i < 6; i++) {
  tritons[i] = false;
}

let t1 = 0.001;
let l1 = 1; // velocity
let t2 = 0.1;
let l2 = 0.5; // aftertouch
let t3 = 0.3;
let l3 = 0;

var fonDeg = 0;
//var fonNum = 130;
var nextNote = false;

var dragX, dragY, dragDist;
var dragLimit = 0.1;

var midiScale = [[]];

var maxFreq = 10000;

function deg(d) {
  while(d < 1) {d += 7;}
  return (d-1)%7+1;
}

function ndt(n) {
  while(n < 0) {n += 12;}
  return n%12;
}

function alt(a) {
  while(a < -6) {a += 12;}
  while(a >  6) {a -= 12;}
  return a;
}

function degToNdt(d) {
  switch(deg(d)) {
    default:
    case 1: return 0;
    case 2: return 2;
    case 3:	return 4;
    case 4: return 5;
    case 5: return 7;
    case 6: return 9;
		case 7: return 11;
  }
}

function ndtToDeg(n) {
  switch(ndt(n)){
    case 0: return 1;
    case 2: return 2;
    case 4: return 3;
    case 5: return 4;
    case 7: return 5;
    case 9: return 6;
    case 11:return 7;
    default: return false;
  }
}

function degToColor(d,light=false) {
  if(light) {
    switch(deg(d)) {
      case 1:  return 41;
      case 3:  return 25;
      case 5:  return 60;
      case 7:  return 13;
      default: return 0;//70;
    }
  }
  switch(deg(d)) {
    case 1:  return [109,158,235];
    case 3:  return [146,196,125];
    case 5:  return [224,102,101];
    case 7:  return [254,217,102];
    default: return [217,217,217];
  }
}

function triggerColors(deg,overwrite = false) {
  var updateColumn = false;
  if(launchpad.isOn && ((fonDeg == deg && !overwrite) || !fonDeg)) {
    updateColumn = true;
  }
  if(fonDeg == deg) {
    if(overwrite) {
      return;
    }
    fonDeg = 0;
    for(let d = 1; d <= 7; d++) {
      notes[d-1].setColor(0);
      notes[d-1].updateText();
    }
  }
  else {
    fonDeg = deg;
    let i = fonDeg-1;
    for(let d = 1; d <= 7; d++) {
      notes[i].setColor(d);
      notes[i].updateText();
      i++;
      i %= 7;
    }
  }
  if(launchpad.isOn) {
    launchpad.update();
    if(updateColumn) {
      launchpad.sendControlColumn();
    }
  }
}

class Launchpad {
  constructor() {
    this.isOn = false;
    this.output = null;
    this.lightGrid = [];
    for(let r = 0; r < 8; r++) {
      var row = [];
      for(let c = 0; c < 8; c++) {
        row.push(0);
      }
      this.lightGrid.push(row);
    }
  }

  turnOn(output) {
    if(output == 'Launchpad Note') {
      for(let o = 0; o < WebMidi.outputs.length; o++) {
        if(WebMidi.outputs[o].name.includes('Launchpad Light')) {
          this.output = WebMidi.outputs[o];
        }
      }
    }
    else {
      this.output = WebMidi.outputs[output];
    }
    //this.output.send(noteOnStatus,[10,degToColor(1,true)]);
    this.isOn = true;
    //this.update();
  }

  sendControlColumn() {
    for(let d = 2; d <= 7; d++) {
      this.output.send(noteOnStatus,[d*10,fonDeg?degToColor(d,true):0]);
    }
  }

  update() {
    if(fonDeg) {
      var d = (8-fonDeg)%7+1;
      for(var r = 0; r < 8; r++) {
        for(var c = 0; c < 8; c++) {
          var color;
          if(this.lightGrid[r][c]) {
            color = 3;
          }
          else {
            color = degToColor(d,true);
          }
          this.output.send(noteOnStatus,[(r+1)*10+c+1,color]);
          d = d%7+1;
        }
        d = (d+2)%7+1;
      }
    }
    else {
      for(var r = 0; r < 8; r++) {
        if(r && r < 7) {
          this.output.send(noteOnStatus,[(r+1)*10,0]);
        }
        for(var c = 0; c < 8; c++) {
          var color;
          if(this.lightGrid[r][c]) {
            color = 3;
          }
          else {
            color = 0;
          }
          this.output.send(noteOnStatus,[(r+1)*10+c+1,color]);
        }
      }
    }
  }

  noteOn(row,col) {
    var color = 3;
    this.lightGrid[row][col] = true;
    this.output.send(noteOnStatus,[(row+1)*10+col+1,color]);
    if(col < 4) {
      if(row > 0) {
        this.lightGrid[row-1][col+4] = true;
        this.output.send(noteOnStatus,[row*10+col+5,color]);
      }
    }
    else {
      if(row < 7) {
        this.lightGrid[row+1][col-4] = true;
        this.output.send(noteOnStatus,[(row+2)*10+col-3,color]);
      }
    }
    console.log('yep');
  }

  noteOff(row,col) {
    //var color = degToColor(deg,true);
    this.lightGrid[row][col] = false;
    //this.output.send(noteOnStatus,[(row+1)*10+col+1,color]);
    if(col < 4) {
      if(row > 0) {
        this.lightGrid[row-1][col+4] = false;
        //this.output.send(noteOnStatus,[row*10+col+5,color]);
      }
    }
    else {
      if(row < 7) {
        this.lightGrid[row+1][col-4] = false;
        //this.output.send(noteOnStatus,[(row+2)*10+col-3,color]);
      }
    }
    this.update();
  }
}

class MidiHandler {
  constructor() {
    this.button = new Clickable();
    this.button.color = white;
    this.button.cornerRadius = 1000;
    this.button.stroke = black;
    this.button.text = '';
    this.button.onPress = function() {
      enableMidi();
    }
    this.update();
  }

  update() {
    let r = midiRadius*dimension;
    this.button.resize(2*r,2*r);
    this.button.locate(width/2 -r,
                       height/2-r);
    this.button.strokeWeight = weight*dimension;
  }

  draw() {
    this.button.draw();

    noStroke();
    fill(this.button.color==white?black:white);
    let r  = 0.14*midiRadius*dimension;
    let br = 0.6*midiRadius*dimension;
    for(let n = 0; n < 5; n++) {
      let a = n*PI/4;
      circle(width/2+br*cos(a),height/2-br*sin(a),2*r,2*r);
    }
    let l = 0.7*midiRadius*dimension;
    let h = 0.35*midiRadius*dimension;
    rect(width/2-l/2,height/2+1.1*br,l,h,h);
  }
}

function preload() {
  font      = loadFont('nunito_light.ttf');
  fontLight = loadFont('nunito_extra_light.ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

  dimension = Math.min(width,height);

  launchpad = new Launchpad();

  //midiHandler = new MidiHandler();

  enableMidi();

  /*userStartAudio().then(function() {
     console.log('Audio ready');
  });*/
}

function draw() {
  background(white);

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

  for(let row = 0; row < 8; row++) {
    for(let col = 0; col < 8; col++) {
      lightGrid2[row][col] = lerp(lightGrid2[row][col],lightGrid[row][col],0.5);
      push();
      translate(-210+col*60,-18-100*lightGrid2[row][col],210-row*60);
      box(50,6+200*lightGrid2[row][col],50);
      pop();
    }
  }

  if(!midi) {
    //midiHandler.draw();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  dimension = Math.min(width,height);

  //midiHandler.update();
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
      /*if(name == 'MIDIIN2 (Launchpad Pro)') {
        launchpad.turnOn('MIDIOUT2 (Launchpad Pro)');
        name += '.\nColours will be displayed on the matrix. Please put your Launchpad Pro into Programmer Mode';
      }*/
      if(name.includes('Launchpad Pro')) {
        useLight = true;
        let x = (WebMidi.inputs[num-2].name.includes('Launchpad Pro'));
        let y = (WebMidi.inputs[num  ].name.includes('Launchpad Pro'));
        var offset;
        if(!x && y) {
          offset = 0;
        }
        else if(x && y) {
          offset = 1;
        }
        else {
          offset = 2;
        }
        taille = WebMidi.outputs.length;
        for(let o = 0; o < taille-2; o++) {
          if(WebMidi.outputs[o  ].name.includes('Launchpad Pro') &&
             WebMidi.outputs[o+1].name.includes('Launchpad Pro') &&
             WebMidi.outputs[o+2].name.includes('Launchpad Pro')) {
            launchpad.turnOn(o+offset);
            name += '.\nColours will be displayed on the matrix. Please put your Launchpad Pro into Programmer Mode';
            taille -= 3;
            break;
          }
        }
      }
      else if(name.includes('Launchpad Note')) {
        launchpad.turnOn('Launchpad Note');
        name += '.\nColours will be displayed on the matrix. Please put your Launchpad Pro into Programmer Mode';
      }
      window.alert('Input selected: ' + name + '.');
      if(!midiInput.hasListener('noteon',      'all', handleNoteOn)) {
        midiInput.addListener('noteon',        'all', handleNoteOn);
        midiInput.addListener('keyaftertouch', 'all', handleAftertouch);
        midiInput.addListener('noteoff',       'all', handleNoteOff);
      }
      midi = 1;
      //midiButton.color  = black;
      //midiButton.stroke = white;
    }
  },true);
}

//--------------------EVENTS--------------------

var oct0 = 3;

function handleNoteOn(e) {
  var deg, oct;
  var num = e.note.number;
  let row = Math.floor(num/10)-1;
  let col = num%10-1;
  lightGrid[row][col] = e.velocity;
}

function handleAftertouch(e) {
  var deg, oct;
  var num = e.note.number;
  let row = Math.floor(num/10)-1;
  let col = num%10-1;
  lightGrid[row][col] = e.value;
}

function handleNoteOff(e) {
  var deg, oct;
  var num = e.note.number;
  let row = Math.floor(num/10)-1;
  let col = num%10-1;
  lightGrid[row][col] = 0;
}

function disableMidi() {
  midi = 0;

  for(let i = 0; i < WebMidi.inputs.length; i++) {
    WebMidi.inputs[i].removeListener();
  }

  WebMidi.disable();

  //midiButton.color  = white;
  //midiButton.stroke = black;
}
