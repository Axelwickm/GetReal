import { Player } from "./Player";
import { AdminMenu } from "./AdminMenu";
import { GetRealSchema } from "./schema/GetRealSchema";
import {
    PlayerSchema,
    PlayerSettingsUpdateMessageType,
    PlayerCalibrateMessageType,
    PlayerCalibrateMessage,
} from "./schema/PlayerSchema";

import { Room } from "colyseus.js";
import {
    Scene,
    WebXRDefaultExperience,
    Engine,
} from "@babylonjs/core";

export class Game {
    private scene: Scene;
    private xr: WebXRDefaultExperience;
    private aPressed: boolean = false;

    private adminMenu: AdminMenu = new AdminMenu(this);
    private players: Map<string, Player> = new Map();
    private room?: Room<GetRealSchema>;
    private debugMode: boolean = false;

    constructor(scene: Scene, xr: WebXRDefaultExperience) {
        this.scene = scene;
        this.xr = xr;
    }

    setRoom(room: Room<GetRealSchema>) {
        if (this.room) {
            throw new Error("Room already set");
        }

        this.room = room;
        this.adminMenu.setRoom(room);

        // Watch for incoming network changes
        room.state.players.onAdd = (
            playerState: PlayerSchema,
            sessionId: string
        ) => {
            console.log("player added!", playerState, sessionId);
            const isMe = sessionId === room.sessionId;

            // add player
            this.players.set(
                sessionId,
                new Player(playerState, this.scene, room, isMe, this.xr)
            );

            this.adminMenu.registerPlayer(playerState, isMe);
        };

        room.state.players.onRemove = (
            playerState: PlayerSchema,
            sessionId: string
        ) => {
            console.log("player removed!", playerState, sessionId);
            this.players.delete(sessionId);
            this.adminMenu.setOffline(playerState);
        };

        this.room.onMessage(
            PlayerCalibrateMessageType,
            (message: PlayerCalibrateMessage) => {
                const player = this.players.get(message.sessionId);
                if (player?.isMe()) {
                    player.calibrate(false);
                }
            }
        );
    }

    getPlayer(sessionId: string): Player | undefined {
        return this.players.get(sessionId);
    }

    async calibrate(immediate: boolean = false) {
        for (const player of this.players.values()) {
            if (player.isMe()) await player.calibrate(immediate);
        }
    }

    update(): void {
        this.players.forEach((player) => {
            player.update();
        });
    }

    getDebugMode(): boolean {
        return this.debugMode;
    }

    setDebugMode(debugMode: boolean) {
        console.log("Game debug mode set to", debugMode);
        this.debugMode = debugMode;
        this.players.forEach((player) => {
            player.debugAvatar?.setEnabled(debugMode);
        });
    }

    run(engine: Engine) {
        let avgTotal = 0;
        let lastTime = Date.now();
        let lastUpdate = Date.now();

        // run the main render loop
        engine.runRenderLoop(async () => {
            let start = Date.now();
            this.checkXRInput();
            this.update();
            let gameUpdate = Date.now() - start;
            this.scene.render();
            let render = Date.now() - start - gameUpdate;

            avgTotal = avgTotal * 0.98 + (Date.now() - lastTime) * 0.02;
            lastTime = Date.now();

            // Update FPS counter
            if (Date.now() - lastUpdate > 2000) {
                let fps = Math.round(1000 / avgTotal);
                lastTime = Date.now();
                lastUpdate = Date.now();
                this.updateServer(fps, gameUpdate, render);
            }
        });
    }

    updateServer(fps: number, updateTime: number, renderTime: number) {
        if (this.room) {
            this.room.send(PlayerSettingsUpdateMessageType, {
                sessionId: this.room.sessionId,
                fps: fps,
                updateTime: updateTime,
                renderTime: renderTime,
            });
        }
    }

    checkXRInput() {
        // TODO: move this to hw rig
        this.xr.input.controllers.forEach((controller) => {
            if (controller.inputSource.handedness === "left") {

            } else if (controller.inputSource.handedness === "right") {
                //   https://www.w3.org/TR/webxr-gamepads-module-1/
                const p =
                    controller.inputSource.gamepad?.buttons[4].pressed;
                if (p && !this.aPressed) this.calibrate(true);
                this.aPressed = p ?? false;
            }
        });
    }
}
