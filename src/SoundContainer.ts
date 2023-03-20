import { TransformNode } from "@babylonjs/core";

export class SoundContainer {
    public source: AudioBufferSourceNode;
    public audioContext: AudioContext;

    public gain: GainNode;

    public panner?: PannerNode;
    public pannerObject?: TransformNode;
    private lastPannerUpdate: number = 0;

    private _spatial: boolean = false;

    constructor(buffer: AudioBuffer, audioContext: AudioContext) {
        this.audioContext = audioContext;

        this.source = audioContext.createBufferSource();
        this.source.buffer = buffer;
        this.gain = audioContext.createGain();

        this.source.connect(this.gain);
        this.gain.connect(audioContext.destination);
    }

    play(when: number, offset: number) {
        this.source.start(when, offset);
    }

    destroy() {
        this.source.disconnect();
        this.panner?.disconnect();
    }

    setSpatial(value: boolean, object?: TransformNode) {
        if (value) {
            if (!this.panner) {
                this.panner = this.audioContext.createPanner();
                this.panner.panningModel = "HRTF";
                this.panner.distanceModel = "inverse";
                this.panner.refDistance = 1;
                this.panner.maxDistance = 10;
                this.panner.rolloffFactor = 1;
                this.panner.coneInnerAngle = 360;
                this.panner.coneOuterAngle = 0;
                this.panner.coneOuterGain = 0;
            }
            if (!object)
                throw new Error(
                    "Spatial sound requires a node to be passed in"
                );
            this.pannerObject = object;
            this.gain.disconnect();
            this.gain.connect(this.panner);
            this.panner.connect(this.audioContext.destination);
        } else {
            this.panner?.disconnect();
            this.gain.disconnect();
            this.gain.connect(this.audioContext.destination);
        }
    }

    getSpatial() {
        return this._spatial;
    }

    update() {
        if (this.panner && this.pannerObject) {
            // Only update the panner position every 100ms
            if (Date.now() - this.lastPannerUpdate > 100) {
                this.lastPannerUpdate = Date.now();
                const position = this.pannerObject.absolutePosition;
                this.panner.positionX.value = position.x;
                this.panner.positionY.value = position.y;
                this.panner.positionZ.value = position.z;
                console.log("Updating panner position");
            }
        }
    }
}
