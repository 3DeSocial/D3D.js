export default class UserProfile  {

    constructor(config) {
    }

    getAvatarHashForUser(userProfile){
        
        // accepts DeSo ProfileEntryResponse
        if(!userProfile.ExtraData){
            console.log('Current user has no ExtraData');
            return false;
        }

        if(!userProfile.ExtraData.XRExtraData){
            console.log('Current user has no XRExtraData');
            console.log(userProfile.ExtraData);
            return false;
        }

        let XRExtraData = null;

        try{
            XRExtraData = JSON.parse(userProfile.ExtraData.XRExtraData);
        }catch(e){
            console.log(e);
            console.log('unable to decode XRExtraData')
            return false;            
        }


        if(!XRExtraData.activeAvatar){
            console.log('Current user has no activeAvatar');
            return false;
        }

        if(!XRExtraData.activeAvatar.length){
            console.log('Current user has invalid activeAvatar');
            return false;    
        }

        if(XRExtraData.activeAvatar.length === 0){
            console.log('Current user has invalid activeAvatar');
            return false;    
        }

        return XRExtraData.activeAvatar;

    }
}
