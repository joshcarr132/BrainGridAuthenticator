import Grid from './grid';

const socket = io(); // eslint-disable-line


lsetss s;
// let client;
let grid;


// SETUP
$(document).ready(() => { // eslint-disable-line
  socket.emit('ready');

  s = Snap('#svg'); // eslint-disable-line
  grid = new Grid();

  grid.setup(s);
});

// HANDLE INPUTS
$(document).keypress((e) => { // eslint-disable-line
  switch (e.which) {
    case 97: // left
      grid.moveLeft();
      break;

    case 119: // up
      grid.moveUp();
      break;

    case 100: // right
      grid.moveRight();
      break;

    case 115: // down
      grid.moveDown();
      break;

    case 32: // spacebar
      grid.redraw(s, [2, 2]);
      console.log('reinitializing...');
      break;

    case 117: // u
      grid.undo();
      break;

    case 13: // enter
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

    default:
      console.log(e.which);
      break;
  }
});
