import * as THREE from 'three';

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
const helperRoot = new THREE.Group();

    /**
     * A map from Mixamo rig name to VRM Humanoid bone name
     */
    const mixamoVRMRigMap = {
        mixamorigHips: 'hips',
        mixamorigSpine: 'spine',
        mixamorigSpine1: 'chest',
        mixamorigSpine2: 'upperChest',
        mixamorigNeck: 'neck',
        mixamorigHead: 'head',
        mixamorigLeftShoulder: 'leftShoulder',
        mixamorigLeftArm: 'leftUpperArm',
        mixamorigLeftForeArm: 'leftLowerArm',
        mixamorigLeftHand: 'leftHand',
        mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
        mixamorigLeftHandThumb2: 'leftThumbProximal',
        mixamorigLeftHandThumb3: 'leftThumbDistal',
        mixamorigLeftHandIndex1: 'leftIndexProximal',
        mixamorigLeftHandIndex2: 'leftIndexIntermediate',
        mixamorigLeftHandIndex3: 'leftIndexDistal',
        mixamorigLeftHandMiddle1: 'leftMiddleProximal',
        mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
        mixamorigLeftHandMiddle3: 'leftMiddleDistal',
        mixamorigLeftHandRing1: 'leftRingProximal',
        mixamorigLeftHandRing2: 'leftRingIntermediate',
        mixamorigLeftHandRing3: 'leftRingDistal',
        mixamorigLeftHandPinky1: 'leftLittleProximal',
        mixamorigLeftHandPinky2: 'leftLittleIntermediate',
        mixamorigLeftHandPinky3: 'leftLittleDistal',
        mixamorigRightShoulder: 'rightShoulder',
        mixamorigRightArm: 'rightUpperArm',
        mixamorigRightForeArm: 'rightLowerArm',
        mixamorigRightHand: 'rightHand',
        mixamorigRightHandPinky1: 'rightLittleProximal',
        mixamorigRightHandPinky2: 'rightLittleIntermediate',
        mixamorigRightHandPinky3: 'rightLittleDistal',
        mixamorigRightHandRing1: 'rightRingProximal',
        mixamorigRightHandRing2: 'rightRingIntermediate',
        mixamorigRightHandRing3: 'rightRingDistal',
        mixamorigRightHandMiddle1: 'rightMiddleProximal',
        mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
        mixamorigRightHandMiddle3: 'rightMiddleDistal',
        mixamorigRightHandIndex1: 'rightIndexProximal',
        mixamorigRightHandIndex2: 'rightIndexIntermediate',
        mixamorigRightHandIndex3: 'rightIndexDistal',
        mixamorigRightHandThumb1: 'rightThumbMetacarpal',
        mixamorigRightHandThumb2: 'rightThumbProximal',
        mixamorigRightHandThumb3: 'rightThumbDistal',
        mixamorigLeftUpLeg: 'leftUpperLeg',
        mixamorigLeftLeg: 'leftLowerLeg',
        mixamorigLeftFoot: 'leftFoot',
        mixamorigLeftToeBase: 'leftToes',
        mixamorigRightUpLeg: 'rightUpperLeg',
        mixamorigRightLeg: 'rightLowerLeg',
        mixamorigRightFoot: 'rightFoot',
        mixamorigRightToeBase: 'rightToes',
    };

export default class AnimLoader {

    constructor(config){
        let defaults = {
            format: 'fbx',
            modelUrl: '',
            modelsRoute: 'models',
            nftsRoute: 'nfts',
            castShadow: true,
            isImage: false,
            // override the actions array to set click handlers
            actions: {'click': function(e){ 
                console.log('clicked');
                console.log(this);
            },'dblclick': function(e){
                console.log('dblclick');
                console.log(this);
            }}
        };
    
        this.config = {
            ...defaults,
            ...config
        };
        this.isVRM = false;

        this.loader = this.config.loader;
    
      
        this.modelUrl = this.config.modelUrl;
       
        this.mesh = this.config.mesh
        this.animRunning = false;
        this.animations = null;
        this.isItem = false;
        this.isImage = false;
        this.animationActions = [];      
        this.avatarFormat =(this.config.avatarFormat)?this.config.avatarFormat:'fbx';
        if(this.config.modelUrl){
            console.log('check modelUrl');
            this.getFormatFromModelUrl();
        } else {
            console.log('no modelUrl');
        }
        this.preloadAnims();
    }

    setAvatarFormat= (format)=>{
        this.avatarFormat = format;

    }
    preloadAnims = () =>{
        let that = this;
        

/*
        fetch(url,{ method: "get"})
                .then(response => response.text())
                .then((data)=>{
                    this.animPosts = data;
                });
*/

        this.animUrls =  [  {name:'walk',hex:'0c91b85ef07adc0feeb0a8cb7215e3c678a39ede0f842fb6fac6f9009dc30653',url:'https://desodata.azureedge.net/unzipped/0c91b85ef07adc0feeb0a8cb7215e3c678a39ede0f842fb6fac6f9009dc30653/fbx/normal/StandardWalk.fbx'},
                            {name:'stretch',hex:'1a27c2f8a2672adbfdb4df7b31586a890b7f3a95b49a6937edc01de5d74072f2',url:'https://desodata.azureedge.net/unzipped/1a27c2f8a2672adbfdb4df7b31586a890b7f3a95b49a6937edc01de5d74072f2/fbx/normal/Arm_Stretching.fbx'},
                            {name:'idle_happy',hex:'95c405260688db9fbb76d126334ee911a263352c58dbb77b6d562750c5ce1ed2',url:'https://desodata.azureedge.net/unzipped/95c405260688db9fbb76d126334ee911a263352c58dbb77b6d562750c5ce1ed2/fbx/normal/Happy_Idle.fbx'},
                            {name:'idle',hex:'8d931cbd0fda4e794c3154d42fb6aef7cf094481ad83a83e97be8113cd702b85',url:'https://desodata.azureedge.net/unzipped/8d931cbd0fda4e794c3154d42fb6aef7cf094481ad83a83e97be8113cd702b85/fbx/normal/Warrior_Idle.fbx'},
                            {name:'victory',hex:'287cb636f6a8fc869f5c0f992fa2608a2332226c6251b1dc6908c827ab87eee4',url:'https://desodata.azureedge.net/unzipped/287cb636f6a8fc869f5c0f992fa2608a2332226c6251b1dc6908c827ab87eee4/fbx/normal/Victory.fbx'}];
        this.currentAnimName = 'idle';
        this.lastPlayed = 0;
    }

    loadAnim = async (animUrl, mixer) =>{
        let that = this;
        return new Promise((resolve,reject)=>{
                let animationAction = null;
                let fbxLoader = new FBXLoader();
                let animName = this.getNameFromPath(animUrl);
              //add an animation from another file
                fbxLoader.load(
                    animUrl,
                    (object) => {

                        let animToUse = null;
                        object.animations.forEach((anim)=>{
                            if(parseFloat(anim.duration)>0){
                                animToUse = anim;
                            }
                        });
                        if(animToUse){
                            if(animName==='walk'){
                                const playbackRate = 4; // Set to 2 to double the speed
                                animationAction = mixer.clipAction(animToUse).setDuration(animToUse.duration / playbackRate);
                            } else {
                                animationAction = mixer.clipAction(animToUse)
                            }

                            let anim = {name:animName,
                                url:animUrl,
                                action:animationAction};
                            console.log('loadAnim created: ',anim);
                            console.log(anim);
                            that.animationActions.push(anim);
                                                
                            resolve(animationAction);                            
                        };

                });
        });
    }

getDefaultAnim = (mesh, mixer) =>{
    let defaultAnimToUse = null;
    mesh.animations.forEach((anim)=>{
        if(parseFloat(anim.duration)>0){
            defaultAnimToUse = anim;
        }
    });
    if(defaultAnimToUse){
        const animationAction = mixer.clipAction(defaultAnimToUse)
        this.currentAnim = {name: 'idle',
            action:animationAction};
        animationAction.play();
        this.animationActions.push(this.currentAnim);
        this.currentAnimName = 'idle';
    };

}

    switchAnim =(format, animName)=>{
        let anim = null;
        if(animName===this.currentAnim.name){
            return false;
        };
        if(this.animationActions[animName]){
           anim = this.animationActions[animName]; 
        } else {
            if(format==='vrm'){
                anim = this.fetchUrlByName(animName);
            } else {
                anim = this.fetchFBXUrlByName(animName)
            }
        }
        if(!anim){
            console.log('no anim called: ',animName)

            return false; 
         };     
         
         if(!anim.action){
            console.log('no ACTION for anim  called: ',animName)

            return false; 
         };           
    
        if(this.currentAnim){
            this.crossFade(this.currentAnim.action,  anim.action, 0.2);
        } else {

            anim.play();           
        }

        this.currentAnimName = animName;
        this.currentAnim = anim;
        return true;
    }

    crossFade = (from, to, duration) =>{
        to.reset();  
        to.setEffectiveTimeScale( 1 )
        to.setEffectiveWeight( 1 )      
        to.clampWhenFinished = true;
        to.crossFadeFrom(from, duration, true);
        to.play();

    }

    getNameFromPath = (path) =>{
        let parts = path.split('/');
        let name = parts[parts.length-1];
        name = name.replace('.fbx','');
        return name;
    }
    createAnimRequest = () =>{
        return 'https://nftzapi.azurewebsites.net/api/post/getposts?hexesStr='+this.config.animHashes.join(',');
    }
    setMixer = (mixer)=>{
        this.mixer = mixer;
    }

    createClipsFBX = async (vrm) =>{
        let that = this;
        let animClips = [];
        let loadedCtr = 0;
        let loadingCounter = this.animUrls.length;
        this.fbxLoader = new FBXLoader();
        return new Promise((resolve,reject)=>{
            that.animUrls.forEach((animMeta)=>{

                that.loadMixamo(animMeta, vrm).then((action)=>{
                    animMeta.action = action;
                    --loadingCounter;
                    if(loadingCounter===0){
                        that.animationActions = that.animUrls;
                        resolve(animMeta);
                    }
                })
            })
        })
    }

    createClips = async (mesh) =>{
        let that = this;
        let animClips = [];
        let loadedCtr = 0;
        let mixer = new THREE.AnimationMixer(mesh);     
        this.mixer = mixer;   
        this.fbxLoader = new FBXLoader();
        return new Promise((resolve,reject)=>{
            that.animUrls.forEach((animMeta)=>{

                that.fbxLoader.load(animMeta.url, (anim) => {
                    //creates animation action
                    let animToProcess = null;
                    anim.animations.forEach((animation)=>{
                        if(animation.duration>0){
                            animToProcess = animation;
                        }
                    })

                    let action = mixer.clipAction(animToProcess);
                    that.animationActions[animMeta.name] = animMeta;
                    that.animationActions[animMeta.name].action = action;                        
                        loadedCtr++;
                      
                        if(loadedCtr===that.animUrls.length){

                            resolve(that.animationActions);
                        }
                });
            })
        })
    }

        // mixamo animation
        loadMixamo = ( currentAnim, vrm) => {
            let that = this;
            return new Promise((resolve,reject)=>{
               
                if(currentAnim.url){
                    // create AnimationMixer for VRM
                    that.loadMixamoAnimation(currentAnim.url, vrm ).then( ( clip ) => {
                        // Apply the loaded animation to mixer and play
                        let action = that.mixer.clipAction(clip);
                        resolve(action);
                    });
                  }
            });
        }


        loadMixamoAnimation = ( url, vrm ) => {

            const loader = new FBXLoader(); // A loader which loads FBX
            return loader.loadAsync( url ).then( ( asset ) => {
            const clip = THREE.AnimationClip.findByName( asset.animations, 'mixamo.com' ); // extract the AnimationClip
    
            const tracks = []; // KeyframeTracks compatible with VRM will be added here
    
            const restRotationInverse = new THREE.Quaternion();
            const parentRestWorldRotation = new THREE.Quaternion();
            const _quatA = new THREE.Quaternion();
            const _vec3 = new THREE.Vector3();
    
            // Adjust with reference to hips height.
            const motionHipsHeight = asset.getObjectByName( 'mixamorigHips' ).position.y;
            const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode( 'hips' ).getWorldPosition( _vec3 ).y;
            const vrmRootY = vrm.scene.getWorldPosition( _vec3 ).y;
            const vrmHipsHeight = Math.abs( vrmHipsY - vrmRootY );
            const hipsPositionScale = vrmHipsHeight / motionHipsHeight;
    
            clip.tracks.forEach( ( track ) => {
    
                // Convert each tracks for VRM use, and push to `tracks`
                const trackSplitted = track.name.split( '.' );
                const mixamoRigName = trackSplitted[ 0 ];
                const vrmBoneName = mixamoVRMRigMap[ mixamoRigName ];
                const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode( vrmBoneName )?.name;
                const mixamoRigNode = asset.getObjectByName( mixamoRigName );
    
                if ( vrmNodeName != null ) {
    
                    const propertyName = trackSplitted[ 1 ];
    
                    // Store rotations of rest-pose.
                    mixamoRigNode.getWorldQuaternion( restRotationInverse ).invert();
                    mixamoRigNode.parent.getWorldQuaternion( parentRestWorldRotation );
                    let protoType = Object.getPrototypeOf(track);
                    if (( protoType.ValueTypeName==='quaternion' )) {
    
                        // Retarget rotation of mixamoRig to NormalizedBone.
                        for ( let i = 0; i < track.values.length; i += 4 ) {
    
                            const flatQuaternion = track.values.slice( i, i + 4 );
    
                            _quatA.fromArray( flatQuaternion );
    
                            // 親のレスト時ワールド回転 * トラックの回転 * レスト時ワールド回転の逆
                            _quatA
                                .premultiply( parentRestWorldRotation )
                                .multiply( restRotationInverse );
    
                            _quatA.toArray( flatQuaternion );
    
                            flatQuaternion.forEach( ( v, index ) => {
    
                                track.values[ index + i ] = v;
    
                            } );
    
                        }
                        tracks.push(
                            new THREE.QuaternionKeyframeTrack(
                                `${vrmNodeName}.${propertyName}`,
                                track.times,
                                track.values.map( ( v, i ) => ( vrm.meta?.metaVersion === '0' && i % 2 === 0 ? - v : v ) ),
                            ),
                        );
    
                    } else if ( protoType.ValueTypeName==='vector') {
                        const value = track.values.map( ( v, i ) => ( vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? - v : v ) * hipsPositionScale );
                        tracks.push( new THREE.VectorKeyframeTrack( `${vrmNodeName}.${propertyName}`, track.times, value ) );
    
                    } else {
                        console.log('what kind of track?');
                        console.log('THREE.VectorKeyframeTrack:',THREE.VectorKeyframeTrack);                
                        console.log('THREE.QuaternionKeyframeTrack:',THREE.QuaternionKeyframeTrack);        
                    }
    
                } else {
                    console.log('vrmNodeName is null')
                }
    
            } );
          ///  console.log('loaded fbx:  clip.duration: ', clip.duration,' tracks:', tracks);
    
            return new THREE.AnimationClip( 'vrmAnimation', clip.duration, tracks );
    
        } );
    
    }

    playNextAnim = (animationUrl) =>{
        let animIndex = this.config.animations.indexOf(animationUrl);
        animIndex++;

        if(!this.config.animations[animIndex]){
            animIndex = 0;
        }

        this.loadMixamo(this.config.animations[animIndex]);
    }

    hasAnimations = (obj) =>{
        if(!obj){
            obj = this.root;
        };

        if(this.root.animations){
            if(this.root.animations.length>0){
                this.animations = this.root.animations;
                return true;
            };            
        }

        if(this.mesh.animations){
            if(this.mesh.animations.length>0){
                this.animations = this.mesh.animations;
                return true;
            };            
        }
        
        if(!obj.children){
            return false;
        }
       
        if(!obj.children[0]){
            return false;
        };

        if(obj.children[0].animations){
            if(obj.children[0].animations.length>0){
                this.animations = obj.children[0].animations;
                return true;
            };          
        };

        return false;
    }

    getAnimations = ()=>{
        if(this.hasAnimations()){
            return this.animations;
        } else {
            return false;
        }
    }
  
    retrievedModelUrlIsValid = (modelUrl) =>{
        if(typeof(modelUrl)==='undefined'){
            return false;        
        };        
        if(modelUrl===''){
            return false;        
        };
        if(modelUrl === 'https://desodata.azureedge.net/'){
            return false;
        };
        if(modelUrl === 'https://desodata.azureedge.net'){
            return false;
        };   
        return true;
    }

  /*  fetchAnimUrl = async() =>{
        let that = this;

        return new Promise((resolve,reject)=>{
            // fetch from config if available
            if(this.config.modelUrl!==''){
                resolve(this.config.modelUrl);
                return;
            } else {
                let url = this.config.nftsRoute;
                console.log('fetchAnimUrl: ',this.config.nftsRoute);
                if(url.trim()===''){
                    reject('No nftsRoute or modelUrl exists for this item');
                    return;
                };
                fetch(url,{ method: "get"})
                .then(response => response.text())
                .then((data)=>{ 
                    if(typeof(data)=== undefined){
                        reject('undefined response from ',url);
                        return;
                    };
                    if(data.indexOf('DOCTYPE')>-1){
                        reject('DOCTYPE error recieved from ',this.config );
                        return;
                    };
                    let fullUrl = that.config.modelsRoute+data;
                    resolve(fullUrl);
                });
            }
        })
        
    }*/

    fetchAnimUrl = (hex) => {
        return (this.animUrls[hex])?this.animUrls[hex]:false;

    }

    fetchUrlByName = (name) => {
        let anims = this.animUrls.filter(anim => (anim.name===name));
        return (anims[0])?anims[0]:false;

    }    

    fetchFBXUrlByName = (name) => {
        let anims = this.animationActions.filter(anim => (anim.name===name));
        return (anims[0])?anims[0]:false;

    }
    playFBXAnimByName = (name) => {
        let anim = this.fetchFBXUrlByName(name);
        if(!anim){ 
            console.log('playAnimByName: could not find ',name);
            return false;
        };
        
        if(!anim.action){
            console.log('playAnimByName: no anim ACTIONto play with name: ',name);
            return false;        
        }
        console.log('playAnimByName: anim: ',anim);

        this.currentAnim = anim;
        this.currentAnim.action.play();

    } 

    playAnimByName = (name) => {
        let anim = this.fetchUrlByName(name);
        if(!anim){ 
            console.log('playAnimByName: could not find ',name);
            return false;
        };
        
        if(!anim.action){
            console.log('playAnimByName: no anim ACTIONto play with name: ',name);
            return false;        
        }

        this.currentAnim = anim;
        this.currentAnim.action.play();

    }     

    fetchRandAnimUrl = () =>{
        let animIdx = this.getRandomInt(0,this.animUrls.length-1);
        return this.animUrls[animIdx].url;
    }


    fetchRandAnim = () =>{
        let animIdx = this.getRandomInt(0,this.animUrls.length-1);
        return this.animUrls[animIdx];
    }

    getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    fetchModel = async(modelUrl, posVector) =>{
        
        let that = this;

        return new Promise((resolve,reject)=>{
           // console.log('fetchModel: ',modelUrl);
           // console.log('that.loader: ',that.loader);            
            that.loader.load(modelUrl, (root)=> {
                that.root = root;
                let loadedItem = null;

                if(root.scene){
                    loadedItem = root.scene;
                } else {
                    loadedItem = root;
                };     
            /*               
                if(that.hasArmature()){
                    console.log('armature detected');
                    console.log(this.armature);
                } else {
}
}
*/
                    that.mesh = loadedItem;
                    that.mesh.userData.owner = this;
                    that.mesh.owner = this;                
                    let obj3D = this.convertToObj3D(loadedItem);
                    if(obj3D===false){
                        console.log('could not convert item for scene');
                        return false;
                    };
                  
                    this.scaleToFitScene(obj3D, posVector);
                   
                    console.log('DO fix Y coord');
                    this.fixYCoord(obj3D, posVector); 
                    resolve(obj3D);

              //  }
               

            },
            this.onProgressCallback,
            this.onErrorCallback);

        })
      
    }

onProgressCallback = ()=> {}
onErrorCallback = (e)=> {
    console.log('loading error');
    console.log(e);
}

scaleToFitScene = (obj3D, posVector) =>{

    let that = this;

        //console.log('posVector:',posVector);
        let boxMesh = this.createContainerBox(posVector);
        console.log(boxMesh);
        let sceneBounds = new THREE.Box3().setFromObject( boxMesh );

        let meshBounds = null    
            meshBounds = new THREE.Box3().setFromObject( obj3D );

        // Calculate side lengths of scene (cube) bounding box
        let lengthSceneBounds = {
            x: Math.abs(sceneBounds.max.x - sceneBounds.min.x),
            y: Math.abs(sceneBounds.max.y - sceneBounds.min.y),
            z: Math.abs(sceneBounds.max.z - sceneBounds.min.z),
        };   

        // Calculate side lengths of glb-model bounding box
        let lengthMeshBounds = {
            x: Math.abs(meshBounds.max.x - meshBounds.min.x),
            y: Math.abs(meshBounds.max.y - meshBounds.min.y),
            z: Math.abs(meshBounds.max.z - meshBounds.min.z),
        };

        // Calculate length ratios
        let lengthRatios = [
            (lengthSceneBounds.x / lengthMeshBounds.x),
            (lengthSceneBounds.y / lengthMeshBounds.y),
            (lengthSceneBounds.z / lengthMeshBounds.z),
        ];

        let minRatio = Math.min(...lengthRatios);
        
        // Use smallest ratio to scale the model
        if(obj3D.scale.set){
            obj3D.scale.set(minRatio, minRatio, minRatio);
            obj3D.updateMatrixWorld();
        };
        
        let newMeshBounds = new THREE.Box3().setFromObject( obj3D );
        //console.log('newMeshBounds',newMeshBounds);
        let newLengthMeshBounds = {
            x: Math.abs(newMeshBounds.max.x - newMeshBounds.min.x),
            y: Math.abs(newMeshBounds.max.y - newMeshBounds.min.y),
            z: Math.abs(newMeshBounds.max.z - newMeshBounds.min.z),
        };
        
        let cbox = that.createContainerBoxForModel(newLengthMeshBounds.x, newLengthMeshBounds.y, newLengthMeshBounds.z, posVector);
        cbox.position.copy(posVector);

        // center of box is position so move up by 50% of newLengthMeshBounds.y
        //let yOffset = newLengthMeshBounds.y/2;
        //cbox.position.setY(cbox.position.y+yOffset);
        //cbox.add(obj3D);
        //obj3D.updateMatrixWorld();

        cbox.userData.owner = this; //set reference to Item
        that.scene.add(obj3D);    
        obj3D.position.copy(posVector);
        console.log('set position after render in scale');
       console.log('scaleToFitScene wants to add');
       console.log(obj3D);
        cbox.updateMatrixWorld();    
    }

    getBoxHelperVertices = (boxHelper) =>{
        var points = [];
        let lowest = 1000000;
        let lowestVertex = null;
        for(var i = 0; i < 8; ++i) {
            var x = boxHelper.geometry.attributes.position.getX(i)
            var y = boxHelper.geometry.attributes.position.getY(i)
            var z = boxHelper.geometry.attributes.position.getZ(i)
            points.push({x: x, y:y, z: z})
            if(y<lowest){
                lowest = y;
                lowestVertex = new THREE.Vector3(x,y,z);
            }
        }
        //console.log('lowest point in helper: ',lowest);
        return lowestVertex;
    }

    getFloorYCoord = (posVector) =>{
        let boxmeshFloor = posVector.y;
        return boxmeshFloor;
    }

    postionMeshOnFLoor = (mesh, posVector, scaledMeshHeight) =>{
      /*  let destY = posVector.y;
        let yOffset = scaledMeshHeight/2;
        let y = destY + yOffset;
        if(mesh.geometry){
            mesh.geometry.center();
        };        
        if(mesh.children.length===1){
            if(mesh.children[0].geometry){
                mesh.children[0].geometry.center();
            };
            mesh.children[0].position.setX(0);
            mesh.children[0].position.setY(0);
            mesh.children[0].position.setZ(0);
        };*/
        //posVector.setY(mesh.position.y+1);
        mesh.position.copy(posVector);


    }

    addPlaneAtPos = (posVector) =>{
        var geo = new THREE.PlaneBufferGeometry(20, 20);
        var mat = new THREE.MeshPhongMaterial({ color: 0x99FFFF, side: THREE.DoubleSide });
        var plane = new THREE.Mesh(geo, mat);
        plane.rotateX( - Math.PI / 2);
        plane.position.copy(posVector);
        this.scene.add(plane);

    }

    createContainerBoxForModel = (width, height, depth, posVector) =>{
        const geometry = new THREE.BoxGeometry(width, height, depth);
      //  console.log('createContainerBoxForModel: ', width, height, depth);
        if(!this.config.color){
            this.config.color = 0xff3333;
        };
        
        const material = new THREE.MeshPhongMaterial({
            color: this.config.color,
            opacity: 0,
            transparent: true
        });

        let boxMesh = new THREE.Mesh( geometry, material );
        return boxMesh;
    }

    setDimensions = (w,h,d) =>{
        this.config.width = w;
        this.config.height = h;
        this.config.depth = d;
    }

    setTarget = () =>{

    }

    createContainerBox = (posVector) =>{
        const geometry = new THREE.BoxGeometry(this.config.width, this.config.height,this.config.depth);
        
        if(!this.config.color){
            this.config.color = 0xff3333;
        };
        
        const material = new THREE.MeshPhongMaterial({
            color: this.config.color,
            opacity: 0,
            transparent: true
        });

        let boxMesh = new THREE.Mesh( geometry, material );
            boxMesh.position.copy(posVector);

        return boxMesh;
    }

    convertToObj3D = (loadedItem) =>{
        let loadedType = loadedItem.type;
        let material, vertexColors, geometry;
       // console.log('loaded type: ',loadedType);
        switch(loadedType){
            case 'Object3D','Mesh':
            break;
            case 'BufferGeometry':
                loadedItem.center();
                switch(this.config.format){
                    case 'xyz': //points format
                        vertexColors = ( loadedItem.hasAttribute( 'color' ) === true );
                        material = new THREE.PointsMaterial( { size: 0.1, vertexColors: vertexColors } );
                        loadedItem = new THREE.Points( loadedItem, material );
                    break;
                    case 'vtk':
                        geometry = loadedItem;
                        geometry.computeVertexNormals();
                        geometry.center();

                        material = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
                        loadedItem = new THREE.Mesh( geometry, material );
                    break;

                };
               
            break;
            case 'Scene':
            break; 
            case 'Group':
            break;   
            case undefined:

                switch(this.config.format){
                    case 'vox':
                    let scene = new THREE.Scene()
                        for ( let i = 0; i < loadedItem.length; i ++ ) {

                            const chunk = loadedItem[ i ];

                            // displayPalette( chunk.palette );

                            const mesh = new VOXMesh( chunk );
                            mesh.scale.setScalar( 0.0015 );
                            scene.add( mesh );

                        };
                        return scene;
                    break;
                }
            break;
            default: 
                console.log('unknown type: ',loadedType);
            return false;
        };
        return this.configureImportedObject(loadedItem);

    }

    configureImportedObject = (object3d) =>{
        object3d.castShadow = false;
        return object3d;
    }

    fixYCoord = (obj3D, posVector) =>{
        var helper = new THREE.BoxHelper(obj3D, 0x00ff00);
            helper.update();

        let lowestVertex = this.getBoxHelperVertices(helper);
        if(!lowestVertex){
            return false;
        };
        lowestVertex.applyMatrix4(helper.matrixWorld);
        if(posVector.y !== lowestVertex.y){
            let yOffset = lowestVertex.y-posVector.y;
            obj3D.position.setY(obj3D.position.y - yOffset);
        };
    }

    startAnimation = (animIndex, loopType) =>{

        /* accepts 
            THREE.LoopOnce
            THREE.LoopRepeat
            THREE.LoopPingPong */

        this.setCurrentAnimation(animIndex);
        this.startCurrentAnimation(loopType);        
    }
    setCurrentAnimation = (animIndex) => {
        this.currentAnimation = animIndex;
    }

    startCurrentAnimation = (loopType) => {
        if(!loopType){
            loopType = THREE.LoopRepeat
        };
        let that = this;
        let animIndex = this.currentAnimation;
        if(this.animations){
            if(this.animations[animIndex]){
                this.mixer = new THREE.AnimationMixer( this.mesh );

                let animation = this.animations[animIndex];
                 
                this.action = this.mixer.clipAction(animation);
                this.action.setLoop(loopType);
                this.action.play();
                this.animRunning = true;
                this.mixer.addEventListener('finished',(e)=>{
                    console.log('animation not running now');                    
                    that.setAnimRunning(false);
                }, false);
            } else {
                console.log('animation', animIndex, 'doesnt exist');
            }
        } else {
            console.log('no animations: ');
            console.log(this.mesh);
        }
    }

    stopAnimation = () =>{
        if(this.action){
           this.action.stop();
           this.action = null;
        }
        this.animRunning = false;
    }

    setAnimRunning =(value)=>{
        this.animRunning = value;
        console.log('animation running set to: ',value);
    }

    shouldBeCentered = (children) =>{

        if(children.length>1){
            return false;// dont center      
        };        
    
        if(!children[0].isMesh){
            return false; // dont center         
        };
        let mesh = children[0];
        if(mesh.position.x!=0){
            return true;
        };
    
        if(mesh.position.z!=0){
            return true;
        };

        if(mesh.position.y!=0){
            return true;
        };
        return false;
    }

    getImportedObjectSize = (obj) =>{
        let box = new THREE.Box3().setFromObject(obj);
        let center = new THREE.Vector3();
        let size = new THREE.Vector3();
        let max = box.max;
        let min = box.min;
        let d = max.z - min.z;
        let w = max.x - min.x;
        let h = max.y - min.y;

        return h;
    }

    setScale = (model) =>{

        //create a box which is the desired size of the nft

        let lengthSceneBounds = {
          x: 2,
          y: 2,
          z: 2,
        };

        let meshBounds = this.getMeshBounds(model);
        
        let lengthMeshBounds = {
          x: Math.abs(meshBounds.max.x - meshBounds.min.x),
          y: Math.abs(meshBounds.max.y - meshBounds.min.y),
          z: Math.abs(meshBounds.max.z - meshBounds.min.z),
        }

        let lengthRatios = [
          (lengthSceneBounds.x / lengthMeshBounds.x),
          (lengthSceneBounds.y / lengthMeshBounds.y),
          (lengthSceneBounds.z / lengthMeshBounds.z),
        ];
        
        let minRatio = Math.min(...lengthRatios);

        model.scale.set(minRatio, minRatio, minRatio);

    }

    getMeshBounds = (model) => {
        let that = this;
        let meshBounds = null;

        model.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.geometry.computeBoundingBox()
                meshBounds = child.geometry.boundingBox;
              //  console.log(meshBounds);
            }
        });
        return meshBounds;
    }

    getPosition = () =>{
        let copiedPos = new THREE.Vector3();
            copiedPos.copy(this.mesh.position);
          //  console.log('item pos: ', copiedPos);
            return copiedPos;
    }

    positionItem = (model, posVector) =>{
        model.position.copy(posVector);
    }

    rotateItem = () =>{

    }

}

export {AnimLoader}