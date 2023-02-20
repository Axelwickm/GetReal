import { PlayerState } from "./schema/GetRealState";

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

        // Join Colyseus client
        const host = window.location.hostname;
        console.log("host", host);
        const client = new Colyseus.Client("ws://" + host + ":2567");
        client
            .joinOrCreate("get_real")
            .then((room: any) => {
                console.log("joined successfully", room);
                room.state.players.onAdd = (playerState : PlayerState, sessionId : string) => {
                    console.log("player added!", playerState, sessionId);
                    // create player Sphere
                    var sphere = MeshBuilder.CreateSphere(
                        `player-${sessionId}`,
                        {
                            segments: 8,
                            diameter: 30,
                        }
                    );

                    // set player spawning position
                    sphere.position.set(playerState.x, playerState.y, playerState.z);

                    playerState.onChange = () => {
                        sphere.position.set(playerState.x, playerState.y, playerState.z);
                    }

                };

                room.state.players.onRemove = (playerState : PlayerState, sessionId : string) => {
                    console.log("player removed!", playerState, sessionId);
                    // remove player
                    var sphere = scene.getMeshByName(`player-${sessionId}`);
                    sphere?.dispose();
                }
            })
            .catch((e) => {
                console.error("join error", e);
                setErrorMessage("Could not join room: " + e.message);
                throw e;
            });

        // initialize babylon scene and engine
        var engine = new Engine(canvas, true);
        var scene = new Scene(engine);

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
        var sphere: Mesh = MeshBuilder.CreateSphere(
            "sphere",
            { diameter: 1 },
            scene
        );

        // ground
        var ground = MeshBuilder.CreateGround(
            "ground",
            { width: 6, height: 6 },
            scene
        );

        // Add XR support
        const xr = scene.createDefaultXRExperienceAsync({
            floorMeshes: [ground],
        });

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
            scene.render();
        });
    }
}

new App();
