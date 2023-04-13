class ExtraDataLocationBuilder {
    constructor() {
      this.locationData = {
        scenery: '',
        items: [],
        floorPlan: null,
        actions: [],
        background: '',
        walkSpeed: 10,
        sceneScale: 0.01,
        scaleModelToHeight: 2,
        scaleModelToWidth: 2,
        scaleModelToDepth: 2,
        playerStartPos: { x: 0, y: 4, z: 0 },
        avatarSize: { width: 1, height: 1, depth: 1 },
        firstPerson: true,
        vrType: 'walking'
      };
    }
  
    setScenery(nftHash) {
      this.locationData.scenery = nftHash;
    }
  
    addItem(item) {
      const index = this.locationData.items.findIndex(existingItem => existingItem.PostHashHex === item.PostHashHex);
      if (index !== -1) {
        this.locationData.items[index] = item;
      } else {
        this.locationData.items.push(item);
      }
    }
  
    addItems(items) {
      items.forEach(item => this.addItem(item));
    }
  
    removeItem(nftHash) {
        this.locationData.items = this.locationData.items.filter(item => item !== nftHash);
      }
    
      setFloorPlan(floorPlan) {
        this.locationData.floorPlan = floorPlan;
      }
    
      addAction(nftHash, action, destinationLocationHash) {
        this.locationData.actions.push({ nftHash, action, destinationLocationHash });
      }
    
      removeAction(nftHash, action, destinationLocationHash) {
        this.locationData.actions = this.locationData.actions.filter(
          act => !(act.nftHash === nftHash && act.action === action && act.destinationLocationHash === destinationLocationHash)
        );
      }
    
      setBackground(pathOrNftHash) {
        this.locationData.background = pathOrNftHash;
      }
    
      getLocationData() {
        return this.locationData;
      }

      toString() {
        return JSON.stringify(this.locationData, null, 2);
      }
  }
  
  // Usage
  const locationBuilder = new ExtraDataLocationBuilder();
  
  const item1 = { PostHashHex: 'NFTHash1', otherData: 'data1' };
  const item2 = { PostHashHex: 'NFTHash2', otherData: 'data2' };
  const item3 = { PostHashHex: 'NFTHash1', otherData: 'data3' }; // This item has the same PostHashHex as item1 and should overwrite it
  
  locationBuilder.addItem(item1);
  locationBuilder.addItem(item2);
  locationBuilder.addItems([item3]);
  
  console.log(locationBuilder.getLocationData());
  

  export {ExtrDataBuilder}

/*
 const locationBuilder = new ExtraDataLocationBuilder();

locationBuilder.setScenery('NFTHash1');
locationBuilder.addItem('NFTHash2');
locationBuilder.addItem('NFTHash3');
locationBuilder.removeItem('NFTHash2');
locationBuilder.setFloorPlan('floorPlanSpec');
locationBuilder.addAction('NFTHash4', 'travel', 'DestinationLocationHash1');
locationBuilder.removeAction('NFTHash4', 'travel', 'DestinationLocationHash1');
locationBuilder.setBackground('pathToSkybox');

console.log(locationBuilder.getLocationData());

  */