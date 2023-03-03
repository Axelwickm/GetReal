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
import { WebXRDefaultExperience } from "@babylonjs/core";

// TODO: put this in a separate file
const HEAD_BONE = 6;

export class XSensXRRig extends HardwareRig {
    boneTransformsRaw: Array<[Vector3, Quaternion]> = [];
    boneTransformsTransformed: Array<[Vector3, Quaternion]> = [];
    xr: WebXRDefaultExperience;
    headToXRPosition: Vector3 = new Vector3();
    headToXRRotation: Quaternion = new Quaternion();
    headToXROffset: Vector3 = new Vector3();
    origoToXRPosition: Vector3 = new Vector3();

    constructor(
        hardwareRigState: HardwareRigSchema,
        xr: WebXRDefaultExperience
    ) {
        console.log("Create XSens + XR Rig");
        super();
        this.xr = xr;
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

    getCameraTransform(): [Vector3, Quaternion] {
        const camera = this.xr.baseExperience.camera;
        return [camera.position, camera.rotationQuaternion];
    }

    getBoneTransforms(): Array<[Vector3, Quaternion]> {
        return this.boneTransformsTransformed;
    }

    continuousCalibrate(room: Room, factor: number) {
        if (this.boneTransformsRaw.length !== 0) {
            const camera = this.xr.baseExperience.camera;
            const headBone = this.boneTransformsRaw[HEAD_BONE];

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

            // Get location delta between head bone and XR camera
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
                // TODO: do conversion with utility functions
                headToXRPosition: [
                    this.headToXRPosition.x,
                    this.headToXRPosition.y,
                    this.headToXRPosition.z,
                ],
                headToXRRotation: [
                    this.headToXRRotation.w,
                    this.headToXRRotation.x,
                    this.headToXRRotation.y,
                    this.headToXRRotation.z,
                ],
                headToXROffset: [
                    this.headToXROffset.x,
                    this.headToXROffset.y,
                    this.headToXROffset.z,
                ],
                origoToXRPosition: [
                    this.origoToXRPosition.x,
                    this.origoToXRPosition.y,
                    this.origoToXRPosition.z,
                ],
            });
        }
    }

    async calibrate(room: Room) {
        console.log("Calibrating XSens and XR hardware rig");

        if (this.boneTransformsRaw.length === 0) {
            console.warn(
                "No bone transforms available, is XSens suit connected?"
            );
            return;
        } else {
            this.continuousCalibrate(room, 1);
            console.log("Done calibrating XSens and XR hardware rig");
        }
    }

    networkUpdate(playerState: PlayerSchema, room: Room) {
        // Zip playerState.bonePositions and playerState.boneRotations
        this.boneTransformsRaw = playerState.bonePositions.map(
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

        // Continuous calibration (TODO: probably should do this with deltaT factored in)
        this.continuousCalibrate(room, 0.04);

        // Update this.boneTransforms with headToXRPosition and headToXRRotation
        this.boneTransformsTransformed = this.boneTransformsRaw.map(
            (transform) => {
                let [position, rotation] = transform;
                position = position.clone();
                position = position.add(this.headToXRPosition);
                position = position.add(this.headToXROffset);
                position.rotateByQuaternionAroundPointToRef(
                    this.headToXRRotation,
                    this.origoToXRPosition,
                    position
                );

                return [position, this.headToXRRotation.multiply(rotation)];
            }
        );

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
