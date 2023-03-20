import { Vector3Schema, QuaternionSchema } from "./MathSchemas";
import { AvatarSchema } from "./AvatarSchema";
import { HardwareRigSchema } from "./HardwareRigSchema";

import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

// Messages are only sent from client to server, although server might also invoke internally
export const PlayerSettingsUpdateMessageType = "playerSettingsUpdate";
export type PlayerSettingsUpdateMessage = {
    sessionId: string;
    cookieId?: string;
    name?: string;

    isAdmin?: boolean;
    performerId?: number;

    headsetBatteryLevel?: number;

    fps?: number;
    updateTime?: number; // ms
    renderTime?: number; // ms
    errors?: string[];
    loaded?: boolean;
};

export const PlayerTransformUpdateMessageType = "playerTransformUpdate";
export type PlayerTransformUpdateMessage = {
    sessionId: string; // What player should update
    bonePositions?: { [boneName: string]: [number, number, number] };
    boneRotations?: { [boneName: string]: [number, number, number, number] };
};

// Events
export const PlayerCalibrateMessageType = "playerCalibrate";
export type PlayerCalibrateMessage = {
    sessionId: string;
};

export const PlayerPeerDataMessageType = "playerPeerData";
export type PlayerPeerDataMessage = {
    sourceSessionId: string;
    targetSessionId: string;
    signalingData: string;
};

export class PlayerSchema extends Schema {
    @type("string") sessionId: string = "undefined";
    @type("string") cookieId: string = "undefined";
    @type("string") name: string = "undefined";

    @type("boolean") isAdmin: boolean = false;
    @type("number") performerId: number = -1;
    @type(AvatarSchema) avatar = new AvatarSchema();
    @type(HardwareRigSchema) hardwareRig = new HardwareRigSchema();

    // Can only updated by client
    @type("number") headsetBatteryLevel: number = -1;

    // How well running is going
    @type("number") fps: number = 0;
    @type("number") updateTime: number = 0; // ms
    @type("number") renderTime: number = 0; // ms
    @type(["string"]) errors = new ArraySchema<string>();
    @type("boolean") loaded: boolean = false;

    // Bone names to vector, quaternion
    @type({ map: Vector3Schema }) bonePositions =
        new MapSchema<Vector3Schema>();
    @type({ map: QuaternionSchema }) boneRotations =
        new MapSchema<QuaternionSchema>();

    updateFromSettingsMessage(message: PlayerSettingsUpdateMessage) {
        this.cookieId = message.cookieId ?? this.cookieId;
        this.name = message.name ?? this.name;

        this.isAdmin = message.isAdmin ?? this.isAdmin;
        this.performerId = message.performerId ?? this.performerId;

        this.headsetBatteryLevel =
            message.headsetBatteryLevel ?? this.headsetBatteryLevel;

        this.fps = message.fps ?? this.fps;
        this.updateTime = message.updateTime ?? this.updateTime;
        this.renderTime = message.renderTime ?? this.renderTime;

        if (message.errors) {
            for (const error of message.errors) {
                this.errors.push(error);
            }
        }

        this.loaded = message.loaded ?? this.loaded;
    }

    updateFromTransformMessage(message: PlayerTransformUpdateMessage) {
        if (message.bonePositions) {
            this.bonePositions = new MapSchema<Vector3Schema>();
            for (const [boneName, position] of Object.entries(
                message.bonePositions ?? {}
            )) {
                this.bonePositions.set(
                    boneName,
                    new Vector3Schema(position[0], position[1], position[2])
                );
            }
        }

        if (message.boneRotations) {
            this.boneRotations = new MapSchema<QuaternionSchema>();
            for (const [boneName, rotation] of Object.entries(
                message.boneRotations ?? {}
            )) {
                this.boneRotations.set(
                    boneName,
                    new QuaternionSchema(
                        rotation[0],
                        rotation[1],
                        rotation[2],
                        rotation[3]
                    )
                );
            }
        }
    }
}
