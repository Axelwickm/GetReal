import { Player } from "./Player";
import { AdminMenu } from "./AdminMenu";
import { HardwareRig } from "./hardware_rigs/HardwareRig";
import { GetRealSchema } from "./schema/GetRealSchema";
import { PlayerSchema, PlayerSettingsUpdateMessageType } from "./schema/PlayerSchema";

import { XSensXRRig } from "./hardware_rigs/XSensXRRig";
import { NetworkRig } from "./hardware_rigs/NetworkRig";

import { Room } from "colyseus.js";
import { Scene, WebXRDefaultExperience, Engine } from "@babylonjs/core";
import { XRRig } from "./hardware_rigs/XRRig";


export class Game {
    private scene: Scene;
    private xr: WebXRDefaultExperience;
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

            // TODO: message handling for calibrating, clearing, saving

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
    }

    getPlayer(sessionId: string): Player | undefined {
        return this.players.get(sessionId);
    }

    async calibrate() {
        for (const player of this.players.values()) {
            if (player.isMe())
                await player.calibrate();
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
                fps: fps,
                updateTime: updateTime,
                renderTime: renderTime,
            });
        }
    }
}
