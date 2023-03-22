import { HardwareRig } from "./HardwareRig";
import {
    PlayerSchema,
    PlayerTransformUpdateMessageType,
    PlayerTransformUpdateMessage,
} from "../schema/PlayerSchema";
import {
    HardwareRigSchema,
    HardwareRigUpdateMessageType,
} from "../schema/HardwareRigSchema";

import { Room } from "colyseus.js";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { WebXRDefaultExperience, WebXRState } from "@babylonjs/core";
import { Conversion } from "../Conversion";
import { Interpolator } from "../Interpolator";

export class XSensXRRig extends HardwareRig {
    boneTransformsRaw: Map<string, [Vector3, Quaternion]> = new Map();
    boneTransformsTransformed: Map<string, [Vector3, Quaternion]> = new Map();
    headToXRPosition: Vector3 = new Vector3();
    headToXRRotation: Quaternion = new Quaternion();
    headToXROffset: Vector3 = new Vector3();
    origoToXRPosition: Vector3 = new Vector3();

    bonePositionInterpolator: Interpolator = new Interpolator("Vector3");
    bonePositionsInterpolated: Map<string, Vector3> = new Map();

    boneRotationInterpolator: Interpolator = new Interpolator("Quaternion");
    boneRotationsInterpolated: Map<string, Quaternion> = new Map();

    constructor(
        xr: WebXRDefaultExperience,
        hardwareRigState: HardwareRigSchema
    ) {
        console.log("Create XSens + XR Rig");
        super(xr);
    }

    static getRigType(): string {
        return "xsens_xr";
    }

    getRigType(): string {
        return XSensXRRig.getRigType();
    }

    isMe(): boolean {
        return true;
    }

    getBone(name: string): { position: Vector3; rotation: Quaternion } | null {
        const bone = this.boneTransformsTransformed.get(name);
        const bonePositionInterpolated =
            this.bonePositionsInterpolated.get(name);
        const boneRotationInterpolated =
            this.boneRotationsInterpolated.get(name);
        if (bone) {
            return {
                position: bone[0],
                rotation: bone[1],
                /*position: bonePositionInterpolated
                    ? bonePositionInterpolated
                    : bone[0],
                rotation: bone[1],*/
                /*rotation: boneRotationInterpolated
                    ? boneRotationInterpolated
                    : bone[1],*/
            };
        }
        return null;
    }

    getAllBones(): Map<string, { position: Vector3; rotation: Quaternion }> {
        const allBones = new Map();
        for (const [name, [position, rotation]] of this
            .boneTransformsTransformed) {
            allBones.set(name, { position, rotation });
        }
        return allBones;
    }

    continuousCalibrate(room: Room, factor: number) {
        if (this.boneTransformsRaw.size !== 0) {
            const camera = this.xr.baseExperience.camera;
            const headBone = this.boneTransformsRaw.get("Head");
            if (!headBone) throw new Error("Head bone not found");

            // This works as long as xsens knows where the ground is
            // ( applied globally)
            let headToXROffset = new Vector3(
                0,
                headBone[0].y - camera.position.y,
                0
            );

            // Get rotation delta between head bone and XR camera
            let headToXRRotation = camera.rotationQuaternion.multiply(
                Quaternion.Inverse(headBone[1])
            );

            // Only use yaw
            headToXRRotation.x = 0;
            headToXRRotation.z = 0;
            headToXRRotation.normalize();

            // Get position delta between head bone and XR camera
            // Here we take into account that the camera and head bone
            // are not at the same position in physical space.
            // I.e. the headset is infront of the head bone.
            // You can test the values by putting you hands out infront
            // and spinning around in a circle. They should not translate.
            // TODO: somehow calibrate these values, or make them configurable.
            let origoToXRPosition = camera.position
                .clone()
                .subtract(
                    new Vector3(0, 0, 0.06).rotateByQuaternionToRef(
                        camera.rotationQuaternion,
                        new Vector3()
                    )
                );
            let headToXRPosition = origoToXRPosition.subtract(headBone[0]);

            // Do the lerping
            this.headToXRPosition = headToXRPosition
                .scale(factor)
                .add(this.headToXRPosition.scale(1 - factor));

            Quaternion.SlerpToRef(
                this.headToXRRotation,
                headToXRRotation,
                factor,
                this.headToXRRotation
            );

            this.headToXROffset = headToXROffset
                .scale(factor)
                .add(this.headToXROffset.scale(1 - factor));

            this.origoToXRPosition = origoToXRPosition
                .scale(factor)
                .add(this.origoToXRPosition.scale(1 - factor));

            // Send to server
            room.send(HardwareRigUpdateMessageType, {
                sessionId: room.sessionId,
                rigType: this.getRigType(),
                headToXRPosition: Conversion.babylonToMessageVector3(
                    this.headToXRPosition
                ),
                headToXRRotation: Conversion.babylonToMessageQuaternion(
                    this.headToXRRotation
                ),
                headToXROffset: Conversion.babylonToMessageVector3(
                    this.headToXROffset
                ),
                origoToXRPosition: Conversion.babylonToMessageVector3(
                    this.origoToXRPosition
                ),
            });
        }
    }

    async calibrate(room: Room) {
        console.log("Calibrating XSens and XR hardware rig");

        if (this.boneTransformsRaw.size === 0) {
            console.warn(
                "No bone transforms available, is XSens suit connected?"
            );
            return;
        } else {
            this.continuousCalibrate(room, 1);
            console.log("Done calibrating XSens and XR hardware rig");
        }
    }

    networkUpdate(playerState: PlayerSchema, room: Room, deltaTime: number) {
        super.networkUpdate(playerState, room, deltaTime);

        // Zip playerState.bonePositions and playerState.boneRotations
        this.boneTransformsRaw = new Map<string, [Vector3, Quaternion]>();
        for (const [key, position] of playerState.bonePositions.entries()) {
            const rotation = playerState.boneRotations.get(key)!;
            this.boneTransformsRaw.set(key, [
                Conversion.schemaToBabylonVector3(position),
                Conversion.schemaToBabylonQuaternion(rotation),
            ]);
        }

        // Continuous calibration if in XR
        if (this.xr.baseExperience.state === WebXRState.IN_XR)
            this.continuousCalibrate(room, 1 - Math.pow(0.08, deltaTime));

        // Update this.boneTransforms with headToXRPosition and headToXRRotation
        this.boneTransformsTransformed = new Map<
            string,
            [Vector3, Quaternion]
        >();

        const bonePositions = new Map<string, Vector3>();
        const boneRotations = new Map<string, Quaternion>();
        for (const [key, value] of this.boneTransformsRaw) {
            let [position, rotation] = value;
            position = position.clone();
            position = position.add(this.headToXRPosition);
            position = position.add(this.headToXROffset);
            position.rotateByQuaternionAroundPointToRef(
                this.headToXRRotation,
                this.origoToXRPosition,
                position
            );
            //position.addInPlace(this.globalPosition);

            rotation = rotation.multiply(this.headToXRRotation);
            //rotation.multiplyInPlace(this.globalRotation);

            this.boneTransformsTransformed.set(key, [position, rotation]);

            bonePositions.set(key, position);
            boneRotations.set(key, rotation);
        }

        // Update interpolators
        this.bonePositionInterpolator.updateVector3(deltaTime, bonePositions);
        this.boneRotationInterpolator.updateQuaternion(
            deltaTime,
            boneRotations
        );
    }

    update(state: PlayerSchema, room: Room, deltaTime: number) {
        this.bonePositionsInterpolated = this.bonePositionInterpolator.predict(
            deltaTime
        ) as Map<string, Vector3>;
        this.boneRotationsInterpolated = this.boneRotationInterpolator.predict(
            deltaTime
        ) as Map<string, Quaternion>;
    }
}
