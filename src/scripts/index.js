import Grid from './grid.js';

/* eslint no-undef: 0 */
/* eslint no-alert: 0 */

const socket = io();

let s;
let grid;
let correctPwd;
let createMode;
let id;
let successCount;

// SETUP
$(document).ready(() => {
  s = Snap('#svg');
  mainMenu();
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

      if (checkPassword(correctPwd.moves, grid.moves)) {
        console.log('successfully authenticated!');
      } else {
        console.log("password doesn't match!");
      }
      break;

    default:
      break;

    case 103: // g
      if (createMode) {
        grid.toggleShowGuide();
      } else {
        console.log('cannot show guides in enter mode');
      }
      break;
  }
});


// check the input password against the database response
function checkPassword(password, input) {
  if (password.length !== input.length) { return false; }

  for (let i = 0; i < password.length; i++) {
    if (password[i] !== input[i]) { return false; }
  }

  if (createMode) {
    if (!grid.guideVisible) {
      successCount++;
      if (successCount >= 2) {
        endSession();
      }
    }
  } else { // enter mode
    endSession();
  }

  return true;
}


// all functionality of choosing modes, entering/checking ids occurs here
// first point of user interaction
function mainMenu() {
  id = 0;
  let mode;
  $('#mainInterface').hide();
  $('#menu').show();

  $('#menu').on('submit', (event) => {
    event.preventDefault();
    mode = $("form input[type='radio']:checked").val();
    id = parseInt($("form input[type='number']").val());

    socket.emit('ready', id);

    if (mode === 'create') {
      createMode = true;
    } else if (mode === 'enter') {
      createMode = false;
    }

    return false;
  });

  socket.on('db_response', (res) => {
    console.log(res);
    if (createMode) {
      if (res !== -1) { // db entry found for id
        console.log('id already exists! please choose another');
      } else {
        initSessionCreate();
      }
    } else { // enter mode
      if (res === -1) { // db entry not found
        console.log('id not found! try again');
      } else {
        initSessionEnter(res);
      }
    }
  });
}


function initSessionCreate() {
  $('#menu').hide();
  $('#mainInterface').show();

  successCount = 0;
  console.log('initializing "CREATE" session');

  grid = new Grid(s, {
    height:   600,
    width:    600,
    xpoints:  6,
    ypoints : 6,
  });
  correctPwd = grid.template;

  grid.setup();
  grid.showGuide();
}

function initSessionEnter(template) {
  $('#menu').hide();
  $('#mainInterface').show();

  console.log('initializing "ENTER" session');

  grid = new Grid(s, { template });
  correctPwd = template[0];

  grid.setup();
}

function endSession() {
  if (createMode) {
    const dbEntry = { _id: id, start: grid.start, moves: grid.moves };
    socket.emit('create_success', dbEntry);
  }

  grid.ignoringInput = true;
}
