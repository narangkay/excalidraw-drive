import { Sidebar, restore, useI18n } from "../../packages/excalidraw/index";
import { atom, useAtom } from "jotai";
import { ToolButton } from "../../components/ToolButton";
import { TokenResponse } from "@react-oauth/google";
import { ExcalidrawImperativeAPI } from "../../types";
import Spinner from "../../components/Spinner";
import { TextField } from "../../components/TextField";
import { KEYS } from "../../keys";
import { ImportedDataState } from "../../data/types";
import {
  loadingAtom,
  fetchFromDrive,
  driveFilesAtom,
  freshFetchFilesFromDrive,
  createFileInDrive,
  selectedFileAtom,
} from "../data/GoogleDriveState";
import {
  GoogleDriveLoginButton,
  tokenResponseReadAtom,
} from "./GoogleDriveLoginButton";

const newFileNameAtom = atom<string>("");

export const DRIVE_SIDEBAR_NAME = "drive-sidebar";
export const DRIVE_SODEBAR_ACTION_TITLE = "Open File";
export const DRIVE_SIDEBAR_BUTTON_LABEL = "importDialog.googledrive_button";

const importFrtomGoogleDrive = async (
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

export const GoogleDriveSidebar: React.FC<{
  excalidrawAPI?: ExcalidrawImperativeAPI;
  onError: (error: Error) => void;
}> = ({ excalidrawAPI, onError }) => {
  const [tokenResponse] = useAtom(tokenResponseReadAtom);
  const [driveFiles, setDriveFiles] = useAtom(driveFilesAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [newFileName, setNewFileName] = useAtom(newFileNameAtom);
  const [, setSelectedFile] = useAtom(selectedFileAtom);

  const { t } = useI18n();
  return (
    <Sidebar name={DRIVE_SIDEBAR_NAME}>
      <Sidebar.Header>
        {DRIVE_SODEBAR_ACTION_TITLE}
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
                    importFrtomGoogleDrive(
                      json.id,
                      tokenResponse,
                      excalidrawAPI,
                    ),
                    freshFetchFilesFromDrive(tokenResponse).then((files) => {
                      setDriveFiles(files);
                      setSelectedFile(
                        files.find((file) => file.id === json.id),
                      );
                    }),
                  ]);
                })
                .then(() => {
                  setLoading(false);
                  return excalidrawAPI?.toggleSidebar({
                    name: DRIVE_SIDEBAR_NAME,
                  });
                });
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
                importFrtomGoogleDrive(
                  df.id,
                  tokenResponse,
                  excalidrawAPI,
                ).then((_) => {
                  setLoading(false);
                  setSelectedFile(df);
                  return excalidrawAPI?.toggleSidebar({
                    name: DRIVE_SIDEBAR_NAME,
                  });
                });
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
