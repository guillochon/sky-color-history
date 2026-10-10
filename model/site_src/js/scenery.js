const LAND={ // stand-in surface color, not from the radiative-transfer model
  hadean44:[.18,.12,.08], hadean40:[.16,.12,.08], archean38:[.15,.13,.10],
  archean27thin:[.20,.16,.11], archean27:[.22,.16,.10], archean27vthick:[.24,.15,.09],
  proterozoic22:[.16,.18,.11], snowball07:[.78,.82,.86], ordovician466:[.17,.17,.12], carbon30:[.12,.22,.08],
  kpg66:[.17,.15,.13], zetaoph:[.16,.20,.10], geminga:[.16,.20,.10], volcanic:[.18,.16,.14], modern:[.15,.22,.09], modernpoll:[.17,.18,.11], ozonehole:[.15,.22,.09], y2100:[.15,.22,.09]
};
let skyNow=null, skyGen=0, skyUploaded=-1, vrNote='', vrOn=false, vrYaw=0, vrPitch=8, vrX=0, vrY=0, vrScenery=true, vrClouds=true, cloudScroll=0, cloudMinPrev=null, vrRelock=false, vrGL=null, vrRAF=0, vrWalk=0, vrWalkStamp=0, vrNav=false, vrLinkKey='';
const vrHeld=new Set();
let vrMove=null, vrRun=false; // on-screen stick: {f, s} in -1..1, and its run toggle
