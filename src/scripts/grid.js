// DEFAULTS
const WIDTH      = 900;
const HEIGHT     = 900;
const LINECOLOUR = 'coral';
const XPOINTS    = 5;
const YPOINTS    = 5;
const DELAY      = 200;


export default class Grid {
  constructor(snap, options) {
    this.snap = snap;

    if (!options) {
      this.options = {};
    } else {
      this.options = options;
    }

    if (this.options.width) {
      this.width = this.options.width;
    } else {
      this.width = WIDTH;
    }

    if (this.options.height) {
      this.height = this.options.height;
    } else {
      this.height = HEIGHT;
    }

    if (this.options.lineColour) {
      this.lineColour = this.options.lineColour;
    } else {
      this.lineColour = LINECOLOUR;
    }

    if (this.options.delay) {
      this.delay = this.options.delay;
    } else {
      this.delay = DELAY;
    }

    if (this.options.xpoints) {
      this.xpoints = this.options.xpoints;
    } else {
      this.xpoints = XPOINTS;
    }

    if (this.options.ypoints) {
      this.ypoints = this.options.ypoints;
    } else {
      this.ypoints = YPOINTS;
    }


    if (this.options.template) {
      this.template = this.options.template;
      this.start = this.template[0].start;
    } else {
      this.createMode = true;
      this.assignNewTemplate(this.createRandomPath());
    }

    // calculate geometry
    this.cellWidth  = this.width / this.xpoints;
    this.cellHeight = this.height / this.ypoints;
    this.hPadding   = this.cellWidth / 2;
    this.vPadding   = this.cellHeight / 2;
    this.centerX    = this.width / 2;
    this.centerY    = this.height / 2;


    // initialize svg objects
    this.s          = null;
    this.pathString = '';
    this.path       = null;
    this.circle     = null;


    // initialize grid objects
    this.nodes        = [];
    this.visitedNodes = [];
    this.moves        = [];
    this.currentNode  = this.start;
    this.guideVisible = false;


    this.ignoringInput = true;
  }


  setup() {
    // create and render static elements
    // create array of pixel values for all nodes
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


  redraw(reset = false) {
    // redraw all dynamic elements (circle, lines)
    // if reset = true, will reset everything to starting position

    if (this.path) { this.path.remove(); }
    if (this.circle) { this.circle.remove(); }

    if (reset) {
      this.visitedNodes = [];
      this.moves        = [];
      this.currentNode  = this.start;
      this.visitedNodes.push(this.currentNode);

      if (this.path)   { this.path.remove(); }
      if (this.circle) { this.circle.remove(); }
    }

    // initialize path
    this.pathString = this.getTemplate(this.start, this.moves).pathString;
    const nodePx    = this.getNodePx(...this.start);

    this.snap.circle(nodePx[0], nodePx[1], 10)
      .attr({ fill: this.lineColour, stroke: this.lineColour });

    this.path = this.snap.path(this.pathString)
      .attr({ stroke: this.lineColour, fill: 'none', strokeWidth: 20 });

    // circle position indicator
    const circlePx = this.getNodePx(this.currentNode[0], this.currentNode[1]);
    this.circle    = this.snap.circle(circlePx[0], circlePx[1], 30)
      .attr({
        fill:          this.lineColour,
        stroke:        this.lineColour,
        strokeWidth:   10,
        strokeOpacity: 0.3,
      });

    this.ignoringInput = false;
  }


  move(dir) {
    let newNode;

    // TODO: this could be a method
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


  getNodePx(x, y) {
    const nodeX = this.nodes[x][y].x;
    const nodeY = this.nodes[x][y].y;
    return [nodeX, nodeY];
  }


  getTemplate(startNode, moves) {
    // given a start node and a set of moves, return string of pixel locations
    // of path and end node

    const cx = this.getNodePx(...startNode);

    let s        = `M${cx[0]},${cx[1]}`;
    let newNode  = startNode;
    let lastNode = startNode;

    // TODO: make function
    moves.forEach((move) => {
      if (move === 'up')    { newNode = [lastNode[0], lastNode[1] - 1]; }
      if (move === 'down')  { newNode = [lastNode[0], lastNode[1] + 1]; }
      if (move === 'left')  { newNode = [lastNode[0] - 1, lastNode[1]]; }
      if (move === 'right') { newNode = [lastNode[0] + 1, lastNode[1]]; }

      const newNodePx = this.getNodePx(...newNode);

      s += `L${newNodePx[0]},${newNodePx[1]}`;

      lastNode = newNode;
    });

    // the last point assigned to lastNode will be the end node of the path

    return { pathString: s, endNode: lastNode };
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

    // TODO: need a function for this!
    const moveOptions = {
      up   : [0, -1],
      down : [0, 1],
      left : [-1, 0],
      right: [1, 0],
    };

    const visited  = [];
    const deadEnds = [];
    const matrix   = [];

    for (let i = 0; i < this.xpoints; i++) {
      matrix[i] = new Array(this.ypoints).fill(0);
    }

    let currentNode = [...start];
    visited.push(currentNode);
    matrix[currentNode[0]][currentNode[1]] = 1;


    let i = 0;
    while (i < pathLength) {
      const validOptions = [];

      for (const opt of Object.keys(moveOptions)) {
        const option = moveOptions[opt];
        const candidateX = currentNode[0] + option[0];
        const candidateY = currentNode[1] + option[1];

        if (this.isValidNode(candidateX, candidateY, visited, deadEnds)) {
          validOptions.push([moveOptions[opt], opt]);
        }
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


  assignNewTemplate(newTemplate) {
    this.template = newTemplate;
    this.start = newTemplate.start;
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


  showGuide() {
    // render the guide
    this.guidePath = this.snap.path(this.getTemplate(this.template.start, this.template.moves).pathString)
      .attr({ fill: 'none', stroke: 'grey', strokeWidth: 20 });

    const guideCirclePx = this.getNodePx(...this.template.end);

    this.guideCircle = this.snap.circle(guideCirclePx[0], guideCirclePx[1], 15)
      .attr({ fill: 'grey', stroke: 'grey' });

    this.guideVisible = true;
    this.redraw();
  }

  hideGuide() {
    if (this.guidePath)   { this.guidePath.remove(); }
    if (this.guideCircle) { this.guideCircle.remove(); }

    this.guideVisible = false;
    this.redraw();
  }

  toggleShowGuide() {
    if (this.guideVisible) {
      this.hideGuide();
    } else {
      this.showGuide();
    }
  }
}
