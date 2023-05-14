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

      gifWorker.onmessage = (event) => {
        if (event.data.event === 'sharedArrayUpdate') {
          this.updateGifs();
        }        
      };    

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
      
      loadGifAsSpritesheet = async (gifItem, index) => {
        let url = this.config.proxy+gifItem.config.nft.imageURLs[0];
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const gifData = parseGIF(buffer);
        const frames = decompressFrames(gifData, true);
      
        const spritesheetCanvas = this.createSpritesheet(frames);
        const spritesheetTexture = new THREE.CanvasTexture(spritesheetCanvas);
        spritesheetTexture.matrixAutoUpdate = true;
        spritesheetTexture.repeat.set(1 / frames.length, 1);
        gifItem.spritesheetTexture = spritesheetTexture;
        gifItem.frames = frames;
        gifItem.gifCount = this.gifCount;
        return gifItem;
      }

      loadGifs = async (gifs) => {
        let that = this;
        this.gifs =gifs;
        this.gifCount = this.gifs.length;
        const sharedBuffer = new SharedArrayBuffer(Float64Array.BYTES_PER_ELEMENT * (1 + gifs.length * 5));
        this.sharedArray = new Float64Array(sharedBuffer);
        await Promise.all(this.gifs.map(this.loadGifAsSpritesheet));      
        let frameSets = [];
        this.gifs.forEach((gifItem, index) => {
          let gifArrayIndex = 1 + that.gifCount + index;
          that.gifs[index].offset = that.sharedArray[gifArrayIndex];
          that.gifs[index].sharedArray = that.sharedArray;
          that.gifs[index].gifIndex = index;
          frameSets.push(gifItem.frames);
        });
        this.frameSets = frameSets;
        gifWorker.postMessage({
          sharedBuffer,
          frameSets
        });
      }

      updateGifs = ()=>{
        let that = this;
        this.gifs.forEach((gifItem, index) => {
          if(gifItem.mesh){
            if ((gifItem.mesh.material)&&(gifItem.sharedArray)) {

                  let xOffSet = that.sharedArray[1 + that.gifCount + index];
                  gifItem.mesh.material[5].map.offset.x =xOffSet;
                
           
            }
          }
      });        
      }

}
export {Giffer}