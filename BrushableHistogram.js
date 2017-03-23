class BrushableHistogram {

  constructor(props) {

    const {brushMove} = props;
    if(typeof brushMove !== "function") { brushMove = () => {}; }
    if (!BrushableHistogram.id) BrushableHistogram.id = 0;

    const margin = { top: 10, right: 13, bottom: 20, left: 10 };
    const x = 0;
    const y = d3.scaleLinear().range([100, 0]);
    const axis = d3.axisBottom();
    const brush = d3.brushX();

    this.state = {
      id: BrushableHistogram.id++,
      margin,
      x, y,
      axis,
      dimension : undefined,
      group : undefined,
      round : undefined,
      brush,
      brushMove,
      brushDirty : undefined,
      gBrush : undefined
    };
    this.bound = {
      barPath: this.barPath.bind(this),
      resizeHandlePath: this.resizeHandlePath.bind(this)
    }
  }


  render(div) {
    const {x,y, margin, group, id, axis, brush, gBrush, brushMove, brushDirty} = this.state;
    const {barPath, resizeHandlePath} = this.bound;

    console.log("[brushDirty]", brushDirty)

    const width = x.range()[1];
    const height = y.range()[0];
    this.state.height = height;

    brush.extent([[0, 0], [width, height]]);

    y.domain([0, group.top(1)[0].value]);

    let gBrushx;

    div.each((d, i, nodes) => {
      const node = nodes[i];
      const div = d3.select(node);
      let g = div.select('g');

      // Create the skeletal chart.
      if (g.empty()) {
        div.select('.title').append('a')
          .attr('href', `javascript:reset(${id})`)
          .attr('class', 'reset')
          .text('reset')
          .style('display', 'none');

        g = div.append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        g.append('clipPath')
          .attr('id', `clip-${id}`)
          .append('rect')
            .attr('width', width)
            .attr('height', height);

        g.selectAll('.bar')
          .data(['background', 'foreground'])
          .enter().append('path')
            .attr('class', d => `${d} bar`)
            .datum(group.all());


        g.selectAll('.foreground.bar')
          .attr('clip-path', `url(#clip-${id})`);

        g.append('g')
          .attr('class', 'axis')
          .attr('transform', `translate(0,${height})`)
          .call(axis);


        // Initialize the brush component with pretty resize handles.
        this.state.gBrush = g.append('g')
          .attr('class', 'brush')
          .call(brush);

        this.state.gBrush.selectAll('.handle--custom')
            .data([{ type: 'w' }, { type: 'e' }])
            .enter().append('path')
              .attr('class', 'brush-handle')
              .attr('cursor', 'ew-resize')
              .attr('d', resizeHandlePath)
              .style('display', 'none');


      }

      // Only redraw the brush if set externally.
      if (brushDirty !== false) {
        const filterVal = brushDirty;
        this.state.brushDirty = false;

        div.select('.title a').style('display', d3.brushSelection(div) ? null : 'none');

        if (!filterVal) {
          g.call(brush);

          g.selectAll(`#clip-${id} rect`)
            .attr('x', 0)
            .attr('width', width);

          g.selectAll('.brush-handle').style('display', 'none');
          brushMove();
        } else {
          const range = filterVal.map(x);
          brush.move(this.state.gBrush, range);
          this.resetBrush(g, id, range)
        }
      }

      g.selectAll('.bar').attr('d', barPath);
    });

    this.initializeBrush();

    return this;
  }

  initializeBrush() {
    const {id, x, dimension, brush, round, brushMove} = this.state;
    const resetBrush = this.resetBrush.bind(this);

    brush.on('start.chart', function () {
      const div = d3.select(this.parentNode.parentNode.parentNode);
      div.select('.title a').style('display', null);
    });

    brush.on('brush.chart', function () {
      const g = d3.select(this.parentNode);
      const brushRange = d3.event.selection || d3.brushSelection(this); // attempt to read brush range
      const xRange = x && x.range(); // attempt to read range from x scale
      let activeRange = brushRange || xRange; // default to x range if no brush range available

      const hasRange = activeRange &&
        activeRange.length === 2 &&
        !isNaN(activeRange[0]) &&
        !isNaN(activeRange[1]);

      if (!hasRange) return; // quit early if we don't have a valid range

      // calculate current brush extents using x scale
      let extents = activeRange.map(x.invert);

      // if rounding fn supplied, then snap to rounded extents
      // and move brush rect to reflect rounded range bounds if it was set by user interaction
      if (round) {
        extents = extents.map(round);
        activeRange = extents.map(x);

        if (
          d3.event.sourceEvent &&
          d3.event.sourceEvent.type === 'mousemove'
        ) {
          d3.select(this).call(brush.move, activeRange);
        }
      }

      resetBrush(g, id, activeRange);

      // filter the active dimension to the range extents
      dimension.filterRange(extents);

      // re-render the other charts accordingly
      brushMove();
    });


    brush.on('end.chart', function () {
      // reset corresponding filter if the brush selection was cleared
      // (e.g. user "clicked off" the active range)
      if (!d3.brushSelection(this)) {
        reset(id);
      }
    });


  }

    resetBrush(parent, id, activeRange) {
      // move brush handles to start and end of range
      parent.selectAll('.brush-handle')
        .style('display', null)
        .attr('transform', (d, i) => `translate(${activeRange[i]}, 0)`);

      // resize sliding window to reflect updated range
      parent.select(`#clip-${id} rect`)
        .attr('x', activeRange[0])
        .attr('width', activeRange[1] - activeRange[0]);
      
    }

  // bound

    barPath(groups) {
      const {x, y, height} = this.state;
      let path = [];
      let i = -1;
      const n = groups.length;
      let d, pth;
      while (++i < n) {
        d = groups[i];
        pth = ['M', x(d.key), ',', height, 'V', y(d.value), 'h9V', height];
        path = path.concat(pth);
      }
      return path.join('');
    }

    resizeHandlePath(d) {
      const {height} = this.state;
      const rounding = (n, p) => {
        if(p === undefined || p === 0) { return Math.round(n); }
        if(p < 0) { return n; }
        const pow = Math.pow(10, 2);
        return Math.round(n * pow) / pow;
      }

      const e = +(d.type === 'e');
      const x = e ? 1 : -1;
      const y = rounding(height / 3);
      const pth = `M${rounding(0.5 * x)},${y}A6,6 0 0 ${e} ${rounding(6.5 * x)},${y + 6}V${2 * y - 6}A6,6 0 0 ${e} ${0.5 * x},${2 * y}ZM${2.5 * x},${y + 8}V${2 * y - 8}M${4.5 * x},${y + 8}V${2 * y - 8}`;
      return pth;
    }


  // accessors  

  margin (_) {
    const {margin} = this.state;
    if (!arguments.length) return margin;
    margin = _;
    return this;
  }

  x (_) {
    const {axis} = this.state;
    if (!arguments.length) return this.state.x;
    this.state.x = _;
    axis.scale(this.state.x);
    return this;
  }

  y (_) {
    if (!arguments.length) return this.state.y;
    this.state.y = _;
    return this;
  }

  dimension (_) {
    if (!arguments.length) return this.state.dimension;
    this.state.dimension = _;
    return this;
  }

  filter (_) {
    console.log('[filter]', _)
    if (!_) this.state.dimension.filterAll();
    this.state.brushDirty = _;
    return this;
  }

  group (_) {
    if (!arguments.length) return this.state.group;
    this.state.group = _;
    return this;
  }

  round (_) {
    if (!arguments.length) return this.state.round;
    this.state.round = _;
    return this;
  }

  gBrush () {
    return this.state.gBrush;
  }


}

