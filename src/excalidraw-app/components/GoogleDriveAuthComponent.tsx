import { ToolButton } from "../../components/ToolButton";
import { useI18n } from "../../i18n";
import { ExcalidrawImperativeAPI } from "../../types";
import { useAtom } from "jotai";
import { loadingAtom, selectedFileAtom } from "../data/GoogleDriveState";
import Spinner from "../../components/Spinner";
import {
  GoogleDriveLoginButton,
  tokenResponseReadAtom,
} from "./GoogleDriveLoginButton";
import { ExportToGoogleDriveFileButton } from "./ExportToGoogleDriveFileButton";
import {
  DRIVE_SIDEBAR_BUTTON_LABEL,
  DRIVE_SIDEBAR_NAME,
} from "./GoogleDriveSidebar";

export const GoogleDriveAuthComponent: React.FC<{
  excalidrawAPI?: ExcalidrawImperativeAPI;
  onError: (error: Error) => void;
}> = ({ excalidrawAPI, onError }) => {
  const { t } = useI18n();
  const [loading] = useAtom(loadingAtom);
  const [tokenResponse] = useAtom(tokenResponseReadAtom);
  const [selectedFile] = useAtom(selectedFileAtom);

  return (
    <div>
      {tokenResponse && selectedFile && (
        <ExportToGoogleDriveFileButton
          tokenResponse={tokenResponse}
          selectedFile={selectedFile}
          excalidrawAPI={excalidrawAPI}
          onError={onError}
        />
      )}
      {tokenResponse ? (
        <ToolButton
          className="Card-button"
          type="button"
          title={t(DRIVE_SIDEBAR_BUTTON_LABEL)}
          aria-label={t(DRIVE_SIDEBAR_BUTTON_LABEL)}
          showAriaLabel={true}
          onClick={() => {
            excalidrawAPI?.toggleSidebar({
              name: DRIVE_SIDEBAR_NAME,
            });
          }}
        />
      ) : (
        <GoogleDriveLoginButton onError={onError} />
      )}
      {loading && <Spinner />}
    </div>
  );
};
