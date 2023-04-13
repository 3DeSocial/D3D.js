class ExtrDataBuilder {
    constructor() {
      this.modelData = {
        '3DModels': []
      };
    }
  
    addModel({ modelUrl, modelCats, modelFormats, modelLicenses }) {
      const newModel = {
        ModelUrl: modelUrl,
        ModelCats: modelCats,
        ModelFormats: modelFormats,
        ModelLicenses: modelLicenses
      };
      this.modelData['3DModels'].push(newModel);
    }
  
    getModelData() {
      return this.modelData;
    }

    toString() {
      return JSON.stringify(this.locationData, null, 2);
    }
        
  }

  export {ExtrDataBuilder}

/*
  // Usage
  const extrDataBuilder = new ExtrDataBuilder();
  
  const modelData = {
    modelUrl: ['https://arweave.org/arweaveurl1', 'https://images.google.com/imageurl', 'https://ipfs.io/ipfs/imageurl'],
    modelCats: ['item'],
    modelFormats: {
      'gtlf': ['low_poly_version', 'high_polyversion'],
      'threejsscene': ['hd_version', 'low_poly_version']
    },
    modelLicenses: {
      'gtlf': ['low_poly_version_licence', 'high_polyversion_licence'],
      'threejsscene': ['hd_version_licence', 'low_poly_version_licence']
    }
  };
  
  extrDataBuilder.addModel(modelData);
  
  console.log(extrDataBuilder.getModelData());
  */