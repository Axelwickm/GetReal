import { Schema, type, } from "@colyseus/schema";

export class Vector3Schema extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

export class QuaternionSchema extends Schema {
    @type("number") w: number = 1;
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;

    constructor(w: number = 1, x: number = 0, y: number = 0, z: number = 0) {
        super();
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
