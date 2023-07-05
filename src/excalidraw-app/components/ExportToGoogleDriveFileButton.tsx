import { ToolButton } from "../../components/ToolButton";
import { TokenResponse } from "@react-oauth/google";
import {
  DriveFile,
  fetchFromDrive,
  loadingAtom,
} from "../data/GoogleDriveState";
import { atom, useAtom } from "jotai";
import { ExcalidrawImperativeAPI } from "../../types";
import { serializeAsJSON, useI18n } from "../../packages/excalidraw/index";

const tokenResponseAtom = atom<TokenResponse | undefined>(undefined);
export const tokenResponseReadAtom = atom((get) => get(tokenResponseAtom));

const exportToGoogleDrive = async (
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

export const ExportToGoogleDriveFileButton: React.FC<{
  tokenResponse: TokenResponse;
  selectedFile: DriveFile;
  excalidrawAPI?: ExcalidrawImperativeAPI;
  onError: (error: Error) => void;
}> = ({ tokenResponse, selectedFile, excalidrawAPI, onError }) => {
  const [, setLoading] = useAtom(loadingAtom);
  const { t } = useI18n();
  return (
    <ToolButton
      className="Card-button"
      type="button"
      title={`Save To ${selectedFile.name}`}
      aria-label={`Save To ${selectedFile.name}`}
      showAriaLabel={true}
      onClick={() => {
        setLoading(true);
        try {
          exportToGoogleDrive(
            selectedFile.id!,
            tokenResponse,
            excalidrawAPI,
          ).then((_) => setLoading(false));
        } catch (error: any) {
          console.error(error);
          onError(new Error(t("exportDialog.googledrive_exportError")));
          setLoading(false);
        }
      }}
    />
  );
};
