# Forest-Game-Scene
A video game environment I created using JavaScript, WebGL, THREEJS, and Blender. Here's a video demo of the environment:

<a href = "https://www.youtube.com/watch?v=9LCfe6U7jv4" target = "_blank">![Video Game Scene Demo Thumbnail](https://img.youtube.com/vi/9LCfe6U7jv4/0.jpg)</a>

This was a project I completed for some coursework and I had a lot of fun making it. I'd not really used JavaScript, WebGL or ThreeJS before starting so I learnt a lot! As a point of note, this is a project exploring computer graphics rather than gameplay. As such I haven't implemented gameplay features or collision since the focus was on models, rendering and lighting.

Here are some key features:
 - Interactivity: The player can use the mouse to move the viewpoint of the first-person camera and also can press the following keys to trigger functions in the game.WASD: walk, SHIFT: run, SPACE: jump, T: toggle torch, C: toggle camera view, F: interact with door.
 - Menu: I have included a menu to explain the game and controls at the start.
 - Levels: There are two environments to explore, a cabin and a forest.
 - Lighting: There are four light sources in the forest. There is ambient light from the 
moon, a point light source positioned on the lamp at the cabin’s door, a point light 
source positioned at the cabin’s window and a spotlight that follows the player and 
functions as a torch. Inside the cabin there is the torch light, ambient light and a point 
light from the candle.
 - Textures: the ground in the cabin and the forest are both textured, as is the sky which 
has a dusk-like skybox.
 - Physics: I have implemented gravity so that the player falls back to the ground once 
they have jumped.
 - Animation: the snow is animated to fall down and swirl through the air as time 
progresses.
 - I used WebGL to create both scenes for the environments and also to load all the 
models and textures I included.
 - Since the snow particle system has 50000 particles at any one time, to make it 
perform at all I implemented WebGL shaders specifically for them that would run on 
the GPU, sparing the CPU to perform the other tasks in the scene. Moreover, I rely on 
WebGL’s implementation of the depth test to ensure snow particles fall behind/in 
front of objects appropriately in the scene.
 - I use THREE.js camera fog to make objects further away appear darker. This helps 
them blend into the night time skybox I have used.

If you want to run the game for yourself, download all the files above and then open a terminal window, navigate to the file path where the project is saved and run the command 'python3 -m http.server' to start a local http server. Then in a supported browser (I've only tested with Chrome) go to the URL 'http://localhost:8000/...' followed by the correct file path to the html file.




