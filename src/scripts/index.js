// import commandBlock from './commandBlock';
// import { initClient } from './commandBlock';
// import { loadTrainingProfile } from './commandBlock';
import $ from 'jquery';
import Snap from 'snapsvg-cjs';
import { commandBlock, initClient, loadTrainingProfile } from './commandBlock';
import Grid from './grid';

import { Auth } from './auth';
/* eslint-disable no-console */


// TODO: create main menu interface that loads first, allows selecting profile,
//       initiates loading grid interface for create or enter sessions
// TODO: random path generation - function to create a randomized path through the
//       grid that incorporates n node
// TODO: variable feedback - allow different levels of visual feedback for practice
//         * dim line that shows the path
//         * no hint line but highlight end location
//         * remove indicator trail
//         * remove end location indicator
//         * remove all but the grid
// TODO: move all snap and animation functions (including move commands) to their own file


const auth = new Auth(); // probably not the best way to do this but it works
const authObj = {
  username: auth.username,
  password: auth.password,
  client_id: auth.client_id,
  client_secret: auth.client_secret,
  debit: auth.debit,
};


let s;
let client;
let grid;


// SETUP
$(document).ready(() => { // eslint-disable-line
  initClient(authObj)
    .then((ctxClient) => {
      client = ctxClient;
      console.log(`client: ${client}`);
    })
    .then(() => { loadTrainingProfile(client); });

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
      grid.redraw(s);
      console.log('reinitializing...');
      break;

    case 13: // enter
      grid.ignoringInput = true;
      commandBlock(client)
        .then((data) => {
          const command = data.output[0];
          // console.log('command' + command);
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
  // spread syntax seems unnecessary here but it mysteriously only works this way
  grid.visitedNodes.push([...grid.currentNode]);
  console.log(grid.currentNode);
});
