import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { createHmac } from 'crypto';
import * as path from 'path';
import which from 'which';

const PLUGIN_NAME = 'remark-mermaid';

/**
 * Accepts the `source` of the graph as a string, and render an SVG using
 * mermaid.cli. Returns the path to the rendered SVG.
 *
 * @param  {string} source
 * @param  {string} destination
 * @return {string}
 */
export const render = async (source, destination, vFile) => {
  const unique = createHmac('sha1', PLUGIN_NAME).update(source).digest('hex');
  const mmdcExecutable = which.sync('mmdc');
  const mmdPath = path.join(destination, `${unique}.mmd`);
  const svgFilename = `${unique}.svg`;
  const svgPath = path.join(destination, svgFilename);

  try {
    await fs.writeFile(mmdPath, source);
    execSync(`${mmdcExecutable} -i ${mmdPath} -o ${svgPath} -b transparent`);
  } catch (error) {
    throw new Error(`Failed to render Mermaid graph: ${error.message}`);
  } finally {
    await fs.unlink(mmdPath);
  }
  return `/assets/images/${svgFilename}`;
};

/**
 * Accepts the `source` of the graph as a string, and render an SVG using
 * mermaid.cli. Returns the path to the rendered SVG.
 *
 * @param  {string} destination
 * @param  {string} source
 * @return {string}
 */
export const renderFromFile = (inputFile, destination) => {
  const unique = createHmac('sha1', PLUGIN_NAME).update(inputFile).digest('hex');
  const mmdcExecutable = which.sync('mmdc');
  const svgFilename = `${unique}.svg`;
  const svgPath = path.join(destination, svgFilename);

  // Invoke mermaid.cli
  try {
    execSync(`${mmdcExecutable} -i ${inputFile} -o ${svgPath} -b transparent`);
  } catch (error) {
    throw new Error(`Failed to render Mermaid graph from file: ${error.message}`);
  }
  return `./${svgFilename}`;
}

/**
 * Returns the destination for the SVG to be rendered at, explicity defined
 * using `vFile.data.destinationDir`, or falling back to the file's current
 * directory.
 *
 * @param {vFile} vFile
 * @return {string}
 */
export const getDestinationDir = (vFile) => {
  return path.join(path.resolve(), '/public/assets/images')
  // return vFile.data.destinationDir ?? vFile.dirname;
}

/**
 * Given the contents, returns a MDAST representation of a HTML node.
 *
 * @param  {string} contents
 * @return {object}
 */
export const createMermaidDiv = (contents) => {
  return {
    type: 'html',
    value: `<div class="mermaid">
  ${contents}
</div>`,
  };
}

