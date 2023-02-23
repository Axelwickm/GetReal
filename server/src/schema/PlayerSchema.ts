import { Vector3Schema, QuaternionSchema } from "./MathSchemas";

import { ArraySchema, Schema, type, } from "@colyseus/schema";

// Messages are only sent from client to server, although sometime the server invokes them internally.
/*export const PlayerTransformUpdateMessageType = "playerTransformUpdate";
export type PlayerTransformUpdateMessage = {
    sessionId: string; // What player should update
    cameraPosition?: [number, number, number];
    cameraRotation?: [number, number, number, number];
    leftHandPosition?: [number, number, number];
    leftHandRotation?: [number, number, number, number];
    rightHandPosition?: [number, number, number];
    rightHandRotation?: [number, number, number, number];
    // Bones are only updated by server
}*/

export class PlayerSchema extends Schema {
    @type("string") name: string = "unknown";
    @type("string") avatarType: string = "unknown";
    @type("number") performerId: number = -1;

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


    /*updateFromTransformMessage(message: PlayerTransformUpdateMessage) {
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
    }*/
}
