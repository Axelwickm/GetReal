import { PlayerSchema } from "./schema/PlayerSchema";
import { HardwareRig } from "./hardware_rigs/HardwareRig";
import { Avatar } from "./avatars/Avatar";
import { Game } from "./Game";

import { DebugAvatar } from "./avatars/DebugAvatar";
import { FullBodyAvatar } from "./avatars/FullBodyAvatar";

import { Room } from "colyseus.js";
import { Scene, WebXRDefaultExperience } from "@babylonjs/core";
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

    avatar: Avatar | undefined;
    debugAvatar: Avatar | undefined;

    panner: PannerNode | undefined;
    chromeWorkarondAudio: HTMLAudioElement | undefined;

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

        if (isMe) {
            this.rig = new XRRig(xr); // default
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
                    this.rig = new XRRig(xr);
                } else if (
                    playerState.hardwareRig.rigType ===
                        XSensXRRig.getRigType() &&
                    this.rig.getRigType() !== XSensXRRig.getRigType()
                ) {
                    this.rig = new XSensXRRig(playerState.hardwareRig, xr);
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
    }

    destroy() {
        this.avatar?.destroy();
        this.debugAvatar?.destroy();
        this.panner?.disconnect();
        this.chromeWorkarondAudio?.remove();
    }

    addOnChangeCallback(cb: () => void) {
        this.onChangeCallbacks.push(cb);
    }

    update(deltaTime: number) {
        this.avatar?.update();
        this.debugAvatar?.update();

        this.rig.update(this.state, this.room, deltaTime);

        if (this.rig.aTriggered) this.calibrate(true);

        if (this.rig.bTriggered)
            this.game.setDebugMode(!this.game.getDebugMode());

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
        } else if (head && this.panner) {
            this.panner.positionX.value = head.position.x;
            this.panner.positionY.value = head.position.y;
            this.panner.positionZ.value = head.position.z;

            const forward = Vector3.Backward().rotateByQuaternionToRef(
                head.rotation,
                new Vector3()
            );
            this.panner.orientationX.value = forward.x;
            this.panner.orientationY.value = forward.y;
            this.panner.orientationZ.value = forward.z;
        }
    }

    isMe(): boolean {
        return this.rig.isMe();
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
        this.audioContext.then((audioContext) => {
            console.log("Setting up audio for " + this.id);
            this.chromeWorkarondAudio = new Audio();
            this.chromeWorkarondAudio.srcObject = mediaStream;

            const source = audioContext.createMediaStreamSource(mediaStream);

            // Using this gives the same result
            this.panner = audioContext.createPanner();
            this.panner.panningModel = "HRTF";
            this.panner.distanceModel = "exponential";
            this.panner.refDistance = 1;
            this.panner.maxDistance = 5;
            this.panner.rolloffFactor = 1.4;
            this.panner.coneInnerAngle = 270;
            this.panner.coneOuterAngle = 300;
            this.panner.coneOuterGain = 0.8;
            this.panner.positionX.value = 0;
            this.panner.positionY.value = 0;
            this.panner.positionZ.value = 0;
            this.panner.orientationX.value = 0;
            this.panner.orientationY.value = 0;
            this.panner.orientationZ.value = 0;

            source.connect(this.panner);
            this.panner.connect(audioContext.destination);
        });
    }
}
