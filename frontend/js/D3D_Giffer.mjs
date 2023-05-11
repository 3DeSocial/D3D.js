import { parseGIF, decompressFrames } from 'gifuct-js';

export default class Giffer {

    //interface for deso api based on passed config
    constructor(config){
        let defaults = {
              proxy:''
        };
    
        this.config = {
            ...defaults,
            ...config
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
      
      loadGifAsSpritesheet = async (gifItem) => {
        console.log('loadGifAsSpritesheet: ',gifItem);
        let url = this.config.proxy+gifItem.config.nft.imageURLs[0];
        console.log('gifUrl: ', url);
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const gifData = parseGIF(buffer);
        const frames = decompressFrames(gifData, true);
      
        const spritesheetCanvas = createSpritesheet(frames);
        const spritesheetTexture = new THREE.CanvasTexture(spritesheetCanvas);
        spritesheetTexture.repeat.set(1 / frames.length, 1);
        gifItem.spritesheetTexture = spritesheetTexture;
        gifItem.frames = frames;
        gifItem.updateTexture(spritesheetTexture);
        return gifItem;
      }

      loadGifs = async (gifs) => {

        const sharedBuffer = new SharedArrayBuffer(Float64Array.BYTES_PER_ELEMENT * (1 + gifs.length * 5));
        const sharedArray = new Float64Array(sharedBuffer);
        const gifItems = await Promise.all(gifs.map(this.loadGifAsSpritesheet));      
        console.log('gifs loaded: ',gifItems);
        let frameSets = [];
        gifItems.forEach((gifItem, index) => {
          frameSets.push(gifItem.frames);
        });
      }

}
export {Giffer}