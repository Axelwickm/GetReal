import { Player } from "./Player";
import { PersistantData } from "./PersistantData";
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
    AnimationGroup,
} from "@babylonjs/core";
import { AssetManager, EnvironmentAsset } from "./AssetManager";

export class Game {
    private scene: Scene;
    private xr: WebXRDefaultExperience;
    private persitentData: PersistantData = PersistantData.getInstance();

    private aPressed: boolean = false;
    private bPressed: boolean = false;

    private adminMenu: AdminMenu = new AdminMenu(this);
    private players: Map<string, Player> = new Map();
    private room?: Room<GetRealSchema>;

    private environmentName?: string = undefined;
    private environment?: EnvironmentAsset;

    private debugMode: boolean = false;

    constructor(scene: Scene, xr: WebXRDefaultExperience) {
        this.scene = scene;
        this.xr = xr;
    }

    setRoom(room: Room<GetRealSchema>) {
        if (this.room) throw new Error("Room already set");

        this.room = room;
        this.adminMenu.setRoom(room);
        this.environmentName = room.state.room.environment;

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

            if (isMe || playerState.cookieId !== "undefined") {
                this.adminMenu.registerPlayer(playerState, isMe);
            } else {
                // The cookie id can sometimes drop in a bit later
                // so we'll wait for it to come in
                playerState.listen("cookieId", (cookieId: string) => {
                    if (cookieId !== "undefined")
                        this.adminMenu.registerPlayer(playerState, isMe);
                });
            }


            if (isMe) {
                if (!this.room)
                    throw new Error("Room not set when trying to send player introduction message");
                
                this.room.send(PlayerSettingsUpdateMessageType, {
                    sessionId: this.room.sessionId,
                    cookieId: this.persitentData.data.cookieId,
                    name: this.persitentData.data.name,
                    isAdmin: this.persitentData.data.isAdmin ? true : undefined,
                });

                playerState.listen("name", (name: string) => {
                    this.persitentData.data = {
                        ...this.persitentData.data,
                        name: name,
                    };
                });

                playerState.listen("cookieId", (cookieId: string) => {

                });

                playerState.listen("isAdmin", (isAdmin: boolean) => {
                    this.persitentData.data = {
                        ...this.persitentData.data,
                        isAdmin: isAdmin,
                    };
                });
            }
        };

        room.state.players.onRemove = (
            playerState: PlayerSchema,
            sessionId: string
        ) => {
            console.log("player removed!", playerState, sessionId);
            const player = this.players.get(sessionId);
            if (player) {
                player.destroy();
                this.players.delete(sessionId);
            }
            this.adminMenu.setOffline(playerState.sessionId, true);
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

        this.room.state.room.listen(
            "environment",
            (environmentName: string) => {
                this.setEnvironment(environmentName);
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
        this.adminMenu.setDebugMode(debugMode);
    }

    run(engine: Engine) {
        let avgTotal = 0;
        let lastTime = Date.now();
        let lastUpdate = Date.now();

        // run the main render loop
        engine.runRenderLoop(async () => {
            const startTime = Date.now();
            this.checkXRInput();
            this.update();
            const updateFinishTime = Date.now();
            this.scene.render();
            const renderFinishTime = Date.now();


            const gameUpdateTime = updateFinishTime - startTime;
            const renderTime =  renderFinishTime - updateFinishTime;

            avgTotal = avgTotal * 0.95 + (Date.now() - lastTime) * 0.05;
            lastTime = Date.now();

            // Update FPS counter
            if (Date.now() - lastUpdate > 2000) {
                const fps = Math.round(1000 / avgTotal);
                lastTime = Date.now();
                lastUpdate = Date.now();
                this.updateServer(fps, gameUpdateTime, renderTime);
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
                const a = controller.inputSource.gamepad?.buttons[4]?.pressed ?? false;
                if (a && !this.aPressed) this.calibrate(true);
                this.aPressed = a ?? false;

                const b = controller.inputSource.gamepad?.buttons[5]?.pressed ?? false;
                if (b && !this.bPressed) this.setDebugMode(!this.debugMode);
                this.bPressed = b ?? false;
            }
        });
    }

    async setEnvironment(environment: string) {
        const oldEnvironmentName = this.environmentName;
        this.environmentName = environment;
        console.log(
            "Environment set to",
            this.environmentName,
            "from",
            oldEnvironmentName
        );

        const assetManager = AssetManager.getInstance();

        if (this.environmentName === "Lobbys" && false) {
            // No animation since first
        } else if (
            this.environmentName === "Warehouse" &&
            oldEnvironmentName === "Lobbys"
        ) {
            const oldEnvironment = this.environment;
            this.environment = await assetManager.getEnvironment(
                this.environmentName
            );
            AssetManager.setEnabled(this.environment, true);

            let animationGroup : AnimationGroup | undefined = 
                oldEnvironment?.container.animationGroups.find(
                    (ag) => ag.name === "LobbyDisassemble"
                );

            if (!animationGroup)
                throw new Error("No animation group found");


            animationGroup.play(true);

            // When done, disable old environment
            animationGroup.onAnimationGroupLoopObservable.add(() => {
                animationGroup?.stop();
                animationGroup?.reset();
                AssetManager.setEnabled(oldEnvironment!, false);
                
            });
        } else {
            // No animation, since this is the first scene
            if (this.environment)
                AssetManager.setEnabled(this.environment, false);

            this.environment = await assetManager.getEnvironment(
                this.environmentName
            );

            AssetManager.setEnabled(this.environment, true);
        }
    }
}
