import React, { useState } from "react";
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { ToolButton } from "../../components/ToolButton";
import { trackEvent } from "../../analytics";
import { useI18n } from "../../i18n";
import { getFrame } from "../../utils";
import { FileId, NonDeletedExcalidrawElement } from "../../element/types";
import { isInitializedImageElement } from "../../element/typeChecks";
import { AppState, BinaryFileData, BinaryFiles, ExcalidrawImperativeAPI } from "../../types";
import { serializeAsJSON } from "../../data/json";

const exportToGoogleDrive = async (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
) => {
    const payload = new TextEncoder().encode(
        serializeAsJSON(elements, appState, files, "database"),
    );
    console.log(payload);

    const filesMap = new Map<FileId, BinaryFileData>();
    for (const element of elements) {
        if (isInitializedImageElement(element) && files[element.fileId]) {
            filesMap.set(element.fileId, files[element.fileId]);
        }
    }
    console.log(filesMap)
};

export const GoogleDriveAuthComponent: React.FC<{
    excalidrawAPI?: ExcalidrawImperativeAPI;
    appState: Partial<AppState>;
    onError: (error: Error) => void;
}> = ({ excalidrawAPI, appState, onError }) => {
    const [token, setToken] = useState<CredentialResponse | null>(null)
    const { t } = useI18n();

    return (
        token ?
            <ToolButton
                className="Card-button"
                type="button"
                title={t("exportDialog.googledrive_button")}
                aria-label={t("exportDialog.googledrive_button")}
                showAriaLabel={true}
                onClick={async () => {
                    try {
                        trackEvent("export", "gdrive", `ui (${getFrame()})`);
                        await exportToGoogleDrive(excalidrawAPI?.getSceneElements()!!, appState, excalidrawAPI?.getFiles()!!);
                    } catch (error: any) {
                        console.error(error);
                        if (error.name !== "AbortError") {
                            onError(new Error(t("exportDialog.googledrive_exportError")));
                        }
                    }
                }}
            /> :
            <GoogleLogin
                onSuccess={credentialResponse => {
                    setToken(credentialResponse)
                }}
                onError={() => {
                    onError(new Error("Login failed"))
                }}
            />
    )
}