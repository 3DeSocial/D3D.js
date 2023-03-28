import { Item, ItemVRM, SceneryLoader, ExtraData3DParser } from 'd3d';

export default class NFTImporter {

    constructor(config){

        let defaults = {
            animations: ['/mixamo/Arm_Stretching.fbx', '/mixamo/Looking_Around.fbx','/mixamo/Strut_Walking.fbx','/mixamo/Victory.fbx'],
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

    }

    import =  async (nftParams) =>{
        // returns promise that resolves in an Item, ready to be placed in a 3D environment
        return new Promise((resolve, reject) => { 

            // fetch metadata from blockchain
            this.fetchMeta(nftParams.nftPostHashHex).then((nftMeta)=>{
                let importedItem = null;
                let itemConfig = null;
                if(nftMeta.extraDataString){
                    itemConfig = this.processMeta(nftParams, nftMeta);

                    importedItem = itemConfig; // return config by default

                } else {
                    console.log('no 3D data, return 2d data');
                    importedItem = nftMeta;
                    nftParams.assetType = 'Not 3D';              
                }

                // or instantiate requested assetType class
                switch(nftParams.assetType){
                    case 'scenery':
                        // create config for 3D asset class
                        let sceneryConfig = {
                            sceneryPath: itemConfig.modelUrl,
                            sceneScale: 2.5,
                            playerStartPos: { x: -0, y: 8 ,z: 0 },
                         }
                        importedItem = sceneryConfig;

                        break;
                    case 'item':
                        // create config for 3D asset class
                        importedItem = new Item(itemConfig);
                        break;                        
                    case 'avatar':
                        // create config for 3D asset class
                        itemConfig.isAvatar = true;
                        let urlParts = itemConfig.modelUrl.split('.');
                        let extension = urlParts[urlParts.length-1];

                        if(extension.trim().toLowerCase()==='vrm'){
                            console.log('avatar is VRM, extension: ',extension);
                            itemConfig.animLoader = true;
                            console.log(itemConfig);
                            importedItem = new ItemVRM(itemConfig);
                        } else {
                            console.log('avatar is NOT VRM, extension: ',extension);
                
                            importedItem = new Item(itemConfig);
                        };                        

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
                        resolve({extraDataString: null,
                                 postHashHex: postHashHex,
                                 nft: json})
                    
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
            ...{avatarPath: folderPath, // current minter does not allow subfolders so anims on the same level
                loader: this.config.loaders.getLoaderForFormat(extension),                        
                modelUrl: modelUrl,
                format: formats[0],
                nft: nftMeta}

        };

        return itemConfig;
    }

}

export {NFTImporter};