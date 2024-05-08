export const skyrimCustom = () => `
[Actor]
bUseNavMeshForMovement=0

[Animation]
fMaxFrameCounterDifferenceToConsiderVisible=0.06666667

[Archive]
bLoadArchiveInMemory=1
sArchiveToLoadInMemoryList=Skyrim - Animations.bsa
sResourceArchiveList=Skyrim - Misc.bsa, Skyrim - Shaders.bsa, Skyrim - Interface.bsa, Skyrim - Animations.bsa, Skyrim - Meshes0.bsa, Skyrim - Meshes1.bsa, Skyrim - Sounds.bsa
sResourceArchiveList2=Skyrim - Voices_en0.bsa, Skyrim - Textures0.bsa, Skyrim - Textures1.bsa, Skyrim - Textures2.bsa, Skyrim - Textures3.bsa, Skyrim - Textures4.bsa, Skyrim - Textures5.bsa, Skyrim - Textures6.bsa, Skyrim - Textures7.bsa, Skyrim - Textures8.bsa, Skyrim - Patch.bsa

[Audio]
fMenuModeFadeInTime=1.0
fMenuModeFadeOutTime=3.0
fMusicDuckingSeconds=6.0
fMusicUnDuckingSeconds=8.0

[Camera]
fMouseWheelZoomSpeed=10.00

[Combat]
bForceNPCsUseAmmo=1
f1PArrowTiltUpAngle=0.7
f1PBoltTiltUpAngle=0.7
f3PArrowTiltUpAngle=0.7
fMagnetismLookingMult=0.0
fMagnetismStrafeHeadingMult=0.0

[Controls]
bGamepadLookApplySnapToAxis=0
fGamepadHeadingXScale=1
fGamepadHeadingYScale=.80
fGamepadLookAccelPitchMult=1.4
fGamepadLookAccelSec=.1
fGamepadLookAccelYawMult=1.4
fLThumbDeadzone=0.2
fLThumbDeadzoneMax=.97
fMaxLookRampUpDelta=1.00
fMouseHeadingSensitivityMax=0.0731
fMouseHeadingXScale=0.0200
fMouseHeadingYScale=0.8500
fRThumbDeadzone=0.1
fRThumbDeadzoneMax=.97

[Decals]
uMaxSkinDecalPerActor=40

[Display]
bDeactivateAOOnSnow=1
bEnableSnowRimLighting=0
bLockFrameRate=0
bVolumetricLightingDisableInterior=1
fDDOFFocusCenterweightExt=2
fDecalLifetime=300
fDefaultWorldFOV=105
fDOFMaxDepthParticipation=10000
fDynamicDOFFarBlur=0.4
fFirstSliceDistance=2800
fGlobalBrightnessBoost=0.0000
fGlobalContrastBoost=0.0000
fGlobalSaturationBoost=0.0000
fLightLODRange=33750
fLightLODStartFade=3500.0
fMaxHeightShadowCastingTrees=30000.0000
fShadowDirectionalBiasScale=0.15
fSparklesIntensity=0.3
fSunShadowUpdateTime=1
fSunUpdateThreshold=0.5
fTreesMidLODSwitchDist=9999999.0000

[General]
bBackgroundLoadVMData=1
bBorderRegionsEnabled=1
fFlickeringLightDistance=8192
sIntroSequence=
sLanguage=ENGLISH
sTestFile1=Dawnguard.esm
sTestFile2=HearthFires.esm
sTestFile3=Dragonborn.esm
uExterior Cell Buffer=36
uGridsToLoad=5

[GeneralWarnings]
SGeneralMasterMismatchWarning=One or more plugins could not find the correct versions of the master files they depend on. Errors may occur during load or game play. Check the "Warnings.txt" file for more information.

[Grass]
bAllowCreateGrass=1
bAllowLoadGrass=0
bDrawShaderGrass=1
fGrassFadeRange=9375
fGrassMaxStartFadeDistance=7000.0000
fGrassMinStartFadeDistance=0.0000
fGrassWindMagnitudeMax=125
fGrassWindMagnitudeMin=5
iGrassCellRadius=2
iMaxGrassTypesPerTexure=3
iMinGrassSize=40

[HAVOK]
fMaxTime=0.01666667
fMaxTimeComplex=0.03333333

[Imagespace]
iRadialBlurLevel=2

[Interface]
bShowTutorials=0

[Launcher]
bEnableFileSelection=1

[LightingShader]
fDecalLODFadeEnd=0.6
fDecalLODFadeStart=0.5
fEnvmapLODFadeEnd=0.7
fEnvmapLODFadeStart=0.6

[LOD]
fDistanceMultiplier=1.00

[MapMenu]
fMapWorldMaxPitch=90
fMapWorldMinPitch=0
fMapWorldYawRange=400

[Menu]
iConsoleSizeScreenPercent=40
iConsoleTextSize=20

[Papyrus]
bEnableLogging=0
bEnableProfiling=0
bEnableTrace=0
bLoadDebugInformation=0
fPostLoadUpdateTimeMS=500
iMaxMemoryPageSize=512
iMinMemoryPageSize=128

[SaveGame]
iAutoSaveCount=3

[Trees]
bEnableTreeAnimations=1
bEnableTrees=1
fUpdateBudget=1.5

[Water]
bReflectLODLand=1
bReflectLODObjects=1
bReflectLODTrees=1
bReflectSky=0
`;
