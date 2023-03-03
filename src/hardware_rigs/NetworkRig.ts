import { HardwareRig } from "./HardwareRig";
import { PlayerSchema } from "../schema/PlayerSchema";

import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Room } from "colyseus.js";
import { Conversion } from "../Conversion";

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
            Conversion.schemaToBabylonVector3(playerState.cameraPosition),
            Conversion.schemaToBabylonQuaternion(playerState.cameraRotation),
        ];

        // Zip playerState.bonePositions and playerState.boneRotations
        this.boneTransforms = playerState.bonePositions.map(
            (position, index) => {
                return [
                    Conversion.schemaToBabylonVector3(position),
                    Conversion.schemaToBabylonQuaternion(
                        playerState.boneRotations[index]
                    ),
                ];
            }
        );

        if (this.boneTransforms.length > 0) {
            // Integrate between local hardware and network
            const headToXRPosition = Conversion.schemaToBabylonVector3(
                playerState.hardwareRig.headToXRPosition
            );

            const headToXRRotation = Conversion.schemaToBabylonQuaternion(
                playerState.hardwareRig.headToXRRotation
            );

            const headToXROffset = Conversion.schemaToBabylonVector3(
                playerState.hardwareRig.headToXROffset
            );

            const origoToXRPosition = Conversion.schemaToBabylonVector3(
                playerState.hardwareRig.origoToXRPosition
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
