import * as THREE from '../ExtraLibraries/build/three.module.js';
import { PointerLockControls } from '../ExtraLibraries/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from '../ExtraLibraries/examples/jsm/loaders/GLTFLoader.js';

let camera, cameraFP, cameraFixed, controls, scene, sceneForest, sceneCabin, renderer, canvas;

let prevTime = performance.now();
let fpsCounter = document.getElementById('fpscounter');
var fpsAverageArray = [0,0,0,0,0];
var fps = 0.0;

var moveForward = false;
var moveLeft = false;
var moveRight = false;
var moveBackward = false;
var isSprinting = false;
var canJump = true;
const walkSpeed = 20;
let moveSpeed;
var forceOfGravity = 1;
var jumpForce = 30;
var velocity = new THREE.Vector3(0,0,0);

let torchLight;
let torchObject;
var isTorchOn = true;

let particleSystem;
var particleNum = 50000;
var particleWidth = 500;
var particleHeight = 500;
var particleDepth = 500;
var particleSystemHeight = 150.0;
var particleRadiusX = 3.0;
var particleRadiusZ = 3.0;
var particleSize = 20.0;
var particleScale = 10.0;
var particleOpacity = 0.9;
var particleHorizontalSpeed = 1.0;
var particleVerticalSpeed = 0.7;
var clock = new THREE.Clock();

var forestWidth = 400;
var forestDepth = 400;
var treeNum = 75;
var baseTreeSize = 5;
var treeSizeVariance = 2;
var maxAttemptsToPlaceTree = 100;
let treeTemp;
let scaleTemp;

var sceneBoundingBoxes = [];

var playableAreaWidthForest = 150;
var playableAreaDepthForest = 150;
var cabinBoundsNX = -5.36;
var cabinBoundsPX = 9.68;
var cabinBoundsNZ = -6.63;
var cabinBoundsPZ = 6.65;
var cabinDoorTolerance = 3;
var forestDoorTolerance = 3;

var isInForest = true;
var isInFirstPersonCam = true;

let raycaster;
var collidableMeshList = [];

function main() {
    canvas = document.getElementById( "gl-canvas" );
    renderer = new THREE.WebGLRenderer({canvas});
    renderer.shadowMap.enabled = true;

    // Setup the first person camera and create the controls for it
    const fov = 80;
    const near = 0.1;
    const far = 1000;
    cameraFP = new THREE.PerspectiveCamera(fov, window.innerWidth/window.innerHeight, near, far);
    cameraFP.position.set(0, 5, 10);
    cameraFP.lookAt(40,0,30);
    createControls( cameraFP );

    // Setup the fixed camera
    cameraFixed = new THREE.PerspectiveCamera(fov, window.innerWidth/window.innerHeight, near, far);
    cameraFixed.position.set(40, 30, 30);
    cameraFixed.lookAt(0,0,30);

    // Set the first person camera as default
    camera = cameraFP;

    // Check for mouse click and then remove instruction menu and start the controls
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions')
    blocker.addEventListener('click', function() {
        blocker.style.display = 'none';
        instructions.style.display = 'none';
        controls.lock();
    })

    // Listen for key presses from the user
    window.addEventListener('keydown', function(e){
        if (e.key == 'w' || e.key == 'W') {
            moveForward = true;
        }
        if (e.key == 'a' || e.key == 'A') {
            moveLeft = true;
        }
        if (e.key == 's' || e.key == 'S') {
            moveBackward = true;
        }
        if (e.key == 'd' || e.key == 'D') {
            moveRight = true;
        }
        if (e.key == ' ' && canJump) {
            velocity.y += jumpForce;
            canJump = false;
        }
        if (e.shiftKey) {
            isSprinting = true;
        }
        if (e.key == 't' || e.key == 'T') {
            isTorchOn = !isTorchOn;
        }
        if (e.key == 'f' || e.key == 'F') {
            if (isInForest) {
                if (canEnterCabin()){
                    scene = sceneCabin;
                    isInForest = !isInForest;
                    sceneForest.remove(cameraFP);
                    sceneCabin.add(cameraFP);
                    cameraFP.position.set(-5,5,0);
                    cameraFP.lookAt(1,5,0);
                }
            } else {
                if(canEnterForest()){
                    scene = sceneForest;
                    isInForest = !isInForest;
                    sceneCabin.remove(cameraFP);
                    sceneForest.add(cameraFP);
                    cameraFP.position.set(29,0,30);
                    cameraFP.lookAt(-28,5,30);
                }
            }
        }
        if (e.key == 'c' || e.key == 'C') {
            if (isInForest){
                if (isInFirstPersonCam) {
                    camera = cameraFixed;
                    isInFirstPersonCam = !isInFirstPersonCam;
                } else {
                    camera = cameraFP;
                    isInFirstPersonCam = !isInFirstPersonCam;
                }
            }
        }
    });

    // Listen for key lifts from the user
    window.addEventListener('keyup', function(e){
        if (e.key == 'w' || e.key == 'W') {
            moveForward = false;
        }
        if (e.key == 'a' || e.key == 'A') {
            moveLeft = false;
        }
        if (e.key == 's' || e.key == 'S') {
            moveBackward = false;
        }
        if (e.key == 'd' || e.key == 'D') {
            moveRight = false;
        }
        if (!e.shiftKey) {
            isSprinting = false;
        }
    })

    // ============================================================ BUILD sceneFOREST ============================================================

    // Load skybox textures
    const loaderSky = new THREE.CubeTextureLoader();
    loaderSky.setPath('../Resources/Skybox/Dusk/');
    const skyboxTexture = loaderSky.load(['right.png', 'left.png', 'top.png', 'bottom.png', 'front.png', 'back.png']);
    
    // Create the THREE forest scene and assign skybox textures
    sceneForest = new THREE.Scene();
    sceneForest.background = skyboxTexture;
    sceneForest.fog = new THREE.FogExp2( 0x000000, 0.01 );
    sceneForest.add(cameraFP);

    // Setup the snow texture and normal map for the ground
    const groundTexture = new THREE.TextureLoader().load( '../Resources/Snow/Snow_001_OCC.jpg' );
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set( 1000, 1000 );

    const groundMaterialNormal = new THREE.TextureLoader().load('../Resources/Snow/Snow_001_NORM.jpg');
    groundMaterialNormal.wrapS = THREE.RepeatWrapping;
    groundMaterialNormal.wrapT = THREE.RepeatWrapping;
    groundMaterialNormal.repeat.set( 1000, 1000 );

    const groundMaterial = new THREE.MeshPhongMaterial( { map: groundTexture, normalMap: groundMaterialNormal, side: THREE.DoubleSide} );

    // Create, texture and place the ground in the world
    const planeSize = 10000;
    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const PlaneMesh = new THREE.Mesh(planeGeo, groundMaterial);
    PlaneMesh.receiveShadow = true;
    PlaneMesh.rotation.x = Math.PI * -.5;
    sceneForest.add(PlaneMesh);

    // Light source for lamp on cabin door
    const cabinLampLight = new THREE.PointLight (0xFFBF00, 1);
    cabinLampLight.position.set(-1.25,1.5,-2.6);
    cabinLampLight.scale.set(0.3,0.3,0.3);
    cabinLampLight.castShadow = true;
    cabinLampLight.decay = 1;
    cabinLampLight.distance = 150;

    // Light source for light from cabin window
    const cabinWindowLight = new THREE.PointLight(0xFFBF00,0.5)
    cabinWindowLight.position.set(2.55,1.5, 0.5);
    cabinWindowLight.scale.set(0.4,0.4,0.4);
    cabinWindowLight.castShadow = true;
    cabinWindowLight.decay = 1;
    cabinWindowLight.distance = 150;

    // Soft ambient light source from moon
    const ambLight = new THREE.AmbientLight( 0x404040, 1.2 );
    sceneForest.add( ambLight );

    // First person perspective torch light
    torchLight = new THREE.SpotLight(0xFFFFFF, 1);
    torchLight.castShadow = true;
    torchLight.angle = Math.PI/9;
    torchLight.decay = 2;
    torchLight.penumbra = 0.2;
    cameraFP.add(torchLight);
    cameraFP.add(torchLight.target);
    torchLight.target.position.set(0,3,-1);
    torchLight.position.copy(cameraFP.position);

    // Create the object to load all of our GLTF models
    const loader = new GLTFLoader();

    // Load the Christmas tree model and place near the cabin
    loader.load( '../Resources/GLTF_Models/ChristmasTree.glb', function ( gltf ) {
        gltf.scene.position.set(15,0,45);
        gltf.scene.scale.set(10,10,10);
        gltf.scene.rotation.set(0,Math.PI*(1/4),0);
        gltf.scene.traverse( function( node ) { if ( node instanceof THREE.Mesh ) { node.castShadow = true;} } );
        sceneBoundingBoxes.push(new THREE.Box3().setFromObject(gltf.scene));
	    sceneForest.add( gltf.scene );
        }, undefined, function ( error ) {
	        console.error( error );
    });
    
    // Load cabin object
    loader.load( '../Resources/GLTF_Models/SnowCabin.glb', function ( cabin ) {
        // Set cabin properties
        cabin.scene.position.set(40,0,30);
        cabin.scene.scale.set(4,4,4);
        cabin.scene.rotation.set(0,Math.PI/2,0);
        cabin.scene.traverse( function( node ) { if ( node instanceof THREE.Mesh ) { node.castShadow = true; } } );
        sceneBoundingBoxes.push(new THREE.Box3().setFromObject(cabin.scene));
        collidableMeshList.push(cabin.scene);

        // Add lights to cabin and cabin to scene
        sceneForest.add( cabin.scene );
        cabin.scene.add(cabinLampLight);
        cabin.scene.add(cabinWindowLight);
        
    }, undefined, function ( error ) {
        console.error( error );
    } );

    // Load the snow trees to generate the forest
    for (var j = 0; j < 4; j++) {
        // Loop through the 4 different tree models we have
        loader.load( '../Resources/GLTF_Models/SnowTree' + (j+1).toString() + '.glb', function ( gltf ) {
            for (var i = 0; i < treeNum; i++) {
                // For each of the tree models, load treeNum of them into the scene with random variation in scale, rotation and position.
                treeTemp = gltf.scene.clone();
                scaleTemp = baseTreeSize + treeSizeVariance*(Math.random()-0.5);
                treeTemp.scale.set(scaleTemp,scaleTemp,scaleTemp);
                treeTemp.rotation.set(0,Math.PI*2*Math.random(),0);
                treeTemp.position.set(forestWidth*(Math.random()-0.5),0,forestDepth*(Math.random()-0.5));
                var attempts = 0;
                while (doesIntersect(new THREE.Box3().setFromObject(treeTemp), sceneBoundingBoxes) && (attempts <= maxAttemptsToPlaceTree)) {
                    // Choose a spot for the current tree and then check if it's intersecting a previously placed one. If it is then replace it and check again.
                    // Note if we try to place a tree more than 'maxAttemptsToPlaceTree' then we break the loop and stop placing any more trees
                    treeTemp.position.set(forestWidth*(Math.random()-0.5),0,forestDepth*(Math.random()-0.5));
                    attempts += 1;
                }
                if (attempts >= maxAttemptsToPlaceTree) {
                    break;
                }
                sceneBoundingBoxes.push(new THREE.Box3().setFromObject(treeTemp));
                treeTemp.traverse( function( node ) { if ( node instanceof THREE.Mesh ) { node.castShadow = true; } } );
                sceneForest.add(treeTemp);
            }
            }, undefined, function ( error ) {
                console.error( error );
        });
    }

    // Load the torch model and lock position relative to the first person viewpoint
    loader.load( '../Resources/GLTF_Models/Torch.glb', function ( gltf ) {
        torchObject = gltf.scene;
        torchObject.scale.set(0.5,0.5,0.5);
        torchObject.rotation.set(Math.PI*(1/12),Math.PI*(1/2),0);
	    cameraFP.add( torchObject );
        torchObject.position.copy(cameraFP.position.clone().add(new THREE.Vector3(1,-7,-12)));
        }, undefined, function ( error ) {
	        console.error( error );
    });

    // Add snow particles
    // Implementation of snow heavily inspired from https://soledadpenades.com/articles/three-js-tutorials/rendering-snow-with-shaders/
    var particleGeometry = new THREE.BufferGeometry();
    const particleTexture = new THREE.TextureLoader().load( '../Resources/Snow/SnowFlake.png' );
    var particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color:  { type: 'c', value: new THREE.Color( 0xFFFFFF ) },
            height: { type: 'f', value: particleSystemHeight },
            elapsedTime: { type: 'f', value: 0 },
            radiusX: { type: 'f', value: particleRadiusX },
			radiusZ: { type: 'f', value: particleRadiusZ},
            size: { type: 'f', value: particleSize},
            scale: { type: 'f', value: particleScale},
            opacity: { type: 'f', value: particleOpacity},
            horizontalSpeed: { type: 'f', value: particleHorizontalSpeed},
            verticalSpeed: { type: 'f', value: particleVerticalSpeed},
            texMap: { type: 't', value: particleTexture}
        },
        vertexShader: document.getElementById( 'vertex-shader' ).textContent,
        fragmentShader: document.getElementById( 'fragment-shader' ).textContent,
        blending: THREE.AdditiveBlending,
        transparent: true,
    });

    var particlePositions = [];

    for (var i = 0; i < particleNum; i++) {
        var vertex = new THREE.Vector3(particleWidth*(Math.random()-0.5), particleHeight*Math.random(), particleDepth*(Math.random()-0.5));
        particlePositions.push(vertex);
    }
    particleGeometry.setFromPoints(particlePositions);

    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.position.y -= 10;
    particleSystem.FogExp2 = true;
    sceneForest.add(particleSystem);

    // ============================================================ BUILD sceneCabin ============================================================

    // Create the THREE forest scene and assign skybox textures
    sceneCabin = new THREE.Scene();
    sceneCabin.background = new THREE.Color('black');

    // Load the floor texture
    const cabinFloorTexture = new THREE.TextureLoader().load('../Resources/Wood/WoodFloorTexture.jpg');
    cabinFloorTexture.wrapS = THREE.RepeatWrapping;
    cabinFloorTexture.wrapT = THREE.RepeatWrapping;
    cabinFloorTexture.repeat.set( 10, 10 );

    const cabinFloorMaterial = new THREE.MeshPhongMaterial( { map: cabinFloorTexture, side: THREE.DoubleSide} );

    // Create, texture and place the floor in the cabin
    const cabinFloorGeo = new THREE.PlaneGeometry(100, 100);
    const cabinFloorMesh = new THREE.Mesh(cabinFloorGeo, cabinFloorMaterial);
    cabinFloorMesh.receiveShadow = true;
    cabinFloorMesh.rotation.x = Math.PI * -.5;
    cabinFloorMesh.rotation.z = Math.PI * -.5;
    sceneCabin.add(cabinFloorMesh);

    // Soft ambient light source in the cabin to illuminate some of the shadows a little
    const ambLightCabin = new THREE.AmbientLight( 0x404040, 2 );
    sceneCabin.add( ambLightCabin );

    // Load cabin object
    loader.load( '../Resources/GLTF_Models/SnowCabin.glb', function ( cabin ) {
        cabin.scene.position.set(0,0,0);
        cabin.scene.scale.set(4,4,4);
        cabin.scene.rotation.set(0,Math.PI/2,0);

        sceneCabin.add( cabin.scene );
    }, undefined, function ( error ) {
        console.error( error );
    } );

    // Load the table model
    loader.load( '../Resources/GLTF_Models/Table1.glb', function ( gltf ) {
        gltf.scene.scale.set(2,2,2);
        gltf.scene.traverse( function( node ) { if ( node instanceof THREE.Mesh ) { node.castShadow = true;} } );
        gltf.scene.position.set(3,-1,4.5)
	    sceneCabin.add( gltf.scene );
        }, undefined, function ( error ) {
	        console.error( error );
    });

    // Load the first chair model
    loader.load( '../Resources/GLTF_Models/Chair1.glb', function ( gltf ) {
        gltf.scene.scale.set(2,2,2);
        gltf.scene.rotation.set(0,Math.PI*(1/2),0);
        gltf.scene.traverse( function( node ) { if ( node instanceof THREE.Mesh ) { node.castShadow = true; node.receiveShadow = true;} } );
        gltf.scene.position.set(-1,0,4.5)
	    sceneCabin.add( gltf.scene );
        }, undefined, function ( error ) {
	        console.error( error );
    });

    // Load the second chair model
    loader.load( '../Resources/GLTF_Models/Chair1.glb', function ( gltf ) {
        gltf.scene.scale.set(2,2,2);
        gltf.scene.rotation.set(0,-Math.PI*(1/2),0);
        gltf.scene.traverse( function( node ) { if ( node instanceof THREE.Mesh ) { node.castShadow = true; node.receiveShadow = true;} } );
        gltf.scene.position.set(7,0,4.5)
	    sceneCabin.add( gltf.scene );
        }, undefined, function ( error ) {
	        console.error( error );
    });

    // Load the candle model
    loader.load( '../Resources/GLTF_Models/Candle.glb', function ( gltf ) {
        gltf.scene.scale.set(0.25,0.25,0.25);
        gltf.scene.traverse( function( node ) { if ( node instanceof THREE.Mesh ) { node.castShadow = true; } } );
        gltf.scene.position.set(3,4.25,4.5)
	    sceneCabin.add( gltf.scene );
        }, undefined, function ( error ) {
	        console.error( error );
    });

    // Light source for candle inside the cabin
    const cabinCandleLight = new THREE.PointLight (0xFFBF00, 1.5);
    cabinCandleLight.position.set(3,5,4.5);
    cabinCandleLight.castShadow = true;
    sceneCabin.add(cabinCandleLight);

    // Soft ambient light source inside the cabin
    const cabinAmbientLight = new THREE.AmbientLight( 0x404040, 1 );
    sceneCabin.add( cabinAmbientLight );

    // The cabin by default shows white outside the window but I want it to show black so I'm placing a black cube in front of it
    const cubeWindowMaskerGeo = new THREE.BoxGeometry(4, 6, 1);
    const cubeWindowMaskerMat = new THREE.MeshBasicMaterial({color: 'black'});
    const cubeWindowMaskerMesh = new THREE.Mesh(cubeWindowMaskerGeo, cubeWindowMaskerMat)      
    cubeWindowMaskerMesh.position.set(1.8, 5, -10.55); 
    sceneCabin.add(cubeWindowMaskerMesh);


    // Set the default scene to the forest
    scene = sceneForest;

    requestAnimationFrame(animate);
}

function canEnterCabin(){
    // Make sure the player is near the cabin door when they try to enter
    if(camera.position.distanceTo(new THREE.Vector3(28.65,5,30.54)) < cabinDoorTolerance) {
        return true;
    }
}

function canEnterForest(){
    // Make sure the player is near the cabin door when they try to leave
    if(camera.position.distanceTo(new THREE.Vector3(-5,5,0)) < forestDoorTolerance) {
        return true;
    }
}

function doesIntersect(currentBoundingBox, boundingBoxArray) {
    // This function is used for random placement of trees. Each time a tree is placed its bounding box is added to an array.
    // In this function we check against that array to see if the next tree has been placed intersecting another in the array.
    for(var s = 0; s < boundingBoxArray.length; s++) {
        if(currentBoundingBox.intersectsBox(boundingBoxArray[s])){
            return true;
        }
    }
}

function resizeRendererToDisplaySize(renderer) {
    // Handle resizing of canvas if the window is changed
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
}


function createControls( camera ) {
    // Create THREE PointerLockControls object for our camera controls
    controls = new PointerLockControls(camera, renderer.domElement);
    controls.unlock();
}

function animate() {
    requestAnimationFrame(animate);
    
    // Handle resizing of window
    resizeRendererToDisplaySize(renderer);
    {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    // Handle displaying 'enter cabin/forest' label
    if(canEnterCabin() && isInForest){
        document.getElementById('cabinenterlabel').style.display = 'flex';
    } else {
        document.getElementById('cabinenterlabel').style.display = 'none';
    }

    if (canEnterForest() && !isInForest){
        document.getElementById('forestenterlabel').style.display = 'flex';
    } else {
        document.getElementById('forestenterlabel').style.display = 'none';
    }

    // Handle updating time for animating the snow particles
	var elapsedTime = clock.getElapsedTime();
	particleSystem.material.uniforms.elapsedTime.value = elapsedTime * 10;

    // Calculate frame time for fps calculation and making movement controls framerate independent
    const time = performance.now();
    const deltaT = (time - prevTime)/1000;

    if (controls.isLocked) {

        // Handle torch controls
        if (isTorchOn) {
            torchLight.intensity = 1;
            torchObject.visible = true;
        } else {
            torchLight.intensity = 0;
            torchObject.visible = false;
        }

        // Check if player is sprinting
        if (isSprinting) { 
            moveSpeed = 2*walkSpeed;
        } else {
            moveSpeed = walkSpeed;
        }

        // Set movement velocity in each direction according to key presses
        if (moveForward) {
            velocity.z = moveSpeed;
        } 
        if (moveBackward) {
            velocity.z = -moveSpeed;
        } 
        if (moveLeft) {
            velocity.x = -moveSpeed;
        } 
        if (moveRight) {
            velocity.x = moveSpeed;
        } 
        

        // Normalise the movement speed so that travelling diagonally has same speed as travelling forwards.
        if (Math.sqrt(Math.pow(velocity.x,2) + Math.pow(velocity.z, 2)) > moveSpeed) {
            velocity.z = velocity.z/Math.sqrt(2);
            velocity.x = velocity.x/Math.sqrt(2);
        }

        // Perform the movement action on the camera
        if (moveForward || moveBackward) {
            controls.moveForward(velocity.z * deltaT);
        }
        if (moveRight || moveLeft) {
            controls.moveRight(velocity.x * deltaT);
        }

        // Calculate gravity effect
        velocity.y -= forceOfGravity;
        controls.getObject().position.y += velocity.y * deltaT;

        // Prevent camera from falling through the terrain
        if (controls.getObject().position.y < 5) {
            canJump = true;
            velocity.y = 0;
            controls.getObject().position.y = 5;
        }

        // Contain player to playable area
        if (isInForest) {
            if (Math.abs(controls.getObject().position.x) > playableAreaWidthForest) {
                controls.getObject().position.x = Math.sign(controls.getObject().position.x)*playableAreaWidthForest;
            }
            if (Math.abs(controls.getObject().position.z) > playableAreaDepthForest) {
                controls.getObject().position.z = Math.sign(controls.getObject().position.z)*playableAreaDepthForest;
            }
        } else {
            if (controls.getObject().position.x < cabinBoundsNX) {
                controls.getObject().position.x = cabinBoundsNX;
            }
            if (controls.getObject().position.x > cabinBoundsPX) {
                controls.getObject().position.x = cabinBoundsPX;
            }
            if (controls.getObject().position.z < cabinBoundsNZ) {
                controls.getObject().position.z = cabinBoundsNZ;
            }
            if (controls.getObject().position.z > cabinBoundsPZ) {
                controls.getObject().position.z = cabinBoundsPZ;
            }
        }   
    }

    // Update FPS Display
    prevTime = time;
    fpsAverageArray.shift();
    fpsAverageArray.push(deltaT);
    fps = Math.floor(5 / (fpsAverageArray[0] + fpsAverageArray[1] + fpsAverageArray[2] + fpsAverageArray[3] + fpsAverageArray[4]));
    fpsCounter.textContent = 'FPS: ' + fps.toFixed(1);
    
    renderer.render(scene, camera);
}

main();
animate();