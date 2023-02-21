import { HardwareRig } from './HardwareRig';
import { PlayerSchema } from '../schema/PlayerSchema';

import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

export class XSensXRRig extends HardwareRig {
    hipPosition: Vector3;
    hipRotation: Quaternion;

    boneTransforms: Array<[Vector3, Quaternion]> = [];

    constructor() {
        super();
        this.hipPosition = new Vector3(0, 0, 0);
        this.hipRotation = new Quaternion(0, 0, 0, 1);
    }

    static getRigType(): string {
        return "xsens_xr";
    }

    static isMe(): boolean {
        return true;
    }

    getHipTransform(): { position: Vector3, rotation: Quaternion } {
        return {
            position: this.hipPosition,
            rotation: this.hipRotation
        };
    }

    getBoneTransforms(): Array<[Vector3, Quaternion]> {
        return this.boneTransforms;
    }

    networkUpdate(playerState: PlayerSchema) {
        this.hipPosition.x = playerState.hipPosition.x;
        this.hipPosition.y = playerState.hipPosition.y;
        this.hipPosition.z = playerState.hipPosition.z;

        this.hipRotation.w = playerState.hipRotation.w;
        this.hipRotation.x = playerState.hipRotation.x;
        this.hipRotation.y = playerState.hipRotation.y;
        this.hipRotation.z = playerState.hipRotation.z;

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

