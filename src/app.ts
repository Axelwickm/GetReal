import { Game } from "./Game";
import { AssetManager } from "./AssetManager";
import { GetRealSchema } from "./schema/GetRealSchema";

import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {
    Engine,
    Scene,
    ArcRotateCamera,
    Vector3,
    HemisphericLight,
    MeshBuilder,
    StandardMaterial,
} from "@babylonjs/core";

import * as Colyseus from "colyseus.js";

class App {
    constructor() {
        // create the canvas html element and attach it to the webpage
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // Set error message as text
        const setErrorMessage = (message?: string) => {
            document.body.innerHTML = message ?? "Unknown error";
            document.body.style.color = "darkred";
            document.body.style.fontSize = "xx-large";
        };
        
        // initialize babylon scene and engine
        var engine = new Engine(canvas, true);
        var scene = new Scene(engine);

        // Define "red" material
        const redMaterial = new StandardMaterial("red", scene);
        redMaterial.diffuseColor.set(1, 0, 0);
        scene.materials.push(redMaterial);

        // Define "black" material
        const blackMaterial = new StandardMaterial("black", scene);
        blackMaterial.diffuseColor.set(0, 0, 0);
        scene.materials.push(blackMaterial);

        
        // TODO: move this stuff below to Game
        var camera: ArcRotateCamera = new ArcRotateCamera(
            "Camera",
            Math.PI / 2,
            Math.PI / 2,
            2,
            Vector3.Zero(),
            scene
        );
        camera.attachControl(canvas, true);
        // Make control less sensitive
        camera.lowerRadiusLimit = 1;
        camera.upperRadiusLimit = 10;
        camera.wheelPrecision = 50;


        var light1: HemisphericLight = new HemisphericLight(
            "light1",
            new Vector3(1, 1, 0),
            scene
        );

        var ground = MeshBuilder.CreateGround(
            "ground",
            { width: 10, height: 10 },
            scene
        );

        scene.createDefaultXRExperienceAsync({
            floorMeshes: [ground],
        });

        // Create core Game object
        const game = new Game(scene);

        // Join Colyseus client
        const host = window.location.hostname;
        const client = new Colyseus.Client("wss://" + host + ":2567");
        client
            .joinOrCreate("get_real")
            .then((room: Colyseus.Room<unknown>) => {
                console.log("joined successfully", room);
                game.setRoom(room as Colyseus.Room<GetRealSchema>);
            })
            .catch((e) => {
                console.error("join error", e);
                setErrorMessage("Could not join room: " + e.message);
                throw e;
            });

        // Load assets
        AssetManager.getInstance().loadAssets(scene).then(() => {

        });

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Ctrl+I = Inspector
            if (ev.ctrlKey && ev.key === "i") {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
                ev.preventDefault();
            }
            // Debug mode 
            if (ev.ctrlKey && ev.key === "d") {
                game.setDebugMode(!game.getDebugMode());
                ev.preventDefault();
            }
        });

        // Find calibrate listener and have it call game.calibrate()
        const calibrateButton = document.getElementById("calibrate");
        if (calibrateButton) {
            console.log("Found calibrate button");
            calibrateButton.addEventListener("click", () => {
                console.log("Calibrating");
                game.calibrate();
            });
        }

        let avgTotal = 0;
        let lastTime = Date.now();
        let lastUpdate = Date.now();
        let fpsCounter = document.getElementById("fps");

        // run the main render loop
        engine.runRenderLoop(async () => {
            let start = Date.now();
            game.update();
            let gameUpdate = Date.now() - start;
            scene.render();
            let render = Date.now() - start - gameUpdate;

            avgTotal = avgTotal*0.98 + (Date.now() - lastTime)*0.02;
            lastTime = Date.now();

            // Update FPS counter
            if (Date.now() - lastUpdate > 1000) {
                let fps = Math.round(1000/avgTotal);
                lastTime = Date.now();
                lastUpdate = Date.now();
                if (fpsCounter) fpsCounter.innerHTML = `FPS: ${fps} - u ${gameUpdate}ms - r ${render}ms`;
            }
        });
    }
}

new App();
