import { HardwareRig } from './HardwareRig';
import { PlayerSchema } from "../schema/PlayerSchema";

import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Room } from "colyseus.js";

export class NetworkRig extends HardwareRig {
    cameraTransform: [Vector3, Quaternion] = [new Vector3(), new Quaternion()];
    boneTransforms: Array<[Vector3, Quaternion]> = [];

    constructor() {
        super();
    }

    static getRigType(): string {
        return "network";
    }

    isMe(): boolean {
        return false;
    }

    networkUpdate(playerState: PlayerSchema, room: Room) {
        this.cameraTransform = [
            new Vector3(playerState.cameraPosition.x, playerState.cameraPosition.y, playerState.cameraPosition.z),
            new Quaternion(
                playerState.cameraRotation.x,
                playerState.cameraRotation.y,
                playerState.cameraRotation.z,
                playerState.cameraRotation.w,
            )
        ];

        // Zip playerState.bonePositions and playerState.boneRotations
        this.boneTransforms = playerState.bonePositions.map((position, index) => {
            return [
                new Vector3(position.x, position.y, position.z),
                new Quaternion(
                    playerState.boneRotations[index].x,
                    playerState.boneRotations[index].y,
                    playerState.boneRotations[index].z,
                    playerState.boneRotations[index].w, // This order is sooo dangerous
                )
            ];
        });
    }

    getCameraTransform(): [Vector3, Quaternion] {
        return this.cameraTransform;
    }
    
    getBoneTransforms(): Array<[Vector3, Quaternion]> {
        return this.boneTransforms;
    }
}

