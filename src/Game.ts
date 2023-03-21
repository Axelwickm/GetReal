import { Player } from "./Player";
import { PersistantData } from "./PersistantData";
import { AdminMenu } from "./AdminMenu";
import { GetRealSchema } from "./schema/GetRealSchema";
import { SoundContainer } from "./SoundContainer";
import { Rendering } from "./Rendering";

import {
    PlayerSchema,
    PlayerSettingsUpdateMessageType,
    PlayerCalibrateMessageType,
    PlayerCalibrateMessage,
    PlayerPeerDataMessageType,
    PlayerPeerDataMessage,
} from "./schema/PlayerSchema";
import { Peer2Peer } from "./Peer2Peer";

import { Room } from "colyseus.js";
import {
    Scene,
    WebXRDefaultExperience,
    WebXRState,
    Engine,
    AnimationGroup,
} from "@babylonjs/core";
import { AssetManager, EnvironmentAsset } from "./AssetManager";

declare class BatteryManager {
    level: number;
}

export class Game {
    private scene: Scene;
    private xr: WebXRDefaultExperience;
    public rendering: Rendering;
    private battery?: BatteryManager;
    private audioContext: Promise<AudioContext>;
    private persitentData: PersistantData = PersistantData.getInstance();
    private peer2peer?: Peer2Peer;

    private adminMenu: AdminMenu = new AdminMenu(this);
    private players: Map<string, Player> = new Map();
    private me: Player | undefined;
    private room?: Room<GetRealSchema>;

    private environmentName?: string = undefined;
    private environment?: EnvironmentAsset;

    private soundTrack: SoundContainer | undefined;

    private debugMode: boolean = false;

    constructor(scene: Scene, xr: WebXRDefaultExperience) {
        this.scene = scene;
        this.xr = xr;
        this.rendering = new Rendering(scene, xr);

        this.audioContext = this.waitForUserGesture().then(() => {
            console.log("Resuming audio context");
            return new AudioContext();
        });

        //@ts-ignore
        navigator.getBattery().then((battery: BatteryManager) => {
            this.battery = battery;
        });

        const _this = this;
        window.addEventListener("error", function (errorEvent) {
            const errorMessage = `Error: ${errorEvent.message}\nSource: ${errorEvent.filename}\nLine: ${errorEvent.lineno}\nColumn: ${errorEvent.colno}\nStack Trace: ${errorEvent.error.stack}`;
            if (_this.room) {
                _this.room.send(PlayerSettingsUpdateMessageType, {
                    sessionId: _this.room.sessionId,
                    errors: [errorMessage],
                });
            }
        });
        window.addEventListener("unhandledrejection", function (event) {
            const errorMessage = `Unhandled Promise Rejection: ${event.reason}`;
            if (_this.room) {
                _this.room.send(PlayerSettingsUpdateMessageType, {
                    sessionId: _this.room.sessionId,
                    errors: [errorMessage],
                });
            }
        });

        // When jumping into XR This causes error in babylonjs, so will use polling approach
        xr.baseExperience.onStateChangedObservable.add((state) => {
            if (state === WebXRState.IN_XR) {
                this.rendering.attachCameras();
            }
        });

        // Load all the assets
        AssetManager.getInstance()
            .loadAssets(this.scene)
            .then(() => {
                for (const player of this.players.values()) {
                    if (player.rig.isMe() && _this.room)
                        _this.room.send(PlayerSettingsUpdateMessageType, {
                            sessionId: _this.room.sessionId,
                            loaded: true,
                        });
                }
            });
    }

    setRoom(room: Room<GetRealSchema>) {
        if (this.room) throw new Error("Room already set");

        this.room = room;
        this.adminMenu.setRoom(room);
        this.environmentName = room.state.room.environment;
        this.peer2peer = new Peer2Peer(room.sessionId);

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
                new Player(
                    playerState,
                    this.scene,
                    this,
                    room,
                    isMe,
                    this.xr,
                    this.audioContext
                )
            );

            const player = this.players.get(sessionId)!;

            if (isMe) this.me = player;

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
                    throw new Error(
                        "Room not set when trying to send player introduction message"
                    );

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

                playerState.listen("cookieId", (cookieId: string) => {});

                playerState.listen("isAdmin", (isAdmin: boolean) => {
                    this.persitentData.data = {
                        ...this.persitentData.data,
                        isAdmin: isAdmin,
                    };
                });

                /*if (
                    this.room.state.room.nonAdminEnterVRImmediatelyMode &&
                    !playerState.isAdmin
                ) {
                    // TODO: doesn't work, gives me security errors
                    this.xr.baseExperience.enterXRAsync(
                        "immersive-vr",
                        "local-floor"
                    );
                }*/
            } else {
                this.peer2peer!.connectToPeer(
                    sessionId,
                    sessionId < room.sessionId,
                    (signalData: string) => {
                        this.room!.send(PlayerPeerDataMessageType, {
                            sourceSessionId: this.room!.sessionId,
                            targetSessionId: sessionId,
                            signalingData: signalData,
                        });
                    },
                    (audioStream: MediaStream) => {
                        const player = this.players.get(sessionId);
                        if (player) player.setAudioStream(audioStream);
                    }
                );

                player.setSoundMode(room.state.room.soundMode);
                player.setSpatialSoundMode(room.state.room.spatialSoundMode);
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
                this.peer2peer!.disconnectFromPeer(sessionId);
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

        this.room.onMessage(
            PlayerPeerDataMessageType,
            (message: PlayerPeerDataMessage) => {
                if (message.targetSessionId !== this.room!.sessionId)
                    throw new Error(
                        "Received peer data message for a different player"
                    );
                this.peer2peer!.signalToPeer(
                    message.sourceSessionId,
                    message.signalingData
                );
            }
        );

        this.room.state.room.listen(
            "environment",
            (environmentName: string) => {
                this.setEnvironment(environmentName);
            }
        );

        this.room.state.room.listen("soundMode", (mode: string) => {
            if (
                mode !== "all" &&
                mode !== "none" &&
                mode !== "performers" &&
                mode !== "audience"
            )
                throw new Error("Invalid sound mode: " + mode);
            for (const player of this.players.values()) {
                if (!player.isMe()) player.setSoundMode(mode);
            }
        });

        this.room.state.room.listen("spatialSoundMode", (mode: string) => {
            if (mode !== "global" && mode !== "spatial")
                throw new Error("Invalid spatial sound mode: " + mode);
            for (const player of this.players.values()) {
                if (!player.isMe()) player.setSpatialSoundMode(mode);
            }
        });

        this.room.state.room.listen("songStartTime", () => {
            this.setSong();
        });

        this.room.state.room.listen("attachSongToPerformer", () => {
            this.attachSongToPerformer();
        });

        this.setSong();
    }

    getPlayer(sessionId: string): Player | undefined {
        return this.players.get(sessionId);
    }

    async calibrate(immediate: boolean = false) {
        for (const player of this.players.values()) {
            if (player.isMe()) await player.calibrate(immediate);
        }
    }

    update(deltaTime: number): void {
        this.players.forEach((player) => {
            player.update(deltaTime);
        });

        this.soundTrack?.update();
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
        this.rendering.setScreenBlackout(false);
    }

    run(engine: Engine) {
        let avgTotal = 0;
        let lastStartTime = Date.now();
        let lastTime = Date.now();
        let lastUpdate = Date.now();

        // run the main render loop
        engine.runRenderLoop(async () => {
            const startTime = Date.now();
            this.update(startTime - lastStartTime);
            lastStartTime = startTime;
            const updateFinishTime = Date.now();
            this.scene.render();
            this.rendering.update();
            const renderFinishTime = Date.now();

            const gameUpdateTime = updateFinishTime - startTime;
            const renderTime = renderFinishTime - updateFinishTime;

            avgTotal = avgTotal * 0.95 + (Date.now() - lastTime) * 0.05;
            lastTime = Date.now();

            // Update FPS counter
            if (Date.now() - lastUpdate > 2000) {
                const fps = Math.round(1000 / avgTotal);
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
                headsetBatteryLevel: this.battery
                    ? Math.floor(this.battery.level * 100)
                    : undefined,
            });
        }
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

            let animationGroup: AnimationGroup | undefined =
                oldEnvironment?.container.animationGroups.find(
                    (ag) => ag.name === "LobbyDisassemble"
                );

            if (!animationGroup) throw new Error("No animation group found");

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

    async setSong() {
        if (this.soundTrack) {
            this.soundTrack.destroy();
        }

        if (
            !this.room!.state.room.song ||
            this.room!.state.room.song === "undefined"
        )
            return;

        const songAsset = await AssetManager.getInstance().getSound(
            this.room!.state.room.song
        );

        // Use web api instead
        this.audioContext.then((audioContext) => {
            this.soundTrack = new SoundContainer(
                songAsset.buffer,
                audioContext
            );
            this.soundTrack.gain.gain.value = 0.5;
            const songStartTime = this.room!.state.room.songStartTime;
            const delay = songStartTime - Date.now();
            console.log("Playing song with delay", delay);
            this.soundTrack.play(
                audioContext.currentTime + delay / 1000,
                delay < 0 ? -delay / 1000 : 0
            );
            this.attachSongToPerformer();
        });
    }

    attachSongToPerformer() {
        if (!this.room || !this.soundTrack) return;

        // Loop through all players and find first where performer !== -1
        let player: Player | undefined;
        for (const p of this.players.values()) {
            if (p.state.performerId !== -1) {
                player = p;
                break;
            }
        }

        const wasSpatial = this.soundTrack.getSpatial();
        this.soundTrack.setSpatial(false);

        if (!this.room.state.room.attachSongToPerformer) {
            if (wasSpatial) console.log("Detaching song from performer");
        } else if (!player) {
            console.log("No performer found to attach song to. Detaching.");
        } else {
            console.log("Attaching song to performer: ", player.state.name);
            this.soundTrack.setSpatial(true, player.getOrigin());
            this.soundTrack.panner!.distanceModel = "linear";
            this.soundTrack.panner!.rolloffFactor = 0.35;
        }
    }

    async waitForUserGesture() {
        return new Promise<void>((resolve) => {
            const handler = () => {
                window.removeEventListener("click", handler);
                resolve();
            };
            window.addEventListener("click", handler);
        });
    }
}
