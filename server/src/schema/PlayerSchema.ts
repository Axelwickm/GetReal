import { Vector3Schema, QuaternionSchema } from "./MathSchemas";
import { AvatarSchema } from "./AvatarSchema";
import { HardwareRigSchema } from "./HardwareRigSchema";

import { ArraySchema, Schema, type, } from "@colyseus/schema";

// Messages are only sent from client to server, although server might also invoke internally
export const PlayerSettingsUpdateMessageType = "playerSettingsUpdate";
export type PlayerSettingsUpdateMessage = {
    sessionId: string;
    cookieId?: string;

    isAdmin?: boolean;
    performerId?: number;

    headsetBatteryLevel?: number;
    leftControllerBatteryLevel?: number;
    rightControllerBatteryLevel?: number;

    fps?: number;
    updateTime?: number; // ms
    renderTime?: number; // ms
    errors?: string[];
}

export const PlayerTransformUpdateMessageType = "playerTransformUpdate";
export type PlayerTransformUpdateMessage = {
    sessionId: string; // What player should update
    cameraPosition?: [number, number, number];
    cameraRotation?: [number, number, number, number];
    leftHandPosition?: [number, number, number];
    leftHandRotation?: [number, number, number, number];
    rightHandPosition?: [number, number, number];
    rightHandRotation?: [number, number, number, number];
    // Bones are only updated by server
}

// Events
export const PlayerCalibrateMessageType = "playerCalibrate";
export type PlayerCalibrateMessage = {
    sessionId: string;
}

export class PlayerSchema extends Schema {
    @type("string") sessionId: string = "undefined";
    @type("string") cookieId: string = "undefined";

    @type("boolean") isAdmin: boolean = false;
    @type("number") performerId: number = -1;
    @type(AvatarSchema) avatar = new AvatarSchema();
    @type(HardwareRigSchema) hardwareRig = new HardwareRigSchema();

    // Can only updated by client
    @type("number") headsetBatteryLevel: number = 0;
    @type("number") leftControllerBatteryLevel: number = 0;
    @type("number") rightControllerBatteryLevel: number = 0;

    // How well running is going
    @type("number") fps: number = 0;
    @type("number") updateTime: number = 0; // ms
    @type("number") renderTime: number = 0; // ms
    @type(["string"]) errors = new ArraySchema<string>();

    // Everything below is in World Space
    @type(Vector3Schema) cameraPosition = new Vector3Schema();
    @type(QuaternionSchema) cameraRotation = new QuaternionSchema();

    @type(Vector3Schema) leftHandPosition = new Vector3Schema();
    @type(QuaternionSchema) leftHandRotation = new QuaternionSchema();
    // TODO: hand state

    @type(Vector3Schema) rightHandPosition = new Vector3Schema();
    @type(QuaternionSchema) rightHandRotation = new QuaternionSchema();
    // TODO: hand state

    @type([Vector3Schema]) bonePositions = new ArraySchema<Vector3Schema>();
    @type([QuaternionSchema]) boneRotations = new ArraySchema<QuaternionSchema>();

    updateFromSettingsMessage(message: PlayerSettingsUpdateMessage) {
        this.cookieId = message.cookieId ?? this.cookieId;

        this.isAdmin = message.isAdmin ?? this.isAdmin;
        this.performerId = message.performerId ?? this.performerId;

        this.headsetBatteryLevel = message.headsetBatteryLevel ?? this.headsetBatteryLevel;
        this.leftControllerBatteryLevel = message.leftControllerBatteryLevel ?? this.leftControllerBatteryLevel;
        this.rightControllerBatteryLevel = message.rightControllerBatteryLevel ?? this.rightControllerBatteryLevel;

        this.fps = message.fps ?? this.fps;
        this.updateTime = message.updateTime ?? this.updateTime;
        this.renderTime = message.renderTime ?? this.renderTime;
    }

    updateFromTransformMessage(message: PlayerTransformUpdateMessage) {
        if (message.cameraPosition)
            this.cameraPosition = new Vector3Schema(message.cameraPosition[0], message.cameraPosition[1], message.cameraPosition[2]);
        if (message.cameraRotation)
            this.cameraRotation = new QuaternionSchema(message.cameraRotation[0], message.cameraRotation[1], message.cameraRotation[2], message.cameraRotation[3]);

        if (message.leftHandPosition)
            this.leftHandPosition = new Vector3Schema(message.leftHandPosition[0], message.leftHandPosition[1], message.leftHandPosition[2]);
        if (message.leftHandRotation)
            this.leftHandRotation = new QuaternionSchema(message.leftHandRotation[0], message.leftHandRotation[1], message.leftHandRotation[2], message.leftHandRotation[3]);

        if (message.rightHandPosition)
            this.rightHandPosition = new Vector3Schema(message.rightHandPosition[0], message.rightHandPosition[1], message.rightHandPosition[2]);
        if (message.rightHandRotation)
            this.rightHandRotation = new QuaternionSchema(message.rightHandRotation[0], message.rightHandRotation[1], message.rightHandRotation[2], message.rightHandRotation[3]);
    }
}
