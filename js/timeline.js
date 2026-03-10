import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export default class Timeline {
  constructor(parentElement, data){
    this._parentElement = parentElement;
    this._data = data;
    this._displayData = data;
  }

  initVis() {
    let vis = this;

    vis.margin = {top: 0, right: 40, bottom: 30, left: 40};

    vis.width = document.getElementById(vis._parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
    vis.height = Math.max(60, document.getElementById(vis._parentElement).getBoundingClientRect().height) - vis.margin.top - vis.margin.bottom;

    // SVG drawing area
    vis.svg = d3.select("#" + vis._parentElement).append("svg")
      .attr("width", vis.width + vis.margin.left + vis.margin.right)
      .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // Scales and axes (years are numeric)
    vis.x = d3.scaleLinear()
      .range([0, vis.width])
      .domain(d3.extent(vis._displayData, d => d.year));

    vis.y = d3.scaleLinear()
      .range([vis.height, 0])
      .domain([0, d3.max(vis._displayData, d => d.count) || 1]);

    vis.xAxis = d3.axisBottom()
      .scale(vis.x).tickFormat(d3.format("d"));

    vis.area = d3.area()
      .x(d => vis.x(d.year))
      .y0(vis.height)
      .y1(d => vis.y(d.count));

    vis.svg.append("path")
      .datum(vis._displayData)
      .attr("fill", "#ccc")
      .attr("d", vis.area);

    vis.brush = d3.brushX()
      .extent([[0,0],[vis.width, vis.height]])
      .on("brush", function(event) {
        if (event.selection && window.brushed) {
          const sel = event.selection.map(px => Math.round(vis.x.invert(px)));
          window.brushed(sel);
        } else if (!event.selection && window.brushed) {
          window.brushed(null);
        }
      })
      .on("end", function(event) {
        if (event.selection && window.brushed) {
          const sel = event.selection.map(px => Math.round(vis.x.invert(px)));
          window.brushed(sel);
        } else if (!event.selection && window.brushed) {
          window.brushed(null);
        }
      });

    vis.svg.append("g")
      .attr("class", "brush")
      .call(vis.brush);

    // Append x-axis
    vis.svg.append("g")
      .attr("class", "x-axis axis")
      .attr("transform", "translate(0," + vis.height + ")")
      .call(vis.xAxis);
  }
}
