// DEFAULTS
const WIDTH = 900;
const HEIGHT = 900;
const LINECOLOUR = 'coral';
const XPOINTS = 5;
const YPOINTS = 5;
const DELAY = 200;


// TODO: fix indentation (should be 2 spaces but it is 4 in some places)
// TODO: remove pathString from DB schema; it has to be recalculated every time based on window dimensions
export default class Grid {
  constructor(snap, options) {

    this.snap = snap;

    if (!options) {
      this.options = {};
    } else {
      this.options = options;
    }

    // set options
    if (this.options.template) {
      this.template = this.options.template;
    } else { this.template = this.createRandomPath('random', 8); }

    if (this.options.width) {
      this.width = this.options.width;
    } else { this.width = WIDTH; }

    if (this.options.height) {
      this.height = this.options.height;
    } else { this.height = HEIGHT; }

    if (this.options.lineColour) {
      this.lineColour = this.options.lineColour;
    } else { this.lineColour = LINECOLOUR; }

    if (this.options.delay) {
      this.delay = this.options.delay;
    } else { this.delay = DELAY; }

    if (this.options.xpoints) {
      this.xpoints = this.options.xpoints;
    } else { this.xpoints = XPOINTS; }

    if (this.options.ypoints) {
      this.ypoints = this.options.ypoints;
    } else { this.ypoints = YPOINTS; }


    // calculate geometry
   this.cellWidth = this.width / this.xpoints;
    this.cellHeight = this.height / this.ypoints;
    this.hPadding = this.cellWidth / 2;
    this.vPadding = this.cellHeight / 2;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.ignoringInput = true;


    // initialize svg objects
    this.s = null;
    this.pathString = '';
    this.path = null;
    this.circle = null;


    // initialize grid objects
    this.nodes = [];
    this.visitedNodes = [];
    this.moves = [];
    this.currentNode = [...this.template.start];
  }


  setup() {
    // create and render static elements
    this.ignoringInput = true;

    for (let i = 0; i <= this.xpoints - 1; i++) {
      const row = [];
      for (let j = 0; j <= this.ypoints - 1; j++) {
        const pointX = this.cellWidth * i + this.hPadding;
        const pointY = this.cellHeight * j + this.vPadding;
        this.snap.circle(pointX, pointY, 10);

        row.push({ x: pointX, y: pointY });
      }

      this.nodes.push(row);
    }

    this.redraw();
  }


  redraw(guide = false, reset = false) {
    if (reset) {
      this.visitedNodes = [];
      this.moves = [];
      this.currentNode = [...this.template.start];
      this.visitedNodes.push(this.currentNode);

      if (this.path) { this.path.remove(); }
      if (this.circle) { this.circle.remove(); }
    }

    if (guide) {
      // render the guide
      this.guidePath = snap.path(this.getPathString(this.template.start, this.template.moves))
        .attr({ fill: 'none', stroke: 'grey', strokeWidth: 20 });

      const guideCirclePx = this.getNodePx(...this.template.end);

      this.guideCircle = snap.circle(guideCirclePx[0], guideCirclePx[1])
        .attr({ fill: 'grey', stroke: 'grey' });
    }

    // initialize path
    this.pathString = this.getPathString(this.template.start, this.moves);

    const nodePx = this.getNodePx(...this.template.start);
    this.snap.circle(nodePx[0], nodePx[1], 10)
      .attr({ fill: this.lineColour, stroke: this.lineColour });

    this.path = this.snap.path(this.pathString)
      .attr({ stroke: this.lineColour, fill: 'none', strokeWidth: 20 });


    // circle position indicator
    const circlePx = this.getNodePx(this.currentNode[0], this.currentNode[1]);
    this.circle = this.snap.circle(circlePx[0], circlePx[1], 30)
      .attr({
        fill: this.lineColour,
        stroke: this.lineColour,
        strokeWidth: 10,
        strokeOpacity: 0.3,
      });

    this.ignoringInput = false;
  }


  getNodePx(x, y) {
    const nodeX = this.nodes[x][y].x;
    const nodeY = this.nodes[x][y].y;
    return [nodeX, nodeY];
  }


  getPathString(start, moves) {
    // return pathstring
    const cx = this.getNodePx(...this.template.start);
    let s = `M${cx[0]},${cx[1]}`;
    let newNode;

    moves.forEach((move) => {
      if (move === 'up') { newNode = [this.currentNode[0], this.currentNode[1] - 1]; }
      if (move === 'down') { newNode = [this.currentNode[0], this.currentNode[1] + 1]; }
      if (move === 'left') { newNode = [this.currentNode[0] - 1, this.currentNode[1]]; }
      if (move === 'right') { newNode = [this.currentNode[0] + 1, this.currentNode[1]]; }

      const newNodePx = this.getNodePx(...newNode);

      s += `L${newNodePx[0]},${newNodePx[1]}`;
    });

    return s;
  }


  createRandomPath(startNode = 'random', pathLength = 8, verbose = false) {
    // generate a random path of desired length and start point
    // uses dimensions of the current grid i.e., this.xpoints this.ypoints
    let start;

    if (startNode === 'random') {
      const x = Math.floor(Math.random() * this.xpoints);
      const y = Math.floor(Math.random() * this.ypoints);
      start = [x, y];
    } else {
      start = startNode;
    }

    const output = {};
    output.moves = [];
    output.start = start;

    const moveOptions = {
      up    : [-1, 0],
      right : [0, 1],
      down  : [1, 0],
      left  : [0, -1],
    };

    const visited = [];
    const deadEnds = [];
    const matrix = [];

    for (let i = 0; i < this.xpoints; i++) {
      matrix[i] = new Array(this.ypoints).fill(0);
      console.log(matrix);
      // TODO confirm x and y are correct
    }

    let currentNode = [...start];
    visited.push(currentNode);
    matrix[currentNode[0]][currentNode[1]] = 1;


    let i = 0;
    while (i < pathLength) {
      const validOptions = [];

      for (const opt of moveOptions) {
        const option = moveOptions[opt];
        const candidateX = currentNode[0] + option[0];
        const candidateY = currentNode[1] + option[1];

        if (this.isValidNode(candidateX, candidateY, visited, deadEnds)) {
          validOptions.push([moveOptions[opt], opt]);
        }
      // });
      }

      if (validOptions.length > 0) {
        const choice = Math.floor(Math.random() * validOptions.length);
        const move = validOptions[choice][0];

        currentNode = [currentNode[0] + move[0], currentNode[1] + move[1]];
        visited.push(currentNode);
        output.moves.push(validOptions[choice][1]);
        matrix[currentNode[0]][currentNode[1]] = 1;
        i++;
      } else {
        deadEnds.push(currentNode);
        matrix[currentNode[0]][currentNode[1]] = 0;
        currentNode = visited.pop();
        output.moves.pop();
        i--;
      }

      if (verbose) {
        console.log(matrix);
      }
    }

    output.end = currentNode;
    return output;
  }

  isValidNode(x, y, visitedList = this.visitedNodes, deadEnds = null) {
    if (x < 0 || x > this.xpoints - 1) { return false; }
    if (y < 0 || y > this.ypoints - 1) { return false; }

    if (visitedList.some(node => (node[0] === x && node[1] === y))) {
      return false;
    }

    if (deadEnds && deadEnds.some(node => (node[0] === x && node[1] === y))) {
      return false;
    }

    return true;
  }

  ignoreInput(delay = this.delay) {
    this.ignoringInput = true;
    window.setTimeout(() => {
      this.ignoringInput = false;
    }, delay + 50);
  }


  move(dir) {
    let newNode;
    if (dir === 'up')    { newNode = [this.currentNode[0], this.currentNode[1] - 1]; }
    if (dir === 'down')  { newNode = [this.currentNode[0], this.currentNode[1] + 1]; }
    if (dir === 'left')  { newNode = [this.currentNode[0] - 1, this.currentNode[1]]; }
    if (dir === 'right') { newNode = [this.currentNode[0] + 1, this.currentNode[1]]; }


    if (this.isValidNode(newNode[0], newNode[1], this.visitedNodes) && !this.ignoringInput) {
      const newNodePx = this.getNodePx(newNode[0], newNode[1]);
      this.visitedNodes.push([...this.currentNode]);
      this.pathString += `L${newNodePx[0]},${newNodePx[1]}`;
      this.moves.push(dir);
      this.currentNode = newNode;
      this.ignoreInput();
      this.circle.animate({ cx: newNodePx[0], cy: newNodePx[1] }, this.delay);
      this.path.animate({ d: this.pathString }, this.delay);
    } else {
      console.log('invalid position');
      // TODO maybe add a visual indicator
    }
  }


  undo() {
    if (this.visitedNodes.length <= 1) { console.log('no moves to undo'); }
    if (!this.ignoringInput) {
      this.currentNode = this.visitedNodes.pop();
      this.moves.pop();
      const newNodePx = this.getNodePx(this.currentNode[0], this.currentNode[1]);
      this.pathString = this.pathString.substring(0, this.pathString.lastIndexOf('L'));
      this.ignoreInput();
      this.circle.animate({ cx: newNodePx[0], cy: newNodePx[1] }, this.delay);
      this.path.animate({ d: this.pathString }, this.delay);
    }
  }
}
