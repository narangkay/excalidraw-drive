import React from "react";
import { Card } from "../../components/Card";
import { ToolButton } from "../../components/ToolButton";
import { serializeAsJSON } from "../../data/json";
import { saveFilesToFirebase } from "../data/firebase";
import { compressData } from "../../data/encode";
import { FileId, NonDeletedExcalidrawElement } from "../../element/types";
import { AppState, BinaryFileData, BinaryFiles } from "../../types";
import { useI18n } from "../../i18n";
import { excalidrawPlusIcon } from "./icons";
import { generateEncryptionKey } from "../../data/encryption";
import { isInitializedImageElement } from "../../element/typeChecks";
import { FILE_UPLOAD_MAX_BYTES } from "../app_constants";
import { encodeFilesForUpload } from "../data/FileManager";
import { trackEvent } from "../../analytics";
import { getFrame } from "../../utils";

const BACKEND_V2_POST = process.env.REACT_APP_BACKEND_V2_POST_URL;

const exportToGoogleDrive = async (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
) => {
  const encryptionKey = (await generateEncryptionKey())!;

  const payload = await compressData(
    new TextEncoder().encode(
      serializeAsJSON(elements, appState, files, "database"),
    ),
    { encryptionKey },
  );

  const response = await fetch(BACKEND_V2_POST, {
    method: "POST",
    body: payload.buffer,
  });
  const json = await response.json();
  if (!json.id) {
    throw Error(`No id from backend ${json.error.message}`);
  }
  const url = new URL(window.location.href);
  // We need to store the key (and less importantly the id) as hash instead
  // of queryParam in order to never send it to the server
  url.hash = `json=${json.id},${encryptionKey}`;

  const filesMap = new Map<FileId, BinaryFileData>();
  for (const element of elements) {
    if (isInitializedImageElement(element) && files[element.fileId]) {
      filesMap.set(element.fileId, files[element.fileId]);
    }
  }

  if (filesMap.size) {
    const filesToUpload = await encodeFilesForUpload({
      files: filesMap,
      encryptionKey,
      maxBytes: FILE_UPLOAD_MAX_BYTES,
    });

    await saveFilesToFirebase({
      prefix: `/files/shareLinks/${json.id}`,
      files: filesToUpload,
    });
  }

  window.open(url.toString());
};

export const ExportToGoogleDrive: React.FC<{
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  onError: (error: Error) => void;
}> = ({ elements, appState, files, onError }) => {
  const { t } = useI18n();
  return (
    <Card color="primary">
      <div className="Card-icon">{excalidrawPlusIcon}</div>
      <h2>Google Drive</h2>
      <div className="Card-details">
        {t("exportDialog.googledrive_description")}
      </div>
      <ToolButton
        className="Card-button"
        type="button"
        title={t("exportDialog.googledrive_button")}
        aria-label={t("exportDialog.googledrive_button")}
        showAriaLabel={true}
        onClick={async () => {
          try {
            trackEvent("export", "gdrive", `ui (${getFrame()})`);
            await exportToGoogleDrive(elements, appState, files);
          } catch (error: any) {
            console.error(error);
            if (error.name !== "AbortError") {
              onError(new Error(t("exportDialog.googledrive_exportError")));
            }
          }
        }}
      />
    </Card>
  );
};
