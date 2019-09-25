import Grid from './grid.js';

/* eslint no-undef: 0 */
/* eslint no-alert: 0 */
const socket = io();

// IDEA: incorporate the idea of a 'session', which can be a 'create' session or
// an 'enter' session. The session initializes everything, handles flow/sequence
// of events, and cleanup/db submission.


let s;
let grid;
let dbResponse;
let createNew;

// SETUP
$(document).ready(() => {
  selectModePrompt();
  const id = prompt('enter id');
  s = Snap('#svg');

  socket.emit('ready', id);

  socket.on('db_response', (res) => {
    if (createMode) {
      if (res !== -1) {
        console.log('id already exists; overwriting');
      } else {
        initSessionCreate();
      }
    } else {
      if (res === -1) {
        // raise error
      } else {
        initSessionEnter();
      }
    }
  });
});

// HANDLE INPUTS
$(document).keypress((e) => { 
  console.log(e.which);
  switch (e.which) {
    case 97: // left
      grid.move('left');
      break;

    case 119: // up
      grid.move('up');
      break;

    case 100: // right
      grid.move('right');
      break;

    case 115: // down
      grid.move('down');
      break;

    case 32: // spacebar
      // grid.redraw(s, { keepTemplate: true });
      grid.redraw(true);
      console.log('reinitializing...');
      break;

    case 117: // u
      grid.undo();
      break;

    case 98: // b
      grid.ignoringInput = true;
      socket.emit('initCmdBlock');

      socket.on('command', (command) => {
        console.log(`OUTPUT COMMAND: ${command}`);
        grid.ignoringInput = false;
        switch (command) {
          case 'left':
            grid.moveLeft();
            break;
          case 'push':
            grid.moveUp();
            break;
          case 'right':
            grid.moveRight();
            break;
          case 'drop':
            grid.moveDown();
            break;
          default:
            console.log('no command detected');
            break;
        }
      });
      break;

    case 13: // enter
      console.log('checking password...');
      if (checkPassword(dbResponse.moves, grid.moves)) {
        console.log('successfully authenticated!');
      } else {
        console.log("password doesn't match!");
      }
      break;

    default:
      // console.log(e.which);
      break;

    case 103: // g
      if (createNew) {
          grid.toggleShowGuide();
      } else {
          console.log('cannot show guides in enter mode');
      }
      break;
  }
  // console.log(grid.currentNode);
  // console.log(grid.options.template.moves);
  // console.log(grid.moves);
  // console.log(grid.pathString);
  // console.log(grid.visitedNodes);
});


// check the input password against the database response
function checkPassword(password, input) {
  if (password.length !== input.length) { return false; }

  for (let i = 0; i < password.length; i++) {
    if (password[i] !== input[i]) {return false;}
  }

  if (createMode && !grid.guideVisible) {
    successCount++;
    if (successCount >= 2) {
      endSession();
    }
  }
  return true;
}

// a prompt window to select create mode or enter mode
// placeholder until i build a proper ui for this
function selectModePrompt() {
  const mode = prompt('select mode:\n(c)reate new password | (e)nter a password');
  if (mode === 'c') {
    createNew = true;
  } else if (mode === 'e') {
    createNew = false;
  } else {
    console.log('select a valid mode');
    selectModePrompt();
  }
}

function initSessionCreate(length = 6) {
  const successCount = 0;

  grid = new Grid(s);

  createMode = true;
  grid.setup();
  grid.showGuide();
}


function initSessionEnter() {
  //placeholder
}

function endSession() {
  //placeholder
  if (createMode) {
    dbEntry = {id: id, start: grid.start, moves: grid.moves};
    socket.emit('create_success', dbEntry);
  }
}
