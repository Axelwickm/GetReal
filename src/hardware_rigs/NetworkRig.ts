import { HardwareRig } from "./HardwareRig";
import { PlayerSchema } from "../schema/PlayerSchema";
import { Conversion } from "../Conversion";

import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Room } from "colyseus.js";
import { WebXRDefaultExperience } from "@babylonjs/core";

export class NetworkRig extends HardwareRig {
    boneTransforms: Map<string, { position: Vector3; rotation: Quaternion }> =
        new Map();

    constructor(xr: WebXRDefaultExperience) {
        super(xr);
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

    getBone(name: string): { position: Vector3; rotation: Quaternion } | null {
        const bone = this.boneTransforms.get(name);
        if (bone) return bone;
        return null;
    }

    getAllBones(): Map<string, { position: Vector3; rotation: Quaternion }> {
        return this.boneTransforms;
    }

    networkUpdate(playerState: PlayerSchema, room: Room, deltaTime: number) {
        // Zip playerState.bonePositions and playerState.boneRotations
        this.boneTransforms = new Map<
            string,
            { position: Vector3; rotation: Quaternion }
        >();
        for (const [key, position] of playerState.bonePositions.entries()) {
            const rotation = playerState.boneRotations.get(key)!;
            this.boneTransforms.set(key, {
                position: Conversion.schemaToBabylonVector3(position),
                rotation: Conversion.schemaToBabylonQuaternion(rotation),
            });
        }

        if (this.boneTransforms.size > 0) {
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

            for (const [key, value] of this.boneTransforms) {
                let position = value.position;
                const rotation = value.rotation;
                position = position.clone();
                position = position.add(headToXRPosition);
                position = position.add(headToXROffset);
                position.rotateByQuaternionAroundPointToRef(
                    headToXRRotation,
                    origoToXRPosition,
                    position
                );

                this.boneTransforms.set(key, {
                    position: position,
                    rotation: headToXRRotation.multiply(rotation),
                });
            }
        }
    }

    update(state: PlayerSchema, room: Room, deltaTime: number) {}
}
