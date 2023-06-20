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
import { TextField } from "../../components/TextField";
import { KEYS } from "../../keys";

const tokenResponseAtom = atom<TokenResponse | undefined>(undefined);

const DRIVE_EXPORT_SIDEBAR_NAME = "drive-export-sidebar";
const DRIVE_IMPORT_SIDEBAR_NAME = "drive-import-sidebar";

export type SidebarType = "import" | "export";

type DriveAction = (
  fileId: string,
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  tokenResponse: TokenResponse,
) => Promise<void>;

type DriveFile = {
  kind: "drive#file";
  mimeType: "text/plain" | "application/octet-stream";
  id: string;
  name: string;
};

const fetchFromDrive: (
  method: "GET" | "POST" | "PATCH",
  url: string,
  tokenResponse?: TokenResponse,
  payload?: string,
) => Promise<any> = async (method, url, tokenResponse, payload) => {
  if (!tokenResponse) {
    return new Promise((resolve, reject) => {
      reject(new Error("not logged in"));
    });
  }
  if (
    !hasGrantedAllScopesGoogle(
      tokenResponse,
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.install",
    )
  ) {
    return new Promise((resolve, reject) => {
      reject(new Error("missing scopes."));
    });
  }
  return fetch(url, {
    method: method,
    headers: new Headers({
      "content-type": "text/plain",
      Authorization: `Bearer ${tokenResponse?.access_token}`,
    }),
    body: payload,
  }).then((response) => response.json());
};

const exportToGoogleDrive: DriveAction = async (
  fileId: string,
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  tokenResponse: TokenResponse,
) => {
  const payload = serializeAsJSON(elements, appState, files, "local");
  return fetchFromDrive(
    "PATCH",
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
    tokenResponse,
    payload,
  );
};

const importFrtomGoogleDrive: DriveAction = async (
  fileId: string,
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  tokenResponse: TokenResponse,
) => {
  return Promise.all([]).then((_) => {});
};

export const SIDEBAR_CONFIG: Record<
  SidebarType,
  {
    name: string;
    actionTitle: string;
    buttonLabel: string;
    act: DriveAction;
  }
> = {
  export: {
    name: DRIVE_EXPORT_SIDEBAR_NAME,
    actionTitle: "Export to Google Drive",
    buttonLabel: "exportDialog.googledrive_button",
    act: exportToGoogleDrive,
  },
  import: {
    name: DRIVE_IMPORT_SIDEBAR_NAME,
    actionTitle: "Import from Google Drive",
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
  const [newFileName, setNewFileName] = useState<string>("");

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

  const refreshFileList = async () => {
    setLoading(true);
    fetchFromDrive(
      "GET",
      "https://www.googleapis.com/drive/v3/files",
      tokenResponse,
    )
      .then(
        (listJson) => (listJson as { files: DriveFile[] }).files,
        (error) => {
          onError(error);
          return [];
        },
      )
      .then((files) => {
        console.log(files);
        return files;
      })
      .then((files) => setDriveFiles(files))
      .then((_) => setLoading(false));
  };

  const createFileInDrive = async () => {
    setLoading(true);
    fetchFromDrive(
      "POST",
      "https://www.googleapis.com/drive/v3/files",
      tokenResponse,
      JSON.stringify({
        mimeType: "text/plain",
        name: `${newFileName}.excalidraw`,
        description: "Auto created by excalidraw drive",
      }),
    ).then((json) => {
      setNewFileName("");
      return refreshFileList();
    });
  };

  useEffect(() => {
    refreshFileList();
  }, [tokenResponse, onError]);

  const { t } = useI18n();
  const config = SIDEBAR_CONFIG[sidebarType];
  return (
    <Sidebar name={config.name}>
      <Sidebar.Header>
        {config.actionTitle}{loading && <Spinner />}
      </Sidebar.Header>
      {tokenResponse && (
        <TextField
          value={newFileName}
          onChange={setNewFileName}
          label="New file name input"
          fullWidth={false}
          placeholder="New file name here..."
          readonly={false}
          onKeyDown={(event) =>
            event.key === KEYS.ENTER &&
            newFileName.trim().length > 0 &&
            createFileInDrive()
          }
        />
      )}
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
                    tokenResponse,
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
