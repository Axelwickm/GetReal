import { Game } from "./Game";
import { GetRealSchema } from "./schema/GetRealSchema";
import { MaterialsGenerator } from "./MaterialsCreator";
import { GetRealAssets } from "./GetRealAssets";
import { AssetManager } from "./AssetManager";

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
    AmmoJSPlugin,
    Color4,
    WebXRDefaultExperience,
} from "@babylonjs/core";

import Ammo from "ammojs-typed";

import * as Colyseus from "colyseus.js";

class App {
    constructor() {
        this.init();
    }

    async init() {
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

        scene.clearColor = new Color4(0.1, 0.1, 0.1, 1);

        // Enable physics
        const ammo = await Ammo();
        scene.enablePhysics(
            new Vector3(0, -9.81, 0),
            new AmmoJSPlugin(undefined, ammo)
        );

        // Set asset refs
        AssetManager.setAssetRefs(GetRealAssets);

        // Add materials to scene
        MaterialsGenerator.addMaterialsToScene(scene);

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
        camera.lowerRadiusLimit = 1;
        camera.upperRadiusLimit = 10;
        camera.wheelPrecision = 50;

        var light1: HemisphericLight = new HemisphericLight(
            "light1",
            new Vector3(1, 1, 0),
            scene
        );

        // TODO: this should maybe be handled by the asset manager
        var ground = MeshBuilder.CreateGround(
            "ground",
            { width: 100, height: 100 },
            scene
        );
        ground.visibility = 0;

        let xr: WebXRDefaultExperience;
        try {
            xr = await scene.createDefaultXRExperienceAsync({
                floorMeshes: [ground],
            });
        } catch (e: any) {
            setErrorMessage("Could not create XR experience: " + e.message);
            throw e;
        }

        // Create core Game object
        const game = new Game(scene, xr);

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

        game.run(engine);
    }
}

new App();
