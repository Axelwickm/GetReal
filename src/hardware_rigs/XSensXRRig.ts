import { HardwareRig } from './HardwareRig';
import { PlayerSchema } from '../schema/PlayerSchema';

import { Room } from 'colyseus.js';
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

export class XSensXRRig extends HardwareRig {
    boneTransforms: Array<[Vector3, Quaternion]> = [];

    constructor() {
        super();
    }

    static getRigType(): string {
        return "xsens_xr";
    }

    isMe(): boolean {
        return true;
    }


    getBoneTransforms(): Array<[Vector3, Quaternion]> {
        return this.boneTransforms;
    }

    networkUpdate(playerState: PlayerSchema, room: Room) {
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

        
        // TODO: integrate between local hardware and network
        // TODO: send headset updates to network?
    }
}

