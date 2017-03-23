// A nest operator, for grouping the flight list.
const nestByDate = d3.nest()
	.key(d => d3.timeDay(d.date));

class FlightList {
	constructor(props) {
		this.props = props;
		this.state = {};
	}
    render(div) {
    	const {date, formatters} =  this.props;
	    const flightsByDate = nestByDate.entries(date.top(40));

	    div.each(function () {
	      const date = d3.select(this).selectAll('.date')
	        .data(flightsByDate, d => d.key);

	      date.exit().remove();

	      date.enter().append('div')
	        .attr('class', 'date')
	        .append('div')
	          .attr('class', 'day')
	          .text(d => formatters.date(d.values[0].date))
	        .merge(date);


	      const flight = date.order().selectAll('.flight')
	        .data(d => d.values, d => d.index);

	      flight.exit().remove();

	      const flightEnter = flight.enter().append('div')
	        .attr('class', 'flight');

	      flightEnter.append('div')
	        .attr('class', 'time')
	        .text(d => formatters.time(d.date));

	      flightEnter.append('div')
	        .attr('class', 'origin')
	        .text(d => d.origin);

	      flightEnter.append('div')
	        .attr('class', 'destination')
	        .text(d => d.destination);

	      flightEnter.append('div')
	        .attr('class', 'distance')
	        .text(d => `${formatters.number(d.distance)} mi.`);

	      flightEnter.append('div')
	        .attr('class', 'delay')
	        .classed('early', d => d.delay < 0)
	        .text(d => `${formatters.change(d.delay)} min.`);

	      flightEnter.merge(flight);

	      flight.order();
    });
  }
}