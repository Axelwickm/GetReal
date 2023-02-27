import { Player } from "./Player";
import { AdminMenu } from "./AdminMenu";
import { HardwareRig } from "./hardware_rigs/HardwareRig";
import { GetRealSchema } from "./schema/GetRealSchema";
import { PlayerSchema } from "./schema/PlayerSchema";

import { XSensXRRig } from "./hardware_rigs/XSensXRRig";
import { NetworkRig } from "./hardware_rigs/NetworkRig";

import { Room } from "colyseus.js";
import { Scene, WebXRDefaultExperience } from "@babylonjs/core";
import { XRRig } from "./hardware_rigs/XRRig";


export class Game {
    private scene: Scene;
    private xr: WebXRDefaultExperience;
    private adminMenu: AdminMenu = new AdminMenu();
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
            let rig: HardwareRig;
            if (isMe) {
                rig = new XSensXRRig(this.xr); // TODO: be able to configure this
                //rig = new XRRig(this.xr);
            } else {
                rig = new NetworkRig();
            }

            // add player
            this.players.set(
                sessionId,
                new Player(playerState, this.scene, rig, room)
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
}
