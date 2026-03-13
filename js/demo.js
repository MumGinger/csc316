import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const demoWidth = 400;
const demoHeight = 300;
const centerX = demoWidth / 2;
const centerY = demoHeight / 2;

const demoSvg = d3.select("#demo")
  .append("svg")
  .attr("viewBox", `0 0 ${demoWidth} ${demoHeight}`)
  .style("width", "100%")
  .style("height", "auto")

const satG = demoSvg.append("g")
  .attr("transform", `translate(${centerX + 160}, ${centerY})`) 
  .style("cursor", "pointer");

const satDot = satG.append("circle")
  .attr("r", 4)
  .attr("fill", "#ffd166")
  .style("stroke", "transparent")
  .style("stroke-width", "25px");

const demoLabel = demoSvg.append("text")
  .attr("x", 20)
  .attr("y", 40)
  .style("fill", "#fff")
  .style("font-family", "system-ui, sans-serif")
  .style("font-size", "14px")
  .style("font-weight", "bold")
  .text("Hover the satellite to inspect");

satG.on("mouseenter", () => {
  satDot.transition().duration(100).attr("r", 8).attr("fill", "#fff");
  demoLabel.text("ISS - International Space Station").style("fill", "#ffd166");
  
  demoSvg.append("g")
    .attr("class", "stats")
    .attr("transform", "translate(20, 70)")
    .html(`
      <text y="0" fill="#a0c4ff" font-size="12" font-family="sans-serif">Velocity: 7.66 km/s</text>
      <text y="20" fill="#a0c4ff" font-size="12" font-family="sans-serif">Altitude: 408 km</text>
      <text y="40" fill="#a0c4ff" font-size="12" font-family="sans-serif">Inclination: 51.6°</text>
    `);
}).on("mouseleave", () => {
  satDot.transition().duration(200).attr("r", 4).attr("fill", "#ffd166");
  demoLabel.text("Hover the satellite to inspect").style("fill", "#fff");
  demoSvg.selectAll(".stats").remove();
});