import {
  Sidebar,
  restore,
  serializeAsJSON,
  useI18n,
} from "../../packages/excalidraw/index";
import { atom, useAtom } from "jotai";
import { ToolButton } from "../../components/ToolButton";
import { TokenResponse } from "@react-oauth/google";
import { ExcalidrawImperativeAPI } from "../../types";
import Spinner from "../../components/Spinner";
import { TextField } from "../../components/TextField";
import { KEYS } from "../../keys";
import { ImportedDataState } from "../../data/types";
import {
  DriveAction,
  loadingAtom,
  fetchFromDrive,
  driveFilesAtom,
  freshFetchFilesFromDrive,
  createFileInDrive,
} from "../data/GoogleDriveState";
import {
  GoogleDriveLoginButton,
  tokenResponseReadAtom,
} from "./GoogleDriveLoginButton";

const newFileNameAtom = atom<string>("");

const DRIVE_EXPORT_SIDEBAR_NAME = "drive-export-sidebar";
const DRIVE_IMPORT_SIDEBAR_NAME = "drive-import-sidebar";

export type SidebarType = "import" | "export";

const exportToGoogleDrive: DriveAction = async (
  fileId: string,
  tokenResponse: TokenResponse,
  excalidrawAPI?: ExcalidrawImperativeAPI,
) => {
  const payload = serializeAsJSON(
    excalidrawAPI?.getSceneElements()!!,
    excalidrawAPI?.getAppState()!!,
    excalidrawAPI?.getFiles()!!,
    "local",
  );
  return fetchFromDrive(
    "PATCH",
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
    tokenResponse,
    payload,
  );
};

const importFrtomGoogleDrive: DriveAction = async (
  fileId: string,
  tokenResponse: TokenResponse,
  excalidrawAPI?: ExcalidrawImperativeAPI,
) => {
  return fetchFromDrive(
    "GET",
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    tokenResponse,
  )
    .then((json) => {
      const importedDataState = json as ImportedDataState;
      return restore(
        {
          elements: importedDataState.elements,
          appState: importedDataState.appState,
        },
        excalidrawAPI?.getAppState(),
        excalidrawAPI?.getSceneElements(),
      );
    })
    .then((scene) => excalidrawAPI?.updateScene(scene));
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
  const [tokenResponse] = useAtom(tokenResponseReadAtom);
  const [driveFiles, setDriveFiles] = useAtom(driveFilesAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [newFileName, setNewFileName] = useAtom(newFileNameAtom);

  const { t } = useI18n();
  const config = SIDEBAR_CONFIG[sidebarType];
  return (
    <Sidebar name={config.name}>
      <Sidebar.Header>
        {config.actionTitle}
        {loading && <Spinner />}
      </Sidebar.Header>
      {tokenResponse && (
        <TextField
          value={newFileName}
          onChange={setNewFileName}
          label="New file name input"
          fullWidth={false}
          placeholder="New file name here..."
          readonly={false}
          onKeyDown={(event) => {
            if (event.key === KEYS.ENTER && newFileName.trim().length > 0) {
              setLoading(true);
              createFileInDrive(tokenResponse, newFileName)
                .then((json) => {
                  setNewFileName("");
                  return json;
                })
                .then((json) => {
                  return Promise.all([
                    config.act(json.id, tokenResponse, excalidrawAPI),
                    freshFetchFilesFromDrive(tokenResponse).then((files) =>
                      setDriveFiles(files),
                    ),
                  ]);
                })
                .then(() => setLoading(false));
            }
          }}
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
                  .act(df.id, tokenResponse, excalidrawAPI)
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
        <GoogleDriveLoginButton onError={onError} />
      )}
    </Sidebar>
  );
};
