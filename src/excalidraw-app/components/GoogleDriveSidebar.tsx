import {
  Sidebar,
  serializeAsJSON,
  useI18n,
} from "../../packages/excalidraw/index";
import { useGoogleLogin } from "@react-oauth/google";
import { atom, useAtom } from "jotai";
import { appJotaiStore } from "../app-jotai";
import { ToolButton } from "../../components/ToolButton";
import { hasGrantedAllScopesGoogle, TokenResponse } from "@react-oauth/google";
import { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "../../types";
import { NonDeletedExcalidrawElement } from "../../element/types";
import { useEffect, useState } from "react";
import Spinner from "../../components/Spinner";

const tokenResponseAtom = atom<TokenResponse | null>(null);

const DRIVE_EXPORT_SIDEBAR_NAME = "drive-export-sidebar";
const DRIVE_IMPORT_SIDEBAR_NAME = "drive-import-sidebar";

export type SidebarType = "import" | "export";

type DriveAction = (
  fileId: string,
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  token: string,
) => Promise<void>;

type DriveFile = {
  kind: "drive#file";
  mimeType: "text/plain" | "application/octet-stream";
  id: string;
  name: string;
};

const exportToGoogleDrive: DriveAction = (
  fileId: string,
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  token: string,
) => {
  const payload = serializeAsJSON(elements, appState, files, "local");
  return fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}`, {
    method: "PATCH",
    headers: new Headers({
      "content-type": "text/plain",
      Authorization: `Bearer ${token}`,
    }),
    body: payload,
  })
    .then((updateResponse) => updateResponse.json())
    .then((updateJson) => console.log(updateJson));
};

const importFrtomGoogleDrive: DriveAction = (
  fileId: string,
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  token: string,
) => {
  return Promise.all([]).then((_) => {});
};

export const SIDEBAR_CONFIG: Record<
  SidebarType,
  {
    name: string;
    action: string;
    buttonLabel: string;
    act: DriveAction;
  }
> = {
  export: {
    name: DRIVE_EXPORT_SIDEBAR_NAME,
    action: "Export",
    buttonLabel: "exportDialog.googledrive_button",
    act: exportToGoogleDrive,
  },
  import: {
    name: DRIVE_IMPORT_SIDEBAR_NAME,
    action: "Import",
    buttonLabel: "importDialog.googledrive_button",
    act: importFrtomGoogleDrive,
  },
};

export const GoogleDriveSidebar: React.FC<{
  excalidrawAPI?: ExcalidrawImperativeAPI;
  sidebarType: SidebarType;
  onError: (error: Error) => void;
}> = ({ excalidrawAPI, sidebarType, onError }) => {
  const [tokenResponse] = useAtom(tokenResponseAtom);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      appJotaiStore.set(tokenResponseAtom, tokenResponse);
      setLoading(false);
    },
    onError: (error) => {
      onError(new Error(error.error_description));
      setLoading(false);
    },
    flow: "implicit",
    scope:
      "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.install",
  });

  useEffect(() => {
    if (!tokenResponse) {
      return;
    }
    if (
      !hasGrantedAllScopesGoogle(
        tokenResponse,
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.install",
      )
    ) {
      return onError(new Error("missing scopes."));
    }
    fetch("https://www.googleapis.com/drive/v3/files", {
      method: "GET",
      headers: new Headers({
        "content-type": "text/plain",
        Authorization: `Bearer ${tokenResponse?.access_token}`,
      }),
    })
      .then((listResponse) => listResponse.json())
      .then((listJson) => (listJson as { files: DriveFile[] }).files)
      .then((files) => setDriveFiles(files));
  }, [tokenResponse, onError]);

  const { t } = useI18n();
  const config = SIDEBAR_CONFIG[sidebarType];
  return (
    <Sidebar name={config.name}>
      <Sidebar.Header>
        {config.action} To Google Drive{loading && <Spinner />}
      </Sidebar.Header>
      {tokenResponse ? (
        driveFiles.map((df) => (
          <ToolButton
            className="Card-button"
            type="button"
            key={df.id}
            title={df.name}
            aria-label={df.name}
            showAriaLabel={true}
            onClick={() => {
              setLoading(true);
              try {
                config
                  .act(
                    df.id,
                    excalidrawAPI?.getSceneElements()!!,
                    excalidrawAPI?.getAppState()!!,
                    excalidrawAPI?.getFiles()!!,
                    tokenResponse.access_token,
                  )
                  .then((_) => setLoading(false));
              } catch (error: any) {
                console.error(error);
                onError(new Error(t("exportDialog.googledrive_exportError")));
                setLoading(false);
              }
            }}
          />
        ))
      ) : (
        <ToolButton
          className="Card-button"
          type="button"
          title="Log In"
          aria-label="Log In"
          showAriaLabel={true}
          onClick={() => {
            setLoading(true);
            login();
          }}
        />
      )}
    </Sidebar>
  );
};
