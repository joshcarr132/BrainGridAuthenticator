import Grid from './grid.js'; // eslint-disable-line import/extensions

const socket = io(); // eslint-disable-line

let s;
let grid;

// SETUP
$(document).ready(() => { // eslint-disable-line no-undef
  const id = prompt('enter id'); // eslint-disable-line no-alert
  // console.log(id);
  s = Snap('#svg'); // eslint-disable-line no-undef

  socket.emit('ready', id);

  socket.on('db_response', (res) => {
    if (res !== -1) {
      // grid.setup(s, res);
      grid = new Grid({ template: res });
      grid.setup(s);
    } else {
      grid = new Grid({});
      grid.setup(s);
    }
  });
});

// HANDLE INPUTS
$(document).keypress((e) => { // eslint-disable-line no-undef
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
      grid.redraw(s, false, true);
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

      // case 103: // g
      //   if (grid.submitPassword()) {
      //     // send to db via socket
      //     if (create) {
      //       socket.emit('success', { create: true, template: grid.template });
      //     } else {
      //       socket.emit('success', { template: grid.template });
      //     }
      //   }
      //   break;


    default:
      console.log(e.which);
      break;
  }
  console.log(grid.currentNode);
  console.log(grid.options.template.commands);
  console.log(grid.moves);
  console.log(grid.pathString);
});
