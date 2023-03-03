import {
    PlayerSchema,
    PlayerTransformUpdateMessageType,
    PlayerTransformUpdateMessage,
} from "../schema/PlayerSchema";
import { HardwareRig } from "./HardwareRig";

import { Room } from "colyseus.js";
import { WebXRDefaultExperience } from "@babylonjs/core";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

export class XRRig extends HardwareRig {
    xr: WebXRDefaultExperience;

    constructor(xr: WebXRDefaultExperience) {
        console.log("Create XRRig");
        super();
        this.xr = xr;
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

    getBoneTransforms(): Array<[Vector3, Quaternion]> {
        return []; // Has no bones.
    }

    async calibrate(room: Room) {

    }

    networkUpdate(state: PlayerSchema, room: Room) {
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
                camera.rotationQuaternion.w,
                camera.rotationQuaternion.x,
                camera.rotationQuaternion.y,
                camera.rotationQuaternion.z,
            ],
        };
        room.send(PlayerTransformUpdateMessageType, message);
    }
}
