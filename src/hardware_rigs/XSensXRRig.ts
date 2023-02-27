import { HardwareRig } from "./HardwareRig";
import {
    PlayerSchema,
    PlayerTransformUpdateMessageType,
    PlayerTransformUpdateMessage,
} from "../schema/PlayerSchema";

import { Room } from "colyseus.js";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { WebXRDefaultExperience } from "@babylonjs/core";

export class XSensXRRig extends HardwareRig {
    boneTransforms: Array<[Vector3, Quaternion]> = [];
    xr: WebXRDefaultExperience;

    constructor(xr: WebXRDefaultExperience) {
        super();
        this.xr = xr;
    }

    static getRigType(): string {
        return "xsens_xr";
    }

    isMe(): boolean {
        return true;
    }

    getCameraTransform(): [Vector3, Quaternion] {
        const camera = this.xr.baseExperience.camera;
        return [camera.position, camera.rotationQuaternion];
    }

    getBoneTransforms(): Array<[Vector3, Quaternion]> {
        return this.boneTransforms;
    }

    async calibrate() {
        console.log("Calibrating XSens and XR hardware rig");

        console.log("Done calibrating XSens and XR hardware rig");
    }

    networkUpdate(playerState: PlayerSchema, room: Room) {
        // Zip playerState.bonePositions and playerState.boneRotations
        this.boneTransforms = playerState.bonePositions.map(
            (position, index) => {
                return [
                    new Vector3(position.x, position.y, position.z),
                    new Quaternion(
                        playerState.boneRotations[index].x,
                        playerState.boneRotations[index].y,
                        playerState.boneRotations[index].z,
                        playerState.boneRotations[index].w // This order is sooo dangerous
                    ),
                ];
            }
        );

        // TODO: integrate between local hardware and network

        // Sync camera position to server
        const camera = this.xr.baseExperience.camera;
        const message: PlayerTransformUpdateMessage = {
            sessionId: room.sessionId,
            cameraPosition: [
                camera.position.x,
                camera.position.y,
                camera.position.z,
            ],
            cameraRotation: [
                camera.rotationQuaternion.w, // Again, watch the order
                camera.rotationQuaternion.x,
                camera.rotationQuaternion.y,
                camera.rotationQuaternion.z,
            ],
        };
        room.send(PlayerTransformUpdateMessageType, message);
    }
}
