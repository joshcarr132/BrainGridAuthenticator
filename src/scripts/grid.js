const WIDTH = 900;
const HEIGHT = 900;
const LINECOLOUR = 'coral';

const DELAY = 200; // length of the animation

export default class Grid {
  constructor(options) {
    // geometry
    if (!options) options = {};

    if (options.width) {
      this.width = options.width;
    } else { this.width = WIDTH; }

    if (options.height) {
      this.height = options.height;
    } else { this.height = HEIGHT; }

    if (options.lineColour) {
      this.lineColour = options.lineColour;
    } else { this.lineColour = LINECOLOUR; }

    if (options.delay) {
      this.delay = options.delay;
    } else { this.delay = DELAY; }

    if (options.startNode) {
      this.startNode = options.startNode;
    } else { this.startNode = [2, 2]; }

    this.cellWidth = this.width / 5;
    this.cellHeight = this.height / 5;
    this.hPadding = this.cellWidth / 2;
    this.vPadding = this.cellHeight / 2;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
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
      this.visitedNodes.push([...this.currentNode]);
      this.circle.animate({ cx: newNode[0], cy: newNode[1] }, this.delay);
      this.pathString += `L${newNode[0]},${newNode[1]}`;
      this.currentNode[0] -= 1;
      this.ignoreInput(this.delay);
      this.path.animate({ d: this.pathString }, this.delay);
    } else { console.log('invalid position'); }
  }

  moveUp() {
    if (this.isValidNode([this.currentNode[0], this.currentNode[1] - 1]) && !this.ignoringInput) {
      const newNode = this.getNode(this.currentNode[0], this.currentNode[1] - 1);
      this.visitedNodes.push([...this.currentNode]);
      this.circle.animate({ cx: newNode[0], cy: newNode[1] }, this.delay);
      this.pathString += `L${newNode[0]},${newNode[1]}`;
      this.currentNode[1] -= 1;
      this.ignoreInput(this.delay);
      this.path.animate({ d: this.pathString }, this.delay);
    } else { console.log('invalid position'); }
  }

  moveRight() {
    if (this.isValidNode([this.currentNode[0] + 1, this.currentNode[1]]) && !this.ignoringInput) {
      const newNode = this.getNode(this.currentNode[0] + 1, this.currentNode[1]);
      this.visitedNodes.push([...this.currentNode]);
      this.circle.animate({ cx: newNode[0], cy: newNode[1] }, this.delay);
      this.pathString += `L${newNode[0]},${newNode[1]}`;
      this.currentNode[0] += 1;
      this.ignoreInput(this.delay);
      this.path.animate({ d: this.pathString }, this.delay);
    } else { console.log('invalid position'); }
  }

  moveDown() {
    if (this.isValidNode([this.currentNode[0], this.currentNode[1] + 1]) && !this.ignoringInput) {
      const newNode = this.getNode(this.currentNode[0], this.currentNode[1] + 1);
      this.visitedNodes.push([...this.currentNode]);
      this.circle.animate({ cx: newNode[0], cy: newNode[1] }, this.delay);
      this.pathString += `L${newNode[0]},${newNode[1]}`;
      this.currentNode[1] += 1;
      this.ignoreInput(this.delay);
      this.path.animate({ d: this.pathString }, this.delay);
    } else { console.log('invalid position'); }
  }

  undo() {
    // undo the last move
    if (!this.ignoringInput && this.visitedNodes.length > 1) {
      this.currentNode = this.visitedNodes.pop();
      const newNode = this.getNode(this.currentNode[0], this.currentNode[1]);
      this.circle.animate({ cx: newNode[0], cy: newNode[1] }, this.delay);
      this.pathString = this.pathString.substring(0, this.pathString.lastIndexOf('L'));
      this.ignoreInput(this.delay);
      this.path.animate({ d: this.pathString }, this.delay);
    } else if (this.visitedNodes.length < 2) {
      console.log('no moves to undo!');
    }
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
    }, this.delay + 50); // add a small extra delay to be sure the animation finishes
  }

  /* SETUP */
  setup(snap) {
    this.ignoringInput = false;

    // render static grid and add coordinates to [nodes]
    for (let i = 0; i <= 5; i++) {
      const row = [];
      for (let j = 0; j <= 5; j++) {
        const pointX = this.cellWidth * i + this.hPadding;
        const pointY = this.cellHeight * j + this.vPadding;
        snap.circle(pointX, pointY, 10);

        row.push({ x: pointX, y: pointY });
      }
      this.nodes.push(row);
    }

    // render dynamic components
    this.redraw(snap, this.startNode);
  }

  redraw(snap, start = this.startNode) {
    /* redraw is called once during setup to render the main circle indicator
      and initialize the path. It can be called again at any point to reset
      the animation to its initial state.

      snap: the snap object
      start: an array with 2 elements that specifies the start position (e.g., [2, 1])
    */

    // reset to default values
    this.visitedNodes = [];
    this.currentNode = [...start];
    this.visitedNodes.push([...this.currentNode]);
    const newNodePx = this.getNode(this.currentNode[0], this.currentNode[1]);

    this.pathString = `M${newNodePx[0]},${newNodePx[1]}`;


    if (this.path) { this.path.remove(); }
    if (this.circle) { this.circle.remove(); }

    // initialize path before circle because snap doesn't support z-index
    snap.circle(newNodePx[0], newNodePx[1], 10) // so the middle grid dot isnt visible
      .attr({ fill: this.lineColour, stroke: this.lineColour });

    this.path = snap.path(this.pathString)
      .attr({ stroke: this.lineColour, fill: 'none', strokeWidth: 20 });

    // circle indicator
    this.circle = snap.circle(newNodePx[0], newNodePx[1], 30)
      .attr({
        fill: this.lineColour,
        stroke: this.lineColour,
        strokeOpacity: 0.3,
        strokeWidth: 10,
      });
  }
}
