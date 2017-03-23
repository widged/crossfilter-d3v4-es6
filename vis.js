/* global d3 crossfilter reset */

// (It's CSV, but GitHub Pages only gzip's JSON at the moment.)
d3.csv('https://alexmacy.github.io/crossfilter/flights-3m.json', (error, flights) => {


// Various formatters.
const FORMATTERS = {
  number: d3.format(',d'),
  date: d3.timeFormat('%B %d, %Y'),
  change: d3.format('+,d'),
  time: d3.timeFormat('%I:%M %p')
}

  // A little coercion, since the CSV is untyped.
  flights.forEach((d, i) => {
    d.index = i;
    d.date = parseDate(d.date);
    d.delay = +d.delay;
    d.distance = +d.distance;
  });

  // Create the crossfilter for the relevant dimensions and groups.
  const flight = crossfilter(flights);

  const all = flight.groupAll();
  const date = flight.dimension(d => d.date);
  const dates = date.group(d3.timeDay);
  const hour = flight.dimension(d => d.date.getHours() + d.date.getMinutes() / 60);
  const hours = hour.group(Math.floor);
  const delay = flight.dimension(d => Math.max(-60, Math.min(149, d.delay)));
  const delays = delay.group(d => Math.floor(d / 10) * 10);
  const distance = flight.dimension(d => Math.min(1999, d.distance));
  const distances = distance.group(d => Math.floor(d / 50) * 50);

  const brushMove = () => {
    renderAll();
  }

  const charts = [

    (new BrushableHistogram({brushMove}))
      .dimension(hour)
      .group(hours)
      .x(d3.scaleLinear()
        .domain([0, 24])
        .rangeRound([0, 10 * 24])),

    (new BrushableHistogram({brushMove}))
      .dimension(delay)
      .group(delays)
      .x(d3.scaleLinear()
          .domain([-60, 150])
          .rangeRound([0, 10 * 21])),

    (new BrushableHistogram({brushMove}))
      .dimension(distance)
      .group(distances)
      .x(d3.scaleLinear()
        .domain([0, 2000])
        .rangeRound([0, 10 * 40])),

    (new BrushableHistogram({brushMove}))
      .dimension(date)
      .group(dates)
      .round(d3.timeDay.round)
      .x(d3.scaleTime()
        .domain([new Date(2001, 0, 1), new Date(2001, 3, 1)])
        .rangeRound([0, 10 * 90]))
      .filter([new Date(2001, 1, 1), new Date(2001, 2, 1)]),

  ];

  // Given our array of charts, which we assume are in the same order as the
  // .chart elements in the DOM, bind the charts to the DOM and render them.
  // We also listen to the chart's brush events to update the display.
  const chart = d3.selectAll('.chart')
    .data(charts);

  // Render the initial lists.
  const list = d3.selectAll('.list')
    .data([new FlightList({date, formatters: FORMATTERS})]);

  // Render the total.
  d3.selectAll('#total')
    .text(FORMATTERS.number(flight.size()));

  renderAll();

  // Renders the specified chart or list.
  function render(instance) {
    instance.render(d3.select(this));
  }

  // Whenever the brush moves, re-rendering everything.
  function renderAll() {
    chart.each(render);
    list.each(render);
    d3.select('#active').text(FORMATTERS.number(all.value()));
  }

  // Like d3.timeFormat, but faster.
  function parseDate(d) {
    return new Date(2001,
      d.substring(0, 2) - 1,
      d.substring(2, 4),
      d.substring(4, 6),
      d.substring(6, 8));
  }


  window.filter = filters => {
    filters.forEach((d, i) => { charts[i].filter(d); });
    renderAll();
  };

  window.reset = i => {
    charts[i].filter(null);
    renderAll();
  };

  

  

});
