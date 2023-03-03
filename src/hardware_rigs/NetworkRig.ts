import { HardwareRig } from "./HardwareRig";
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

    getRigType(): string {
        return NetworkRig.getRigType();
    }

    isMe(): boolean {
        return false;
    }

    async calibrate(room: Room) {}

    networkUpdate(playerState: PlayerSchema, room: Room) {
        this.cameraTransform = [
            new Vector3(
                playerState.cameraPosition.x,
                playerState.cameraPosition.y,
                playerState.cameraPosition.z
            ),
            new Quaternion(
                playerState.cameraRotation.x,
                playerState.cameraRotation.y,
                playerState.cameraRotation.z,
                playerState.cameraRotation.w
            ),
        ];

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

        if (this.boneTransforms.length > 0) {
            // Integrate between local hardware and network
            // TODO: utility function for conversions
            const headToXRPosition = new Vector3(
                playerState.hardwareRig.headToXRPosition.x,
                playerState.hardwareRig.headToXRPosition.y,
                playerState.hardwareRig.headToXRPosition.z
            );

            const headToXRRotation = new Quaternion(
                playerState.hardwareRig.headToXRRotation.x,
                playerState.hardwareRig.headToXRRotation.y,
                playerState.hardwareRig.headToXRRotation.z,
                playerState.hardwareRig.headToXRRotation.w
            );

            const headToXROffset = new Vector3(
                playerState.hardwareRig.headToXROffset.x,
                playerState.hardwareRig.headToXROffset.y,
                playerState.hardwareRig.headToXROffset.z
            );

            const origoToXRPosition = new Vector3(
                playerState.hardwareRig.origoToXRPosition.x,
                playerState.hardwareRig.origoToXRPosition.y,
                playerState.hardwareRig.origoToXRPosition.z
            );

            this.boneTransforms = this.boneTransforms.map((transform) => {
                let [position, rotation] = transform;
                position = position.clone();
                position = position.add(headToXRPosition);
                position = position.add(headToXROffset);
                position.rotateByQuaternionAroundPointToRef(
                    headToXRRotation,
                    origoToXRPosition,
                    position
                );

                return [position, headToXRRotation.multiply(rotation)];
            });
        }
    }

    getCameraTransform(): [Vector3, Quaternion] {
        return this.cameraTransform;
    }

    getBoneTransforms(): Array<[Vector3, Quaternion]> {
        return this.boneTransforms;
    }
}
