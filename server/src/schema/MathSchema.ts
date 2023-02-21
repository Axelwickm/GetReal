import { Schema, type } from "@colyseus/schema";

export class Vector3Schema extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
}

export class QuaternionSchema extends Schema {
    @type("number") w: number = 1;
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 1;
}
