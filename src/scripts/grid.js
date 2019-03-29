import Snap from 'snapsvg-cjs';


const WIDTH = 900;
const HEIGHT = 900;
const cellHeight = HEIGHT / 5;
const cellWidth = WIDTH / 5;
const vPadding = cellHeight / 2;
const hPadding = cellWidth / 2;
const centerX = WIDTH / 2;
const centerY = HEIGHT / 2;
const lineColour = 'coral';

const delay = 200; // length of the animation

let path;
let circle;


export default class Grid {
  constructor() {
    // geometry
    this.width = WIDTH;
    this.height = HEIGHT;
    this.cellWidth = this.width / 5;
    this.cellHeight = this.height / 5;
    this.hPadding = cellWidth / 2;
    this.vPadding = cellHeight / 2;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.delay = delay;
    this.ignoringInput = true;

    // svg objects
    this.s = null;
    this.pathString = '';
    this.path = null;
    this.circle = null;

    // grid
    this.nodes = [];
    this.currentNode = [];
    this.visitedNodes = [];
  }

  moveLeft() {
    if (this.isValidNode([this.currentNode[0] - 1, this.currentNode[1]]) && !this.ignoringInput) {
      const newNode = this.getNode(this.currentNode[0] - 1, this.currentNode[1]);
      this.circle.animate({ cx: newNode[0], cy: newNode[1] }, this.delay);
      this.pathString += `L${newNode[0]},${newNode[1]}`;
      this.currentNode[0] -= 1;
      this.ignoreInput(delay);
      this.path.animate({ d: this.pathString }, this.delay);
    } else { console.log('invalid position'); }
  }

  moveUp() {
    if (this.isValidNode([this.currentNode[0], this.currentNode[1] - 1]) && !this.ignoringInput) {
      const newNode = this.getNode(this.currentNode[0], this.currentNode[1] - 1);
      this.circle.animate({ cx: newNode[0], cy: newNode[1] }, this.delay);
      this.pathString += `L${newNode[0]},${newNode[1]}`;
      this.currentNode[1] -= 1;
      this.ignoreInput(delay);
      this.path.animate({ d: this.pathString }, this.delay);
    } else { console.log('invalid position'); }
  }

  moveRight() {
    if (this.isValidNode([this.currentNode[0] + 1, this.currentNode[1]]) && !this.ignoringInput) {
      const newNode = this.getNode(this.currentNode[0] + 1, this.currentNode[1]);
      this.circle.animate({ cx: newNode[0], cy: newNode[1] }, this.delay);
      this.pathString += `L${newNode[0]},${newNode[1]}`;
      this.currentNode[0] += 1;
      this.ignoreInput(delay);
      this.path.animate({ d: this.pathString }, delay);
    } else { console.log('invalid position'); }
  }

  moveDown() {
    if (this.isValidNode([this.currentNode[0], this.currentNode[1] + 1]) && !this.ignoringInput) {
      const newNode = this.getNode(this.currentNode[0], this.currentNode[1] + 1);
      this.circle.animate({ cx: newNode[0], cy: newNode[1] }, this.delay);
      this.pathString += `L${newNode[0]},${newNode[1]}`;
      this.currentNode[1] += 1;
      this.ignoreInput(delay);
      this.path.animate({ d: this.pathString }, delay);
    } else { console.log('invalid position'); }
  }

  /* HELPER FUNCTIONS */
  getNode(x, y) {
    /* Enter a grid location (e.g., [0,2]) to get the x and y pixel
      values of that grid position. */
    const nodeX = this.nodes[x][y].x;
    const nodeY = this.nodes[x][y].y;
    return [nodeX, nodeY];
  }

  isValidNode(coordinates) {
    /* Called before any movement to determine if move is valid.
       Returns true if the destination node is a valid grid position
       (i.e., int between 0-4 for both x and y) AND the node has not
       previously been visited. */
    if (coordinates[0] < 0 || coordinates[0] > 4) { return false; }
    if (coordinates[1] < 0 || coordinates[1] > 4) { return false; }

    return !(this.visitedNodes.some((node) => { // eslint-disable-line
      return (node[0] === coordinates[0] && node[1] === coordinates[1]);
    }));
  }

  ignoreInput() {
    /* Issuing a movement command before a previous animation has completed causes some
      undesired animation and it looks pretty bad. ignoreInput is called when an animation
      begins in order to block input for it's duration. */
    this.ignoringInput = true;
    window.setTimeout(() => {
      this.ignoringInput = false;
    }, this.delay + 50);
  }

  /* SETUP */
  setup(snap) {
    this.ignoringInput = false;

    // render static grid and add coordinates to [nodes]
    for (let i = 0; i <= 5; i++) {
      const row = [];
      for (let j = 0; j <= 5; j++) {
        const pointX = cellWidth * i + hPadding;
        const pointY = cellHeight * j + vPadding;
        snap.circle(pointX, pointY, 10);

        row.push({ x: pointX, y: pointY });
      }
      this.nodes.push(row);
    }

    // render dynamic components
    this.redraw(snap);
  }

  redraw(snap) {
    /* redraw is called once during setup to render the main circle indicator
      and initialize the path. It can be called again at any point to reset
      the animation to its initial state. */

    // reset to default values
    this.visitedNodes = [[2, 2]];
    this.currentNode = [2, 2];
    this.pathString = `M${this.centerX},${this.centerY}`;

    if (this.path) { this.path.remove(); }
    if (this.circle) { this.circle.remove(); }

    // initialize path before circle because snap doesn't support z-index
    snap.circle(centerX, centerY, 10) // so the middle grid dot isnt visible
      .attr({ fill: lineColour, stroke: lineColour });

    this.path = snap.path(this.pathString)
      .attr({ stroke: lineColour, fill: 'none', strokeWidth: 20 });

    // circle indicator
    const node = this.getNode(2, 2);
    this.circle = snap.circle(node[0], node[1], 30)
      .attr({
        fill: lineColour,
        stroke: lineColour,
        strokeOpacity: 0.3,
        strokeWidth: 10,
      });
  }
}
