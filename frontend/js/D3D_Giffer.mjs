export default class Giffer {

    //interface for deso api based on passed config
    constructor(config){
        let defaults = {
              
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
      };
      
      loadGifAsSpritesheet = async (url) => {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);
      
        const spritesheetCanvas = createSpritesheet(frames);
        const spritesheetTexture = new THREE.CanvasTexture(spritesheetCanvas);
        spritesheetTexture.repeat.set(1 / frames.length, 1);
      
        return [spritesheetTexture, frames];
      };    

      loadGifs = async (gifUrls) => {
      }

}
export {Giffer}