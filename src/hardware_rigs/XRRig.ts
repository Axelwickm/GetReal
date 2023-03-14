import {
    PlayerSchema,
    PlayerTransformUpdateMessageType,
    PlayerTransformUpdateMessage,
} from "../schema/PlayerSchema";
import { HardwareRig } from "./HardwareRig";

import { Room } from "colyseus.js";
import { WebXRDefaultExperience } from "@babylonjs/core";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Conversion } from "../Conversion";

const UPDATE_RATE = 1000 / 30;

export class XRRig extends HardwareRig {
    boneTransforms: Map<string, { position: Vector3; rotation: Quaternion }> =
        new Map();
    timeSinceLastUpdate: number = Infinity;

    constructor(xr: WebXRDefaultExperience) {
        console.log("Create XRRig");
        super(xr);
        this.boneTransforms.set("Head", {
            position: new Vector3(),
            rotation: new Quaternion(),
        });

        this.boneTransforms.set("LeftHand", {
            position: new Vector3(),
            rotation: new Quaternion(),
        });

        this.boneTransforms.set("RightHand", {
            position: new Vector3(),
            rotation: new Quaternion(),
        });
    }

    static getRigType(): string {
        return "xr";
    }

    getRigType(): string {
        return XRRig.getRigType();
    }

    isMe(): boolean {
        return true;
    }

    getCameraTransform(): [Vector3, Quaternion] {
        const camera = this.xr.baseExperience.camera;
        return [camera.position, camera.rotationQuaternion];
    }

    getBone(name: string): { position: Vector3; rotation: Quaternion } | null {
        const bone = this.boneTransforms.get(name);
        if (bone) {
            return {
                position: bone.position,
                rotation: bone.rotation,
            };
        }
        return null;
    }

    getAllBones(): Map<string, { position: Vector3; rotation: Quaternion }> {
        return this.boneTransforms;
    }

    async calibrate(room: Room) {}

    networkUpdate(playerState: PlayerSchema, room: Room, deltaTime: number) {}

    update(playerState: PlayerSchema, room: Room, deltaTime: number) {
        super.networkUpdate(playerState, room, deltaTime);

        const camera = this.xr.baseExperience.camera;
        this.boneTransforms.set("Head", {
            position: camera.position,
            rotation: camera.rotationQuaternion,
        });

        if (this.leftControllerPosition && this.leftControllerRotation) {
            this.boneTransforms.set("LeftHand", {
                position: this.leftControllerPosition,
                rotation: this.leftControllerRotation,
            });
        }

        if (this.rightControllerPosition && this.rightControllerRotation) {
            this.boneTransforms.set("RightHand", {
                position: this.rightControllerPosition,
                rotation: this.rightControllerRotation,
            });
        }

        this.timeSinceLastUpdate += deltaTime;
        if (UPDATE_RATE < this.timeSinceLastUpdate) {
            // Sync camera position to server
            const message: PlayerTransformUpdateMessage = {
                sessionId: room.sessionId,
                bonePositions: {
                    Head: Conversion.babylonToMessageVector3(
                        this.boneTransforms.get("Head")!.position
                    ),
                    LeftHand: Conversion.babylonToMessageVector3(
                        this.boneTransforms.get("LeftHand")!.position
                    ),
                    RightHand: Conversion.babylonToMessageVector3(
                        this.boneTransforms.get("RightHand")!.position
                    ),
                },
                boneRotations: {
                    Head: Conversion.babylonToMessageQuaternion(
                        this.boneTransforms.get("Head")!.rotation
                    ),
                    LeftHand: Conversion.babylonToMessageQuaternion(
                        this.boneTransforms.get("LeftHand")!.rotation
                    ),
                    RightHand: Conversion.babylonToMessageQuaternion(
                        this.boneTransforms.get("RightHand")!.rotation
                    ),
                },
            };
            room.send(PlayerTransformUpdateMessageType, message);
            this.timeSinceLastUpdate = 0;
        }
    }
}
