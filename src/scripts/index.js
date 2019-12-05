import Grid from './grid.js';

/* eslint no-undef: 0 */
/* eslint no-alert: 0 */

const socket = io();

let s;
let grid;
let correctPwd;
let createMode;
let id;
let session;

// grid dimensions
const xpoints = 7;
const ypoints = 7;
const width = 600;
const height = 600;

// SETUP
$(document).ready(() => {
  // setup interface buttons
  $('#undoButton').click(() => { grid.undo(); });
  $('#resetButton').click(() => { grid.redraw(true); });
  $('#submitButton').click(() => { checkPassword(); });

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
  socket.on('command', (command) => {
    console.log(`OUTPUT COMMAND: ${command}`);
    grid.ignoringInput = false;

    switch (command.output.key) {
      case 'left':
        grid.move('left');
        break;
      case 'push':
        grid.move('up');
        break;
      case 'right':
        grid.move('right');
        break;
      case 'drop':
        grid.move('down');
        break;
      case 'neutral':
        grid.move('up');
        console.log('undefined command');
        break;
      default:
        console.log('no command detected');
        break;
    }
  });
}


function initSessionCreate(nTrialsGuide = 2, nTrialsNoGuide = 2) {
  $('#menu').hide();
  $('#mainInterface').show();
  console.log('initializing "CREATE" session');

  session = {
    grid: new Grid(s, {
      height,
      width,
      xpoints,
      ypoints,
    }),
    nTrialsGuide,
    nTrialsNoGuide,
    completedGuide: 0,
    completedNoGuide: 0,
  };

  correctPwd = session.grid.template;
  grid = session.grid;

  sessionCreateGuide();
}

function sessionCreateGuide() {
  grid.setup();
  grid.redraw(true);
  grid.showGuide();
}

function sessionCreateNoGuide() {
  grid.setup();
  grid.redraw(true);
  grid.hideGuide();
}

function initSessionEnter(template) {
  $('#menu').hide();
  $('#mainInterface').show();
  console.log('initializing "ENTER" session');

  grid = new Grid(s, {
    template,
    height,
    width,
    xpoints,
    ypoints,
  });

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

// check the input password against the database response
function checkPassword(password, input) {
  if (password.length !== input.length) { return false; }

  for (let i = 0; i < password.length; i++) {
    if (password[i] !== input[i]) { return false; }
  }

  if (!createMode) {
    return true;
  }

  if (grid.guideVisible) {
    session.completedGuide++;
  } else {
    session.completedNoGuide++;
  }

  if (session.completedGuide < session.nTrialsGuide) {
    sessionCreateGuide();
  } else if (session.completedNoGuide < session.nTrialsNoGuide) {
    sessionCreateNoGuide();
  } else {
    endSession();
  }

  return true;
}
