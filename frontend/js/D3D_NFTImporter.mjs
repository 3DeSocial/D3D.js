import { Item, SceneryLoader, ExtraData3DParser } from 'd3d';

export default class NFTImporter {

    constructor(config){

        let defaults = {
            animLoader: true,
            isAvatar: false,
            width: 3, 
            height:3, 
            depth:3,
            modelsRoute: null, // endpoint for model storage on this node
            scene: null,
            owner: {
                ownerName: 'Unknown',
                ownerPublicKey: null,
                ownerDescription: null
            }
        };

        this.config = {
            ...defaults,
            ...config
        };
        console.log('NFTImporter this.config: ', this.config);

    }

    import =  async (nftParams) =>{
        // returns promise that resolves in an Item, ready to be placed in a 3D environment
        return new Promise((resolve, reject) => { 

            // fetch metadata from blockchain
            this.fetchMeta(nftParams.nftPostHashHex).then((nftMeta)=>{

                let itemConfig = this.processMeta(nftParams, nftMeta);
                let importedItem = itemConfig; // return config by default

                // or instantiate requested assetType class
                switch(nftParams.assetType){
                    case 'scenery':
                        // create config for 3D asset class
                        importedItem = new SceneryLoader(itemConfig);
                        break;
                    case 'item':
                    case 'avatar':
                        // create config for 3D asset class
                        importedItem = new Item(itemConfig);
                        break;                  
                };

                resolve(importedItem);
            }).catch(err=>{
                reject(err);
            })
        })
    }

    fetchMeta = async (postHashHex) =>{
        return new Promise((resolve, reject) => {

            this.config.chainAPI.fetchPostDetail({postHashHex:postHashHex}).then((res)=>{
                res.json().then((json)=>{
                        console.log('got nft meta', json);
                    let extraDataString = null;
                    if(json.PostExtraData){
                        extraDataString = json.PostExtraData['3DExtraData']
                    } else if (json.path3D){
                        extraDataString = json.path3D
                    };
                    if(extraDataString){
                        resolve({extraDataString: extraDataString,
                                    postHashHex: postHashHex})
                    
                    } else {
                        reject({err: 'no valid 3DExtraData'});
                    }

                })
            })        
        })  
    }

    processMeta = (nftParams, nftMeta) =>{

        // combine metadata with local node settings to create config for Item
        let extraParams = { nftPostHashHex: nftParams.nftPostHashHex,
                            extraData3D:nftMeta.extraDataString,
                            endPoint:this.config.modelsRoute};

        let extraDataParser = new ExtraData3DParser(extraParams);
        let formats = extraDataParser.getAvailableFormats();                    
        let models = extraDataParser.getModelList();
        let modelUrl = extraDataParser.getModelPath(0,'any','any');
        if(!modelUrl){ 
            console.log('failed to parse model data for nft: ',nftMeta.nftPostHashHex);
            return false;
        };

        let urlParts = modelUrl.split('.');
        let extension = urlParts[urlParts.length-1];
        let pathParts =  modelUrl.split('/');
            pathParts.pop(); 
        let folderPath = pathParts.join('/')+'/';

        // combine with computed params
        let itemConfig = {
            ...this.config,
            ...nftParams,            
            ...nftMeta,
            ...{avatarPath: folderPath, // current minter does not allow subfolders so anims on the same level
                loader: this.config.loaders.getLoaderForFormat(extension),                        
                modelUrl: modelUrl,
                format: formats[0]}

        };
        console.log('imported itemConfig:');
        console.log(itemConfig);
        return itemConfig;
    }

}

export {NFTImporter};