import { PlayerSchema } from "./schema/PlayerSchema";
import { HardwareRig } from "./hardware_rigs/HardwareRig";
import { Avatar } from "./avatars/Avatar";
import { Game } from "./Game";

import { DebugAvatar } from "./avatars/DebugAvatar";
import { FullBodyAvatar } from "./avatars/FullBodyAvatar";

import { Room } from "colyseus.js";
import { Scene, WebXRDefaultExperience, TransformNode } from "@babylonjs/core";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SimpleAvatar } from "./avatars/SimpleAvatar";
import { HardwareRigUpdateMessageType } from "./schema/HardwareRigSchema";
import { XRRig } from "./hardware_rigs/XRRig";
import { XSensXRRig } from "./hardware_rigs/XSensXRRig";
import { NetworkRig } from "./hardware_rigs/NetworkRig";

export class Player {
    scene: Scene;
    game: Game;
    room: Room;
    id: string;

    state: PlayerSchema;
    rig: HardwareRig;
    audioContext: Promise<AudioContext>;
    origin: TransformNode;

    avatar: Avatar | undefined;
    debugAvatar: Avatar | undefined;

    audioStreamSetup: Promise<void>;
    audioStreamSetupResolve?: () => void;
    // TODO: use SoundContainer.ts for this instead
    audioSource: MediaStreamAudioSourceNode | undefined;
    gainNode: GainNode | undefined;
    pannerNode: PannerNode | undefined;
    chromeWorkarondAudio: HTMLAudioElement | undefined;
    oldSoundMode?: "all" | "none" | "performers" | "audience";

    onChangeCallbacks: (() => void)[] = [];

    constructor(
        playerState: PlayerSchema,
        scene: Scene,
        game: Game,
        room: Room,
        isMe: boolean,
        xr: WebXRDefaultExperience,
        audioContext: Promise<AudioContext>
    ) {
        this.scene = scene;
        this.avatar = undefined;
        this.game = game;
        this.room = room;
        this.id = playerState.sessionId;
        this.state = playerState;

        this.audioContext = audioContext;

        this.origin = new TransformNode("player_origin_" + this.id, scene);

        if (isMe) {
            this.rig = new XRRig(xr, scene); // default
        } else {
            this.rig = new NetworkRig(xr); // TODO: xr should not have to be passed here
        }

        if (isMe) {
            scene.audioListenerPositionProvider = () => {
                const headPosition =
                    this.rig.getBone("Head")?.position || Vector3.Zero();
                return headPosition;
            };
        }

        const debugAvatar = new DebugAvatar(this.scene, this.rig);
        debugAvatar.setEnabled(false);
        this.debugAvatar = debugAvatar;

        if (isMe) {
            room.send(HardwareRigUpdateMessageType, {
                sessionId: room.sessionId,
                rigType: this.rig.getRigType(),
            });
        }

        // Add listeners for player state changes
        playerState.onChange = () => {
            for (let i = 0; i < this.onChangeCallbacks.length; i++) {
                this.onChangeCallbacks[i]();
            }
        };

        let lastTime = Date.now();
        this.addOnChangeCallback(() => {
            const dt = (Date.now() - lastTime) / 1000;
            this.rig.networkUpdate(playerState, room, dt);
            lastTime = Date.now();
        });

        const setRig = () => {
            if (isMe) {
                if (
                    playerState.hardwareRig.rigType === XRRig.getRigType() &&
                    this.rig.getRigType() !== XRRig.getRigType()
                ) {
                    this.rig = new XRRig(xr, scene);
                } else if (
                    playerState.hardwareRig.rigType ===
                        XSensXRRig.getRigType() &&
                    this.rig.getRigType() !== XSensXRRig.getRigType()
                ) {
                    this.rig = new XSensXRRig(xr, playerState.hardwareRig);
                }

                this.avatar?.setRig(this.rig);
                this.debugAvatar?.setRig(this.rig);
            }
        };

        playerState.hardwareRig.listen("rigType", setRig);

        const setAvatar = () => {
            // hot-swappable avatars
            const avatarType = playerState.avatar.avatarType;
            if (
                this.avatar?.getAvatarType() !== avatarType &&
                !(avatarType === "undefined" && this.avatar === undefined)
            ) {
                this.setAvatar(avatarType, playerState.avatar.character);
            }
        };

        playerState.avatar.listen("avatarType", setAvatar);

        playerState.listen("performerId", () => {
            if (!this.rig.isMe()) this.setSoundMode();
            this.game.attachSongToPerformer();
        });

        this.audioStreamSetup = new Promise((resolve) => {
            this.audioStreamSetupResolve = resolve;
        });
    }

    destroy() {
        this.avatar?.destroy();
        this.debugAvatar?.destroy();
        this.audioSource?.disconnect();
        this.pannerNode?.disconnect();
        this.chromeWorkarondAudio?.remove();
    }

    addOnChangeCallback(cb: () => void) {
        this.onChangeCallbacks.push(cb);
    }

    update(deltaTime: number) {
        this.avatar?.update();
        this.debugAvatar?.update();

        this.rig.update(this.state, this.room, deltaTime);

        if (this.rig.isMe()) {
            if (this.rig.aTriggered) this.calibrate(true);

            if (this.rig.bTriggered)
                this.game.setDebugMode(!this.game.getDebugMode());

            if (!this.game.getDebugMode())
                this.rig.setControllerVisibility(false);

            if (this.rig.shouldBlackout) {
                if (!this.game.getDebugMode())
                    this.game.rendering.setScreenBlackout(true);
            } else this.game.rendering.setScreenBlackout(false);
        }

        const head = this.rig.getBone("Head");
        if (head && this.rig.isMe()) {
            // check if audio context is ready, else dont wait
            this.audioContext.then((audioContext) => {
                audioContext.listener.positionX.value = head.position.x;
                audioContext.listener.positionY.value = head.position.y;
                audioContext.listener.positionZ.value = head.position.z;

                const forward = Vector3.Backward().rotateByQuaternionToRef(
                    head.rotation,
                    new Vector3()
                );
                audioContext.listener.forwardX.value = forward.x;
                audioContext.listener.forwardY.value = forward.y;
                audioContext.listener.forwardZ.value = forward.z;
            });
        } else if (head && this.pannerNode) {
            this.pannerNode.positionX.value = head.position.x;
            this.pannerNode.positionY.value = head.position.y;
            this.pannerNode.positionZ.value = head.position.z;

            const forward = Vector3.Backward().rotateByQuaternionToRef(
                head.rotation,
                new Vector3()
            );
            this.pannerNode.orientationX.value = forward.x;
            this.pannerNode.orientationY.value = forward.y;
            this.pannerNode.orientationZ.value = forward.z;
        }

        if (head) {
            this.origin.position = head.position;
            this.origin.rotationQuaternion = head.rotation;
        }
    }

    isMe(): boolean {
        return this.rig.isMe();
    }

    getOrigin(): TransformNode {
        return this.origin;
    }

    async calibrate(immediate: boolean) {
        if (!immediate) {
            console.log("Calibrating in 3");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Calibrating in 2");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Calibrating in 1");
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        await this.rig.calibrate(this.room);
        await this.avatar?.calibrate();
        await this.debugAvatar?.calibrate();
    }

    setAvatar(avatarType?: string, character?: string) {
        console.log(
            "Setting avatar to " + avatarType + " with character " + character
        );
        this.avatar?.destroy();
        if (avatarType === "undefined") {
            this.avatar?.destroy();
            this.avatar = undefined;
        } else if (avatarType === DebugAvatar.getAvatarType()) {
            throw new Error(
                "Debug avatar is not hot-swappable, since every player already gets one"
            );
        } else if (avatarType === FullBodyAvatar.getAvatarType()) {
            if (character === undefined)
                throw new Error("Character is undefined");
            const fullBodyAvatar = new FullBodyAvatar(
                this.scene,
                this.rig,
                character,
                this.id
            );
            fullBodyAvatar.setEnabled(true);
            this.avatar = fullBodyAvatar;
        } else if (avatarType === SimpleAvatar.getAvatarType()) {
            if (character === undefined)
                throw new Error("Character is undefined");
            const simpleAvatar = new SimpleAvatar(
                this.scene,
                this.rig,
                character,
                this.id
            );
            simpleAvatar.setEnabled(true);
            this.avatar = simpleAvatar;
        }
    }

    setAudioStream(mediaStream: MediaStream) {
        if (this.rig.isMe())
            throw new Error("Cannot set audio stream for own player");

        this.audioContext.then((audioContext) => {
            console.log("Setting up audio for " + this.id);
            this.chromeWorkarondAudio = new Audio();
            this.chromeWorkarondAudio.srcObject = mediaStream;

            this.audioSource =
                audioContext.createMediaStreamSource(mediaStream);

            this.gainNode = audioContext.createGain();
            this.gainNode.gain.value = 1;

            // Using this gives the same result
            this.pannerNode = audioContext.createPanner();
            this.pannerNode.panningModel = "HRTF";
            this.pannerNode.distanceModel = "exponential";
            this.pannerNode.refDistance = 1;
            this.pannerNode.maxDistance = 5;
            this.pannerNode.rolloffFactor = 1.4;
            this.pannerNode.coneInnerAngle = 270;
            this.pannerNode.coneOuterAngle = 300;
            this.pannerNode.coneOuterGain = 0.8;
            this.pannerNode.positionX.value = 0;
            this.pannerNode.positionY.value = 0;
            this.pannerNode.positionZ.value = 0;
            this.pannerNode.orientationX.value = 0;
            this.pannerNode.orientationY.value = 0;
            this.pannerNode.orientationZ.value = 0;

            this.audioSource.connect(this.gainNode);
            this.gainNode.connect(this.pannerNode);
            this.pannerNode.connect(audioContext.destination);

            if (!this.audioStreamSetupResolve)
                throw new Error("Audio stream setup promise not set");
            this.audioStreamSetupResolve();
        });
    }

    setSoundMode(mode?: "all" | "none" | "performers" | "audience") {
        if (mode === undefined) {
            if (this.oldSoundMode !== undefined) mode = this.oldSoundMode;
            else return;
        } else {
            this.oldSoundMode = mode;
        }

        if (this.rig.isMe())
            throw new Error("Cannot set audio mode for own player");

        console.log("Setting sound mode to " + mode + " for " + this.id);
        const isPerformer = this.state.performerId !== -1;
        this.audioStreamSetup.then(() => {
            console.log("Performing sound mode change for " + this.id);
            if (mode === "all") {
                this.audioSource!.connect(this.gainNode!);
            } else if (mode === "none") {
                this.audioSource!.disconnect();
            } else if (mode === "performers") {
                if (isPerformer) {
                    this.audioSource!.connect(this.gainNode!);
                } else {
                    this.audioSource!.disconnect();
                }
            } else if (mode === "audience") {
                if (isPerformer) {
                    this.audioSource!.disconnect();
                } else {
                    this.audioSource!.connect(this.gainNode!);
                }
            }
        });
    }

    setSpatialSoundMode(mode: "global" | "spatial") {
        if (this.rig.isMe())
            throw new Error("Cannot set audio mode for own player");

        console.log("Setting audio mode for " + this.id + " to " + mode);
        this.audioStreamSetup.then(() => {
            this.audioContext.then((audioContext) => {
                console.log("Performing audio mode change for " + this.id);
                if (mode === "global") {
                    this.gainNode!.disconnect();
                    this.pannerNode!.disconnect();

                    this.gainNode!.connect(audioContext.destination);
                } else if (mode === "spatial") {
                    this.gainNode!.disconnect();

                    this.gainNode!.connect(this.pannerNode!);
                    this.pannerNode!.connect(audioContext.destination);
                }
            });
        });
    }
}
