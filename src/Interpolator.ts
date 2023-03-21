import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

export class Interpolator {
    private lastValues = new Map<string, number | Vector3 | Quaternion>();
    private velocities = new Map<string, number | Vector3 | Quaternion>();
    private mode: "number" | "Vector3" | "Quaternion";

    constructor(mode: "number" | "Vector3" | "Quaternion") {
        this.mode = mode;
    }

    update(deltaTime: number, values: Map<string, number>) {
        values.forEach((value, key) => {
            const lastValue = this.lastValues.get(key) as number | undefined;
            if (lastValue === undefined) {
                this.lastValues.set(key, value);
                return;
            }

            const velocity = this.velocities.get(key) as number | undefined;
            if (velocity === undefined) {
                this.velocities.set(key, 0);
                return;
            }

            const diff = value - lastValue;
            const newVelocity = velocity + diff * deltaTime;
            this.velocities.set(key, newVelocity);
        });
    }

    updateVector3(deltaTime: number, values: Map<string, Vector3>) {
        values.forEach((value, key) => {
            const lastValue = this.lastValues.get(key);
            if (lastValue === undefined) {
                this.lastValues.set(key, value.clone());
                return;
            }

            const velocity = this.velocities.get(key);
            if (velocity === undefined) {
                this.velocities.set(key, Vector3.Zero());
                return;
            }

            const diff = value.clone().subtract(lastValue as Vector3);
            /*const newVelocity = (velocity as Vector3).add(
                diff.scale(deltaTime * 0)
            );
            this.velocities.set(key, newVelocity);*/
        });
    }

    updateQuaternion(deltaTime: number, values: Map<string, Quaternion>) {
        values.forEach((value, key) => {
            const lastValue = this.lastValues.get(key);
            if (lastValue === undefined) {
                this.lastValues.set(key, value);
                return;
            }

            const velocity = this.velocities.get(key);
            if (velocity === undefined) {
                this.velocities.set(key, Quaternion.Identity());
                return;
            }

            const diff = value.subtract(lastValue as Quaternion);
            const newVelocity = (velocity as Quaternion).add(
                diff.scale(deltaTime)
            );
            this.velocities.set(key, newVelocity);
        });
    }

    predict(deltaTime: number): Map<string, number | Vector3 | Quaternion> {
        if (this.mode === "number") {
            const predictedValues = new Map<string, number>();
            this.velocities.forEach((velocity, key) => {
                const lastValue = this.lastValues.get(key) as
                    | number
                    | undefined;
                if (lastValue === undefined) {
                    throw new Error("Cannot find last value: " + key);
                }

                const predictedValue =
                    lastValue + (velocity as number) * deltaTime;
                predictedValues.set(key, predictedValue);
            });

            return predictedValues;
        } else if (this.mode === "Vector3") {
            console.log("Predict");
            const predictedValues = new Map<string, Vector3>();
            this.velocities.forEach((velocity, key) => {
                const lastValue = this.lastValues.get(key) as
                    | Vector3
                    | undefined;
                if (lastValue === undefined) {
                    throw new Error("Cannot find last value: " + key);
                }

                const predictedValue = lastValue; /*(lastValue as Vector3).add(
                    (velocity as Vector3).scale(deltaTime)
                );*/
                predictedValues.set(key, predictedValue);
            });

            return predictedValues;
        } else if (this.mode === "Quaternion") {
            const predictedValues = new Map<string, Quaternion>();
            this.velocities.forEach((velocity, key) => {
                const lastValue = this.lastValues.get(key) as
                    | Quaternion
                    | undefined;
                if (lastValue === undefined) {
                    throw new Error("Cannot find last value: " + key);
                }

                const predictedValue = (lastValue as Quaternion).add(
                    (velocity as Quaternion).scale(deltaTime)
                );
                predictedValues.set(key, predictedValue);
            });

            return predictedValues;
        }

        throw new Error("Unknown mode: " + this.mode);
    }
}
