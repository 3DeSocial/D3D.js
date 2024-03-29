// Find the latest version by visiting https://cdn.skypack.dev/three.
import * as THREE from 'three';

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {Giffer, NFTImporter, ExtraData3DParser, Loaders, PlayerVR, AudioClipRemote, Physics, AudioClip, Item, ItemVRM, LoadingScreen, HUDBrowser, HUDVR, SceneryLoader, Lighting, LayoutPlotter, D3DInventory, NFTViewerOverlay, VRButton, VRControls } from 'd3d';
let clock, gui, stats, delta;
let environment, visualizer, player, controls, geometries;
let playerIsOnGround = false;
let KeyBPressed, spacePressed = false, fwdPressed = false, bkdPressed = false, lftPressed = false, rgtPressed = false, rotlftPressed = false, rotRgtPressed = false;
let nextPos = new THREE.Vector3();



const params = {
    debug: false,
    firstPerson: true,
    visualizeDepth: 10,
    gravity: - 30,
    playerSpeed: 10,
    physicsSteps: 20};

 export default class SpaceViewer {
    
    constructor(config) {

        let defaults = {
                    animations: ['/mixamo/Arm_Stretching.fbx', '/mixamo/Looking_Around.fbx','/mixamo/Strut_Walking.fbx','/mixamo/Victory.fbx'],            
                    avatarSize: {width: 1, height:1, depth:1},
                    el: document.body,
                    ctrClass: 'data-nft', // Attribute of div containing nft preview area for a single nft
                    fitOffset: 1.25,
                    nftsRoute: 'nfts', // Back end route to initialize NFTs
                    modelsRoute: 'models',// Back end route to load models
                    sceneryPath: '/layouts/island/scene.gltf',
                    skyboxPath: '',
                    controls: {
                        maxDistance:Infinity,
                        maxPolarAngle:Infinity
                    },
                    vrType: 'walking',
                    useOwnHandlers: true,
                    lookAtStartPos: {x:0,y:2,z:0},
                    lights: [  {name:'above',intensity:1},
                                {name:'below',intensity:0.5},
                                {name:'left',intensity:0},
                                {name:'right',intensity:0},
                                {name:'front',intensity:0},
                                {name:'back',intensity:0}]
                };
        
        this.config = {
            ...defaults,
            ...config
        };
        this.containerInitialized = false;
        this.el = this.config.el;
        this.playerVelocity = new THREE.Vector3();
        this.upVector = new THREE.Vector3( 0, 1, 0 );
        this.tempVector = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();
        this.tempBox = new THREE.Box3();
        this.tempMat = new THREE.Matrix4();
        this.tempSegment = new THREE.Line3();
        this.isFullScreen = false;
        this.floorPlane = null;
        this.cameraVector = new THREE.Vector3();
        this.dolly = null,
        this.prevGamePads = new Map(),
        this.speedFactor = [0.1, 0.1, 0.1, 0.1],
        this.controllers = [];
        this.loaders = new Loaders({defaultLoader:this.defaultLoader});
        this.initLoaders();
        this.clock = new THREE.Clock();
        environment = null;
        this.collider = null;
        this.moveTo = false;
        this.mouseCoords = new THREE.Vector2();
        this.vrType = this.config.vrType;
        this.camPos = new THREE.Vector3();
        this.objectsInMotion = []; // use for things being thrown etc
       // this.initLoader(this.config.owner);
        this.dirCalc = new THREE.Vector3(1, 1, 1);
        this.newDir = new THREE.Vector3(1, 1, 1);
        this.ghostCaught = false;
        this.actionTargetItem = null;
        this.actionTargetMesh = null;
        this.animations = [];
        this.audioListener = new THREE.AudioListener();
        this.controlProxy = {};
        this.ballVector = new THREE.Vector3();
        this.kickVector = new THREE.Vector3();
        this.claimed = false;
        this.currentAudio = null;
        this.audioTracks = [];
        this.workingMatrix = new THREE.Matrix4();
        this.d = new Date();
        this.nftClaimed = false;
        this.avatars = [];
        this.mouse = new THREE.Vector2(0,0,0);
        this.getContainer(this.config.el);

        this.initScene();
        let importerParams= {chainAPI: this.config.chainAPI,
            imageProxyUrl: this.config.imageProxyUrl,
            loaders: this.loaders,
            modelsRoute:this.config.modelsRoute,
            scene: this.scene};
        this.nftImporter = new NFTImporter(importerParams);            
console.log('this.nftImporter:',this.nftImporter);
    }

    initPhysicsWorld = () =>{
        this.dt = 1.0/90.0;
        this.damping = 0.01;
        const world = new CANNON.World();
              world.gravity.set(0,-20,0);
              world.broadphase = new CANNON.NaiveBroadphase();

        this.world = world; 

        this.bodies = [];      
        this.physics = new Physics({ world: world,
                                    bodies: this.bodies,
                                    scene: this.scene});


      //  this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, world)
    }

    createLabel = (text, group, pos) =>{
        // Create a canvas element to render the text label
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        // Set the font and text for the label
        ctx.font = '40px Arial bold';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 4, canvas.width);

        // Create a texture from the canvas
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        // Create a sprite material using the texture
        var material = new THREE.SpriteMaterial({ map: texture });

        // Create a sprite and position it above the 3D object
        var label = new THREE.Sprite(material);
        label.position.set(pos.x, pos.y, pos.z);

        // Add the sprite to the scene
        group.add(label);

        // Make the sprite always face the camera
        label.lookAt(this.camera.position);        
    }

    setMasterVolume = (num) =>{
        this.audioListener.setMasterVolume(num);
    }

    initSpace = (options) =>{
        let that = this;
        let sceneryloadingComplete = false
        let nftLoadingComplete = false;
        

        return new Promise((resolve, reject) => {
      

            this.initRenderer(this.config.el);
            this.initHUD({scene:that.scene,
                            chainAPI: that.config.chainAPI});
            this.initSkybox();
            this.initLighting();
            let sceneryPostHash = this.config.sceneryPostHash;
            that.loadSceneryNFT(sceneryPostHash).then((sceneryConfig)=>{


                that.loadScenery(sceneryConfig).then(()=>{
        
                    //   this.initPhysicsWorld();        
                       let importerParams=null;
                       if ( 'xr' in navigator ) {
                           that.initVR();
                       };
                       if(this.avatarEnabled()){
                           if(!this.nftImporter){
                               importerParams= {imageProxyUrl: that.config.imageProxyUrl,
                                                isAvatar: true,
                                                   chainAPI: that.config.chainAPI,
                                                   loaders: that.loaders,
                                                   modelsRoute:that.config.modelsRoute,
                                                   scene: that.scene};
       console.log('importerParams');
       console.log(importerParams);

                               this.nftImporter = new NFTImporter(importerParams);
                           };
       
                           let nftImportParams = {assetType: 'avatar',
                                                  nftPostHashHex: this.config.avatar}
                           if(that.config.currentUser){
                               nftImportParams.owner = {
                                  ownerName: that.config.currentUser.Username,
                                  ownerPublicKey: that.config.currentUser.PublicKeyBase58Check,
                                  ownerDescription: that.config.currentUser.Description
                               };                                  
                           };
       
                           this.nftImporter.import(nftImportParams)
       
                               .then((avatar)=>{
                                   that.avatar = avatar;
                                   that.avatar.isActiveAvatar = true;
                                   if(that.avatar){
                                    that.config.firstPerson =false;                                    
                                       that.initCameraThirdPerson();
                                       that.initPlayerThirdPerson(options);                                 


       
       
                                   } else {
                                       //No avatar is available, use first person
                                       that.config.firstPerson =true;
                                       this.initCameraFirstPerson(); 
                                       that.initPlayerFirstPerson(options);      
                                   }
       
                                   that.sceneryloadingComplete = true;
                                   if(this.config.onSceneLoad()){
                                       this.config.onSceneLoad();
                                    }
                               }).catch(err=>{
                                   console.log('could not import avatar: ');
                                   console.log(err);
                               })
       
                       } else {
                           //No avatar is available, use first person
                           that.config.firstPerson =true;
                           this.initCameraFirstPerson(); 
                           that.initPlayerFirstPerson(options);
                           if(this.config.onSceneLoad()){
                               this.config.onSceneLoad();
                            }              
                       }
       
          
                   
       //                this.renderer.render(this.scene,this.camera);
       
       
                //   hat.addListeners();
                  //     console.log('addListeners')
                   //    that.audioListener.setMasterVolume(1);
                   //  his.camera.setRotationFromEuler(new THREE.Euler( 0,Math.PI,0, 'XYZ' ));
                    //   that.animate();
                       sceneryloadingComplete = true;               
                   });

            })

        });
    }

    avatarEnabled = () =>{
        
        if(!this.config.currentUser){
            console.log('Not logged in so no avatar availabe');
            this.config.firstPerson = true;
            return false;
        };

        if(this.config.firstPerson){
            console.log('avatarEnabled: first person selected');
            return false;
        };
        if(!this.config.avatar){
            console.log('no avatar available')
           return false;
        };
        if(this.config.avatar){
            console.log('have avatar: ',this.config.avatar);
            return true;
        };
        return false;
    }

    initLoader = (ownerData) =>{
        this.loadingScreen = new LoadingScreen(ownerData);
        this.loadingScreen.render('.loader-ctr');
    }

    initHUD = (opts) => {
        this.hud = new HUDBrowser(opts);
        this.hud.init();
        let that = this;
        if ( 'xr' in navigator ) {
            navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {
                if(supported){
                    that.hudVR = new HUDVR(opts);
                }
            });     
        }

    }

    loadScenery = (sceneryOptions) =>{
        let that = this;
        console.log('sceneryOptions from nft loader',sceneryOptions);
        return new Promise((resolve,reject)=>{

            let finalSceneryOptions = {
                ...{visualize:(params.debug),
                    scene : that.scene,
                    castShadow: false,
                receiveShadow : false},
                ...sceneryOptions
            };
            that.sceneryLoader = new SceneryLoader(finalSceneryOptions);
            console.log('final scenery optins: ',finalSceneryOptions);
            that.sceneryLoader.loadScenery()
            .then((gltf)=>{
                this.collider = that.sceneryLoader.collider;
                that.sceneryMesh = gltf;
                resolve(gltf);
            })
        });
    }

    setFormat = (format) =>{
        let loader = this.loaders.getLoaderForFormat(format);
        if(loader === false){
            throw('Error - No Loader Availble for File Format: '+format+' in D3DNFTViewer');
            return false;
        };
        this.format = format;
        this.loader = loader;
    }
    
    getContainer = (parentDivEl) =>{
        //First lets create a parent DIV
        this.parentDivEl = parentDivEl;
        this.parentDivElWidth = this.parentDivEl.offsetWidth;
        this.parentDivElHeight = this.parentDivEl.offsetHeight;        
    }
    initScene = () =>{

        //Lets create a new Scene
        this.scene = new THREE.Scene();

    }

    clearScene = (cb) =>{
        var obj = this.scene;
        this.recursiveDestroy(this.scene,cb);
    }

    clearMesh = (obj, cb) =>{
        obj = this.loadedItem.mesh;
        this.recursiveDestroy(obj,cb);
    }

    recursiveDestroy = (obj, cb) =>{
        while(obj.children.length > 0){ 
            this.recursiveDestroy(obj.children[0], cb);
            obj.remove(obj.children[0]);
        }
        
        if(obj.geometry) obj.geometry.dispose();

        if(obj.material){ 
            //in case of map, bumpMap, normalMap, envMap ...
            Object.keys(obj.material).forEach(prop => {
            if(!obj.material[prop])
                return;

            if(obj.material[prop] !== null && typeof obj.material[prop].dispose === 'function')                                  
                obj.material[prop].dispose();                                                      
            });

            obj.material.dispose();
        }
        if(obj.children.length===0){
            cb()
        }
    }

    initContainer(parentDivEl){

        if(this.containerInitialized){
            return true;
        };
        //First lets create a parent DIV
        this.parentDivEl = parentDivEl;
        this.parentDivElWidth = this.parentDivEl.offsetWidth;
        this.parentDivElHeight = this.parentDivEl.offsetHeight;
       // this.initScene();
        
        this.initSkybox();

        this.initCamera();
        this.initRenderer(parentDivEl);
        this.initLighting();
        this.initPlayer();
        this.initControls();
        this.addListeners();
        this.containerInitialized = true;

    }

initCameraFirstPerson = () =>{
        // camera setup
        this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
        this.camera.updateProjectionMatrix(); 
       // this.camera.add( this.audioListener );
        this.camera.rotation.set(0,0,0);
        let camStartPos = new THREE.Vector3(this.sceneryLoader.playerStartPos.x,this.sceneryLoader.playerStartPos.y,this.sceneryLoader.playerStartPos.z);
        camStartPos.y = camStartPos.y+2; // higher than ground level
        this.camera.position.copy(camStartPos);

        this.raycaster = new THREE.Raycaster({camera:this.camera});
        this.pRaycaster = new THREE.Raycaster();

    }

    initCameraThirdPerson = () =>{
        // camera setup
        this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
        this.camera.updateProjectionMatrix(); 
        let camStartPos = new THREE.Vector3(this.sceneryLoader.playerStartPos.x,this.sceneryLoader.playerStartPos.y,this.sceneryLoader.playerStartPos.z);
        camStartPos.y = camStartPos.y+2; // higher than ground level        
        this.camera.position.copy(camStartPos);
        this.raycaster = new THREE.Raycaster({camera:this.camera});
        this.pRaycaster = new THREE.Raycaster();

    }    

    initCamera = () =>{
        //Create a camera
        this.camera = new THREE.PerspectiveCamera(60, this.parentDivElWidth/600, 0.01, 100 );
      //  this.camera.add( this.audioListener );
        //this.camera.rotation.set(0,0,0);
        //Only gotcha. Set a non zero vector3 as the camera position.
//        this.camera.rotation.setX(0);


    }



    calcPlayerStartPos = () =>{
        let playerStartPos = null;
        if(this.sceneryLoader.playerStartPos){
            playerStartPos = new THREE.Vector3(this.sceneryLoader.playerStartPos.x,this.sceneryLoader.playerStartPos.y,this.sceneryLoader.playerStartPos.z);
        }
        let playerFloor = this.sceneryLoader.findFloorAt(playerStartPos, 8, -4);
        playerStartPos.y = playerFloor;
        return playerStartPos;
    }
    calcOffestStartPos = (playerStartPos)=>{

        let offsetStartPos = playerStartPos.clone();
        offsetStartPos.setY(offsetStartPos.y+1.5); 
        return offsetStartPos;     
    }

    

    initControls = () =>{
        //Controls
        let that = this;
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        let playerx = this.player.position.x;
        let playery = this.player.position.y;
        let playerz = this.player.position.z;
        //this.camPos.set(playerx,(playery),playerz);
        this.controls.target.set(playerx,(playery),(playerz+0.001));
        this.controls.update();


        this.transformControls = new TransformControls( this.camera, this.renderer.domElement );
        this.transformControls.addEventListener('mouseDown', function () {
            that.controls.enabled = false;
        });
        this.transformControls.addEventListener('mouseUp', function () {
            that.controls.enabled = true;
        });
        this.transformControls.addEventListener('change', function (e) {
            if(this.object){
                that.updateState(this.object);
            }

        });        
        this.transformControls.addEventListener('objectChange', function (e) {
        });             
    }

    updateState = (controlledObject) => {
        if(!controlledObject){

            return false;
        }
        let assetData = this.sceneInventory.convertItemForStorage(controlledObject,true);
        if(assetData){
            if(this.config.chainAPI.saveSceneAsset){
                console.log('saving asset state: ',assetData);
                this.config.chainAPI.saveSceneAsset(assetData);
            }
        }
    }

    restrictCameraToRoom = () => {
        this.controls.maxDistance = this.config.controls.maxDistance;
        this.controls.maxPolarAngle = this.config.controls.maxPolarAngle;
        this.controls.update();  
    }

    unRestrictCamera = () => {
        this.controls.maxDistance = Infinity;
        this.controls.maxPolarAngle = Infinity; 
        this.controls.update();
    }

    initRenderer = (el) =>{

        //Create a WebGLRenderer
        this.renderer = new THREE.WebGLRenderer({
                autoClear: false,
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true
            });
        this.renderer.autoClear =true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
        this.renderer.xr.enabled = true;
        //the following increases the resolution on Quest
        this.renderer.xr.setFramebufferScaleFactor(2.0);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        this.renderer.setClearColor( 0x000000, 1 );
      //  this.renderer.domElement.style.display = 'none';

        if(el){
           el.appendChild(this.renderer.domElement);
        } else {
            console.log('no el so hide');
            this.renderer.domElement.style.display = 'none';
            this.el.appendChild(this.renderer.domElement);
        };
        this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';     
    }


    initSkybox = ()=>{
        if(this.config.skyBoxHash){
            this.loadEquiRectSkyBox(this.config.skyBoxHash)
        } else {
            if(this.config.skyboxes !== false){
                this.addSky();
            };
        }
    }

    initSceneBounds = ()=>{

    }

    toggleAvatar = ()=>{
        if(this.avatar){
            if(this.avatar.mesh){
                console.log('toggle avatar');
                this.avatar.mesh.visible = (this.avatar.mesh.visible?false:true);
                if(this.avatar.mesh.visible){
                    this.camera.position.setZ(this.player.position.z-4);
                    this.camera.position.lookAt(this.player.position);
                } else {
                    this.camera.position.copy(this.player.position);
                    this.camera.position.setY(this.player.position.y+2);
                }

            }
        }
    }

    loadEquiRectSkyBox = (nftPostHashHex) =>{

        this.nftImporter.import({type:'skybox',
        nftPostHashHex:nftPostHashHex}).then((skyBoxConfig)=>{  
            this.initNFTSkyBox(skyBoxConfig);
        }).catch(err=>{
            console.log('error importing skybox');
            console.log(err);
        })        
    }

    initNFTSkyBox = (skyBoxConfig) =>{
        let that = this;
        console.log('skyBoxConfig: ',skyBoxConfig);
        if(skyBoxConfig.nft.imageURLs[0]){
            const geometry = new THREE.SphereGeometry( 500, 60, 40 );
            // invert the geometry on the x-axis so that all of the faces point inward
            geometry.scale( - 1, 1, 1 );
            let fullImagePath = skyBoxConfig.nft.imageURLs[0];
            console.log('no proxy test');
            console.log('fullImagePath: ',fullImagePath);
            try{
            let loader = new THREE.TextureLoader();
            loader.load(
                fullImagePath,
                function ( texture ) {
                    // create a material using the loaded texture

                    const material = new THREE.MeshBasicMaterial( { map: texture } );
        
                    const mesh = new THREE.Mesh( geometry, material );

                    that.scene.add( mesh );
                },
                function ( xhr ) {
                   // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
                },
                function ( error ) {
                    console.error( 'An error happened', error );
                }
            );
            } catch(error){
                console.log('could not load texture');
                console.log(error);
            }

        } else {
            console.log('no imageURLs[0] in nft');
        }
    }

    loadSceneryNFT = (nftPostHashHex) =>{
        return new Promise((resolve, reject) => {
            if(!this.nftImporter){
                let importerParams= {chainAPI: this.config.chainAPI,
                                    loaders: this.loaders,
                                    modelsRoute:this.config.modelsRoute,
                                    scene: this.scene};

                this.nftImporter = new NFTImporter(importerParams);
               
            };

            this.nftImporter.import({assetType:'scenery',
                                    nftPostHashHex:nftPostHashHex}).then((sceneryConfig)=>{  
                                       resolve(sceneryConfig);
                                    }).catch(err=>{
                                        console.log('error importing scenery');
                                        console.log(err);
                                        reject(err);
                                    });            
        })

    }

    addSky = () =>{
        let skyBoxList = ['blue','bluecloud','browncloud','lightblue','yellowcloud'];
        let skyBoxNo = this.getRandomInt(0,4);
        let skyBox = this.loadSkyBox(skyBoxList[skyBoxNo]);

        this.scene.background = skyBox;
    }

    removeSky = () => {
        this.scene.background = null;
    }

    initLighting = () =>{
        let lights = this.config.lights;



        this.lights = new Lighting({scene:this.scene,
                                        createListeners: false,
                                        lights: lights});   
        //this.addSpotlight();
    }

    initLoaders = () =>{
        //Loader GLTF
        this.loader = this.loaders.getLoaderForFormat(this.config.defaultLoader);      
    }

    addListeners = ()=>{
        document.addEventListener('contextmenu', event => event.preventDefault());
        this.addEventListenerResize();
        this.addEventListenerContextLost();
        this.addEventListenerExitFullScreen();
        this.addEventListenerKeys();
        this.addEventListenerMouseClick();
        this.addEventListenersHUD()
    }    

    addEventListenersHUD = ()=>{
        let that = this;
     /*   let btnDiamond = document.querySelector('#give-diamond');
            this.addClickListenerGiveDiamond(btnDiamond);

        let btnHeart = document.querySelector('#give-heart');
            this.addClickListenerGiveHeart(btnHeart);
*/
        let linkViewFull = document.querySelector('#view-full');  
        this.addClickListenerFullScreen(linkViewFull);

  /*      let btnBuy = document.querySelector('#buy-now');
            this.addClickListenerBuyNow(btnBuy);

        let btnViewPage = document.querySelector('#view-page');
            this.addClickListenerViewPage(btnViewPage);

        let btnViewDetail = document.querySelector('#view-detail');
            this.addClickListenerViewDetails(btnViewDetail);

        let confirmDiamond =  document.querySelector('.confirm-transaction');
            if(confirmDiamond){
                confirmDiamond.addEventListener('click',(e)=>{
                            let diamondCount = this.hud.getDiamondsToSendCount();

                console.log('sending '+diamondCount+' to ',that.hud.selectedItem.config.nft.postHashHex);
                this.config.chainAPI.sendDiamonds(that.hud.selectedItem.config.nft.postHashHex, diamondCount);
            })
        };
*/
    }
    addEventListenerKeys = ()=>{
        let that = this;
        let control = this.transformControls;
        console.log('control: ', control);
        window.addEventListener( 'keydown', function ( e ) {
                switch ( e.code ) {
                        case 'Delete':
                            if ((e.target.tagName.toLowerCase() !== 'textarea') && ( e.target.tagName.toLowerCase() !== 'input')){
                                let item = that.hud.getSelectedItem();
                                if(!item){
                                    console.log('no item selected by hud');
                                    if(that.transformControls.object){
                                        if(that.transformControls.object.mesh){
                                            item = that.transformControls.object;
                                        }
                                    } else {
                                        console.log('no tranformcontrols object')
                                    }
                                }
                                if(item){
                                    control.detach();
                                    that.scene.remove(control);
                                    that.scene.remove(item.mesh);
                                    that.hud.unSelectItem(item);
                                    that.sceneInventory.remove(item);
                                };
                            }
                            break;
                        case 76: // Q
                            control.setSpace( control.space === 'local' ? 'world' : 'local' );
                            break;

                        case 16: // Shift
                            control.setTranslationSnap( 100 );
                            control.setRotationSnap( THREE.MathUtils.degToRad( 15 ) );
                            control.setScaleSnap( 0.25 );
                            break;

                        case 'KeyT': //  M  
                        if(!control.object) {
                            return false;
                        };
                            if(control.mode==='translate'){
                                control.setMode( 'rotate' );
                            } else if(control.mode==='rotate'){
                                control.setMode( 'scale' );
                            } else if(control.mode==='scale'){
                                control.detach();
                                control.setMode( 'translate' );
                                that.scene.remove(control);

                            };
                            break;
                        case 187:
                        case 107: // +, =, num+
                            control.setSize( control.size + 0.1 );
                            break;
                    case 'KeyW':
                        if ((e.target.tagName.toLowerCase() !== 'textarea') && ( e.target.tagName.toLowerCase() !== 'input')){

                            fwdPressed = true; 
                            that.controlProxy.dir = 'f';                         
                        }
                          break;
                    case 'KeyS':
                        if ((e.target.tagName.toLowerCase() !== 'textarea') && ( e.target.tagName.toLowerCase() !== 'input')){

                            bkdPressed = true; 
                            that.controlProxy.dir = 'b';                         
                        }
                        break;
                    case 'KeyD': 
                        if ((e.target.tagName.toLowerCase() !== 'textarea') && ( e.target.tagName.toLowerCase() !== 'input')){

                            rgtPressed = true; 
                            that.controlProxy.dir = 'r';                         
                        }
                        break;
                    case 'KeyA': 
                        if ((e.target.tagName.toLowerCase() !== 'textarea') && ( e.target.tagName.toLowerCase() !== 'input')){

                            lftPressed = true; 
                            that.controlProxy.dir = 'l'; 
                        }
                        break;
                    case 'KeyO': 

                        that.controlProxy.dir = 'rl';
                        that.controlProxy.rot = 'rl';
                        break;
                    case 'KeyP': 

                        that.controlProxy.dir = 'rr';
                        that.controlProxy.rot = 'rr';
                        break;
                    case 'KeyH':
                        that.toggleAvatar();
                        break;
                   // case 'KeyM': that.throwActiveItem(); break;
                    case 'NumpadAdd': that.setMasterVolume(1); break;
                    case 'NumpadSubtract': that.setMasterVolume(0); break;   
                    case 'Numpad0': 
                    break;
                    case 'Numpad4': 
                        //that.moveMeshLeft();
                    break;  
                    case 'Numpad6': 
                        //that.moveMeshRight();
                    break;    
                    case 'Numpad8': 
                        //that.moveMeshForward();
                    break;    
                    case 'Numpad2': 
                        //that.moveMeshBack();
                    break;
                    case 'NumpadAdd': 
                        //that.moveMeshBack();
                    break;                        
                    case 'NumpadSubtract': 
                        //that.moveMeshBack();
                    break;                     
                    case 'Enter':
                       // that.throwSnowBall(e, null);
                    break;
                 /*   case 'Digit0': that.inventory.setActive(0); break;
                    case 'Digit1': that.inventory.setActive(1); break;
                    case 'Digit2': that.inventory.setActive(2); break;
                    case 'Digit3': that.inventory.setActive(3); break;
                    case 'Digit4': that.inventory.setActive(4); break;
                    case 'Digit5': that.inventory.setActive(5); break;
                    case 'Digit6': that.inventory.setActive(6); break;
                    case 'Digit7': that.inventory.setActive(7); break;
                    case 'Digit8': that.inventory.setActive(8); break;*/
                    case 'Space':
                        if ((e.target.tagName.toLowerCase() !== 'textarea') && ( e.target.tagName.toLowerCase() !== 'input')){

                            e.preventDefault();
                            if ( that.playerIsOnGround ) {
                                if(that.player.avatar){
                                    that.player.avatar.animLoader.switchAnim(that.player.avatar.config.format, 'jump');
                                    that.player.state = 'jump';
                                    spacePressed = true;                                

                                    that.playerVelocity.y = 6.0;


                                };


                            }
                        }
                        break;
                    case 'KeyB':
                        if ( that.playerIsOnGround ) {
                            if(that.player.avatar){
                                let newState = 'dance'
                                if(that.player.state == 'dance'){
                                    newState = 'dance2';
                                } else if(that.player.state == 'dance2'){
                                    newState = 'dance3';
                                } else if(that.player.state == 'dance3'){
                                    newState = 'dance';
                                };
                                that.player.avatar.animLoader.switchAnim(that.player.avatar.config.format, that.player.avatar.config.format, newState);
                                that.player.state = newState;
                                KeyBPressed = true;
                            };


                        }

                        break;

                }

            } );

            window.addEventListener( 'keyup', function ( e ) {

                switch ( e.code ) {

                    case 'KeyW': fwdPressed = false; break;
                    case 'KeyS': bkdPressed = false; break;
                    case 'KeyD': rgtPressed = false; break;
                    case 'KeyA': lftPressed = false; break;
                    case 'Space': spacePressed = false; break;
                    case 'KeyBPressed': KeyBPressed = false; break;
                }

            } );

    }
    moveMeshLeft = () =>{
        if(this.hud.selectedItem){
            this.hud.selectedItem.translateX(0.1)
        }
    }

    moveMeshRight = () =>{
        if(this.hud.selectedItem){
            this.hud.selectedItem.translateX(-0.1)          
        }       
    }

    moveMeshForward = () =>{
        if(this.hud.selectedItem){
            this.hud.selectedItem.translateZ(-0.1)           
        }
    }

    moveMeshBack = () =>{
        if(this.hud.selectedItem){
            this.hud.selectedItem.translateZ(0.1)         
        }        
    }

    resetBall = () =>{
        if(this.ball){
            this.ball.velocity.set(0,0,0);
            this.ball.angularVelocity.set(0,0,0);
            this.ball.position.copy(this.ballVector);
        }
    }
    addEventListenerMouseClick = ()=>{
        let that = this;
        this.renderer.domElement.addEventListener( 'mouseup', this.checkMouseUp, false );
        this.renderer.domElement.addEventListener( 'mousedown', this.checkMouseDown, false );        
        this.renderer.domElement.addEventListener( 'dblclick', this.checkMouseDbl, false );
        this.renderer.domElement.addEventListener("touchstart", ()=>{
        if(!this.holding){
            const d = new Date();
            that.startTime = d.getTime();
            that.holding = true;
        }}, false);

        this.renderer.domElement.addEventListener("touchend", ()=>{
            fwdPressed = false;
            that.holding = false;
            that.startTime = false;
        }, false);
    }

    checkMouseDown = (e) =>{
        let that = this;
       
    }


    checkMouseUp = (e) =>{
        let that = this;
        let action = this.raycast(e);
        if(!action.selectedPoint){
            return false;
        };
       // console.log('action.btnIndex: ',action.btnIndex);
        switch(parseInt(action.btnIndex)){
            case 1:
                fwdPressed = false;
                this.holding = false;
                this.startTime = false;
                this.selectTargetNFT(action);
            
    
            break;            
            case 2:
                this.selectTargetNFT(action);

            break;
            default:
                this.selectTargetNFT(action);
            break;
        }
    }

    myInterval = ()=> {
        let that = this;
      var setIntervalId = setInterval(function() {
        if (!that.holding) clearInterval(setIntervalId);
      }, 1000); //set your wait time between consoles in milliseconds here
    }

    showSelectedMeshData =(action) =>{
        let item = null;
        if(!action.selection){
            console.log('showSelectedMeshData: no selection');
            return false;
        };
        if(action.selection.object.userData.owner){
            item = action.selection.object.userData.owner;
        } else {
            item = this.checkForParentOwner(action.selection.object)
        };
        if(item){
            this.selectTargetNFT(action);
            if(item.config.nft){
                let nftDisplayData = item.nftDisplayData;
                if(item.config.spot){
                    nftDisplayData.spot = item.config.spot;
                };
                console.log('selectTargetNFT: ',item.config.nft);
                console.log('nftDisplayData: ',nftDisplayData);

                //this.displayInHUD(nftDisplayData);            
            }

            //console.log(action.selection.object.userData.owner.config.nft);
            //console.log('owner: ',action.selection.object.userData.owner.config.nft.profileEntryResponse.username);
            //console.log('body: ',action.selection.object.userData.owner.config.nft.body);

        } else {
            console.log('no owner: ', action.selection.object);
            if(this.hud){
                this.hud.clear();
            }
        }         
    }

    getItemForAction = (action) =>{
        let item = null;
        if(action.selection.object.userData.owner){
            item = action.selection.object.userData.owner;
        } else {
            item = this.checkForParentOwner(action.selection.object)
        };    
        return item;    
    }

    checkForParentOwner = (mesh) =>{
        let ownerFound = false;
        while((mesh.parent)&&(!ownerFound)){
            mesh = mesh.parent;
            if(mesh.userData.owner){
                ownerFound = true;
            }

        }
        if(ownerFound){
            return mesh.userData.owner;
        } else {
            return false;
        }
    }

    checkForTransformControls = (mesh) =>{
        let ownerFound = false;
        while((mesh.parent)&&(!ownerFound)){
            mesh = mesh.parent;
            if(mesh.isTransformControls){
                ownerFound = true;
            }

        }
        if(ownerFound){
            return mesh;
        } else {
            return false;
        }
    }
    selectTargetNFT = (action) =>{
        let tracks = [];

        this.actionTargetMesh = null;
        let that = this;

        let item = this.getItemForAction(action)
        if(!item){
            return false;
        };
        if(item.isActiveAvatar){
            return false;
        };
        if(item.mesh){
            this.hud.setSelectedItem(item)
            console.log('transforming');
            if(this.transformControls){
                this.transformControls.attach(item.mesh);
                console.log('transform attched');
                console.log('attached to mesh: ',item.mesh);
                console.log(this.transformControls);
                this.transformControls.setSize = 2;
                that.scene.add(this.transformControls);
            }
            this.actionTargetPos = item.getPosition();
        }           
          
       

    }

    parseAudioData = (audioData)=>{
        let tracks = [];
        let info = {};
        console.log('audio detected!');
        let audioExtraData = audioData;
           if(audioExtraData){
            audioData = JSON.parse(audioExtraData)
            console.log('audioData',audioData)
            if(audioData && audioData.TrackCount > 0){
                tracks = JSON.parse(audioData.Tracks)
                //if (previewMode){
                    tracks = tracks.map(x=> { x.trackFile = x.trackFile.replaceAll(' ','%2520');return x });
                //}
            
                console.log('tracks player',tracks);


                console.log('title', audioData.Title)

                info.title = audioData.Title
                info.author = audioData.Author
                info.category = audioData.MusicCategory
                info.subcategory = audioData.MusicSubCategory
                console.log('info',info);
            }
        }
        return tracks;
    }

    getTrackFullUrl = (postHashHex, track) =>{
        let url  = 'https://desodata.azureedge.net/unzipped/'+postHashHex+'/'+track.trackFile;
        return url;
    }

    playAudioNFTTrack = async (postHashHex, fullUrl) =>{
        let that = this;
        console.log('playAudioNFTTrack');
        if(this.currentAudio){
            this.currentAudio.pause();
            this.currentAudio.src = fullUrl
            this.currentAudio.type = 'audio/wav';
        } else {
            this.currentAudio = new Audio();  
            //https://desodata.azureedge.net/unzipped/1588d17557a44cdbdfaf2d8cbb62df4c1336eae46f3e043309d4edecbec6d3a5/Paradigm%2520Shift%2520Master.wav'
            // https://desodata.azureedge.net/unzipped/1588d17557a44cdbdfaf2d8cbb62df4c1336eae46f3e043309d4edecbec6d3a5/Paradigm%20Shift%20Master.wav
            console.log('set src to: ',fullUrl);
            this.currentAudio.src = fullUrl
            this.currentAudio.type = 'audio/wav'
        }


        try {
            await this.currentAudio.play();
            console.log('Playing using set src...',this.currentAudio.src);
            this.isPlayingAudio = true;
            this.currentAudioHash = postHashHex;
        } catch (err) {
            console.log('Failed to play...' + err);
            this.isPlayingAudio = false;            
        }
        


 /*       console.log('create trackClip');
            let trackClip = new AudioClipRemote({
                        path: fullUrl,
                        mesh: this.sceneryMesh,
                        listener: this.audioListener,
                        onEnded: () =>{
                            that.playingTrack = null;
                        }
                    });
            console.log('about to play: ', fullUrl);
            trackClip.play();
            console.log('playing');
            this.audioTracks[postHashHex] = trackClip;
            this.playingTrack = this.audioTracks[postHashHex];*/

    }

    targetFootballPlayer = (item) =>{
        console.log('targeted player');
        console.log(item);
        this.actionTargetItem = item;
        this.actionTargetMesh = item.mesh;        
    }

   
    getShootDirection =() => {
          const vector = new THREE.Vector3(0, 0, 1)
          vector.unproject(this.camera)
          const ray = new THREE.Ray(this.ball.position, vector.sub(this.ball.position).normalize());
          return ray.direction
    }
   
    disableActionBtns = () =>{
        let diamond = document.querySelector('#give-diamond');
        diamond.classList.add("disabled");

        let heart = document.querySelector('#give-heart');
        heart.classList.add("disabled");

        let detail = document.querySelector('#view-detail');
        detail.classList.add("disabled");        
    }

    getVectorAhead = (distance) => {

        let camera = this.camera;
        // Step 1: Create a new Vector3 object to store the direction of the camera
        const direction = new THREE.Vector3();
      
        // Step 2: Use the camera's getWorldDirection() method to obtain the world-space direction vector
        camera.getWorldDirection(direction);
      
        // Step 3: Normalize the direction vector to ensure its length is 1
        direction.normalize();
      
        // Step 4: Multiply the direction vector by the desired distance (2 meters in this case)
        direction.multiplyScalar(distance);
      
        // Step 5: Add the resulting vector to the camera's world position to get the final Vector3 coordinate
        const targetPosition = camera.position.clone().add(direction);
      
        return targetPosition;
      }

      
    enableActionBtns = () =>{
        let diamond = document.querySelector('#give-diamond');
        diamond.classList.remove("disabled");

        let heart = document.querySelector('#give-heart');
        heart.classList.remove("disabled");

        let detail = document.querySelector('#view-detail');
        detail.classList.remove("disabled");

    }

    throwDiamond = ()=>{
        let that = this;
        if(!that.actionTargetPos){
            return false;
        };
        let throwTime = performance.now();
        let item = this.uiAssets['diamond'];
        if(item){
            this.increaseDiamond();
            let heartStatus = this.hud.getHeartStatus();
            if((this.hud.getDiamondsToSendCount()===0)&&(!heartStatus)){
                setTimeout(()=>{
                    this.hideStatusBar(['heart','diamond-count','confirm'])
                }, 3000)
            } else {

                this.showStatusBar(['diamond-count','select-preview','confirm-not','confirm']);
            };

            let start = this.player.position.clone();
            start.y--;

            let finish = that.actionTargetPos.clone();

            item.place(start).then((mesh)=>{
                mesh.visible = true;                
                anime({
                    begin: function(anim) {
                        item.audioGive.play();
                    },
                    targets: mesh.position,
                    x: finish.x,
                    y: finish.y,
                    z: finish.z,
                    loop: false,
                    duration: 4000,
                    complete: function(anim) {
                        mesh.visible = false;
                    }                   
                });
  
            })
        }   
    }


    increaseDiamond =()=>{
        let diamondCount = this.hud.getDiamondsToSendCount();
        if(diamondCount<5){
            ++diamondCount;
        } else {
            diamondCount = 0;
        };
        let diamondCountEl = document.querySelector('#d-count');
        diamondCountEl.innerHTML = String(diamondCount);
    }

    showStatusBar= (iconList) =>{
        let statusbar = document.querySelector('.statusbar');
        statusbar.style.display = 'inline-block';

        if(iconList){
            iconList.forEach((elId)=>{
                let selector ='#'+elId;
                let el = document.querySelector(selector);
                if(el){
                    el.style.display = 'inline-block';
                } else {
                    console.log('not found: ',selector);
                }                
            })
        }
    }

    hideStatusBar= (iconList) =>{
        let statusbar = document.querySelector('.statusbar');
        statusbar.style.display = 'none';

        if(iconList){
            iconList.forEach((elId)=>{
                let selector ='#'+elId;
                let el = document.querySelector(selector);
                if(el){
                   el.style.display = 'none';
                } else {
                    console.log('not found: ',selector);
                }
            })
        }
    }

   
    formatDate =(date)=> {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(date).toLocaleTimeString('en', options);
    }

    convertNanosToDeso = (nanos, d) =>{
        return (nanos / 1e9).toFixed(d)        
    }

    checkMouseDbl = (e) =>{

        let action = this.raycast(e);
       // console.log('action.btnIndex: ',action.btnIndex);
        
     //   this.updateOverlayPos(action.selectedPoint);
        switch(parseInt(action.btnIndex)){
            case 1:
                if(this.config.isCurated){
                    if(this.sounds.throwSound){
                       this.sounds.throwSound.play();
                    } else {
                        console.log('no throwSound');
                    }
                    let x = ( e.clientX / window.innerWidth ) * 2 - 1;
                    let y = - ( e.clientY / window.innerHeight ) * 2 + 1;
                    this.mouse.set(x,y);
                    //this.throwSnowBall(e, null);                    
                } else {
                   // this.showSelectedMeshData(action);
                }
            break;
            default:
                let x = ( e.clientX / window.innerWidth ) * 2 - 1;
                let y = - ( e.clientY / window.innerHeight ) * 2 + 1;
                this.mouse.set(x,y);
                //this.throwSnowBall(e, null);
            break;
        }
    }

    
    updateOverlayPos = (pos) =>{
        let posText = 'x: '+pos.x+' y: '+pos.y+' z: '+pos.z;
        document.querySelector('span#pos-display').innerHTML = posText;
     /*   console.log('camera status');
        console.log(this.camera);
        console.log('controls status');
        console.log(this.controls)        */
    }
    raycastAhead = ( ) => {

        let origin = this.camera.position;

        let dest = origin.clone();
            dest.setZ(1000); //raycast forward
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        this.raycaster.set(origin,dir);
        var intersects = this.raycaster.intersectObjects( this.scene.children, true );
        let hit;
        if(intersects[0]){   
            hit = intersects[0];
            return hit;
        } else {
            return false;
        };

    }

    raycast = ( e ) => {
        var isRightMB;
        let isOnFloor = false;
        let isOnWall = false;
        let btnIndex = 0;
        e = e || window.event;

        if ("which" in e) { // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
            isRightMB = e.which == 3; 
            if(isRightMB){
                 btnIndex = 2;
            } else {
                btnIndex = e.which;
            };
            //console.log(e.which);
        } else if ("button" in e){  // IE, Opera 
            console.log(e.button);
            isRightMB = e.button == 2; 
            if(isRightMB){
                 btnIndex = 1;
            } else {
                 btnIndex = e.button;
            }
        };
    // Step 1: Detect light helper
        //1. sets the this.mouse position with a coordinate system where the center
        //   of the screen is the origin
        let x = ( e.clientX / window.innerWidth ) * 2 - 1;
        let y = - ( e.clientY / window.innerHeight ) * 2 + 1;
        this.mouse.set(x,y);

        //2. set the picking ray from the camera position and this.mouse coordinates
        if(!(this.mouse)||!(this.camera)){
            return false;
        };
        try{
            let raycaster = new THREE.Raycaster();            
                raycaster.setFromCamera( this.mouse, this.camera );    
        //3. compute intersections (note the 2nd parameter)
        var intersects = raycaster.intersectObjects( this.scene.children, true );
        let floorLevel;
        if(intersects[0]){
            isOnFloor = this.isOnFloor(raycaster, intersects[0].point);
            isOnWall = this.isOnWall(raycaster, intersects[0].point);
        };
        return {
            e:e,
            isOnFloor: isOnFloor,
            isOnWall: isOnWall,
            btnIndex: btnIndex,
            selectedPoint: (intersects[0])?intersects[0].point:null,
            selection: (intersects[0])?intersects[0]:null,
        }

        } catch (error) {
          console.log(error);
          return false;

        }


       
    }

    isOnFloor = (raycaster, selectedPoint, meshToCheck) =>{

        let origin = selectedPoint.clone();
            origin.setY(origin.y+2);

        let dest = selectedPoint.clone();
            dest.setY(-1000); //raycast downwards from selected point.
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        raycaster.set(origin,dir);
        var intersects = raycaster.intersectObjects( this.scene.children, true );
        let hit;
        if(intersects[0]){   
            hit = intersects[0];

            if(hit.point.y===selectedPoint.y){
                return true;
            } else {
                return false;
            };
            //this.scene.add(new THREE.ArrowHelper( this.raycaster.ray.direction, this.raycaster.ray.origin, 1000, Math.random() * 0xffffff ));

            return hit.point.y;
        } else {
            return false;
        }
   


    }

isOnWall = (raycaster, selectedPoint, meshToCheck) =>{
        let origin = selectedPoint.clone();
         //   origin.setZ(origin.z-1);
        let dest = selectedPoint.clone();
            dest.setZ(this.player.position.z); //raycast downwards from selected point.
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        raycaster.set(origin,dir);
        var intersects = raycaster.intersectObjects( this.scene.children, true );
        let hit;
        if(intersects[0]){   
            hit = intersects[0];
            if(hit.point.z===selectedPoint.z){
                return true;
            } else {
                //console.log('hit.point.z',hit.point.z,'selectedPoint.z',selectedPoint.z)
                return false;
            };
           // this.scene.add(new THREE.ArrowHelper( this.raycaster.ray.direction, this.raycaster.ray.origin, 1000, Math.random() * 0xffffff ));
        } else {
            return false;
        }
    }

    placeNFT = (pos, nftPostHashHex) =>{
        let item = this.inventory.getItemByHash(nftPostHashHex);
        if(item){
            item.place(pos);
        }

    }

    placeActiveItem = (pos) =>{
        let item = this.inventory.getActiveItem();
        if(item){
            item.place(pos);
        }

    } 
    showOverlay =()=>{

        let that = this;
        let overlay = new NFTViewerOverlay({
            el: this.parentDivEl,
            handlers: {
                floor: (checked)=>{
                    if(checked){
                        that.addScenery();
                    } else {
                        that.unRestrictCamera();
                        that.removeFloor();
                    }
                },
                sky: (checked)=>{
                    if(checked){
                        that.addSky();
                    } else {
                        that.removeSky();
                    }
                }
            }
        })        
    }

    getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getRandom = (min, max) => {
        min = min*10;
        max = max*10;
        let randomInt = this.getRandomInt(min, max);
        return randomInt/10;
    }

    loadSkyBox = (boxname) => {
        if(this.config.skyboxPath===''){
            return false;
        };

        let skybox ='';

        const loader = new THREE.CubeTextureLoader();
        let skyboxPath = this.config.skyboxPath+'/'+boxname+'/';
        loader.setPath(skyboxPath);

        switch(boxname){
            case 'bluecloud':
                skybox = loader.load([
                            'bluecloud_ft.jpg',
                            'bluecloud_bk.jpg',
                            'bluecloud_up.jpg',
                            'bluecloud_dn.jpg',
                            'bluecloud_rt.jpg',
                            'bluecloud_lf.jpg']);
            break;
            case 'yellowcloud':
                skybox = loader.load([
                            'yellowcloud_ft.jpg',
                            'yellowcloud_bk.jpg',
                            'yellowcloud_up.jpg',
                            'yellowcloud_dn.jpg',
                            'yellowcloud_rt.jpg',
                            'yellowcloud_lf.jpg']);
            break;
            case 'browncloud':
                skybox = loader.load([
                            'browncloud_ft.jpg',
                            'browncloud_bk.jpg',
                            'browncloud_up.jpg',
                            'browncloud_dn.jpg',
                            'browncloud_rt.jpg',
                            'browncloud_lf.jpg']);
            break;
            case 'lightblue':
                skybox = loader.load([
                            'right.png',
                            'left.png',
                            'top.png',
                            'bot.png',
                            'front.png',
                            'back.png']);
            break;             
            case 'blue':
                skybox = loader.load([
                            'bkg1_right.png',
                            'bkg1_left.png',
                            'bkg1_top.png',
                            'bkg1_bot.png',
                            'bkg1_front.png',
                            'bkg1_back.png']);
            break;
        }
        
        return skybox;
    }

    addEventListenerResize = () =>{

        window.addEventListener('resize', this.resize.bind(this), false);
    }

    addEventListenerContextLost = () =>{

//        this.renderer.context.canvas.addEventListener("webglcontextlost", this.onLostContext);
    }

    onLostContext = (e)=>{
        e.preventDefault();
        console.log('lost!', e);
        this.renderer.setAnimationLoop(null);
    }

    addEventListenerExitFullScreen = () =>{
        if (document.addEventListener){
            document.addEventListener('webkitfullscreenchange', this.fsChangeHandler, false);
            document.addEventListener('mozfullscreenchange', this.fsChangeHandler, false);
            document.addEventListener('fullscreenchange', this.fsChangeHandler, false);
            document.addEventListener('MSFullscreenChange', this.fsChangeHandler, false);
        }

    }

    /* Close fullscreen */
    closeFullscreen = () =>{
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
      this.isFullScreen = false;       
      if(this.config.onFullScreenToggle){
        this.config.onFullScreenToggle(this.isFullScreen);
      }

    }

    fsChangeHandler = () =>{
            if (document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement !== undefined) {            
        } else {
          var elem = this.renderer.domElement;
            elem.style.width = 'auto';
            elem.style.height = 'auto';
            this.isFullScreen = false;            
            this.camera.aspect = this.parentDivElWidth/this.parentDivElHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);

        }
        this.resizeCanvas();
    
    }

    resize = () =>{
        if (!this.renderer.xr.isPresenting) {
            this.resizeCanvas();
        };
    }
    resizeCanvas = () =>{
        if(this.isFullScreen){
            let canvasWidth = screen.width;
            let canvasHeight = screen.height;
            this.camera.aspect = canvasWidth/canvasHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(canvasWidth,canvasHeight);
        } else {
            this.parentDivElWidth = this.parentDivEl.offsetWidth;
            this.parentDivElHeight = this.parentDivEl.offsetHeight;                       
            this.camera.aspect = this.parentDivElWidth/this.parentDivElHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        };
        if(this.controls){
          this.controls.update();
        };
    }

        
        
    animate = () =>{
        this.renderer.setAnimationLoop(this.render);
    }
    
        render = () =>{

 
       // this.cannonDebugRenderer.update()
         if (this.renderer.xr.isPresenting === true) {
            if(this.vrControls){
                this.vrControls.checkControllers();
            }
        } else {
            if(this.holding&&(!fwdPressed)){
                let d = new Date();
                let timeNow = d.getTime();
                let timeDiff = timeNow - this.startTime;
                if(timeDiff>1500){
                    fwdPressed = true;
                }
            }
        }

        const delta = Math.min( this.clock.getDelta(), 0.1 );
        if(this.world){
            this.updatePhysicsWorld();
            if(this.ball){
                if(this.ball.position.y < -2){
                    this.resetBall();
                }
            }
        };

            if ( this.config.firstPerson ) {

            this.controls.maxPolarAngle = Infinity;
            this.controls.minDistance = 1e-4;
            this.controls.maxDistance = 60;

            } else {

                this.controls.maxPolarAngle = Math.PI;
                this.controls.minDistance = 0.5;
                this.controls.maxDistance = 60;

            }

              if ( this.collider ) {
//console.log('got this.collider');
                this.collider.visible = params.debug;
                if(this.sceneryLoader.visualizer){
                   this.sceneryLoader.visualizer.visible = params.debug;
                }

                const physicsSteps = params.physicsSteps;

                for ( let i = 0; i < physicsSteps; i ++ ) {

                    if (this.renderer.xr.isPresenting === true) {
                        if(this.vrType==="walking"){
                           this.updatePlayerVR( delta );
                        }
                    } else {
                        this.updatePlayer( delta / physicsSteps );
                    }

                }

            }

            // TODO: limit the camera movement based on the this.collider
            // raycast in direction of camera and move it if it's further than the closest point

        //this.controls.update();
        //this.updateAnimations(delta);

        this.renderer.render(this.scene, this.camera);
        this.updateAvatarAnimations(delta);        

        //this.hud.render();

    }

    updateAnimations = (delta)=>{
        this.sceneInventory.updateAnimations(delta);
    }

    updateAvatarAnimations = (delta) =>{
        //update all visible items running animations in sceneInventory
        this.avatars.forEach((item)=>{
            if((item.mixer !== null)){
                item.updateAnimation(delta);
            }
        })
    }    

    updatePhysicsWorld =() =>{
        this.world.step(this.dt); 
        this.world.bodies.forEach( function(body){
            if ( body.threeMesh !== undefined){
                body.threeMesh.position.copy(body.position);
                body.threeMesh.quaternion.copy(body.quaternion);
            }
        });
    }

    centerMeshInScene = (gltfScene) =>{
        let firstMesh = null;

        if(gltfScene.children.length === 1){
            firstMesh = gltfScene.children[0];
            firstMesh.geometry.center();
            return firstMesh;            
        } else {
            gltfScene.traverse( c => {

                if ( c.isMesh ) {

                    firstMesh = c;
                    firstMesh.geometry.center();
                    return firstMesh;  
                }

            } );
        }


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

    updateUI = (el, modelUrl) => {

        let linkCtr = this.config.linkCtrCls;
            linkCtr = document.querySelector('.'+linkCtr);

        let linkView3D = this.createLinkView3D();
        this.addClickListener3D(linkCtr, linkView3D, modelUrl);

        let linkViewFull = this.createLinkFullScreen()
        this.addClickListenerFullScreen(linkCtr, linkViewFull, modelUrl);

        let linkViewVR = this.createLinkVR()
        this.addClickListenerVR(linkCtr, linkViewVR, modelUrl)

        var viewerEl = linkCtr;
        viewerEl.innerHTML = '';
        viewerEl.appendChild(linkView3D);
        viewerEl.appendChild(linkViewFull);
        viewerEl.appendChild(linkViewVR);

        el.setAttribute('model-status','available');
    }

    createLinkView3D = () =>{
        var a = document.createElement('a');
        var linkText = document.createTextNode(this.config.linkText);
            a.appendChild(linkText);
            a.title = "View in 3D";
            a.href = "#";
            a.classList = "btn d3d-btn view-3d-btn";
        return a;
    }

    createLinkFullScreen = () =>{
        var a = document.createElement('a');
        var linkText = document.createTextNode('Full Screen');
            a.appendChild(linkText);
            a.title = "Fullscreen";
            a.href = "#";
            a.classList = "btn d3d-btn view-fullscreen-btn";
            a.setAttribute('style','display:none;');
        return a;
    }    

    createLinkVR = () =>{
        var a = document.createElement('a');
        var linkText = document.createTextNode('View in VR');
            a.appendChild(linkText);
            a.title = "View in VR";
            a.href = "#";
            a.classList = "btn d3d-btn view-vr-btn";
            a.setAttribute('style','display:none;');
        return a;
    }    
    

  openFullscreen =()=> {
      var elem = this.el;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
      }
      elem.style.width = '100%';
      elem.style.height = '100%';
      this.isFullScreen = true;
      if(this.config.onFullScreenToggle){
        this.config.onFullScreenToggle(this.isFullScreen);
      }      
    }

    
    addSpotlight = (pos, targetMesh) =>{
    let spotLight = new THREE.SpotLight( 0xffffff, 10 );
        spotLight.position.copy(pos);
        spotLight.position.y = 10;
        spotLight.angle = Math.PI / 18;
        spotLight.penumbra = 1;
        spotLight.decay = 2;
        spotLight.distance = 100;
        spotLight.target = targetMesh;

      
        this.scene.add( spotLight );        
        this.spotLight = spotLight;

        let pos2 = pos.clone();

    let spotLight2 = new THREE.SpotLight( 0xffffff, 10 );
        spotLight2.position.copy(pos2);
        spotLight2.position.y = -2;
        spotLight2.angle = Math.PI / 12;
        spotLight2.penumbra = 1;
        spotLight2.decay = 2;
        spotLight2.distance = 100;
        spotLight2.target = targetMesh;

      
        this.scene.add( spotLight );      
        this.scene.add( spotLight2 );   
        this.spotLight = spotLight;        
        this.spotLight2 = spotLight2;      
   // let lightHelper = new THREE.SpotLightHelper( spotLight );
  //  this.scene.add( lightHelper );
    }

    initInventory = (options) =>{

        let items =[];
        if(options.items){
            items = options.items;
        }
     
    /*    this.inventory = new D3DInventory({ chainAPI: this.config.chainAPI,
                                            imageProxyUrl: this.config.imageProxyUrl,    
                                            items: items,
                                            scene: this.scene,
                                            loader: this.loader,
                                            loaders: this.loaders,
                                            width: this.config.sceneryOptions.scaleModelToWidth,
                                            depth: this.config.sceneryOptions.scaleModelToDepth,
                                            height: this.config.sceneryOptions.scaleModelToHeight,
                                            modelsRoute: this.config.modelsRoute,
                                            nftsRoute: this.config.nftsRoute,
                                            loadingScreen: this.loadingScreen
                                        });*/
        this.sceneInventory = null;

        let plotterOpts ={
            camera: this.camera,
            scene: this.scene,
            sceneryLoader: this.sceneryLoader}

           this.layoutPlotter = new LayoutPlotter(plotterOpts);  
           
           let sceneInvConfig = {
               transformControls: this.transformControls,  
               animations: this.config.animations,
               chainAPI: this.config.chainAPI,
               imageProxyUrl: this.config.imageProxyUrl,    
               items2d: [],
               items3d: [],
               scene: this.scene,
               loader: this.loader,
               loaders: this.loaders,
               width: 3, // IMPORTANT! Default size for images unless specified in circle layout
               depth: 0.1,
               height: 2,
               modelsRoute: this.config.modelsRoute,
               nftsRoute: this.config.nftsRoute,
               layoutPlotter: this.layoutPlotter
           }

        if(options.sceneAssets){

            let displayable = options.sceneAssets.filter(item =>this.itemCanBePlaced(item));
            //let maxItems =this.layoutPlotter.getMaxItemCount();
            //let maxItems3D =this.layoutPlotter.getMaxItemCount3D();
            
            let items2d = displayable.filter(item =>{
                if(item.nft){
                    if(item.nft.path3D){
                        return false;
                    };     
                    let postExtraData = (item.nft.PostExtraData)?item.nft.PostExtraData: (item.nft.postExtraData)?item.nft.postExtraData:null;
                    if(postExtraData){
                        if(postExtraData.hasOwnProperty('3DExtraData')){
                            return false;
                        }
                    }

                    if(item.nft.imageURLs){
                        return true; 
                    };

                    if(item.nft.ImageURLs){
                        return true;
                    }
                        
                } 
                return false;
            });     
            let items3d = displayable.filter(item => {
                if(!item.nft){
                    return false;
                };
                if(item.nft.path3D){
                    return true;
                }
                if(!item.nft.PostExtraData){
                    if(item.nft.postExtraData){
                        item.nft.PostExtraData = item.nft.postExtraData;
                    } else {
                        return false;
                    }                    
                };
                if(!item.nft.PostExtraData['3DExtraData']){
                    return false;
                };
                return true;
            });

            sceneInvConfig.items2d = items2d;
            sceneInvConfig.items3d = items3d;

            if(this.world){
                sceneInvConfig.physicsWorld = this.world;
            };

            let haveVRM = this.haveVRM(items3d);
            if(haveVRM){
                sceneInvConfig.animLoader = true;
            };
        };
        //console.log('sceneInvConfig',sceneInvConfig);
        this.sceneInventory = new D3DInventory(sceneInvConfig);
        this.gifs = this.sceneInventory.getGifs();
        if(this.gifs.length>0){
           // console.log('initialize gifs: ',this.gifs.length);
          //  this.initGifs();
        }
        
    }

    initGifs = ()=>{

        this.giffer = new Giffer({proxy: this.config.imageProxyUrl});
        this.giffer.loadGifs(this.gifs);
    }

    itemCanBePlaced = (itemData) =>{
        if(!itemData.hasOwnProperty('nft')){
            console.log('item missing nft prop - not displayable');
            return false;
        };
        if(!itemData.hasOwnProperty('pos')){
            console.log('item missing pos prop - not displayable');

            return false;
        }
        if(!itemData.hasOwnProperty('rot')){
            console.log('item missing rot prop - not displayable');

            return false;
        }
        if(!itemData.hasOwnProperty('scale')){
            console.log('item missing scale prop - not displayable');

            return false;
        }          

        return true;             
    }

    haveVRM = (items3dToRender) =>{
        //items3dToRender.filter(item=>(item.nft.))
        return true; //test
    }
    
    getPlayerPos =()=>{
        return this.player.position;
    }

    initItem = (opts) =>{

                let extraParams = { nftPostHashHex: opts.nftPostHashHex,
                                    extraData3D:opts.extraDataString,
                                    endPoint:this.config.modelsRoute};

                let extraDataParser = new ExtraData3DParser(extraParams);
                let formats = extraDataParser.getAvailableFormats();                    
                let models = extraDataParser.getModelList();
                let modelUrl = extraDataParser.getModelPath(0,'any','any');
                if(modelUrl){
                    let urlParts = modelUrl.split('.');
                    let extension = urlParts[urlParts.length-1];
                    let pathParts =  modelUrl.split('/');
                    pathParts.pop(); 
                    let folderPath = pathParts.join('/')+'/'
                    // combine with computed params
                    let avatarParams = {
                        ...opts,
                        ...{animLoader: true,
                            imageProxyUrl: this.config.imageProxyUrl,
                            avatarPath: folderPath, // current minter does not allow subfolders so anims on the same level
                            loader: this.loaders.getLoaderForFormat(extension),                        
                            modelUrl: modelUrl,
                            scene: this.scene,
                            format: formats[0]}

                    };
                    let item = new Item(avatarParams);                

                    return item;                    
                } else {
                    console.log('could not retreive avatar modelUrl');
                }


    }

    initItemForModel = (opts) =>{
        let item = null;

        let urlParts = opts.modelUrl.split('.');
        let extension = urlParts[urlParts.length-1];
        let config = {
            three: THREE,
            loader: this.loaders.getLoaderForFormat(extension),
            scene: this.scene,
            animLoader: (opts.animLoader)?opts.animLoader:false,
            height: 2,
            width: 2,
            depth: 2,
            modelUrl: opts.modelUrl,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            format:extension,
            physicsWorld: (opts.physicsWorld)?opts.physicsWorld:null,
            avatar: (opts.avatar)?opts.avatar:null,
            avatarPath: (opts.avatarPath)?opts.avatarPath:null,
            owner: (opts.owner)?opts.owner:null            
        }

        if(extension.trim().toLowerCase()==='vrm'){
            console.log('avatar is VRM, extension: ',extension);
            config.animations = this.config.animations;
            config.animLoader = true;
            config.height=4;
            config.width=4;
            config.depth=4;            
            item = new ItemVRM(config);
        } else {
            console.log('avatar is NOT VRM, extension: ',extension);

            item = new Item(config);
        };

        return item;

    }

    initAvatarForModel = (modelUrl, size) =>{
        let urlParts = modelUrl.split('.');
        let extension = urlParts[urlParts.length-1];

        if(!size){ // default size for avatar

            size = {
                width: 1,
                height: 1,
                depth: 1
            }
        }

        let item = new Item({
            three: THREE,
            loader: this.loaders.getLoaderForFormat(extension),
            scene: this.scene,
            height: size.height,
            width: size.width,
            depth: size.depth,
            modelUrl: modelUrl,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            format:extension
        });
        return item;

    }    

    initVR = () =>{

        let that = this;
        
        VRButton.registerSessionGrantedListener();        
        let vrBtnOptions = { btnCtr : 'view-vr-btn',
                             viewer: this,
                             onStartSession: ()=>{
                                let vrType = 'walking';

                                that.initVRSession(vrType);                                
                            } }
                            console.log('vrBtnOptions: ',vrBtnOptions);
                            console.log('creat button now...');
                            console.log(VRButton);
        this.vrButton = VRButton.createButton(this.renderer, vrBtnOptions);

    }

    stopAllAnimations = () =>{
        if(this.ghostTimer){
            clearTimeout(this.ghostTimer);

            this.ghostSounds.impact.stop()
            this.ghostSounds.atmo.stop();
            this.ghostSounds.woo.stop();
            this.ghostSounds.creak.stop();
            if(this.ghost){
               this.ghost.tl.pause();
            }

            this.lights.switchOnDirectional();                                             
            if(this.ghost.mesh){
                this.scene.remove(this.ghost.mesh);
            };

            this.lights.aLight.color.setHex(0xffffff);
            this.lights.aLight.intensity = 1; 
            if(this.spotLight) {
                this.scene.remove(this.spotLight);
                this.scene.remove(this.spotLight2);         
            }
        }
    }
    
    getVrTypeFromUI = () =>{
        let selectedVrType = 'walking';
        let vrTypeSelect = document.getElementById('vrType');
        if(vrTypeSelect){
            selectedVrType = vrTypeSelect.options[vrTypeSelect.selectedIndex].value;
        };
        return selectedVrType;
    }

    setVrType = (vrType) => {
        this.vrType = vrType;
    }

    initVRSession = (vrType) =>{
        let that = this;
        console.log('initVRSession');
        this.controlProxy = {};
        this.vrControls = new VRControls({  renderer: this.renderer,
                                            scene:this.scene,
                                            vrType: 'walking',
                                            moveUp: (data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'u';                                                
                                            },
                                            moveDown:(data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'd';
                                            },
                                            moveLeft:(data, value)=>{
                                                console.log('moveLeft triggered');
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'l';  
                                            },                                            
                                            moveRight:(data, value)=>{
                                                console.log('moveright triggered');

                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'r';
                                            },
                                            moveForward:(data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'f';                                                   
                                            },
                                            moveBack:(data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'b';
                                            },
                                            rotateLeft: (data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.rot = 'rl';
                                            },
                                            rotateRight: (data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.rot = 'rr';
                                            },
                                            triggerLeft:(data, value)=>{
                                            },
                                            triggerRight:(data, value)=>{
                                            },
                                            paddleLeft:(data, value)=>{

                                            },  
                                            paddleRight:(data, value)=>{

                                            },
                                            stopMoving: ()=>{
                                                that.controlProxy.data = null;
                                                that.controlProxy.value = null;
                                                that.controlProxy.dir =null;  
                                            },
                                            cancelRotate: ()=>{
                                                that.controlProxy.isRotating = false;
                                                that.controlProxy.rot = null;
                                            },
                                            onSelectStartLeft: (e,controller)=>{
                                               console.log(controller.line);
                                            },
                                            onSelectEndLeft: (e,controller)=>{
                                            },
                                            onSelectStartRight: (e,controller)=>{
                                               console.log(controller.line);
                                               //this.throwSnowBall(e,controller)

                                            },
                                            onSelectEndRight: (e,controller)=>{
                                            }                                            
                                        });

        this.playerVR = new PlayerVR({  controllers: this.vrControls.controllers,
                                        grips: this.vrControls.grips,
                                        camera: this.camera,
                                        controlProxy: this.controlProxy,
                                        playerStartPos: this.player.position.clone(),
                                        sceneCollider: this.sceneryLoader.collider});

        this.scene.add(this.playerVR.dolly);
        this.removePlayer();

    }

    removePlayer = () =>{
        this.player.remove(...this.player.children);
        this.scene.remove(this.player);

    }
    addScenery = () =>{
        let that = this;
        if(this.sceneryMesh){
            this.scene.add(this.sceneryMesh);
        } else {
            let modelURL = this.config.sceneryPath;
            that.loader = this.loaders.getLoaderForFormat('gltf');
            that.loader.load(modelURL, (model)=> {
                let gltfMesh = null;
                gltfMesh = model.scene;
                gltfMesh.position.set(0,0,0); 
                gltfMesh.scale.set(0.2,0.2,0.2);    
                that.sceneryMesh = gltfMesh;
                that.scene.add(that.sceneryMesh);
                this.restrictCameraToRoom();

            })            
        }
        
    }

    removeScenery = () =>{
        if(this.sceneryMesh){
            this.scene.remove(this.sceneryMesh);
            this.unRestrictCamera();
        }
    }    

    removeFloor = () =>{
        if(this.sceneryMesh){
            this.scene.remove(this.sceneryMesh);
            this.unRestrictCamera();
        }
    }

    addClickListenerViewDetails = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            let item = that.hud.getSelectedItem();
            if(item){
                let nftDisplayData = item.nftDisplayData;
                if(item.config.spot){
                    nftDisplayData.spot = item.config.spot;
                };
                //this.displayInHUD(nftDisplayData);                
            }         
        });     
    } 

    addClickListenerGiveDiamond = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(e.target.classList.contains('disabled')){
                return false;
            };
            that.throwDiamond();
        });     
    }    

    addClickListenerGiveHeart = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(e.target.classList.contains('disabled')){
                return false;
            };            
            that.throwHeart();
        });     
    }    

    addClickListenerBuyNow = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(e.target.classList.contains('disabled')){
                return false;
            };
            this.hud.openBuyNFT()    
        });     
    } 


    addClickListenerViewPage = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(e.target.classList.contains('disabled')){
                return false;
            };
            this.hud.openNFTPage()           
        });     
    } 

    addClickListenerFullScreen = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            console.log('clicked, isFullScreen: ',that.isFullScreen);
            if(that.isFullScreen){
                that.closeFullscreen();
                that.toggleFullScreenBtnText(e.target,'Full')                
            } else {
                that.openFullscreen();
                that.toggleFullScreenBtnText(e.target, 'Exit');
            }
            that.resizeCanvas(true);
        });     

 //console.log('adding listener for '+modelUrl);
 el.addEventListener("touchstart", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    console.log('touchstart, isFullScreen: ',that.isFullScreen);
        if(that.isFullScreen){
            that.closeFullscreen();
            that.toggleFullScreenBtnText(e.target,'Full')                
        } else {
            that.openFullscreen();
            that.toggleFullScreenBtnText(e.target, 'Exit');
        }
        that.resizeCanvas(true);
    });             
    }    

    toggleFullScreenBtnText = (link, msg) =>{
        link.innerHTML = msg;
    }
    addClickListenerVR = (ctr, el, modelUrl) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            that.openVR();
            //that.resizeCanvas(true);
        });     
    }   



    openVR = (el) =>{
        console.log('clicking vr button: ',this.vrButton)
        this.vrButton.click();

    }
    updateLink = (linkEl, linkText)=> {
        linkEl.text = linkText;
    }

    findElFrom = (elClassName, ctr) =>{
        let targetEl = null;
        let matchedEls = ctr.getElementsByClassName(elClassName);
        if(matchedEls.length>0){
            targetEl = matchedEls[0];
        };
        return targetEl;
    }

    initNFTs = (container)=>{
        if(!container){
            container = document.body;
        };
    
        let nftContainers = Array.from(container.getElementsByClassName(this.config.ctrClass));

        nftContainers.forEach(this.initModel);        
    }

    initModel = (el) => {
        const that = this;
        let modelStatus = el.getAttribute('model-status');
        if(!modelStatus){
            modelStatus = 'requested';
            el.setAttribute('model-status',modelStatus);
        };
        if(modelStatus!=='available'){
            let nftPostHash = el.getAttribute(this.config.nftDataAttr);
            let url = '';
            if(that.config.modelsRoute.indexOf('http')===-1){
                url = '/'+this.config.nftsRoute+'/'+nftPostHash;
            } else {
                url = this.config.nftsRoute+'/'+nftPostHash;
            };
            fetch(url,{ method: "post"})
            .then(response => response.json())
            .then((data)=>{ 

                if(data !== undefined){
                    let fullUrl = '';
                    if(that.config.modelsRoute.indexOf('http')===-1){
                        // not a remote server so add a slash for local path
                        fullUrl = '/'+that.config.modelsRoute+'/'+nftPostHash+data.modelUrl;
                    } else {
                        fullUrl = that.config.modelsRoute+'/'+nftPostHash+data.modelUrl;
                    };
                    this.updateUI(el, fullUrl);
                };

            }).catch(err => {
                console.log(err);
                console.log(response);
            });
        };

    }


initPlayerFirstPerson = (options) => {

    let that = this;
    let newPos = null;
    let playerFloor = 0;
    let playerStartPos = this.calcPlayerStartPos();
    let offsetStartPos = this.calcOffestStartPos(playerStartPos);


    that.player = new THREE.Group();
    that.player.position.copy(offsetStartPos);
    that.player.rotation.set(0,0,0);
    that.character = new THREE.Mesh(
        new RoundedBoxGeometry(  1.0, 1.0, 1.0, 10, 0.5),
        new THREE.MeshStandardMaterial({ transparent: true, opacity: 0})
    );

    that.character.geometry.translate( 0, -1, 0 );
    that.character.capsuleInfo = {
        radius: (this.config.capsuleRadius)?this.config.capsuleRadius:1,
        segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, - 1.0, 0.0 ) )
    };    
    that.character.rotation.set(0,0,0);

    that.player.add(that.character);
    that.character.updateMatrixWorld();
    that.scene.add( that.player );
    that.player.updateMatrixWorld();
    let lookAtStartPos = that.player.position.clone();
    lookAtStartPos.setZ(lookAtStartPos.z+10); // look ahead
    lookAtStartPos.setY(that.player.position.y); // look ahead    
    that.resizeCanvas();    
    this.initControls();
    this.initInventory(options);         
    this.addListeners();   
    this.camera.position.copy(offsetStartPos);
    that.camera.lookAt(lookAtStartPos);

    that.animate();



}

initPlayerThirdPerson = (options) => {

    let that = this;
    let newPos = null;
    let playerFloor = 0;
    let playerStartPos = this.calcPlayerStartPos();
    let offsetStartPos = this.calcOffestStartPos(playerStartPos);

    let raidus = 0.5;
    that.character = new THREE.Mesh(
        new RoundedBoxGeometry(  1.0, 2.0, 1.0, 10, raidus),
        new THREE.MeshStandardMaterial({ transparent: true, opacity: 0})
    );

    that.character.geometry.translate( 0, - 0.5, 0 );
    that.character.capsuleInfo = {
        radius: raidus,
        segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, - 1.0, 0.0 ) )
    };    
    that.character.rotation.set(0,0,0);
    that.character.position.copy(offsetStartPos);
    that.scene.add(that.character);
    that.character.updateMatrixWorld();
           
    //place avatar in the center of the Player group
   this.avatar.place(playerStartPos).then((model,pos)=>{

        that.player = new THREE.Group();   
        that.player.position.copy(offsetStartPos);
        that.player.state = 'idle';

        that.player.rotation.set(0,0,0);         
        that.player.attach(that.character);
        that.player.attach(that.avatar.mesh);

        that.scene.add( that.player );
        that.player.updateMatrixWorld();
        that.player.avatar = that.avatar;

        that.avatars.push(that.avatar);

        let loggedInUserName = 'Guest';
        if(this.config.currentUser){
            loggedInUserName = this.config.currentUser.Username;
        };
        that.createLabel(loggedInUserName, that.player, {x:0,y:(that.player.position.y+0.5),z:0});
        let lookAtStartPos = that.player.position.clone();
        lookAtStartPos.setZ(lookAtStartPos.z+10); // look ahead
        lookAtStartPos.setY(that.player.position.y); // look ahead
        that.resizeCanvas();        

        this.initControls();
        this.initInventory(options);         
        this.addListeners();            
        this.camera.position.copy(offsetStartPos);
        this.camera.position.z=this.camera.position.z-4;
        that.camera.lookAt(lookAtStartPos);
        that.animate();
        that.sceneryloadingComplete = true;
    //    that.loadingScreen.hide();
    }).catch(err=>{
        that.config.firstPerson =true;
        that.initCameraFirstPerson(); 
        that.initPlayerFirstPerson(options);      
    })
   
    
   
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

    addPlaneAtPos = (posVector) =>{
        var geo = new THREE.PlaneBufferGeometry(20, 20);
        var mat = new THREE.MeshPhongMaterial({ color: 0x99FFFF, side: THREE.DoubleSide });
        var plane = new THREE.Mesh(geo, mat);
        plane.rotateX( - Math.PI / 2);
        plane.position.copy(posVector);
        this.scene.add(plane);

    }

updatePlayer = ( delta )=> {
    let that = this;
    this.playerVelocity.y += this.playerIsOnGround ? 0 : delta * params.gravity;
    this.player.position.addScaledVector( this.playerVelocity, delta );

    // move the player
    const angle = this.controls.getAzimuthalAngle();
    if ( fwdPressed ) {
        this.tempVector.set( 0, 0, - 1 ).applyAxisAngle( this.upVector, angle );
    }

    if ( bkdPressed ) {
        this.tempVector.set( 0, 0, 1 ).applyAxisAngle( this.upVector, angle );
    }

    if ( lftPressed ) {
        this.tempVector.set( - 1, 0, 0 ).applyAxisAngle(  this.upVector, angle );
    }

    if ( rgtPressed ) {
        this.tempVector.set( 1, 0, 0 ).applyAxisAngle( this.upVector, angle );
    }
    
    if(fwdPressed||bkdPressed||lftPressed||rgtPressed){

        this.player.position.addScaledVector( this.tempVector, params.playerSpeed * delta );
        this.updatePlayerDirection(delta);

        if(this.player.avatar){  
            if(!spacePressed){
                if(this.playerIsOnGround){
                  if(this.player.state!='walk'){
                        if(this.player.avatar.animLoader.switchAnim(that.player.avatar.config.format, 'walk')){
                            this.player.state = 'walk'                    
                        }
                  }
                } 
            }
        }
    } else {
        // not walking
        switch (this.player.state){
            case 'walk':
            case 'run':
                // state has not been updated to idle yet
                if(this.player.avatar.animLoader.switchAnim(that.player.avatar.config.format, 'idle')){
                    this.player.state = 'idle';
                };                   
                break;
            case 'jump':
                // only update state if we hit the ground
            if(this.playerIsOnGround){
                if(this.player.avatar.animLoader.switchAnim(that.player.avatar.config.format, 'idle')){
                    this.player.state = 'idle';
                };
            };
            break;
            case 'dance':
            case 'dance2':
            case 'dance3':
                // do not update state - keep dancing!
            break;
        }  
    }

    this.player.updateMatrixWorld();        

    // adjust player position based on collisions
    const capsuleInfo = this.character.capsuleInfo;
    this.tempBox.makeEmpty();
    this.tempMat.copy( this.collider.matrixWorld ).invert();
    this.tempSegment.copy( capsuleInfo.segment );

    // get the position of the capsule in the local space of the this.collider
    this.tempSegment.start.applyMatrix4( this.player.matrixWorld ).applyMatrix4( this.tempMat );
    this.tempSegment.end.applyMatrix4( this.player.matrixWorld ).applyMatrix4( this.tempMat );

    // get the axis aligned bounding box of the capsule
    this.tempBox.expandByPoint( this.tempSegment.start );
    this.tempBox.expandByPoint( this.tempSegment.end );

    this.tempBox.min.addScalar( - capsuleInfo.radius );
    this.tempBox.max.addScalar( capsuleInfo.radius );

    this.collider.geometry.boundsTree.shapecast( {

        intersectsBounds: box => box.intersectsBox( this.tempBox ),

        intersectsTriangle: tri => {

            // check if the triangle is intersecting the capsule and adjust the
            // capsule position if it is.
            const triPoint = this.tempVector;
            const capsulePoint = this.tempVector2;

            const distance = tri.closestPointToSegment( this.tempSegment, triPoint, capsulePoint );
            if ( distance < capsuleInfo.radius ) {
                const depth = capsuleInfo.radius - distance;
                const direction = capsulePoint.sub( triPoint ).normalize();
               //console.log('distance: ',distance,' radius: ',capsuleInfo.radius,' depth: ',depth,' direction: ',direction);

                this.tempSegment.start.addScaledVector( direction, depth );
                this.tempSegment.end.addScaledVector( direction, depth );

            }

        }

    } );


    // get the adjusted position of the capsule this.collider in world space after checking
    // triangle collisions and moving it. capsuleInfo.segment.start is assumed to be
    // the origin of the player model.
    const newPosition = this.tempVector;
    newPosition.copy( this.tempSegment.start ).applyMatrix4( this.collider.matrixWorld );

    // check how much the this.collider was moved
    const deltaVector = this.tempVector2;
    deltaVector.subVectors( newPosition, this.player.position );

    // if the player was primarily adjusted vertically we assume it's on something we should consider ground
    this.playerIsOnGround = deltaVector.y > Math.abs( delta * this.playerVelocity.y * 0.25 );

    const offset = Math.max( 0.0, deltaVector.length() - 1e-5 );
    deltaVector.normalize().multiplyScalar( offset );

    // adjust the player model
    this.player.position.add( deltaVector );
    if ( ! this.playerIsOnGround ) {

        deltaVector.normalize();
        this.playerVelocity.addScaledVector( deltaVector, - deltaVector.dot( this.playerVelocity ) );

    } else {

        this.playerVelocity.set( 0, 0, 0 );

    }
      
    // if the player has fallen too far below the level reset their position to the start
    if ( this.player.position.y < -400 ) {


        this.playerVelocity.y=0;
      //  this.player.position.y = 0;
    }

    // adjust the camera
    this.camera.position.sub( this.controls.target );

    let controlPos = this.player.position.clone();

    if(this.config.firstPerson){
        controlPos.setY(controlPos.y);
    } else {
        controlPos.setY(controlPos.y+1);
    };

    this.controls.target.copy(controlPos);
    this.camera.position.add( this.controls.target );


}

updatePlayerDirection = (delta) =>{
    nextPos.copy( this.player.position);
    nextPos.addScaledVector( this.tempVector, params.playerSpeed * delta );      
    this.player.lookAt(nextPos);         
}

    updatePlayerVR = (delta) =>{
        if(!this.playerVR){
            return false;
        };

        this.playerVR.moveDolly(delta);
    }

    reset = ()=> {
        console.log('RESET!!!');
        if(this.player){
            this.playerVelocity.set( 0, 0, 0 );
            this.player.position.set(this.sceneryLoader.playerStartPos);
            console.log(this.sceneryLoader.playerStartPos);
        }
       // this.camera.position.set( this.player.position );
      //  this.controls.target.copy( this.player.position );
        //this.camera.position.add( this.player.position );
        this.controls.update();

    }    

    stopAnimationLoop = () =>{
        this.renderer.setAnimationLoop(null);
        console.log('render loop stopped');
    }
};

export {SpaceViewer};