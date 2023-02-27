import { Vector3Schema, QuaternionSchema } from "./MathSchemas";
import { ArraySchema, Schema, type, } from "@colyseus/schema";

export const AvatarUpdateMessageType = "avatarUpdate";
export type AvatarUpdateMessage = {
    sessionId: string; // What player should update
    avatarType?: string;
    character?: string;
    bonePositions?: [number, number, number][];
    boneRotations?: [number, number, number, number][];
}


export class AvatarSchema extends Schema {
    // Allowed to be nothing
    @type("string") avatarType: string = "undefined";
    // If full body avatar
    @type("string") character: string = "undefined";

    // List of calibrated values (generated and set by client who is the owner of the avatar)
    @type([Vector3Schema]) bonePositions = new ArraySchema<Vector3Schema>();
    @type([QuaternionSchema]) boneRotations = new ArraySchema<QuaternionSchema>();

    updateFromMessage(message: AvatarUpdateMessage) {
        this.avatarType = message.avatarType ?? this.avatarType;
        this.character = message.character ?? this.character;

        if (message.bonePositions) {
            this.bonePositions = new ArraySchema<Vector3Schema>();
            for (const position of message.bonePositions) {
                this.bonePositions.push(new Vector3Schema(position[0], position[1], position[2]));
            }
        }

        if (message.boneRotations) {
            this.boneRotations = new ArraySchema<QuaternionSchema>();
            for (const rotation of message.boneRotations) {
                this.boneRotations.push(new QuaternionSchema(rotation[0], rotation[1], rotation[2], rotation[3]));
            }
        }

    }
}
