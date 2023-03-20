import { GetRealSchema } from "./schema/GetRealSchema";
import {
    PlayerSchema,
    PlayerSettingsUpdateMessage,
    PlayerSettingsUpdateMessageType,
    PlayerCalibrateMessageType,
    PlayerCalibrateMessage,
} from "./schema/PlayerSchema";
import {
    RoomSettingsUpdateMessage,
    RoomSettingsUpdateMessageType,
    SoundMode,
    SpatialSoundMode,
    AudienceTeleportationMode,
    NonAdminEnterVRImmediatelyMode,
} from "./schema/RoomSettingsSchema";

import { Room } from "colyseus.js";
import { SimpleAvatar } from "./avatars/SimpleAvatar";
import { FullBodyAvatar } from "./avatars/FullBodyAvatar";
import {
    AvatarSchema,
    AvatarUpdateMessage,
    AvatarUpdateMessageType,
} from "./schema/AvatarSchema";
import {
    HardwareRigSchema,
    HardwareRigUpdateMessage,
    HardwareRigUpdateMessageType,
} from "./schema/HardwareRigSchema";
import { XRRig } from "./hardware_rigs/XRRig";
import { XSensXRRig } from "./hardware_rigs/XSensXRRig";
import { Game } from "./Game";

export class AdminMenu {
    private adminMenuElement: HTMLDivElement;
    private playersElement: HTMLDivElement;

    game: Game;
    room?: Room<GetRealSchema>;
    players: Map<string, PlayerSchema> = new Map();
    enabled: boolean = false;
    elements: Map<string, HTMLDivElement> = new Map();
    playerElements: Map<string, HTMLDivElement> = new Map();

    startTime: number = Date.now();
    environmentStartTime: number = Date.now();

    constructor(game: Game) {
        this.game = game;

        this.adminMenuElement = document.getElementById(
            "adminMenu"
        ) as HTMLDivElement;
        if (!this.adminMenuElement) {
            throw new Error("Could not find admin menu element");
        }

        this.playersElement = this.adminMenuElement.querySelector(
            "#players"
        ) as HTMLDivElement;
        if (!this.playersElement) {
            throw new Error("Could not find players element");
        }

        // Find windowControl and add on click handler
        const windowControl = this.adminMenuElement.querySelector(
            "#windowControl"
        ) as HTMLDivElement;
        if (!windowControl) {
            throw new Error("Could not find windowControl element");
        }
        windowControl.addEventListener("click", () => {
            this.adminMenuElement.classList.toggle("minimized");
        });

        const toMMSS = (seconds: number) => {
            const minutes = Math.floor(seconds / 60);
            seconds = Math.floor(seconds % 60);
            return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        };

        // eveny second, update the times
        setInterval(() => {
            if (this.enabled) {
                const now = Date.now();
                const e = this.getElement("#totalTime");
                e.innerText = toMMSS((now - this.startTime) / 1000);
                const e2 = this.getElement("#environmentTime");
                e2.innerText = toMMSS((now - this.environmentStartTime) / 1000);
            }
        }, 1000);

        this.hide();
    }

    getElement(selector: string) {
        let element = this.elements.get(selector);
        if (!element) {
            element = this.adminMenuElement.querySelector(
                selector
            ) as HTMLDivElement;
            if (!element) {
                throw new Error(`Could not find element ${selector}`);
            }
            this.elements.set(selector, element);
        }
        return element;
    }

    getPlayerElement(playerId: string, selector: string) {
        let element = this.playerElements.get(playerId + selector);
        if (!element) {
            const playerElement = this.adminMenuElement.querySelector(
                "#player_" + playerId
            ) as HTMLDivElement;
            if (!playerElement) {
                throw new Error(`Could not find player element ${playerId}`);
            }
            element = playerElement.querySelector(selector) as HTMLDivElement;
            if (!element) {
                throw new Error(`Could not find element ${selector}`);
            }
            this.playerElements.set(playerId + selector, element);
        }
        return element;
    }

    show() {
        this.adminMenuElement.style.display = "block";
        this.enabled = true;
        for (const [_playerId, player] of this.players) {
            this.updatePlayer(player);
        }
    }

    hide() {
        this.adminMenuElement.style.display = "none";
        this.enabled = false;
    }

    updatePlayer(player: PlayerSchema) {
        this.updatePlayerElement(player);
        this.updateAvatarElement(player.sessionId, player.avatar);
        this.updateHardwareRigElement(player.sessionId, player.hardwareRig);
    }

    setRoom(room: Room<GetRealSchema>) {
        if (this.room) {
            throw new Error("Room already set");
        }
        this.room = room;

        this.room.state.room.listen("soundMode", (soundMode: string) => {
            this.setSoundMode(soundMode);
        });

        this.room.state.room.listen("spatialSoundMode", (soundMode: string) => {
            this.setSpatialSoundMode(soundMode);
        });

        this.room.state.room.listen(
            "audienceTeleportationMode",
            (mode: string) => {
                this.setAudienceTeleportationMode(mode);
            }
        );

        this.room.state.room.listen(
            "nonAdminEnterVRImmediatelyMode",
            (mode: string) => {
                this.setNonAdminEnterVRImmediatelyMode(mode);
            }
        );

        this.setDebugMode(this.game.getDebugMode());

        this.room.state.room.listen("environment", (environment: string) => {
            this.setScene(environment);
        });
    }

    registerPlayer(playerState: PlayerSchema, isMe: boolean) {
        this.players.set(playerState.sessionId, playerState);
        let playerElement = this.playersElement.querySelector(
            ".mainPlayer"
        ) as HTMLDivElement;
        if (!playerElement)
            throw new Error("Could not find main player element");

        if (!isMe) {
            // Look through all offline players, and see if we can find one with the same cookieId
            let foundExisting = false;
            const offlinePlayerElements =
                this.playersElement.querySelectorAll(".offline");
            for (let i = 0; i < offlinePlayerElements.length; i++) {
                const offlinePlayerElement = offlinePlayerElements[
                    i
                ] as HTMLDivElement;
                const cookieIdElement = offlinePlayerElement.querySelector(
                    ".cookieId"
                ) as HTMLInputElement;
                if (cookieIdElement.innerHTML === playerState.cookieId) {
                    playerElement = offlinePlayerElement;
                    foundExisting = true;
                    const sessionIdElement = playerElement.querySelector(
                        ".sessionId"
                    ) as HTMLInputElement;
                    const oldSessionId = sessionIdElement.innerHTML;
                    this.setOffline(oldSessionId, false);
                    this.players.delete(oldSessionId);
                    break;
                }
            }

            if (!foundExisting) {
                // Make copy of first player element
                playerElement = playerElement.cloneNode(true) as HTMLDivElement;
                playerElement.className = "";
                this.playersElement.appendChild(playerElement);
            }
        }

        playerElement.id = "player_" + playerState.sessionId;

        // Show menu if it's me and I am admin
        playerState.listen("isAdmin", (isAdmin: boolean) => {
            if (isMe && isAdmin) {
                this.show();
            } else if (isMe && !isAdmin) {
                this.hide();
            }
        });

        // On isAdmin click, send message to server
        const isAdminElement = playerElement.querySelector(
            ".isAdmin"
        ) as HTMLInputElement;
        isAdminElement.addEventListener("click", () => {
            if (!isMe) {
                this.msgPlayerSettings({
                    sessionId: playerState.sessionId,
                    isAdmin: !playerState.isAdmin,
                });
            }
        });

        // Performer id
        const performerIdElement = playerElement.querySelector(
            ".performerId"
        ) as HTMLInputElement;
        performerIdElement.addEventListener("click", () => {
            let id = ((parseInt(performerIdElement.innerHTML) + 1 + 1) % 2) - 1;
            this.msgPlayerSettings({
                sessionId: playerState.sessionId,
                performerId: id,
            });
        });

        // Errors
        const errorsElement = playerElement.querySelector(
            ".errors"
        ) as HTMLInputElement;
        errorsElement.addEventListener("click", () => {
            // Log to console
            console.error(
                "Errors for player " +
                    playerState.name +
                    " " +
                    playerState.sessionId +
                    " (" +
                    playerState.errors.length +
                    ")"
            );
            for (const error of playerState.errors) {
                console.error(error);
            }
        });

        // Avatar changes
        const noAvatar = playerElement.querySelector(
            ".noAvatar"
        ) as HTMLInputElement;
        const simpleAvatar = playerElement.querySelector(
            ".simpleAvatar"
        ) as HTMLInputElement;
        const fullBodyAvatar = playerElement.querySelector(
            ".fullBodyAvatar"
        ) as HTMLInputElement;

        noAvatar.addEventListener("click", () => {
            this.msgAvatar({
                sessionId: playerState.sessionId,
                avatarType: "undefined",
            });
        });

        simpleAvatar.addEventListener("click", () => {
            this.msgAvatar({
                sessionId: playerState.sessionId,
                avatarType: SimpleAvatar.getAvatarType(),
                character: "Nao"
            });
        });

        fullBodyAvatar.addEventListener("click", () => {
            this.msgAvatar({
                sessionId: playerState.sessionId,
                avatarType: FullBodyAvatar.getAvatarType(),
                character: "BlueMonsterGirl"
            });
        });

        const CalibrateElement = playerElement.querySelector(
            ".calibrate"
        ) as HTMLInputElement;
        CalibrateElement.addEventListener("click", () => {
            this.msgCalibrate({
                sessionId: playerState.sessionId,
            });
        });

        // Hardware rig changes
        const XRRigElement = playerElement.querySelector(
            ".XR"
        ) as HTMLInputElement;
        const XSensXRElement = playerElement.querySelector(
            ".XSensXR"
        ) as HTMLInputElement;

        XRRigElement.addEventListener("click", () => {
            this.msgHardwareRig({
                sessionId: playerState.sessionId,
                rigType: XRRig.getRigType(),
            });
        });

        XSensXRElement.addEventListener("click", () => {
            this.msgHardwareRig({
                sessionId: playerState.sessionId,
                rigType: XSensXRRig.getRigType(),
            });
        });

        // Name change
        const nameElement = playerElement.querySelector(
            ".name"
        ) as HTMLInputElement;
        nameElement.addEventListener("change", () => {
            this.msgPlayerSettings({
                sessionId: playerState.sessionId,
                name: nameElement.value,
            });
        });
        playerState.listen("name", (name: string) => {
            nameElement.value = name;
        });

        const DeleteElement = playerElement.querySelector(
            ".delete"
        ) as HTMLInputElement;
        DeleteElement.addEventListener("click", () => {
            // Make sure playerElement has class offline
            if (playerElement.classList.contains("offline")) {
                this.unregisterPlayer(playerState);
            }
        });

        this.updatePlayer(playerState);

        // On player update, update the player element
        this.game.getPlayer(playerState.sessionId)?.addOnChangeCallback(() => {
            if (this.enabled) this.updatePlayerElement(playerState);
        });

        playerState.avatar.listen("avatarType", () => {
            if (this.enabled)
                this.updateAvatarElement(
                    playerState.sessionId,
                    playerState.avatar
                );
        });

        playerState.hardwareRig.listen("rigType", () => {
            if (this.enabled)
                this.updateHardwareRigElement(
                    playerState.sessionId,
                    playerState.hardwareRig
                );
        });
    }

    unregisterPlayer(player: PlayerSchema) {
        this.players.delete(player.sessionId);
        const playerElement = this.playersElement.querySelector(
            "#player_" + player.sessionId
        ) as HTMLDivElement;
        this.playersElement.removeChild(playerElement);
    }

    setOffline(sessionId: string, value: boolean) {
        const playerElement = this.playersElement.querySelector(
            "#player_" + sessionId
        ) as HTMLDivElement;
        if (value) {
            playerElement.classList.add("offline");
        } else {
            playerElement.classList.remove("offline");
        }
        const DeleteElement = this.getPlayerElement(
            sessionId,
            ".delete"
        ) as HTMLInputElement;
        DeleteElement.disabled = !value;
    }

    msgPlayerSettings(msg: PlayerSettingsUpdateMessage) {
        this.room?.send(PlayerSettingsUpdateMessageType, msg);
    }

    msgRoomSettings(msg: RoomSettingsUpdateMessage) {
        this.room?.send(RoomSettingsUpdateMessageType, msg);
    }

    msgAvatar(msg: AvatarUpdateMessage) {
        this.room?.send(AvatarUpdateMessageType, msg);
    }

    msgHardwareRig(msg: HardwareRigUpdateMessage) {
        this.room?.send(HardwareRigUpdateMessageType, msg);
    }

    msgCalibrate(msg: PlayerCalibrateMessage) {
        this.room?.send(PlayerCalibrateMessageType, msg);
    }

    activateElement(element: HTMLElement) {
        const parent = element.parentElement;
        if (!parent) {
            throw new Error("Could not find parent element");
        }
        // Disable all parent's children
        for (let i = 0; i < parent.children.length; i++) {
            const child = parent.children[i] as HTMLElement;
            child.classList.remove("active");
        }
        // Enable this element
        element.classList.add("active");
    }

    setSoundMode(soundMode: string) {
        // allSound, performerSound, audienceSound, noneSound
        const allSoundModeElement = this.getElement("#allSound");
        const performerSoundModeElement = this.getElement("#performersSound");
        const audienceSoundModeElement = this.getElement("#audienceSound");
        const noneSoundModeElement = this.getElement("#noneSound");

        if (soundMode === "all") {
            this.activateElement(allSoundModeElement);
        } else if (soundMode === "performers") {
            this.activateElement(performerSoundModeElement);
        } else if (soundMode === "audience") {
            this.activateElement(audienceSoundModeElement);
        } else if (soundMode === "none") {
            this.activateElement(noneSoundModeElement);
        } else {
            throw new Error("Unknown sound mode: " + soundMode);
        }

        // Add on click handlers if not already added
        if (!allSoundModeElement.onclick) {
            allSoundModeElement.onclick = () => {
                this.msgRoomSettings({ soundMode: SoundMode.All });
            };
        }

        if (!performerSoundModeElement.onclick) {
            performerSoundModeElement.onclick = () => {
                this.msgRoomSettings({ soundMode: SoundMode.Performers });
            };
        }

        if (!audienceSoundModeElement.onclick) {
            audienceSoundModeElement.onclick = () => {
                this.msgRoomSettings({ soundMode: SoundMode.Audience });
            };
        }

        if (!noneSoundModeElement.onclick) {
            noneSoundModeElement.onclick = () => {
                this.msgRoomSettings({ soundMode: SoundMode.None });
            };
        }
    }

    setSpatialSoundMode(soundMode: string) {
        // spatialSound, globalSound
        const spatialSoundModeElement = this.getElement("#spatialSound");
        const globalSoundModeElement = this.getElement("#globalSound");

        if (soundMode === "spatial") {
            this.activateElement(spatialSoundModeElement);
        } else if (soundMode === "global") {
            this.activateElement(globalSoundModeElement);
        } else {
            throw new Error("Unknown sound mode: " + soundMode);
        }

        if (!spatialSoundModeElement.onclick) {
            spatialSoundModeElement.onclick = () => {
                this.msgRoomSettings({
                    spatialSoundMode: SpatialSoundMode.Spatial,
                });
            };
        }

        if (!globalSoundModeElement.onclick) {
            globalSoundModeElement.onclick = () => {
                this.msgRoomSettings({
                    spatialSoundMode: SpatialSoundMode.Global,
                });
            };
        }
    }

    setAudienceTeleportationMode(mode: string) {
        // audienceTeleportation, audienceNoTeleportation
        const audienceTeleportationModeElement = this.getElement(
            "#audienceTeleportationOn"
        );
        const audienceNoTeleportationModeElement = this.getElement(
            "#audienceTeleportationOff"
        );

        if (mode === "on") {
            this.activateElement(audienceTeleportationModeElement);
        } else if (mode === "off") {
            this.activateElement(audienceNoTeleportationModeElement);
        } else {
            throw new Error("Unknown audience teleportation mode: " + mode);
        }

        if (!audienceTeleportationModeElement.onclick) {
            audienceTeleportationModeElement.onclick = () => {
                this.msgRoomSettings({
                    audienceTeleportationMode: AudienceTeleportationMode.On,
                });
            };
        }

        if (!audienceNoTeleportationModeElement.onclick) {
            audienceNoTeleportationModeElement.onclick = () => {
                this.msgRoomSettings({
                    audienceTeleportationMode: AudienceTeleportationMode.Off,
                });
            };
        }
    }

    setNonAdminEnterVRImmediatelyMode(mode: string) {
        // nonAdminEnterVROn, nonAdminEnterVROff
        const nonAdminEnterVROnModeElement =
            this.getElement("#nonAdminEnterVROn");
        const nonAdminEnterVROffModeElement = this.getElement(
            "#nonAdminEnterVROff"
        );

        if (mode === "on") {
            this.activateElement(nonAdminEnterVROnModeElement);
        } else if (mode === "off") {
            this.activateElement(nonAdminEnterVROffModeElement);
        } else {
            throw new Error("Unknown nonAdminEnterVRImmediately mode: " + mode);
        }

        if (!nonAdminEnterVROnModeElement.onclick) {
            nonAdminEnterVROnModeElement.onclick = () => {
                this.msgRoomSettings({
                    nonAdminEnterVRImmediatelyMode:
                        NonAdminEnterVRImmediatelyMode.On,
                });
            };
        }

        if (!nonAdminEnterVROffModeElement.onclick) {
            nonAdminEnterVROffModeElement.onclick = () => {
                this.msgRoomSettings({
                    nonAdminEnterVRImmediatelyMode:
                        NonAdminEnterVRImmediatelyMode.Off,
                });
            };
        }
    }

    setDebugMode(on: boolean) {
        const debugModeElement = this.getElement("#debugModeOn");
        const debugModeOffElement = this.getElement("#debugModeOff");

        if (on) {
            this.activateElement(debugModeElement);
        } else {
            this.activateElement(debugModeOffElement);
        }

        if (!debugModeElement.onclick) {
            debugModeElement.onclick = () => {
                this.game.setDebugMode(true);
                this.activateElement(debugModeElement);
            };
        }

        if (!debugModeOffElement.onclick) {
            debugModeOffElement.onclick = () => {
                this.game.setDebugMode(false);
                this.activateElement(debugModeOffElement);
            };
        }
    }

    setScene(environment: string) {
        const lobbys = this.getElement("#environmentLobbys");
        const warehouse = this.getElement("#environmentWarehouse");
        const mountainsDance = this.getElement("#environmentMountainsDance");

        if (environment === "Lobbys") {
            this.activateElement(lobbys);
        } else if (environment === "Warehouse") {
            this.activateElement(warehouse);
        } else if (environment === "MountainsDance") {
            this.activateElement(mountainsDance);
        } else {
            throw new Error("Unhandled environment: " + environment);
        }

        if (!lobbys.onclick) {
            lobbys.onclick = () => {
                this.msgRoomSettings({ environment: "Lobbys" });
            };
        }

        if (!warehouse.onclick) {
            warehouse.onclick = () => {
                this.msgRoomSettings({ environment: "Warehouse" });
            };
        }

        if (!mountainsDance.onclick) {
            mountainsDance.onclick = () => {
                this.msgRoomSettings({ environment: "MountainsDance" });
            };
        }

        this.environmentStartTime = Date.now();
        const currentScene = this.getElement("#currentScene");
        currentScene.innerHTML = environment;
    }

    updatePlayerElement(player: PlayerSchema) {
        const sid = player.sessionId;
        const sessionIdElement = this.getPlayerElement(sid, ".sessionId");
        sessionIdElement.innerHTML = player.sessionId;

        const cookieIdElement = this.getPlayerElement(sid, ".cookieId");
        cookieIdElement.innerHTML = player.cookieId;

        const performerIdElement = this.getPlayerElement(sid, ".performerId");
        performerIdElement.innerHTML = String(player.performerId);

        const adminElement = this.getPlayerElement(sid, ".isAdmin");
        adminElement.innerHTML = player.isAdmin ? "admin" : "regular";

        if (player.isAdmin) {
            adminElement.classList.add("admin");
        } else {
            adminElement.classList.remove("admin");
        }

        const headsetBatteryLevelElement = this.getPlayerElement(
            sid,
            ".headsetBatteryLevel"
        );
        headsetBatteryLevelElement.innerHTML = String(
            player.headsetBatteryLevel
        );

        const errorsElement = this.getPlayerElement(sid, ".errors");
        errorsElement.innerHTML = String(player.errors.length);
        if (player.errors.length > 0 && !errorsElement.classList.contains("hasErrors")) {
            errorsElement.classList.add("hasErrors");
        } else if (player.errors.length === 0 && errorsElement.classList.contains("hasErrors")) {
            errorsElement.classList.remove("hasErrors");
        }

        const fpsElement = this.getPlayerElement(sid, ".fps");
        fpsElement.innerHTML = String(player.fps);

        const updateTimeElement = this.getPlayerElement(
            sid,
            ".updateTime"
        ) as HTMLInputElement;
        updateTimeElement.innerHTML = String(player.updateTime);

        const renderTimeElement = this.getPlayerElement(sid, ".renderTime");
        renderTimeElement.innerHTML = String(player.renderTime);

        const loadedElement = this.getPlayerElement(sid, ".loaded");
        loadedElement.innerHTML = player.loaded ? "Y" : "N";
        if (player.loaded) loadedElement.classList.remove("notLoaded");
    }

    updateAvatarElement(sessionId: string, avatar: AvatarSchema) {
        const noAvatar = this.getPlayerElement(sessionId, ".noAvatar");
        const simpleAvatar = this.getPlayerElement(sessionId, ".simpleAvatar");
        const fullBodyAvatar = this.getPlayerElement(
            sessionId,
            ".fullBodyAvatar"
        );

        if (avatar.avatarType === "undefined") {
            this.activateElement(noAvatar);
        } else if (avatar.avatarType === SimpleAvatar.getAvatarType()) {
            this.activateElement(simpleAvatar);
        } else if (avatar.avatarType === FullBodyAvatar.getAvatarType()) {
            this.activateElement(fullBodyAvatar);
        } else {
            throw new Error("Unknown avatar: " + avatar.avatarType);
        }
    }

    updateHardwareRigElement(
        sessionId: string,
        hardwareRig: HardwareRigSchema
    ) {
        const xr = this.getPlayerElement(sessionId, ".XR");
        const xsensXr = this.getPlayerElement(sessionId, ".XSensXR");

        if (hardwareRig.rigType === XRRig.getRigType()) {
            this.activateElement(xr);
        } else if (hardwareRig.rigType === XSensXRRig.getRigType()) {
            this.activateElement(xsensXr);
        }
    }
}
