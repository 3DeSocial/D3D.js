import * as THREE from 'three';
import { parseGIF, decompressFrames } from 'gifuct-js';
let gifWorker = null;
export default class Giffer {

    //interface for deso api based on passed config
    constructor(config){
        let defaults = {
              proxy:'',
              gifWorker: null

        };
    
        this.config = {
            ...defaults,
            ...config
        };
      this.loadWorker('/api/worker/gifWorker.js');
      this.gifs = [];
    }

    loadWorker = async (workerURL) => {
      gifWorker = new Worker(workerURL, { type: "module" });
    }

    createSpritesheet = (frames) => {
        const spritesheetCanvas = document.createElement('canvas');
        spritesheetCanvas.width = frames[0].dims.width * frames.length;
        spritesheetCanvas.height = frames[0].dims.height;
        spritesheetCanvas.style.display = 'none';
        const ctx = spritesheetCanvas.getContext('2d');
      
        frames.forEach((frame, index) => {
          const frameImageData = new ImageData(
            new Uint8ClampedArray(frame.patch.buffer),
            frame.dims.width,
            frame.dims.height
          );
          ctx.putImageData(frameImageData, index * frame.dims.width, 0);
        });
      
        return spritesheetCanvas;
      }
      
      loadGifAsSpritesheet = async (gifItem) => {
        console.log('loadGifAsSpritesheet: ',gifItem);
        let url = this.config.proxy+gifItem.config.nft.imageURLs[0];
        console.log('gifUrl: ', url);
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const gifData = parseGIF(buffer);
        const frames = decompressFrames(gifData, true);
      
        const spritesheetCanvas = this.createSpritesheet(frames);
        const spritesheetTexture = new THREE.CanvasTexture(spritesheetCanvas);
        spritesheetTexture.repeat.set(1 / frames.length, 1);
        gifItem.spritesheetTexture = spritesheetTexture;
        gifItem.frames = frames;
        gifItem.updateTexture(spritesheetTexture);
        return gifItem;
      }

      loadGifs = async (gifs) => {
        this.gifs =[...this.gifs, ...gifs];
        this.gifCount = this.gifs.length;
        const sharedBuffer = new SharedArrayBuffer(Float64Array.BYTES_PER_ELEMENT * (1 + gifs.length * 5));
        this.sharedArray = new Float64Array(sharedBuffer);
        const gifItems = await Promise.all(gifs.map(this.loadGifAsSpritesheet));      
        console.log('gifs loaded: ',gifItems);
        let frameSets = [];
        gifItems.forEach((gifItem, index) => {
          frameSets.push(gifItem.frames);
        });
        this.frameSets = frameSets;
        console.log('sending message to wokrer: ',gifWorker);
        gifWorker.postMessage({
          sharedBuffer,
          frameSets
        });
      }

      updateGifs = ()=>{
        let that = this;
        this.gifs.forEach((gifItem, index) => {
        if (gifItem.mesh.material.map) {
          let xOffSet = that.sharedArray[1 + that.gifCount.length + index] / that.frameSets[index].length;
          console.log(xOffSet);
          gifItem.mesh.material.map.offset.x = xOffSet;
        }
      });        
      }

}
export {Giffer}