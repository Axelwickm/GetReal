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
import { Conversion } from "../Conversion";

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
        return JSON.parse('[[{"_isDirty":false,"_x":-0.08712901395567485,"_y":0.9743806719779968,"_z":-0.04171318003289087},{"_isDirty":false,"_x":0.0038996911040700974,"_y":-0.2008412343242556,"_z":-0.007349324407591932,"_w":-0.979588475849885}],[{"_isDirty":false,"_x":-0.09344737108088452,"_y":1.0801146030426025,"_z":-0.05302379121202477},{"_isDirty":false,"_x":0.005817308498852794,"_y":-0.16529747541401152,"_z":0.03207818747247775,"_w":-0.985704751266084}],[{"_isDirty":false,"_x":-0.08620265941033267,"_y":1.198018193244934,"_z":-0.05563190259991074},{"_isDirty":false,"_x":0.05684417454025396,"_y":-0.15166915979365736,"_z":0.04192474988407079,"_w":-0.9859044108016637}],[{"_isDirty":false,"_x":-0.07912502141188327,"_y":1.304814100265503,"_z":-0.06902973966157816},{"_isDirty":false,"_x":0.057801359054539383,"_y":-0.136541633649501,"_z":0.06018288020946505,"_w":-0.987113666536088}],[{"_isDirty":false,"_x":-0.06800537335196566,"_y":1.4110653400421143,"_z":-0.08303094056254195},{"_isDirty":false,"_x":-0.008137927501109837,"_y":0.1212236090835695,"_z":-0.0801314979204284,"_w":0.9893521080775147}],[{"_isDirty":false,"_x":-0.044383353734204434,"_y":1.5599665641784668,"_z":-0.08839092604634885},{"_isDirty":false,"_x":0.15039992344998818,"_y":0.06652393071747387,"_z":-0.07497912070584273,"_w":0.9835306751691145}],[{"_isDirty":false,"_x":-0.027600037527889754,"_y":1.6546396017074585,"_z":-0.05985758473810904},{"_isDirty":false,"_x":0.13290112612910324,"_y":-0.013466738665269595,"_z":-0.04242486953265532,"_w":0.9901293079928637}],[{"_isDirty":false,"_x":-0.023476096270329094,"_y":1.4892470836639404,"_z":-0.09382888037321407},{"_isDirty":false,"_x":-0.019554003984728667,"_y":0.1784525422842536,"_z":0.029528961952274838,"_w":0.9833109193670986}],[{"_isDirty":false,"_x":0.11791308416070478,"_y":1.496970772743225,"_z":-0.1471487629971739},{"_isDirty":false,"_x":-0.19393984050103377,"_y":0.16606434269117087,"_z":-0.18419732222363516,"_w":0.9491476836320867}],[{"_isDirty":false,"_x":0.4014054920631338,"_y":1.3631185293197632,"_z":-0.2259564496367807},{"_isDirty":false,"_x":-0.28965365620242534,"_y":-0.5694202983850731,"_z":-0.45248283603853107,"_w":0.6221901792372466}],[{"_isDirty":false,"_x":0.3860822063117837,"_y":1.301468849182129,"_z":0.03067179529822056},{"_isDirty":false,"_x":-0.2801004971005784,"_y":-0.4852540081540102,"_z":-0.47076700799604154,"_w":0.6815061687803271}],[{"_isDirty":false,"_x":-0.08606458736984735,"_y":1.4997375011444092,"_z":-0.07823926262975561},{"_isDirty":false,"_x":-0.024476343539152633,"_y":0.16057794152150112,"_z":-0.11376727972654826,"_w":0.980139097055757}],[{"_isDirty":false,"_x":-0.2257483221520573,"_y":1.5346977710723877,"_z":-0.031480505982121654},{"_isDirty":false,"_x":0.41792145750550563,"_y":-0.14874239978247955,"_z":-0.05257424008966126,"_w":-0.8946805323135605}],[{"_isDirty":false,"_x":-0.5329145361613135,"_y":1.5444766283035278,"_z":0.06876065069658305},{"_isDirty":false,"_x":-0.5418662974107503,"_y":0.16157127578051395,"_z":0.06436546056064141,"_w":0.8222728817303369}],[{"_isDirty":false,"_x":-0.7812948033572766,"_y":1.56278395652771,"_z":0.15744920870198925},{"_isDirty":false,"_x":-0.49192563356059427,"_y":0.10082324857579894,"_z":0.04800528195800924,"_w":0.8634462128569939}],[{"_isDirty":false,"_x":-0.007273754665874321,"_y":0.9753453135490417,"_z":-0.07572526623911585},{"_isDirty":false,"_x":-0.5785661893746176,"_y":0.3074239348437491,"_z":0.06325911010251944,"_w":0.7528280139260646}],[{"_isDirty":false,"_x":0.1963218948401675,"_y":0.8297615647315979,"_z":0.2999784214207489},{"_isDirty":false,"_x":0.17251702500293606,"_y":0.23929421578626195,"_z":-0.2649596331902655,"_w":0.918026406801539}],[{"_isDirty":false,"_x":-0.05485169909645293,"_y":0.4766532778739929,"_z":0.2162171170273824},{"_isDirty":false,"_x":0.21839903110204176,"_y":0.2767011029584896,"_z":-0.4241835345408703,"_w":0.8341502800649762}],[{"_isDirty":false,"_x":-0.06896108961100822,"_y":0.346839040517807,"_z":0.32334907012730923},{"_isDirty":false,"_x":0.21839903110204176,"_y":0.2767011029584896,"_z":-0.4241835345408703,"_w":0.8341502800649762}],[{"_isDirty":false,"_x":-0.16694330654343048,"_y":0.9736206531524658,"_z":-0.007889098301715192},{"_isDirty":false,"_x":-0.03714532383731893,"_y":0.18811486520343612,"_z":0.035261069150221334,"_w":0.9808107149173553}],[{"_isDirty":false,"_x":-0.1294028484757348,"_y":0.5245493054389954,"_z":0.019031038439694614},{"_isDirty":false,"_x":0.04073876325630855,"_y":0.22071710582406207,"_z":0.03998002372701931,"_w":0.9736662024730345}],[{"_isDirty":false,"_x":-0.10277829088630597,"_y":0.0870710089802742,"_z":-0.023367039878264106},{"_isDirty":false,"_x":0.006290897836400174,"_y":0.19296223032536286,"_z":-0.02415083263345665,"_w":0.9808887351019405}],[{"_isDirty":false,"_x":-0.04798105536652031,"_y":0.01563706248998642,"_z":0.11880862280065202},{"_isDirty":false,"_x":-0.00998029093026963,"_y":0.19333625972192559,"_z":-0.02094678286682007,"_w":0.9808581763454877}]]');
        //return this.boneTransformsTransformed;
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

    networkUpdate(playerState: PlayerSchema, room: Room, deltaTime: number) {
        // Zip playerState.bonePositions and playerState.boneRotations
        this.boneTransformsRaw = playerState.bonePositions.map(
            (position, index) => {
                return [
                    Conversion.schemaToBabylonVector3(position),
                    Conversion.schemaToBabylonQuaternion(
                        playerState.boneRotations[index]
                    ),
                ];
            }
        );

        // Continuous calibration
        //this.continuousCalibrate(room, 1 - Math.pow(0.08, deltaTime));

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
            cameraPosition: Conversion.babylonToMessageVector3(camera.position),
            cameraRotation: Conversion.babylonToMessageQuaternion(
                camera.rotationQuaternion
            ),
        };

        room.send(PlayerTransformUpdateMessageType, message);
    }
}
