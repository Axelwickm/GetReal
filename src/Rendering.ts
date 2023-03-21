import {
    PostProcessRenderPipeline,
    PostProcessRenderEffect,
    ConvolutionPostProcess,
    Scene,
    WebXRDefaultExperience,
} from "@babylonjs/core";

export class Rendering {
    scene: Scene;
    xr: WebXRDefaultExperience;
    pipeline: PostProcessRenderPipeline;
    blackScreen: PostProcessRenderEffect;
    blackScreenActive: boolean = true;

    constructor(scene: Scene, xr: WebXRDefaultExperience) {
        this.scene = scene;
        this.xr = xr;

        this.pipeline = new PostProcessRenderPipeline(
            this.scene.getEngine(),
            "pipeline"
        );

        const blackScreen = new ConvolutionPostProcess(
            "convolution",
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1.0,
            null,
            undefined,
            this.scene.getEngine(),
            false
        );

        this.blackScreen = new PostProcessRenderEffect(
            this.scene.getEngine(),
            "blackScreen",
            () => [blackScreen],
            false
        );
        //this.pipeline.addEffect(this.blackScreen);
        this.setScreenBlackout(false); // TODO: Sometimes broken

        this.scene.postProcessRenderPipelineManager.addPipeline(this.pipeline);
    }

    attachCameras() {
        if (this.xr.baseExperience.camera.rigCameras.length !== 2)
            throw new Error(
                "Expected 2 cameras in rig, found " +
                    this.xr.baseExperience.camera.rigCameras.length
            );

        console.log("Attaching cameras to pipeline");
        for (const camera of this.xr.baseExperience.camera.rigCameras) {
            this.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(
                "pipeline",
                camera
            );
        }
        this.setScreenBlackout(false);
    }

    update() {}

    setScreenBlackout(value: boolean) {
        if (value === this.blackScreenActive) return;
        /*if (value) {
            console.log("Blackout");
            this.blackScreenActive = true;
            this.scene.postProcessRenderPipelineManager.enableEffectInPipeline(
                "pipeline",
                "blackScreen",
                null
            );
        } else {
            console.log("Unblackout");
            this.blackScreenActive = false;
            this.scene.postProcessRenderPipelineManager.disableEffectInPipeline(
                "pipeline",
                "blackScreen",
                null
            );
        }*/
    }
}
