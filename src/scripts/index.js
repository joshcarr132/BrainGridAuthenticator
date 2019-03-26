import commandBlock from './commandBlock';
import { initClient } from './commandBlock';
import { loadTrainingProfile } from './commandBlock';
import $ from 'jquery';
import Snap from 'snapsvg-cjs';
import { Auth } from './auth';
/* eslint-disable no-console */

//
// TODO: bring in cortex and setup a keybinding to initiate  a command block
//       then initiate movement based on block return value
//         * cortex needs to live on the server, so http calls are needed
//         * keypress -> HTTP call -> init command block on server -> animate based on
//            return from server -> save data on server
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


const WIDTH = 900;
const HEIGHT = 900;
const cellHeight = HEIGHT / 5;
const cellWidth = WIDTH / 5;
const vPadding = cellHeight / 2;
const hPadding = cellWidth / 2;
const centerX = WIDTH / 2;
const centerY = HEIGHT / 2;
const lineColour = 'coral';

const auth = new Auth();
const authObj = {
  username: auth.username,
  password: auth.password,
  client_id: auth.client_id,
  client_secret: auth.client_secret,
  debit: auth.debit
};

// const authObj = [auth.username, auth.password, auth.client_id, auth.client_secret, auth.debit]

let pathString;
let path;
let circle;
let visitedNodes;
let currentNode;
let s;
let ignoringInput;
let client;
// initClient(authObj)
//   .then((ctxClient) => {
//     client = ctxClient;
//     console.log('client: ' + client);
//   })
//   .then(() => { loadTrainingProfile(client); });



const nodes = [];
const delay = 200; // length of the animation


/* HELPER FUNCTIONS */
function getNode(x, y) {
  /* Enter a grid location (e.g., [0,2]) to get the x and y pixel
    values of that grid position. */
  const nodeX = nodes[x][y].x;
  const nodeY = nodes[x][y].y;
  return [nodeX, nodeY];
}

function isValidNode(coordinates) {
  /* Called before any movement to determine if move is valid.
     Returns true if the destination node is a valid grid position
     (i.e., int between 0-4 for both x and y) AND the node has not
     previously been visited. */
  if (coordinates[0] < 0 || coordinates[0] > 4) { return false; }
  if (coordinates[1] < 0 || coordinates[1] > 4) { return false; }

  if (visitedNodes.some(node => (node[0] === coordinates[0] && node[1] === coordinates[1]))) {
    return false;
  } return true;
}

function ignoreInput() {
  /* Issuing a movement command before a previous animation has completed causes some
    undesired animation and it looks pretty bad. ignoreInput is called when an animation
    begins in order to block input for it's duration. */
  ignoringInput = true;
  window.setTimeout(() => {
    ignoringInput = false;
  }, delay + 100);
}

/* CONTROL FUNCTIONS */
function redraw(snap) {
  /* redraw is called once during setup to render the main circle indicator
    and initialize the path. It can be called again at any point to reset
    the animation to its initial state. */

  // reset to default values
  visitedNodes = [[2, 2]];
  currentNode = [2, 2];
  pathString = `M${centerX},${centerY}`;

  if (path) { path.remove(); }
  if (circle) { circle.remove(); }

  // initialize path before circle because snap doesn't support z-index
  snap.circle(centerX, centerY, 10) // so the middle grid dot isnt visible
    .attr({ fill: lineColour, stroke: lineColour });

  path = snap.path(pathString)
    .attr({ stroke: lineColour, fill: 'none', strokeWidth: 20 });

  // circle indicator
  const node = getNode(2, 2);
  circle = snap.circle(node[0], node[1], 30)
    .attr({
      fill: lineColour,
      stroke: lineColour,
      strokeOpacity: 0.3,
      strokeWidth: 10,
    });
}

function moveLeft() {
  if (isValidNode([currentNode[0] - 1, currentNode[1]]) && !ignoringInput) {
    const newNode = getNode(currentNode[0] - 1, currentNode[1]);
    circle.animate({ cx: newNode[0], cy: newNode[1] }, delay);
    pathString += `L${newNode[0]},${newNode[1]}`;
    currentNode[0] -= 1;
    ignoreInput(delay);
    path.animate({ d: pathString }, delay);
  } else { console.log('invalid position'); }
}

function moveUp() {
  if (isValidNode([currentNode[0], currentNode[1] - 1]) && !ignoringInput) {
    const newNode = getNode(currentNode[0], currentNode[1] - 1);
    circle.animate({ cx: newNode[0], cy: newNode[1] }, delay);
    pathString += `L${newNode[0]},${newNode[1]}`;
    currentNode[1] -= 1;
    ignoreInput(delay);
    path.animate({ d: pathString }, delay);
  } else { console.log('invalid position'); }
}

function moveRight() {
  if (isValidNode([currentNode[0] + 1, currentNode[1]]) && !ignoringInput) {
    const newNode = getNode(currentNode[0] + 1, currentNode[1]);
    circle.animate({ cx: newNode[0], cy: newNode[1] }, delay);
    pathString += `L${newNode[0]},${newNode[1]}`;
    currentNode[0] += 1;
    ignoreInput(delay);
    path.animate({ d: pathString }, delay);
  } else { console.log('invalid position'); }
}

function moveDown() {
  if (isValidNode([currentNode[0], currentNode[1] + 1]) && !ignoringInput) {
    const newNode = getNode(currentNode[0], currentNode[1] + 1);
    circle.animate({ cx: newNode[0], cy: newNode[1] }, delay);
    pathString += `L${newNode[0]},${newNode[1]}`;
    currentNode[1] += 1;
    ignoreInput(delay);
    path.animate({ d: pathString }, delay);
  } else { console.log('invalid position'); }
}


// SETUP
$(document).ready(() => { // eslint-disable-line
  initClient(authObj)
    .then((ctxClient) => {
      client = ctxClient;
      console.log('client: ' + client);
    })
    .then(() => { loadTrainingProfile(client); });
  // .then(() => {

  s = Snap('#svg'); // eslint-disable-line
  ignoringInput = false;

  // render static grid and add coordinates to [nodes ]
  for (let i = 0; i <= 5; i++) {
    const row = [];
    for (let j = 0; j <= 5; j++) {
      const pointX = cellWidth * i + hPadding;
      const pointY = cellHeight * j + vPadding;
      s.circle(pointX, pointY, 10);

      row.push({ x: pointX, y: pointY });
    }
    nodes.push(row);
  }
  // });

  // render dynamic components
  redraw(s);
});


// HANDLE INPUTS
$(document).keypress((e) => { // eslint-disable-line
  switch (e.which) {
    case 97: // left
      moveLeft();
      break;

    case 119: // up
      moveUp();
      break;

    case 100: // right
      moveRight();
      break;

    case 115: // down
      moveDown();
      break;

    case 32: // spacebar
      redraw(s);
      console.log('reinitializing...');
      break;

    case 13: // enter
      ignoringInput = true;
      commandBlock(client)
        .then((data) => {
          let command = data.output[0];
          // console.log('command' + command);
          ignoringInput = false;
          switch (command) {
            case 'left':
              moveLeft();
              break;
            case 'push':
              moveUp();
              break;
            case 'right':
              moveRight();
              break;
            case 'drop':
              moveDown();
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
  visitedNodes.push([...currentNode]);
  console.log(currentNode);
});
