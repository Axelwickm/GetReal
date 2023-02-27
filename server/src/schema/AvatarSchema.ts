import { Vector3Schema, QuaternionSchema } from "./MathSchemas";
import { ArraySchema, Schema, type, } from "@colyseus/schema";


export class AvatarSchema extends Schema {
    // Allowed to be nothing
    @type("string") avatarType: string = "undefined";
    // If full body avatar
    @type("string") character: string = "undefined";

    // List of calibrated values (generated and set by client who is the owner of the avatar)
    @type([Vector3Schema]) bonePositions = new ArraySchema<Vector3Schema>();
    @type([QuaternionSchema]) boneRotations = new ArraySchema<QuaternionSchema>();

}
