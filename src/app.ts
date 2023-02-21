import { Game } from "./Game";
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
    Mesh,
    MeshBuilder,
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
        var ground = MeshBuilder.CreateGround(
            "ground",
            { width: 6, height: 6 },
            scene
        );
        scene.createDefaultXRExperienceAsync({
            floorMeshes: [ground],
        });

        // Create core Game object
        const game = new Game(scene);

        // Join Colyseus client
        const host = window.location.hostname;
        const client = new Colyseus.Client("ws://" + host + ":2567");
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

        var light1: HemisphericLight = new HemisphericLight(
            "light1",
            new Vector3(1, 1, 0),
            scene
        );

        // Add sphere
        var sphere = MeshBuilder.CreateSphere("ssphere", { diameter: 1 }, scene);


        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.key === "i") {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        });

        // run the main render loop
        engine.runRenderLoop(() => {
            game.update();
            scene.render();
        });
    }
}

new App();
